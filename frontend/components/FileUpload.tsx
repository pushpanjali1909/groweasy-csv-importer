"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import clsx from "clsx";

interface Props {
  onFileSelected: (file: File) => void;
  isLoading?: boolean;
  error?: string | null;
}

export default function FileUpload({ onFileSelected, isLoading, error }: Props) {
  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted[0]) onFileSelected(accepted[0]);
    },
    [onFileSelected]
  );

  const { getRootProps, getInputProps, isDragActive, fileRejections } =
    useDropzone({
      onDrop,
      multiple: false,
      accept: { "text/csv": [".csv"] },
      disabled: isLoading,
    });

  return (
    <div>
      <div
        {...getRootProps()}
        className={clsx(
          "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-16 text-center transition-colors",
          isDragActive
            ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20"
            : "border-slate-300 bg-white hover:border-brand-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-brand-500 dark:hover:bg-slate-800/50",
          isLoading && "pointer-events-none opacity-60"
        )}
      >
        <input {...getInputProps()} />
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 16V4m0 0L7 9m5-5l5 5M5 20h14"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <p className="text-base font-semibold text-slate-800 dark:text-slate-100">
          {isLoading
            ? "Uploading..."
            : isDragActive
            ? "Drop your CSV here"
            : "Drag & drop your CSV file here"}
        </p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          or click to browse — Facebook, Google Ads, Excel, or any lead export
        </p>
        <span className="mt-4 inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          .csv only, up to 15MB
        </span>
      </div>

      {(error || fileRejections.length > 0) && (
        <p className="mt-3 text-sm font-medium text-red-600 dark:text-red-400">
          {error || "Please upload a valid .csv file."}
        </p>
      )}
    </div>
  );
}
