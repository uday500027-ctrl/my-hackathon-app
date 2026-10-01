"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface StatsData {
  totalScans: number;
  averageRisk: number;
  byRiskLevel: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  perDay: Array<{
    date: string;
    scans: number;
    avgRisk: number;
  }>;
  topCategories: Array<{
    category: string;
    count: number;
  }>;
  aiReviewedPercent: number;
  documentScans: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  email: "Email address",
  phone: "Phone number",
  aadhaar: "Aadhaar",
  pan: "PAN",
  upi_id: "UPI ID",
  card: "Payment card",
  api_key: "API keys",
  ip_address: "IP address",
  password: "Password",
  prompt_injection: "Prompt injection",
  confidential_business: "Confidential business",
  credential_in_prose: "Prose credentials",
  personal_data: "Personal data",
  custom_term: "Custom terms",
  other: "Other context",
};

const emptySubscribe = () => () => {};
function useIsMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

export default function InsightsPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const mounted = useIsMounted();

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    async function loadStats() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/stats");
        const json = await res.json();
        if (!res.ok) {
          setError(json.message || "Failed to load risk insights.");
          setLoading(false);
          return;
        }
        setStats(json.data);
      } catch {
        setError("Unable to connect to the server. Please check your connection.");
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, [refreshKey]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Insights
          </h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Aggregated patterns, risk severity trends, and detector statistics.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
            />
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="h-72 animate-pulse rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900" />
          <div className="h-72 animate-pulse rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Insights
          </h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Aggregated patterns, risk severity trends, and detector statistics.
          </p>
        </div>
        <div
          role="alert"
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400"
        >
          <div>
            <p className="font-medium">Failed to load statistics</p>
            <p className="mt-0.5 text-xs opacity-90">{error}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRefreshKey((k) => k + 1)}
            className="min-h-[40px] px-4 text-xs font-medium shrink-0"
          >
            Try again
          </Button>
        </div>
      </div>
    );
  }

  if (!stats || stats.totalScans === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Insights
          </h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Aggregated patterns, risk severity trends, and detector statistics.
          </p>
        </div>
        <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-12 text-center shadow-none dark:border-neutral-700 dark:bg-neutral-900">
          <h2 className="text-base font-semibold text-neutral-800 dark:text-neutral-200">
            Run your first scan to see insights
          </h2>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Once you perform text scans, risk trends, category breakdowns, and AI review percentages will appear here.
          </p>
          <Button asChild className="btn-accent mt-4 min-h-[40px] px-4 font-medium">
            <Link href="/dashboard">Run a scan</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Format perDay dates for XAxis (e.g. "Oct 1")
  const trendData = stats.perDay.map((d) => {
    const parts = d.date.split("-");
    const label = parts.length === 3 ? `${parseInt(parts[1], 10)}/${parseInt(parts[2], 10)}` : d.date;
    return {
      ...d,
      displayDate: label,
    };
  });

  // Format categories
  const categoriesData = stats.topCategories.map((c) => ({
    name: CATEGORY_LABELS[c.category] || c.category,
    count: c.count,
  }));

  const totalLevelScans =
    stats.byRiskLevel.low +
    stats.byRiskLevel.medium +
    stats.byRiskLevel.high +
    stats.byRiskLevel.critical || 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
          Insights
        </h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Aggregated patterns, risk severity trends, and detector statistics (last 30 days).
        </p>
      </div>

      {/* ── 4 Plain Stat Tiles ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="border-neutral-200 bg-white shadow-none dark:border-neutral-800 dark:bg-neutral-900">
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
              Total scans
            </CardDescription>
            <CardTitle className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
              {stats.totalScans}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-neutral-200 bg-white shadow-none dark:border-neutral-800 dark:bg-neutral-900">
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
              Average risk
            </CardDescription>
            <CardTitle className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
              {stats.averageRisk}
              <span className="text-xs font-normal text-neutral-400"> / 100</span>
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-neutral-200 bg-white shadow-none dark:border-neutral-800 dark:bg-neutral-900">
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
              Reviewed by AI
            </CardDescription>
            <CardTitle className="text-2xl font-semibold text-[#2f5e3e] dark:text-emerald-400">
              {stats.aiReviewedPercent}%
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-neutral-200 bg-white shadow-none dark:border-neutral-800 dark:bg-neutral-900">
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
              Document scans
            </CardDescription>
            <CardTitle className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
              {stats.documentScans}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* ── Charts Grid ───────────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Bar Chart: Average risk over last 14 days */}
        <Card className="border-neutral-200 bg-white shadow-none dark:border-neutral-800 dark:bg-neutral-900">
          <CardHeader className="p-5 pb-2">
            <CardTitle className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Average risk, last 14 days
            </CardTitle>
            <CardDescription className="text-xs text-neutral-500">
              Daily average risk score (0-100) for executed scans
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-3">
            <div className="h-64 w-full">
              {mounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                    <XAxis
                      dataKey="displayDate"
                      tick={{ fontSize: 11, fill: "#737373" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 11, fill: "#737373" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="rounded-md border border-neutral-200 bg-white p-2.5 shadow-xs text-xs dark:border-neutral-800 dark:bg-neutral-950">
                              <p className="font-medium text-neutral-700 dark:text-neutral-300">{data.date}</p>
                              <p className="mt-1 text-neutral-600 dark:text-neutral-400">
                                Scans: <span className="font-semibold text-neutral-900 dark:text-neutral-100">{data.scans}</span>
                              </p>
                              <p className="text-neutral-600 dark:text-neutral-400">
                                Avg risk: <span className="font-semibold text-[#2f5e3e]">{data.avgRisk}</span>
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar
                      dataKey="avgRisk"
                      fill="#2f5e3e"
                      radius={[3, 3, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Horizontal Bar Chart: Most common categories */}
        <Card className="border-neutral-200 bg-white shadow-none dark:border-neutral-800 dark:bg-neutral-900">
          <CardHeader className="p-5 pb-2">
            <CardTitle className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Most common categories
            </CardTitle>
            <CardDescription className="text-xs text-neutral-500">
              Top detected sensitive item categories across your scans
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-3">
            <div className="h-64 w-full">
              {mounted && categoriesData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={categoriesData}
                    layout="vertical"
                    margin={{ top: 5, right: 20, left: 35, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e5e5" />
                    <XAxis
                      type="number"
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: "#737373" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      tick={{ fontSize: 11, fill: "#525252" }}
                      axisLine={false}
                      tickLine={false}
                      width={90}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="rounded-md border border-neutral-200 bg-white p-2 text-xs shadow-xs dark:border-neutral-800 dark:bg-neutral-950">
                              <p className="font-semibold text-neutral-900 dark:text-neutral-100">{data.name}</p>
                              <p className="mt-0.5 text-neutral-600 dark:text-neutral-400">
                                Detected: <span className="font-medium text-[#2f5e3e]">{data.count}</span>
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar
                      dataKey="count"
                      fill="#2f5e3e"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-neutral-400">
                  No sensitive categories detected yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Breakdown by Risk Level ───────────────────────────────────────── */}
      <Card className="border-neutral-200 bg-white shadow-none dark:border-neutral-800 dark:bg-neutral-900">
        <CardHeader className="p-5 pb-3">
          <CardTitle className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Breakdown by risk level
          </CardTitle>
          <CardDescription className="text-xs text-neutral-500">
            Distribution of risk severities over the last 30 days
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3.5 dark:border-neutral-800 dark:bg-neutral-950">
              <div className="flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-400">
                <span className="font-medium">Low risk</span>
                <span>{Math.round((stats.byRiskLevel.low / totalLevelScans) * 100)}%</span>
              </div>
              <div className="mt-2 text-xl font-semibold text-neutral-800 dark:text-neutral-200">
                {stats.byRiskLevel.low}
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                <div
                  className="h-full bg-neutral-400"
                  style={{ width: `${(stats.byRiskLevel.low / totalLevelScans) * 100}%` }}
                />
              </div>
            </div>

            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3.5 dark:border-neutral-800 dark:bg-neutral-950">
              <div className="flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-400">
                <span className="font-medium">Medium risk</span>
                <span>{Math.round((stats.byRiskLevel.medium / totalLevelScans) * 100)}%</span>
              </div>
              <div className="mt-2 text-xl font-semibold text-neutral-800 dark:text-neutral-200">
                {stats.byRiskLevel.medium}
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                <div
                  className="h-full bg-neutral-500"
                  style={{ width: `${(stats.byRiskLevel.medium / totalLevelScans) * 100}%` }}
                />
              </div>
            </div>

            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3.5 dark:border-neutral-800 dark:bg-neutral-950">
              <div className="flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-400">
                <span className="font-medium">High risk</span>
                <span>{Math.round((stats.byRiskLevel.high / totalLevelScans) * 100)}%</span>
              </div>
              <div className="mt-2 text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                {stats.byRiskLevel.high}
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                <div
                  className="h-full bg-neutral-700 dark:bg-neutral-400"
                  style={{ width: `${(stats.byRiskLevel.high / totalLevelScans) * 100}%` }}
                />
              </div>
            </div>

            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3.5 dark:border-neutral-800 dark:bg-neutral-950">
              <div className="flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-400">
                <span className="font-medium">Critical risk</span>
                <span>{Math.round((stats.byRiskLevel.critical / totalLevelScans) * 100)}%</span>
              </div>
              <div className="mt-2 text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                {stats.byRiskLevel.critical}
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                <div
                  className="h-full bg-neutral-900 dark:bg-neutral-100"
                  style={{ width: `${(stats.byRiskLevel.critical / totalLevelScans) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
