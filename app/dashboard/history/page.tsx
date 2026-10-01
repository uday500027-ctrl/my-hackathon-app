"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RiskBadge } from "@/app/dashboard/ScanResultPanel";
import type { ScanRecord } from "@/app/dashboard/scan-types";
import { DESTINATION_LABELS, VERDICT_LABELS } from "@/app/dashboard/scan-types";
import type { Verdict } from "@/app/dashboard/scan-types";

const DESTINATIONS = ["ai_chatbot", "email_external", "public_post", "internal_chat"] as const;
const RISK_LEVELS = ["low", "medium", "high", "critical"] as const;

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function HistoryPage() {
  const [items, setItems] = useState<ScanRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [destination, setDestination] = useState<string>("all");
  const [riskLevel, setRiskLevel] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const LIMIT = 10;
  // Use a ref so handleDelete can read the latest setter without going into deps
  const triggerRefresh = useRef(() => setRefreshKey((k) => k + 1));

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
        if (destination !== "all") params.set("destination", destination);
        if (riskLevel !== "all") params.set("risk_level", riskLevel);

        const res = await fetch(`/api/scans?${params}`);
        const data = await res.json();
        if (cancelled) return;

        if (!res.ok) {
          setError(data.message ?? "Failed to load history.");
        } else {
          setItems(data.data.items);
          setTotal(data.data.total);
        }
      } catch {
        if (!cancelled) setError("Could not connect to the server.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [page, destination, riskLevel, refreshKey]);

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/scans/${id}`, { method: "DELETE" });
      if (res.ok) {
        triggerRefresh.current();
      } else {
        const d = await res.json();
        setError(d.message ?? "Failed to delete.");
      }
    } catch {
      setError("Could not connect to the server.");
    } finally {
      setDeletingId(null);
      setConfirmId(null);
    }
  }

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
          Scan history
        </h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Your past scans, newest first.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400"
        >
          <p>Failed to load scan history. Please try again.</p>
          <button
            type="button"
            onClick={() => triggerRefresh.current()}
            className="inline-flex min-h-[40px] items-center justify-center rounded-lg border border-red-300 bg-white px-3.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f5e3e] focus-visible:ring-offset-2 shrink-0 dark:border-red-800 dark:bg-neutral-900 dark:text-red-400"
          >
            Try again
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={destination} onValueChange={(v) => { setDestination(v); setPage(1); }}>
          <SelectTrigger className="w-44 min-h-[40px]">
            <SelectValue placeholder="Destination" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All destinations</SelectItem>
            {DESTINATIONS.map((d) => (
              <SelectItem key={d} value={d}>{DESTINATION_LABELS[d]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={riskLevel} onValueChange={(v) => { setRiskLevel(v); setPage(1); }}>
          <SelectTrigger className="w-40 min-h-[40px]">
            <SelectValue placeholder="Risk level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All risk levels</SelectItem>
            {RISK_LEVELS.map((r) => (
              <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-neutral-200 bg-white px-6 py-14 text-center shadow-none dark:border-neutral-800 dark:bg-neutral-900">
          <p className="text-base font-semibold text-neutral-800 dark:text-neutral-200">No scans yet</p>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Head to Scan to run your first check before sending text or documents.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex min-h-[40px] items-center justify-center rounded-lg bg-[#2f5e3e] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#245032] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f5e3e] focus-visible:ring-offset-2 mt-4"
          >
            Run a scan
          </Link>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-none dark:border-neutral-800 dark:bg-neutral-900">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50/80 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:border-neutral-800 dark:bg-neutral-800/60 dark:text-neutral-400">
                <tr>
                  <th className="px-5 py-3">Scan / Title</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Destination</th>
                  <th className="px-4 py-3">Risk</th>
                  <th className="px-4 py-3">Verdict</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {items.map((item) => {
                  const label =
                    item.title ??
                    (item.findings.length > 0
                      ? `${item.findings.length} finding${item.findings.length > 1 ? "s" : ""}`
                      : "No findings");

                  return (
                    <tr key={item.id} className="transition-colors hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30">
                      <td className="px-5 py-3.5 max-w-[220px]">
                        <Link
                          href={`/dashboard/history/${item.id}`}
                          className="font-medium text-neutral-900 hover:underline truncate block dark:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f5e3e] rounded"
                        >
                          {label}
                        </Link>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                          {item.source === "document" ? "Document" : "Text"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-neutral-600 dark:text-neutral-300">
                        {DESTINATION_LABELS[item.destination] ?? item.destination}
                      </td>
                      <td className="px-4 py-3.5">
                        <RiskBadge level={item.risk_level} />
                      </td>
                      <td className="px-4 py-3.5">
                        {item.source === "document" && item.verdict ? (
                          <span
                            className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
                              item.verdict === "safe"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                                : item.verdict === "redact_first"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                                : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
                            }`}
                          >
                            {VERDICT_LABELS[item.verdict as Verdict]}
                          </span>
                        ) : (
                          <span className="text-neutral-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-neutral-500 whitespace-nowrap">
                        {formatDate(item.created_at)}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {confirmId === item.id ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => handleDelete(item.id)}
                              disabled={deletingId === item.id}
                              className="inline-flex min-h-[36px] items-center rounded-md border border-red-300 bg-white px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f5e3e] focus-visible:ring-offset-2 disabled:opacity-50 dark:border-red-800 dark:bg-neutral-900 dark:text-red-400"
                            >
                              {deletingId === item.id ? "…" : "Confirm"}
                            </button>
                            <button
                              onClick={() => setConfirmId(null)}
                              className="inline-flex min-h-[36px] items-center rounded-md border border-neutral-300 bg-white px-2.5 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f5e3e] focus-visible:ring-offset-2 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmId(item.id)}
                            className="inline-flex min-h-[36px] items-center rounded-md border border-neutral-300 bg-white px-3 py-1 text-xs font-medium text-neutral-600 transition-colors hover:border-red-300 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f5e3e] focus-visible:ring-offset-2 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:border-red-800 dark:hover:text-red-400"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Stacked Cards View */}
          <div className="block md:hidden space-y-3">
            {items.map((item) => {
              const label =
                item.title ??
                (item.findings.length > 0
                  ? `${item.findings.length} finding${item.findings.length > 1 ? "s" : ""}`
                  : "No findings");

              return (
                <div
                  key={item.id}
                  className="rounded-xl border border-neutral-200 bg-white p-4 shadow-none space-y-3 dark:border-neutral-800 dark:bg-neutral-900"
                >
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/dashboard/history/${item.id}`}
                      className="font-medium text-sm text-neutral-900 hover:underline line-clamp-2 dark:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f5e3e] rounded"
                    >
                      {label}
                    </Link>
                    <RiskBadge level={item.risk_level} />
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                    <span className="inline-flex items-center rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                      {item.source === "document" ? "Document" : "Text"}
                    </span>
                    <span>&middot;</span>
                    <span>{DESTINATION_LABELS[item.destination] ?? item.destination}</span>
                    <span>&middot;</span>
                    <span>{formatDate(item.created_at)}</span>
                  </div>

                  {item.source === "document" && item.verdict && (
                    <div className="pt-1">
                      <span
                        className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
                          item.verdict === "safe"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                            : item.verdict === "redact_first"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                            : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
                        }`}
                      >
                        Verdict: {VERDICT_LABELS[item.verdict as Verdict]}
                      </span>
                    </div>
                  )}

                  <div className="border-t border-neutral-100 pt-2 flex justify-end dark:border-neutral-800">
                    {confirmId === item.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-neutral-500">Delete?</span>
                        <button
                          onClick={() => handleDelete(item.id)}
                          disabled={deletingId === item.id}
                          className="inline-flex min-h-[40px] items-center rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f5e3e] focus-visible:ring-offset-2 disabled:opacity-50 dark:border-red-800 dark:bg-neutral-900 dark:text-red-400"
                        >
                          {deletingId === item.id ? "Deleting…" : "Confirm"}
                        </button>
                        <button
                          onClick={() => setConfirmId(null)}
                          className="inline-flex min-h-[40px] items-center rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f5e3e] focus-visible:ring-offset-2 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmId(item.id)}
                        className="inline-flex min-h-[40px] items-center rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:border-red-300 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f5e3e] focus-visible:ring-offset-2 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:border-red-800 dark:hover:text-red-400"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="inline-flex min-h-[40px] items-center justify-center rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f5e3e] focus-visible:ring-offset-2 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
          >
            Previous
          </button>
          <span className="text-sm text-neutral-500">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="inline-flex min-h-[40px] items-center justify-center rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f5e3e] focus-visible:ring-offset-2 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
