"use client";

import { RawCsvRow } from "@/lib/types";

interface Props {
  headers: string[];
  rows: RawCsvRow[];
  totalRows: number;
}

export default function PreviewTable({ headers, rows, totalRows }: Props) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-slate-800">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Preview — showing {rows.length} of {totalRows} rows
        </h3>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          No AI processing yet
        </span>
      </div>
      <div className="thin-scroll max-h-[420px] overflow-auto">
        <table className="w-full min-w-max border-collapse text-left text-sm">
          <thead>
            <tr>
              {headers.map((h) => (
                <th
                  key={h}
                  className="sticky-th whitespace-nowrap border-b border-slate-200 bg-slate-50 px-4 py-2.5 font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={i}
                className="border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-800/60 dark:hover:bg-slate-800/40"
              >
                {headers.map((h) => (
                  <td
                    key={h}
                    className="whitespace-nowrap px-4 py-2 text-slate-700 dark:text-slate-300"
                  >
                    {row[h] || <span className="text-slate-300 dark:text-slate-600">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
