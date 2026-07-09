"use client";

import clsx from "clsx";
import { Step } from "@/lib/types";

const STEPS: { key: Step; label: string }[] = [
  { key: "upload", label: "Upload CSV" },
  { key: "preview", label: "Preview" },
  { key: "processing", label: "AI Mapping" },
  { key: "results", label: "Results" },
];

export default function Stepper({ current }: { current: Step }) {
  const currentIndex = STEPS.findIndex((s) => s.key === current);

  return (
    <ol className="flex w-full items-center">
      {STEPS.map((step, idx) => {
        const isDone = idx < currentIndex;
        const isActive = idx === currentIndex;
        return (
          <li key={step.key} className="flex flex-1 items-center last:flex-none">
            <div className="flex items-center gap-2">
              <span
                className={clsx(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                  isDone && "bg-emerald-500 text-white",
                  isActive && "bg-brand-600 text-white",
                  !isDone && !isActive &&
                    "bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                )}
              >
                {isDone ? "✓" : idx + 1}
              </span>
              <span
                className={clsx(
                  "hidden text-sm font-medium sm:block",
                  isActive
                    ? "text-slate-900 dark:text-white"
                    : "text-slate-500 dark:text-slate-400"
                )}
              >
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={clsx(
                  "mx-2 h-0.5 flex-1 rounded transition-colors sm:mx-4",
                  isDone ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-800"
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
