import {
  ALLOWED_CRM_STATUS,
  ALLOWED_DATA_SOURCE,
  CrmRecord,
  ExtractionResult,
  RawCsvRow,
  SkippedRecord,
} from "../types/crm";
import { chunkArray, runWithConcurrency, withRetry } from "../utils/batching";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// e.g. "anthropic/claude-sonnet-4.5", "openai/gpt-4o-mini", "google/gemini-2.0-flash-001"
// See https://openrouter.ai/models for the full list of available model slugs.
const MODEL = process.env.AI_MODEL || "anthropic/claude-sonnet-4.5";
console.log("AI_MODEL =", process.env.AI_MODEL);
console.log("MODEL =", MODEL);
const BATCH_SIZE = Number(process.env.BATCH_SIZE || 20);
const BATCH_CONCURRENCY = Number(process.env.BATCH_CONCURRENCY || 3);
const BATCH_MAX_RETRIES = Number(process.env.BATCH_MAX_RETRIES || 2);

const SYSTEM_PROMPT = `You are a data-mapping engine for GrowEasy CRM. You receive raw CSV lead rows exported from unknown sources (Facebook Lead Ads, Google Ads, Excel sheets, Real Estate CRMs, sales reports, manual spreadsheets, etc.) with arbitrary/unpredictable column names. Your job is to intelligently map each raw row into the GrowEasy CRM schema.

Follow these rules exactly:

1. ALLOWED crm_status values (use only these, or leave blank if nothing fits):
${ALLOWED_CRM_STATUS.join(", ")}

2. ALLOWED data_source values (use only these, or leave blank if not confidently matched):
${ALLOWED_DATA_SOURCE.join(", ")}

3. created_at must be a value parseable by JavaScript's \`new Date(created_at)\`. Prefer ISO-like "YYYY-MM-DD HH:mm:ss" or "YYYY-MM-DD". If no date-ish field exists, leave it blank.

4. crm_note should collect: remarks, follow-up notes, additional comments, extra phone numbers, extra email addresses, and any other useful info that doesn't map to a dedicated field. Combine multiple notes with " | " as a separator.

5. Multiple emails/mobiles: if a row has more than one email, use the first as \`email\` and append the rest into crm_note (e.g. "Alt email: x@y.com"). Same for mobile numbers — first goes to mobile_without_country_code (digits only, no country code), rest appended to crm_note.

6. country_code should be a phone country code like "+91", "+1" etc, separated out from the mobile number if combined in the source.

7. Never introduce raw newlines inside any field value — if a note has natural line breaks, replace them with " | " or "\\n" escape, never a literal newline, so the record stays a single logical row.

8. SKIP a row entirely (do not include it in "records") if it has NEITHER a usable email NOR a usable mobile number. Instead include it in "skipped" with the original row index and a short reason.

9. Only include fields you can populate with reasonable confidence; leave others as empty strings rather than guessing wildly. Do not fabricate data that isn't implied by the row.

10. Field list for every record object (all keys always present, empty string "" if unknown): created_at, name, email, country_code, mobile_without_country_code, company, city, state, country, lead_owner, crm_status, crm_note, data_source, possession_time, description.

You will be given a JSON array of rows, each with a "_row_index" (its original position in the uploaded file, 0-based) plus the raw column/value pairs exactly as they appeared in the CSV. Map every row to either "records" (successfully mapped) or "skipped" (with reason). Every input row_index must appear in exactly one of the two output arrays — never drop a row silently.

Respond ONLY by calling the "return_crm_records" tool. Do not include any prose.`;

const TOOL_SCHEMA = {
  type: "function" as const,
  function: {
    name: "return_crm_records",
    description:
      "Return the CRM-mapped records and skipped rows for this batch.",
    parameters: {
      type: "object" as const,
      properties: {
        records: {
          type: "array",
          items: {
            type: "object",
            properties: {
              row_index: { type: "number" },
              created_at: { type: "string" },
              name: { type: "string" },
              email: { type: "string" },
              country_code: { type: "string" },
              mobile_without_country_code: { type: "string" },
              company: { type: "string" },
              city: { type: "string" },
              state: { type: "string" },
              country: { type: "string" },
              lead_owner: { type: "string" },
              crm_status: {
                type: "string",
                enum: [...ALLOWED_CRM_STATUS, ""],
              },
              crm_note: { type: "string" },
              data_source: {
                type: "string",
                enum: [...ALLOWED_DATA_SOURCE, ""],
              },
              possession_time: { type: "string" },
              description: { type: "string" },
            },
            required: ["row_index"],
          },
        },
        skipped: {
          type: "array",
          items: {
            type: "object",
            properties: {
              row_index: { type: "number" },
              reason: { type: "string" },
            },
            required: ["row_index", "reason"],
          },
        },
      },
      required: ["records", "skipped"],
    },
  },
};

interface IndexedRow {
  _row_index: number;
  data: RawCsvRow;
}

async function extractBatch(
  batch: IndexedRow[],
  originalRowsByIndex: Map<number, RawCsvRow>
): Promise<ExtractionResult> {
  const call = async (): Promise<ExtractionResult> => {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        // Optional but recommended by OpenRouter for analytics/rate-limit tiers.
        "HTTP-Referer": process.env.FRONTEND_URL || "http://localhost:3000",
        "X-Title": "GrowEasy CSV Importer",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: JSON.stringify(
              batch.map((row) => ({ _row_index: row._row_index, ...row.data }))
            ),
          },
        ],
        tools: [TOOL_SCHEMA],
        tool_choice: {
          type: "function",
          function: { name: "return_crm_records" },
        },
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(
        `OpenRouter request failed (${res.status}): ${body.slice(0, 300)}`
      );
    }

    const data = (await res.json()) as any;
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("AI did not return structured tool output");
    }

    const parsed = JSON.parse(toolCall.function.arguments) as {
      records: (CrmRecord & { row_index: number })[];
      skipped: { row_index: number; reason: string }[];
    };

    const records: CrmRecord[] = parsed.records.map(
      ({ row_index, ...rest }) => rest
    );

    const skipped: SkippedRecord[] = parsed.skipped.map((s) => ({
      row_index: s.row_index,
      reason: s.reason,
      raw: originalRowsByIndex.get(s.row_index) ?? {},
    }));

    return { records, skipped };
  };

  return withRetry(call, BATCH_MAX_RETRIES);
}

/**
 * Extracts CRM records from raw CSV rows using the AI model, processed
 * in concurrent batches with retry-on-failure.
 */
export async function extractCrmRecords(
  rows: RawCsvRow[]
): Promise<ExtractionResult & { failedBatches: number }> {
  if (!OPENROUTER_API_KEY) {
    throw new Error(
      "OPENROUTER_API_KEY is not set. Add it to backend/.env to enable AI extraction."
    );
  }

  const indexedRows: IndexedRow[] = rows.map((row, i) => ({
    _row_index: i,
    data: row,
  }));
  const originalRowsByIndex = new Map<number, RawCsvRow>(
    rows.map((row, i) => [i, row])
  );

  const batches = chunkArray(indexedRows, BATCH_SIZE);

  let failedBatches = 0;
  const allRecords: CrmRecord[] = [];
  const allSkipped: SkippedRecord[] = [];

  const batchResults = await runWithConcurrency(
    batches,
    BATCH_CONCURRENCY,
    async (batch) => {
      try {
        return await extractBatch(batch, originalRowsByIndex);
      } catch (err) {
        failedBatches += 1;
        // Fall back to skipping the whole batch with a clear reason
        // rather than losing the request entirely.
        const skipped: SkippedRecord[] = batch.map((row) => ({
          row_index: row._row_index,
          raw: originalRowsByIndex.get(row._row_index) ?? {},
          reason: `AI extraction failed for this batch: ${
            err instanceof Error ? err.message : "unknown error"
          }`,
        }));
        return { records: [], skipped };
      }
    }
  );

  for (const result of batchResults) {
    allRecords.push(...result.records);
    allSkipped.push(...result.skipped);
  }

  return { records: allRecords, skipped: allSkipped, failedBatches };
}
