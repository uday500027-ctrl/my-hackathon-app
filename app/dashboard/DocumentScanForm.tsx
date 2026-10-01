"use client";

import { useState, useRef, useCallback } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScanResultPanel } from "@/app/dashboard/ScanResultPanel";
import type { ScanRecord } from "@/app/dashboard/scan-types";
import { DESTINATION_LABELS } from "@/app/dashboard/scan-types";

const MAX_FILE_BYTES = 4 * 1024 * 1024; // 4 MB
const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".txt", ".md", ".csv"];
const DESTINATIONS = ["ai_chatbot", "email_external", "public_post", "internal_chat"] as const;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isAllowedType(file: File): boolean {
  const name = file.name.toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

interface Props {
  policies: Array<{ id: string; name: string; is_default: boolean }>;
  initialPolicyId: string;
}

export default function DocumentScanForm({ policies, initialPolicyId }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [destination, setDestination] = useState<string>("ai_chatbot");
  const [policyId, setPolicyId] = useState<string>(initialPolicyId);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanRecord | null>(null);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  function validateAndSetFile(f: File) {
    setFileError("");
    if (!isAllowedType(f)) {
      setFileError("Unsupported file type. Allowed: PDF, Word (.docx), .txt, .md, .csv");
      setFile(null);
      return;
    }
    if (f.size > MAX_FILE_BYTES) {
      setFileError("File is too large. Maximum allowed size is 4 MB.");
      setFile(null);
      return;
    }
    setFile(f);
  }

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) validateAndSetFile(dropped);
  }, []);

  async function handleScan() {
    if (!file) return;
    setError("");
    setResult(null);
    setLoading(true);

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("destination", destination);
      if (policyId) fd.append("policy_id", policyId);

      const res = await fetch("/api/scans/document", { method: "POST", body: fd });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message ?? "Something went wrong.");
        setLoading(false);
        return;
      }

      // Merge transient fields into the ScanRecord
      setResult({
        ...data.data,
        truncated: data.data.truncated ?? false,
        pageCount: data.data.pageCount,
      } as ScanRecord);
      setLoading(false);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch {
      setError("Could not connect to the server. Please try again.");
      setLoading(false);
    }
  }

  const canScan = !!file && !fileError && !loading;

  return (
    <div className="space-y-6">
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400"
        >
          {error}
        </div>
      )}

      <div className="space-y-4 rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
        {/* Policy */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="doc-policy" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Policy
            </Label>
            <a
              href="/dashboard/policies"
              className="inline-flex min-h-[40px] items-center text-xs text-neutral-500 hover:text-neutral-900 underline dark:text-neutral-400 dark:hover:text-neutral-200"
            >
              Manage policies
            </a>
          </div>
          {policies.length > 0 ? (
            <Select value={policyId} onValueChange={setPolicyId}>
              <SelectTrigger id="doc-policy" className="w-full sm:w-64 min-h-[40px]">
                <SelectValue placeholder="Select a policy" />
              </SelectTrigger>
              <SelectContent>
                {policies.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} {p.is_default ? "(Default)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Using default system policy.</p>
          )}
        </div>

        {/* Destination */}
        <div className="space-y-1.5">
          <Label htmlFor="doc-destination" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Destination
          </Label>
          <Select value={destination} onValueChange={setDestination}>
            <SelectTrigger id="doc-destination" className="w-full sm:w-64 min-h-[40px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DESTINATIONS.map((d) => (
                <SelectItem key={d} value={d}>
                  {DESTINATION_LABELS[d]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Drop zone */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            File
          </Label>
          <div
            role="button"
            tabIndex={0}
            aria-label="Drop a file here or click to choose"
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f5e3e] focus-visible:ring-offset-2 ${
              dragging
                ? "border-[#2f5e3e] bg-emerald-50/20 dark:border-emerald-600 dark:bg-neutral-800"
                : "border-neutral-300 hover:border-neutral-400 dark:border-neutral-700 dark:hover:border-neutral-500"
            }`}
          >
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Drag and drop a file here, or
            </p>
            <button
              type="button"
              className="inline-flex min-h-[40px] items-center justify-center rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f5e3e] focus-visible:ring-offset-2 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
              onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
            >
              Choose file
            </button>
            <p className="text-xs text-neutral-400 dark:text-neutral-500">
              PDF, Word (.docx), TXT, MD, CSV — max 4 MB
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx,.txt,.md,.csv"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) validateAndSetFile(f);
              e.target.value = "";
            }}
          />

          {/* File info / error */}
          {fileError && (
            <p className="text-xs text-red-600 dark:text-red-400">{fileError}</p>
          )}
          {file && !fileError && (
            <div className="flex items-center justify-between rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs dark:border-neutral-700 dark:bg-neutral-800">
              <span className="truncate font-medium text-neutral-800 dark:text-neutral-200">
                {file.name}
              </span>
              <span className="ml-3 shrink-0 text-neutral-500">{formatBytes(file.size)}</span>
            </div>
          )}
        </div>

        {/* Privacy note */}
        <p className="text-xs text-neutral-400 dark:text-neutral-500">
          Files are read in memory and never stored. Only masked text is saved.
        </p>

        {/* Action */}
        <div>
          <button
            id="doc-scan-submit"
            onClick={handleScan}
            disabled={!canScan}
            className="inline-flex min-h-[40px] items-center justify-center rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f5e3e] focus-visible:ring-offset-2 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
          >
            {loading ? "Scanning…" : "Scan document"}
          </button>
        </div>
      </div>

      {/* Result */}
      <div ref={resultRef}>
        {result && (
          <ScanResultPanel
            scan={result}
            destinationLabel={DESTINATION_LABELS[destination] ?? destination}
          />
        )}
      </div>
    </div>
  );
}
