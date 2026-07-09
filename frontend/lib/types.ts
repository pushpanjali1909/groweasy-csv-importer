export type RawCsvRow = Record<string, string>;

export type CrmStatus =
  | "GOOD_LEAD_FOLLOW_UP"
  | "DID_NOT_CONNECT"
  | "BAD_LEAD"
  | "SALE_DONE"
  | "";

export interface CrmRecord {
  created_at?: string;
  name?: string;
  email?: string;
  country_code?: string;
  mobile_without_country_code?: string;
  company?: string;
  city?: string;
  state?: string;
  country?: string;
  lead_owner?: string;
  crm_status?: CrmStatus;
  crm_note?: string;
  data_source?: string;
  possession_time?: string;
  description?: string;
}

export interface SkippedRecord {
  row_index: number;
  raw: RawCsvRow;
  reason: string;
}

export interface UploadResponse {
  uploadId: string;
  headers: string[];
  totalRows: number;
  preview: RawCsvRow[];
}

export interface ExtractResponse {
  totalRows: number;
  totalImported: number;
  totalSkipped: number;
  failedBatches: number;
  records: CrmRecord[];
  skipped: SkippedRecord[];
}

export type Step = "upload" | "preview" | "processing" | "results";
