import { parse } from "csv-parse/sync";
import { RawCsvRow } from "../types/crm";

/**
 * Parses raw CSV buffer/string into an array of row objects.
 * Does NOT assume any fixed column names — headers are read dynamically
 * from the first row of the file, whatever they may be.
 */
export function parseCsv(fileContent: string): {
  headers: string[];
  rows: RawCsvRow[];
} {
  const records: RawCsvRow[] = parse(fileContent, {
    columns: (header: string[]) =>
      header.map((h) => (h ?? "").toString().trim()),
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
    bom: true,
  });

  const headers = records.length > 0 ? Object.keys(records[0]) : [];

  return { headers, rows: records };
}
