"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ScanRecord } from "@/app/dashboard/scan-types";
import { CATEGORY_LABELS } from "@/app/dashboard/scan-types";
import { useState } from "react";

const RISK_COLORS: Record<string, string> = {
  low: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  critical: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

const SEVERITY_COLORS: Record<string, string> = {
  low: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  critical: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

export function RiskBadge({ level }: { level: string }) {
  return (
    <Badge
      className={cn(
        "font-medium capitalize",
        RISK_COLORS[level] ?? "bg-neutral-100 text-neutral-600"
      )}
    >
      {level}
    </Badge>
  );
}

export function ScanResultPanel({ scan }: { scan: ScanRecord }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!scan.masked_text) return;
    await navigator.clipboard.writeText(scan.masked_text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const isAiOk = scan.ai_status === "ok" && !!scan.ai_analysis;
  const isFallback = scan.ai_status === "fallback";

  // Separate detector findings from AI findings
  const detectorFindings = scan.findings.filter((f) => f.source !== "ai");
  const aiFindings = scan.findings.filter((f) => f.source === "ai");

  // Group detector findings by category
  const groupedDetector = new Map<string, typeof detectorFindings>();
  for (const f of detectorFindings) {
    if (!groupedDetector.has(f.category)) groupedDetector.set(f.category, []);
    groupedDetector.get(f.category)!.push(f);
  }

  const fallbackNotice =
    scan.ai_notice ||
    "AI review is unavailable right now, so this result uses automatic detection only.";

  return (
    <div className="mt-6 space-y-6 rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
      {/* Fallback Notice Banner */}
      {isFallback && (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-xs text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800/60 dark:text-neutral-400">
          {fallbackNotice}
        </div>
      )}

      {/* Header & Score */}
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-3xl font-bold tabular-nums text-neutral-900 dark:text-neutral-100">
              {scan.risk_score}
            </span>
            <span className="text-sm text-neutral-500">/100</span>
          </div>
          <RiskBadge level={scan.risk_level} />
          {scan.findings.length === 0 && (
            <span className="text-sm text-neutral-500">No sensitive data detected</span>
          )}
        </div>
        {isAiOk && (
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Reviewed by Gemini on masked text only
          </p>
        )}
      </div>

      {/* AI Contextual Review Section */}
      {isAiOk && scan.ai_analysis && (
        <div className="space-y-4 rounded-lg border border-neutral-100 bg-neutral-50/70 p-4 dark:border-neutral-800 dark:bg-neutral-800/40">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200/80 pb-3 dark:border-neutral-700">
            <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
              AI Contextual Analysis
            </p>
            <span
              className={cn(
                "inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium border",
                scan.ai_analysis.safe_to_send
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
              )}
            >
              {scan.ai_analysis.safe_to_send ? "Safe to send" : "Not safe to send"}
            </span>
          </div>

          {/* Summary */}
          {scan.ai_analysis.summary && (
            <div className="space-y-1">
              <p className="text-sm text-neutral-800 dark:text-neutral-200">
                {scan.ai_analysis.summary}
              </p>
            </div>
          )}

          {/* Destination Assessment */}
          {scan.ai_analysis.destination_assessment && (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                Destination Assessment
              </p>
              <p className="text-xs text-neutral-600 dark:text-neutral-400">
                {scan.ai_analysis.destination_assessment}
              </p>
            </div>
          )}

          {/* Recommended Actions */}
          {scan.ai_analysis.recommended_actions?.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                Recommended Actions
              </p>
              <ul className="list-disc space-y-1 pl-4 text-xs text-neutral-600 dark:text-neutral-400">
                {scan.ai_analysis.recommended_actions.map((action, idx) => (
                  <li key={idx}>{action}</li>
                ))}
              </ul>
            </div>
          )}

          {/* AI Contextual Findings */}
          {aiFindings.length > 0 && (
            <div className="space-y-2 pt-2">
              <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                Contextual Risks Identified
              </p>
              <div className="space-y-2">
                {aiFindings.map((f, idx) => (
                  <div
                    key={f.id || idx}
                    className="rounded-md border border-neutral-200 bg-white p-2.5 text-xs dark:border-neutral-700 dark:bg-neutral-800"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-medium text-neutral-900 dark:text-neutral-100">
                        {f.placeholder}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-neutral-500">
                          {CATEGORY_LABELS[f.category] ?? f.category}
                        </span>
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.5 text-[10px] font-medium capitalize",
                            SEVERITY_COLORS[f.severity] ?? "bg-neutral-100 text-neutral-700"
                          )}
                        >
                          {f.severity}
                        </span>
                      </div>
                    </div>
                    {f.reason && (
                      <p className="mt-1 text-neutral-600 dark:text-neutral-400">
                        {f.reason}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Deterministic Findings */}
      {groupedDetector.size > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
            Detected Sensitive Data
          </p>
          <ul className="space-y-1.5">
            {Array.from(groupedDetector.entries()).map(([cat, items]) => (
              <li key={cat} className="flex items-center justify-between text-sm">
                <span className="text-neutral-700 dark:text-neutral-300">
                  {CATEGORY_LABELS[cat] ?? cat}
                </span>
                <span className="font-medium tabular-nums text-neutral-900 dark:text-neutral-100">
                  {items.length}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Masked Safe Text */}
      {scan.masked_text !== undefined && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
              Safe Text
            </p>
            <button
              onClick={handleCopy}
              className="rounded-md border border-neutral-200 px-3 py-1 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
            >
              {copied ? "Copied" : "Copy safe text"}
            </button>
          </div>
          <textarea
            readOnly
            value={scan.masked_text}
            rows={6}
            className="w-full resize-none rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 font-mono text-xs text-neutral-700 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
          />
        </div>
      )}
    </div>
  );
}
