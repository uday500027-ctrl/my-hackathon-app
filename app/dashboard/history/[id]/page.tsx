import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase-server";
import { ScanResultPanel } from "@/app/dashboard/ScanResultPanel";
import { DESTINATION_LABELS } from "@/app/dashboard/scan-types";
import Link from "next/link";
import type { ScanRecord } from "@/app/dashboard/scan-types";

export default async function ScanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;

  const { data: scan, error } = await supabase
    .from("scans")
    .select("*")
    .eq("id", id)
    .eq("user_id", session.userId)
    .maybeSingle();

  if (error || !scan) {
    return (
      <div className="space-y-4">
        <Link
          href="/dashboard/history"
          className="text-sm text-neutral-500 hover:underline"
        >
          &larr; Back to history
        </Link>
        <p className="text-sm text-neutral-500">Scan not found.</p>
      </div>
    );
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/dashboard/history"
          className="inline-flex min-h-[40px] items-center text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f5e3e] focus-visible:ring-offset-2 rounded dark:text-neutral-400 dark:hover:text-neutral-200"
        >
          &larr; Back to history
        </Link>
      </div>

      <div>
        <h1 className="font-serif text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
          {scan.title ?? "Scan result"}
        </h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          {formatDate(scan.created_at)} &middot;{" "}
          {DESTINATION_LABELS[scan.destination as string] ?? scan.destination}
        </p>
      </div>

      <ScanResultPanel
        scan={scan as ScanRecord}
        destinationLabel={DESTINATION_LABELS[scan.destination as string] ?? scan.destination}
      />
    </div>
  );
}
