export const ALLOWED_CRM_STATUS = [
  "GOOD_LEAD_FOLLOW_UP",
  "DID_NOT_CONNECT",
  "BAD_LEAD",
  "SALE_DONE",
] as const;

export const ALLOWED_DATA_SOURCE = [
  "leads_on_demand",
  "meridian_tower",
  "eden_park",
  "varah_swamy",
  "sarjapur_plots",
] as const;

export type CrmStatus = (typeof ALLOWED_CRM_STATUS)[number] | "";
export type DataSource = (typeof ALLOWED_DATA_SOURCE)[number] | "";

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
  data_source?: DataSource;
  possession_time?: string;
  description?: string;
}

export interface SkippedRecord {
  row_index: number;
  raw: Record<string, unknown>;
  reason: string;
}

export interface ExtractionResult {
  records: CrmRecord[];
  skipped: SkippedRecord[];
}

// Raw CSV row before AI mapping (arbitrary headers/values)
export type RawCsvRow = Record<string, string>;
