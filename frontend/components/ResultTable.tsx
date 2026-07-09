"use client";

import { useState } from "react";
import clsx from "clsx";
import { CrmRecord, SkippedRecord } from "@/lib/types";

const CRM_COLUMNS: (keyof CrmRecord)[] = [
  "created_at",
  "name",
  "email",
  "country_code",
  "mobile_without_country_code",
  "company",
  "city",
  "state",
  "country",
  "lead_owner",
  "crm_status",
  "crm_note",
  "data_source",
  "possession_time",
  "description",
];

const STATUS_STYLES: Record<string, string> = {
  GOOD_LEAD_FOLLOW_UP:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  DID_NOT_CONNECT:
    "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
  BAD_LEAD: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  SALE_DONE:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
};

interface Props {
  records: CrmRecord[];
  skipped: SkippedRecord[];
  totalRows: number;
}

export default function ResultTable({ records, skipped, totalRows }: Props) {
  const [tab, setTab] = useState<"imported" | "skipped">("imported");

  return (
    <div>
      {/* Stats */}
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Rows" value={totalRows} tone="neutral" />
        <StatCard label="Successfully Imported" value={records.length} tone="success" />
        <StatCard label="Skipped" value={skipped.length} tone="warning" />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="flex border-b border-slate-200 dark:border-slate-800">
          <TabButton active={tab === "imported"} onClick={() => setTab("imported")}>
            Imported ({records.length})
          </TabButton>
          <TabButton active={tab === "skipped"} onClick={() => setTab("skipped")}>
            Skipped ({skipped.length})
          </TabButton>
        </div>

        {tab === "imported" ? (
          <div className="thin-scroll max-h-[520px] overflow-auto">
            <table className="w-full min-w-max border-collapse text-left text-sm">
              <thead>
                <tr>
                  {CRM_COLUMNS.map((col) => (
                    <th
                      key={col}
                      className="sticky-th whitespace-nowrap border-b border-slate-200 bg-slate-50 px-4 py-2.5 font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map((rec, i) => (
                  <tr
                    key={i}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-800/60 dark:hover:bg-slate-800/40"
                  >
                    {CRM_COLUMNS.map((col) => (
                      <td
                        key={col}
                        className="whitespace-nowrap px-4 py-2 text-slate-700 dark:text-slate-300"
                      >
                        {col === "crm_status" && rec[col] ? (
                          <span
                            className={clsx(
                              "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                              STATUS_STYLES[rec[col] as string]
                            )}
                          >
                            {rec[col]}
                          </span>
                        ) : (
                          rec[col] || (
                            <span className="text-slate-300 dark:text-slate-600">—</span>
                          )
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
                {records.length === 0 && (
                  <tr>
                    <td colSpan={CRM_COLUMNS.length} className="px-4 py-8 text-center text-slate-400">
                      No records were imported.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="thin-scroll max-h-[520px] overflow-auto">
            <table className="w-full min-w-max border-collapse text-left text-sm">
              <thead>
                <tr>
                  <th className="sticky-th whitespace-nowrap border-b border-slate-200 bg-slate-50 px-4 py-2.5 font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300">
                    Row #
                  </th>
                  <th className="sticky-th whitespace-nowrap border-b border-slate-200 bg-slate-50 px-4 py-2.5 font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300">
                    Reason
                  </th>
                  <th className="sticky-th whitespace-nowrap border-b border-slate-200 bg-slate-50 px-4 py-2.5 font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300">
                    Raw Data
                  </th>
                </tr>
              </thead>
              <tbody>
                {skipped.map((s, i) => (
                  <tr
                    key={i}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-800/60 dark:hover:bg-slate-800/40"
                  >
                    <td className="px-4 py-2 text-slate-700 dark:text-slate-300">
                      {s.row_index + 1}
                    </td>
                    <td className="px-4 py-2 text-red-600 dark:text-red-400">{s.reason}</td>
                    <td className="max-w-md truncate px-4 py-2 font-mono text-xs text-slate-500 dark:text-slate-400">
                      {JSON.stringify(s.raw)}
                    </td>
                  </tr>
                ))}
                {skipped.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-slate-400">
                      Nothing was skipped — great data!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "neutral" | "success" | "warning";
}) {
  const toneStyles = {
    neutral: "text-slate-900 dark:text-white",
    success: "text-emerald-600 dark:text-emerald-400",
    warning: "text-amber-600 dark:text-amber-400",
  }[tone];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className={clsx("mt-1 text-2xl font-bold", toneStyles)}>{value}</p>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "px-5 py-3 text-sm font-semibold transition-colors",
        active
          ? "border-b-2 border-brand-600 text-brand-600 dark:text-brand-400"
          : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      )}
    >
      {children}
    </button>
  );
}
