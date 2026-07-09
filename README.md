# GrowEasy AI CSV Importer

An AI-powered CSV importer that intelligently extracts CRM lead information from **any** CSV layout — Facebook Lead Ads exports, Google Ads exports, Excel sheets, real estate CRM exports, sales reports, or manually created spreadsheets — and maps them into the GrowEasy CRM schema, no matter what the source column names are.

## How it works

1. **Upload** — drag & drop (or browse) a `.csv` file.
2. **Preview** — the file is parsed entirely in the browser and shown in a scrollable, sticky-header table. No AI call happens yet.
3. **Confirm** — clicking "Confirm & Run AI Import" sends the file to the backend.
4. **AI Mapping** — the backend re-parses the CSV, splits rows into batches, and sends each batch to Claude with a schema-mapping prompt + structured tool-output schema (so responses are always valid JSON, never free text).
5. **Results** — imported records and skipped rows (with reasons) are shown in a tabbed, responsive results table with import/skip counts.

## Tech stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, react-dropzone, PapaParse
- **Backend**: Node.js, Express, TypeScript, Multer, csv-parse
- **AI**: OpenRouter (OpenAI-compatible `chat/completions`) using function-calling for guaranteed structured JSON output — lets you pick any model (Claude, GPT, Gemini, Llama, etc.) via one API key

## Project structure

```
groweasy-csv-importer/
├── backend/
│   ├── src/
│   │   ├── index.ts              # Express app entry
│   │   ├── routes/
│   │   │   ├── upload.ts         # POST /api/upload — parses CSV, returns preview
│   │   │   └── extract.ts        # POST /api/extract — runs AI batch extraction
│   │   ├── services/
│   │   │   ├── csvParser.ts      # Header-agnostic CSV parsing
│   │   │   └── aiExtractor.ts    # Claude prompt + batching + retries
│   │   ├── middleware/
│   │   │   ├── upload.ts         # Multer config
│   │   │   └── errorHandler.ts   # Central error handling
│   │   ├── utils/batching.ts     # Chunking, concurrency limiter, retry w/ backoff
│   │   └── types/crm.ts          # CRM schema + allowed enum values
│   └── Dockerfile
├── frontend/
│   ├── app/
│   │   ├── page.tsx              # Full upload → preview → confirm → results flow
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── FileUpload.tsx        # Drag & drop zone
│   │   ├── PreviewTable.tsx      # Step 2 raw preview table
│   │   ├── ResultTable.tsx       # Step 4 results table (imported/skipped tabs)
│   │   ├── Stepper.tsx           # Progress indicator
│   │   └── ThemeToggle.tsx       # Dark mode toggle
│   ├── lib/
│   │   ├── api.ts                # Fetch wrappers for backend API
│   │   └── types.ts
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

## Local setup

### Prerequisites
- Node.js 18+
- An OpenRouter API key ([openrouter.ai/keys](https://openrouter.ai/keys)) — one key gives access to Claude, GPT, Gemini, Llama, and more via `AI_MODEL`.

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
# edit .env and set OPENROUTER_API_KEY=sk-or-v1-...
npm run dev
```

Backend runs at `http://localhost:4000`. Health check: `GET /api/health`.

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env
# NEXT_PUBLIC_API_URL=http://localhost:4000 (default is already correct for local dev)
npm run dev
```

Frontend runs at `http://localhost:3000`.

### 3. Try it

Open `http://localhost:3000`, upload any CSV with lead data (see `sample-data/sample-leads.csv` for a quick test file), and walk through the 4-step flow.

## Docker

```bash
# from the project root
export OPENROUTER_API_KEY=sk-or-v1-...
docker compose up --build
```

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:4000`

## API Reference

### `POST /api/upload`
`multipart/form-data` with field `file` (the CSV).

Response:
```json
{
  "uploadId": "uuid",
  "headers": ["col1", "col2", "..."],
  "totalRows": 120,
  "preview": [ { "col1": "...", "col2": "..." } ]
}
```

### `POST /api/extract`
```json
{ "uploadId": "uuid" }
```

Response:
```json
{
  "totalRows": 120,
  "totalImported": 115,
  "totalSkipped": 5,
  "failedBatches": 0,
  "records": [ { "created_at": "...", "name": "...", "...": "..." } ],
  "skipped": [ { "row_index": 0, "raw": {}, "reason": "No email or mobile number found" } ]
}
```

## AI mapping rules (implemented in `aiExtractor.ts`)

- `crm_status` is restricted to: `GOOD_LEAD_FOLLOW_UP`, `DID_NOT_CONNECT`, `BAD_LEAD`, `SALE_DONE`
- `data_source` is restricted to: `leads_on_demand`, `meridian_tower`, `eden_park`, `varah_swamy`, `sarjapur_plots` (left blank if no confident match)
- `created_at` is normalized to a JS-`Date`-parseable format
- Extra emails/mobile numbers, remarks, and follow-ups are folded into `crm_note`
- Rows without an email **and** without a mobile number are skipped and reported separately
- No literal newlines are introduced into any field so every record stays a valid single CSV row

## Design decisions worth noting

- **Structured output via tool-use**: instead of asking Claude to "return JSON" in prose (fragile), the backend defines a strict JSON schema as an Anthropic tool and forces `tool_choice`, so the model's response is always machine-parseable.
- **Batching + concurrency + retries**: rows are chunked (`BATCH_SIZE`, default 20), processed with a concurrency limit (`BATCH_CONCURRENCY`, default 3) and exponential-backoff retries (`BATCH_MAX_RETRIES`, default 2). A batch that still fails after retries doesn't crash the request — its rows are reported as skipped with the failure reason, so partial results are never lost.
- **Two-phase upload**: the frontend parses the CSV client-side for an instant, zero-cost preview; the actual AI call only happens after the user explicitly confirms, exactly as required by the spec.
- **In-memory upload store with TTL**: keeps the project stateless/deployable without a database, while still decoupling "upload" from "extract" as two separate API calls (per the required API design). Swap `uploadStore` for Redis/Postgres if you need multi-instance deployments.

## Environment variables

**backend/.env**
| Variable | Default | Description |
|---|---|---|
| `PORT` | `4000` | Backend port |
| `FRONTEND_URL` | `http://localhost:3000` | CORS allow-origin |
| `OPENROUTER_API_KEY` | — | Required. Your OpenRouter API key |
| `AI_MODEL` | `anthropic/claude-sonnet-4.5` | Any model slug from openrouter.ai/models |
| `BATCH_SIZE` | `20` | Rows per AI batch |
| `BATCH_CONCURRENCY` | `3` | Concurrent batches in flight |
| `BATCH_MAX_RETRIES` | `2` | Retries per failed batch |

**frontend/.env**
| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000` | Backend base URL |

## Deployment

- **Backend** → Railway / Render: set root directory to `backend`, build command `npm install && npm run build`, start command `npm start`, add the env vars above.
- **Frontend** → Vercel: set root directory to `frontend`, add `NEXT_PUBLIC_API_URL` pointing at your deployed backend URL.

## Submission

- Position: _(fill in — Software Developer Intern / Software Developer Full-Time)_
- Hosted app URL: _(fill in after deployment)_
- GitHub repo URL: https://github.com/pushpanjali1909/groweasy-csv-importer
