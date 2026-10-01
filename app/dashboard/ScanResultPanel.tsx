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

  // Group findings by category
  const grouped = new Map<string, typeof scan.findings>();
  for (const f of scan.findings) {
    if (!grouped.has(f.category)) grouped.set(f.category, []);
    grouped.get(f.category)!.push(f);
  }

  return (
    <div className="mt-6 space-y-5 rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
      {/* Header */}
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

      {/* Findings by category */}
      {grouped.size > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
            Findings
          </p>
          <ul className="space-y-1.5">
            {Array.from(grouped.entries()).map(([cat, items]) => (
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

      {/* Masked text */}
      {scan.masked_text !== undefined && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
              Safe text
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
            className="w-full resize-none rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 font-mono text-xs text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
          />
        </div>
      )}
    </div>
  );
}
