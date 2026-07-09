"use client";

import { useCallback, useState } from "react";
import Papa from "papaparse";
import ThemeToggle from "@/components/ThemeToggle";
import Stepper from "@/components/Stepper";
import FileUpload from "@/components/FileUpload";
import PreviewTable from "@/components/PreviewTable";
import ResultTable from "@/components/ResultTable";
import { extractRecords, uploadCsv } from "@/lib/api";
import { ExtractResponse, RawCsvRow, Step } from "@/lib/types";

const LOADING_MESSAGES = [
  "Reading your CSV columns...",
  "Mapping fields to GrowEasy CRM schema...",
  "Cleaning up messy phone numbers & emails...",
  "Almost done, finalizing records...",
];

export default function Home() {
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [clientRows, setClientRows] = useState<RawCsvRow[]>([]);
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [totalRows, setTotalRows] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExtractResponse | null>(null);

  // Step 1 -> Step 2: client-side parse for instant preview (no AI, no backend call yet)
  const handleFileSelected = useCallback(async (selected: File) => {
    setError(null);
    setFile(selected);
    setIsUploading(true);

    Papa.parse<RawCsvRow>(selected, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setIsUploading(false);
        if (!results.data.length) {
          setError("Couldn't find any rows in this CSV. Please check the file.");
          return;
        }
        setHeaders(results.meta.fields || Object.keys(results.data[0]));
        setClientRows(results.data);
        setTotalRows(results.data.length);
        setStep("preview");
      },
      error: (err) => {
        setIsUploading(false);
        setError(err.message || "Failed to parse CSV file.");
      },
    });
  }, []);

  // Step 3: Confirm -> upload to backend, then run AI extraction
  const handleConfirm = useCallback(async () => {
    if (!file) return;
    setError(null);
    setIsProcessing(true);
    setStep("processing");

    let msgTicker: ReturnType<typeof setInterval> | null = null;
    try {
      msgTicker = setInterval(() => {
        setLoadingMsgIdx((i) => (i + 1) % LOADING_MESSAGES.length);
      }, 2200);

      const uploadRes = await uploadCsv(file);
      setUploadId(uploadRes.uploadId);

      const extractRes = await extractRecords(uploadRes.uploadId);
      setResult(extractRes);
      setStep("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStep("preview");
    } finally {
      if (msgTicker) clearInterval(msgTicker);
      setIsProcessing(false);
    }
  }, [file]);

  function handleReset() {
    setStep("upload");
    setFile(null);
    setHeaders([]);
    setClientRows([]);
    setUploadId(null);
    setTotalRows(0);
    setResult(null);
    setError(null);
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="mb-8 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-600 dark:text-brand-400">
            GrowEasy
          </p>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
            AI CSV Lead Importer
          </h1>
        </div>
        <ThemeToggle />
      </header>

      {/* Stepper */}
      <div className="mb-8">
        <Stepper current={step} />
      </div>

      {/* Step: Upload */}
      {step === "upload" && (
        <section>
          <FileUpload
            onFileSelected={handleFileSelected}
            isLoading={isUploading}
            error={error}
          />
          <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
            Works with Facebook Lead Ads, Google Ads exports, Excel sheets, real
            estate CRM exports, and manually created spreadsheets — any column
            layout.
          </p>
        </section>
      )}

      {/* Step: Preview */}
      {step === "preview" && (
        <section>
          <PreviewTable headers={headers} rows={clientRows.slice(0, 50)} totalRows={totalRows} />

          {error && (
            <p className="mt-3 text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
          )}

          <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              onClick={handleReset}
              className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Choose a different file
            </button>
            <button
              onClick={handleConfirm}
              className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
            >
              Confirm &amp; Run AI Import ({totalRows} rows)
            </button>
          </div>
        </section>
      )}

      {/* Step: Processing */}
      {step === "processing" && (
        <section className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-24 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-6 h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600 dark:border-slate-700 dark:border-t-brand-400" />
          <p className="text-base font-semibold text-slate-800 dark:text-slate-100">
            {LOADING_MESSAGES[loadingMsgIdx]}
          </p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Processing {totalRows} rows in batches — this can take a moment for large files.
          </p>
        </section>
      )}

      {/* Step: Results */}
      {step === "results" && result && (
        <section>
          <ResultTable
            records={result.records}
            skipped={result.skipped}
            totalRows={result.totalRows}
          />
          {result.failedBatches > 0 && (
            <p className="mt-4 text-sm font-medium text-amber-600 dark:text-amber-400">
              {result.failedBatches} batch(es) failed after retries and were
              skipped — see the Skipped tab for details.
            </p>
          )}
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleReset}
              className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
            >
              Import Another File
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
