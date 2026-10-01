import { getSession } from "@/lib/auth";
import { supabase } from "@/lib/supabase-server";
import { runScan } from "@/lib/scan-pipeline";
import { ok, fail, withErrorHandler } from "@/lib/api";
import { z } from "zod";
import type { Category } from "@/lib/detectors";
import type { Destination } from "@/lib/risk";

const DESTINATIONS = ["ai_chatbot", "email_external", "public_post", "internal_chat"] as const;

const postSchema = z.object({
  text: z.string().min(1, "Text is required").max(8000, "Text must be at most 8000 characters"),
  destination: z.enum(DESTINATIONS),
  title: z.string().max(80).optional(),
  policy_id: z.string().uuid().optional(),
});

const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(20).default(20),
  destination: z.enum(DESTINATIONS).optional(),
  risk_level: z.enum(["low", "medium", "high", "critical"]).optional(),
});

export const maxDuration = 30;

// ─── POST /api/scans ──────────────────────────────────────────────────────────

async function postHandler(req: Request): Promise<Response> {
  const session = await getSession();
  if (!session) return fail("unauthorized", "Not authenticated.", 401);

  // Parse body without logging it
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return fail("invalid_json", "Invalid request body.", 400);
  }

  const parsed = postSchema.safeParse(rawBody);
  if (!parsed.success) {
    return Response.json(
      { ok: false, code: "validation_error", message: "Please fix the errors below.", errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { text, destination, title, policy_id } = parsed.data;

  // ── Rate limit: max 10 scans in the last 60 seconds ───────────────────────
  const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();
  const { count, error: countError } = await supabase
    .from("scans")
    .select("*", { count: "exact", head: true })
    .eq("user_id", session.userId)
    .gte("created_at", oneMinuteAgo);

  if (countError) {
    console.error("[scans POST] rate limit count error:", countError.code);
    return fail("internal_error", "Something went wrong. Please try again.", 500);
  }

  if ((count ?? 0) >= 10) {
    return fail("rate_limited", "You have reached the limit of 10 scans per minute. Please wait before scanning again.", 429);
  }

  // ── Load policy ───────────────────────────────────────────────────────────
  let policy;
  if (policy_id) {
    const { data, error } = await supabase
      .from("policies")
      .select("id, enabled_categories, custom_terms, strictness")
      .eq("id", policy_id)
      .eq("user_id", session.userId)
      .maybeSingle();

    if (error) {
      console.error("[scans POST] policy load error:", error.code);
      return fail("internal_error", "Something went wrong. Please try again.", 500);
    }
    if (!data) return fail("not_found", "Policy not found.", 404);
    policy = data;
  } else {
    const { data, error } = await supabase
      .from("policies")
      .select("id, enabled_categories, custom_terms, strictness")
      .eq("user_id", session.userId)
      .eq("is_default", true)
      .maybeSingle();

    if (error) {
      console.error("[scans POST] default policy load error:", error.code);
      return fail("internal_error", "Something went wrong. Please try again.", 500);
    }
    if (!data) return fail("not_found", "No default policy found. Please create a policy first.", 404);
    policy = data;
  }

  // ── Run pipeline (raw text is NEVER logged or stored) ────────────────────
  const result = await runScan(text, destination as Destination, {
    enabled_categories: policy.enabled_categories as Category[],
    custom_terms: policy.custom_terms ?? [],
    strictness: policy.strictness as "relaxed" | "balanced" | "strict",
  });

  // ── Persist scan (only masked_text and findings, never raw text) ──────────
  const { data: scan, error: insertError } = await supabase
    .from("scans")
    .insert({
      user_id: session.userId,
      policy_id: policy.id,
      title: title ?? null,
      destination,
      masked_text: result.maskedText,
      findings: result.findings,
      ai_status: result.ai_status,
      ai_analysis: result.ai_analysis,
      risk_score: result.riskScore,
      risk_level: result.riskLevel,
    })
    .select()
    .single();

  if (insertError) {
    console.error("[scans POST] insert error:", insertError.code);
    return fail("internal_error", "Something went wrong. Please try again.", 500);
  }

  return ok({
    ...scan,
    ...(result.ai_notice ? { ai_notice: result.ai_notice } : {}),
  });
}

// ─── GET /api/scans ───────────────────────────────────────────────────────────

async function getHandler(req: Request): Promise<Response> {
  const session = await getSession();
  if (!session) return fail("unauthorized", "Not authenticated.", 401);

  const url = new URL(req.url);
  const queryParams = Object.fromEntries(url.searchParams);
  const parsed = listSchema.safeParse(queryParams);
  if (!parsed.success) {
    return Response.json(
      { ok: false, code: "validation_error", message: "Invalid query parameters.", errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { page, limit, destination, risk_level } = parsed.data;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // Don't select masked_text in the list view
  let query = supabase
    .from("scans")
    .select(
      "id, user_id, policy_id, title, destination, findings, ai_status, risk_score, risk_level, source, verdict, created_at",
      { count: "exact" }
    )
    .eq("user_id", session.userId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (destination) query = query.eq("destination", destination);
  if (risk_level) query = query.eq("risk_level", risk_level);

  const { data, error, count } = await query;

  if (error) {
    console.error("[scans GET] query error:", error.code);
    return fail("internal_error", "Something went wrong. Please try again.", 500);
  }

  return ok({ items: data, page, limit, total: count ?? 0 });
}

export const POST = withErrorHandler(postHandler);
export const GET = withErrorHandler(getHandler);
