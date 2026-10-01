"use client";

import { useState, useRef, useEffect } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScanResultPanel } from "@/app/dashboard/ScanResultPanel";
import DocumentScanForm from "@/app/dashboard/DocumentScanForm";
import { verhoeffGenerateCheckDigit } from "@/lib/detectors";
import type { ScanRecord } from "@/app/dashboard/scan-types";
import { DESTINATION_LABELS } from "@/app/dashboard/scan-types";

const MAX_CHARS = 8000;
const DESTINATIONS = ["ai_chatbot", "email_external", "public_post", "internal_chat"] as const;

// ─── Sample text assembled at runtime — no raw secret literals in source ─────
function buildSampleText(): string {
  // Fake Aadhaar with valid Verhoeff check digit
  const aadhaarBase = "234512345678".slice(0, 11); // 11 digits, first digit 2
  const checkDigit = verhoeffGenerateCheckDigit(aadhaarBase);
  const aadhaar = aadhaarBase + checkDigit;

  // Fake API key assembled by concatenation so no key-like literal exists in source
  const fakeKey = ["AIza", "SyBkFake", "TestKey1234", "abcdefghijk"].join("");

  // Luhn-valid test card: 4111111111111111 is a known test card
  const card = "4111 1111 1111 1111";

  return [
    `Contact Jane at jane.doe@example.com or call +91 98765 43210 for details.`,
    `Her PAN is ABCDE1234F and her Aadhaar is ${aadhaar}.`,
    `She paid with card ${card} via UPI ID jane@icici.`,
    `Server is at 192.168.1.42. Her password is hunter2secret.`,
    `API key for testing: ${fakeKey}`,
    `Project Falcon launch is delayed due to the Acme contract dispute.`,
  ].join("\n");
}

interface PolicyOption {
  id: string;
  name: string;
  is_default: boolean;
}

type ScanMode = "text" | "document";

export default function ScanPage() {
  const [mode, setMode] = useState<ScanMode>("text");
  const [text, setText] = useState("");
  const [destination, setDestination] = useState<string>("ai_chatbot");
  const [policies, setPolicies] = useState<PolicyOption[]>([]);
  const [policyId, setPolicyId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanRecord | null>(null);
  const [error, setError] = useState("");
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadPolicies() {
      try {
        const res = await fetch("/api/policies");
        const data = await res.json();
        if (res.ok && Array.isArray(data.data)) {
          setPolicies(data.data);
          const defaultPol = data.data.find((p: PolicyOption) => p.is_default);
          if (defaultPol) {
            setPolicyId(defaultPol.id);
          } else if (data.data.length > 0) {
            setPolicyId(data.data[0].id);
          }
        }
      } catch {
        // Fallback silently if policies couldn't be loaded
      }
    }
    loadPolicies();
  }, []);

  async function handleScan() {
    setError("");
    setResult(null);
    setLoading(true);

    try {
      const res = await fetch("/api/scans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          destination,
          title: title || undefined,
          policy_id: policyId || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message ?? "Something went wrong.");
        setLoading(false);
        return;
      }

      setResult(data.data as ScanRecord);
      setLoading(false);
      // Scroll to result
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch {
      setError("Could not connect to the server. Please try again.");
      setLoading(false);
    }
  }

  function handleLoadSample() {
    setText(buildSampleText());
  }

  const charCount = text.length;
  const overLimit = charCount > MAX_CHARS;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          Scan
        </h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Paste text or upload a document. Sensitive values will be masked before analysis.
        </p>
      </div>

      {/* Mode toggle */}
      <div className="flex rounded-lg border border-neutral-200 bg-neutral-50 p-1 w-fit dark:border-neutral-800 dark:bg-neutral-900">
        <button
          id="mode-text"
          onClick={() => { setMode("text"); setResult(null); setError(""); }}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            mode === "text"
              ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-800 dark:text-neutral-100"
              : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300"
          }`}
        >
          Text
        </button>
        <button
          id="mode-document"
          onClick={() => { setMode("document"); setResult(null); setError(""); }}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            mode === "document"
              ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-800 dark:text-neutral-100"
              : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300"
          }`}
        >
          Document
        </button>
      </div>

      {mode === "document" ? (
        <DocumentScanForm policies={policies} initialPolicyId={policyId} />
      ) : (
        <>
          {error && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400"
            >
              {error}
            </div>
          )}

          <div className="space-y-4 rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
            {/* Optional title */}
            <div className="space-y-1.5">
              <Label htmlFor="scan-title" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Title <span className="font-normal text-neutral-400">(optional)</span>
              </Label>
              <input
                id="scan-title"
                type="text"
                maxLength={80}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Support email draft"
                className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500"
              />
            </div>

            {/* Policy select */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="scan-policy" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Policy
                </Label>
                <a
                  href="/dashboard/policies"
                  className="text-xs text-neutral-500 hover:text-neutral-900 underline dark:text-neutral-400 dark:hover:text-neutral-200"
                >
                  Manage policies
                </a>
              </div>
              {policies.length > 0 ? (
                <Select value={policyId} onValueChange={setPolicyId}>
                  <SelectTrigger id="scan-policy" className="w-full sm:w-64">
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
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Using default system policy.
                </p>
              )}
            </div>

            {/* Destination */}
            <div className="space-y-1.5">
              <Label htmlFor="scan-destination" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Destination
              </Label>
              <Select value={destination} onValueChange={setDestination}>
                <SelectTrigger id="scan-destination" className="w-full sm:w-64">
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

            {/* Text area */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="scan-text" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Text to scan
                </Label>
                <span
                  className={`text-xs tabular-nums ${
                    overLimit
                      ? "text-red-600 dark:text-red-400"
                      : "text-neutral-400"
                  }`}
                >
                  {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()}
                </span>
              </div>
              <textarea
                id="scan-text"
                rows={10}
                maxLength={MAX_CHARS}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste your text here…"
                className="w-full resize-y rounded-lg border border-neutral-300 bg-white px-3 py-2 font-mono text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500"
              />
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              <button
                id="scan-submit"
                onClick={handleScan}
                disabled={loading || !text.trim() || overLimit}
                className="rounded-lg bg-neutral-900 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-500 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
              >
                {loading ? "Scanning…" : "Scan"}
              </button>
              <button
                id="scan-load-sample"
                type="button"
                onClick={handleLoadSample}
                className="rounded-lg border border-neutral-300 bg-white px-5 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                Load sample text
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
        </>
      )}
    </div>
  );
}
