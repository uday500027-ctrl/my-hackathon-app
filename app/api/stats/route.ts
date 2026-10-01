import { getSession } from "@/lib/auth";
import { supabase } from "@/lib/supabase-server";
import { ok, fail, withErrorHandler } from "@/lib/api";

// ─── GET /api/stats ───────────────────────────────────────────────────────────

async function getHandler(): Promise<Response> {
  const session = await getSession();
  if (!session) return fail("unauthorized", "Not authenticated.", 401);

  // 30 days ago filter
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Select only aggregate-relevant columns — never masked_text
  const { data: scans, error } = await supabase
    .from("scans")
    .select("created_at, risk_score, risk_level, findings, ai_status, source, verdict")
    .eq("user_id", session.userId)
    .gte("created_at", thirtyDaysAgo)
    .order("created_at", { ascending: false })
    .limit(1000);

  if (error) {
    console.error("[stats GET] error:", error.code);
    return fail("internal_error", "Something went wrong. Please try again.", 500);
  }

  const scanList = scans ?? [];
  const totalScans = scanList.length;

  const totalRisk = scanList.reduce((sum, s) => sum + (s.risk_score || 0), 0);
  const averageRisk = totalScans > 0 ? Math.round(totalRisk / totalScans) : 0;

  const byRiskLevel = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };

  let aiReviewedCount = 0;
  const categoryCounts = new Map<string, number>();

  // Map for the last 14 days (with zero-filled gaps)
  const perDayMap = new Map<string, { scans: number; totalRisk: number }>();
  const days: string[] = [];
  const now = new Date();

  // Create 14 chronological date buckets from 13 days ago up to today
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().slice(0, 10);
    days.push(dateStr);
    perDayMap.set(dateStr, { scans: 0, totalRisk: 0 });
  }

  for (const s of scanList) {
    // Risk level counts
    if (s.risk_level in byRiskLevel) {
      byRiskLevel[s.risk_level as keyof typeof byRiskLevel] += 1;
    }

    // AI reviewed count
    if (s.ai_status === "ok") {
      aiReviewedCount += 1;
    }

    // Aggregate findings by category only
    const findingsList = Array.isArray(s.findings) ? s.findings : [];
    for (const f of findingsList) {
      if (f && typeof f === "object" && typeof f.category === "string") {
        categoryCounts.set(f.category, (categoryCounts.get(f.category) || 0) + 1);
      }
    }

    // Per day aggregation for last 14 days
    const scanDate = typeof s.created_at === "string" ? s.created_at.slice(0, 10) : "";
    const dayEntry = perDayMap.get(scanDate);
    if (dayEntry) {
      dayEntry.scans += 1;
      dayEntry.totalRisk += s.risk_score || 0;
    }
  }

  const documentScans = scanList.filter((s) => s.source === "document").length;

  const aiReviewedPercent =
    totalScans > 0 ? Math.round((aiReviewedCount / totalScans) * 100) : 0;

  const perDay = days.map((date) => {
    const entry = perDayMap.get(date)!;
    return {
      date,
      scans: entry.scans,
      avgRisk: entry.scans > 0 ? Math.round(entry.totalRisk / entry.scans) : 0,
    };
  });

  const topCategories = Array.from(categoryCounts.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  return ok({
    totalScans,
    averageRisk,
    byRiskLevel,
    perDay,
    topCategories,
    aiReviewedPercent,
    documentScans,
  });
}

export const GET = withErrorHandler(getHandler);
