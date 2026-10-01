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
import { DESTINATION_LABELS } from "@/app/dashboard/scan-types";

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
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          Scan history
        </h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Your past scans, newest first.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400"
        >
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={destination} onValueChange={(v) => { setDestination(v); setPage(1); }}>
          <SelectTrigger className="w-44">
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
          <SelectTrigger className="w-40">
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

      {/* List */}
      {loading ? (
        <p className="py-12 text-center text-sm text-neutral-400">Loading…</p>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-neutral-200 bg-white px-6 py-16 text-center dark:border-neutral-800 dark:bg-neutral-900">
          <p className="text-sm font-medium text-neutral-500">No scans yet</p>
          <p className="mt-1 text-sm text-neutral-400">
            Head to{" "}
            <Link href="/dashboard" className="underline underline-offset-4 hover:text-neutral-700">
              Scan
            </Link>{" "}
            to run your first check.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const label =
              item.title ??
              (item.findings.length > 0
                ? `${item.findings.length} finding${item.findings.length > 1 ? "s" : ""}`
                : "No findings");

            return (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white px-5 py-4 dark:border-neutral-800 dark:bg-neutral-900"
              >
                <div className="min-w-0 flex-1 space-y-0.5">
                  <Link
                    href={`/dashboard/history/${item.id}`}
                    className="block truncate text-sm font-medium text-neutral-900 hover:underline dark:text-neutral-100"
                  >
                    {label}
                  </Link>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-400">
                    <span>{formatDate(item.created_at)}</span>
                    <span>&middot;</span>
                    <span>{DESTINATION_LABELS[item.destination] ?? item.destination}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <RiskBadge level={item.risk_level} />

                  {confirmId === item.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-neutral-500">Delete?</span>
                      <button
                        onClick={() => handleDelete(item.id)}
                        disabled={deletingId === item.id}
                        className="rounded-md border border-red-300 px-2.5 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950 disabled:opacity-50"
                      >
                        {deletingId === item.id ? "Deleting…" : "Confirm"}
                      </button>
                      <button
                        onClick={() => setConfirmId(null)}
                        className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-400"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmId(item.id)}
                      className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs font-medium text-neutral-500 transition-colors hover:border-red-300 hover:text-red-600 dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-red-800 dark:hover:text-red-400"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg border border-neutral-300 px-4 py-1.5 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 disabled:opacity-40 dark:border-neutral-700 dark:text-neutral-400"
          >
            Previous
          </button>
          <span className="text-sm text-neutral-500">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-lg border border-neutral-300 px-4 py-1.5 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 disabled:opacity-40 dark:border-neutral-700 dark:text-neutral-400"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
