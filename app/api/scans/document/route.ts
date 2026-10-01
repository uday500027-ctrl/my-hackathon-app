import "server-only";
import { getSession } from "@/lib/auth";
import { supabase } from "@/lib/supabase-server";
import { runDocumentScan } from "@/lib/scan-pipeline";
import { extractText } from "@/lib/document-extract";
import { ok, fail, withErrorHandler } from "@/lib/api";
import { z } from "zod";
import type { Category } from "@/lib/detectors";
import type { Destination } from "@/lib/risk";

export const maxDuration = 30;
export const runtime = "nodejs";

const DESTINATIONS = ["ai_chatbot", "email_external", "public_post", "internal_chat"] as const;

const formSchema = z.object({
  destination: z.enum(DESTINATIONS),
  policy_id: z.string().uuid().optional(),
});

// ─── POST /api/scans/document ─────────────────────────────────────────────────

async function postHandler(req: Request): Promise<Response> {
  const session = await getSession();
  if (!session) return fail("unauthorized", "Not authenticated.", 401);

  // Parse multipart form data
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return fail("invalid_request", "Could not parse the uploaded file.", 400);
  }

  const fileField = formData.get("file");
  if (!fileField || !(fileField instanceof File)) {
    return fail("invalid_request", "A file is required.", 400);
  }

  const file = fileField as File;

  // Size check early (before extraction)
  if (file.size > 4 * 1024 * 1024) {
    return fail("too_large", "File is too large. Maximum allowed size is 4 MB.", 413);
  }

  // Validate destination and policy_id
  const rawFields = {
    destination: formData.get("destination"),
    policy_id: formData.get("policy_id") || undefined,
  };
  const parsed = formSchema.safeParse(rawFields);
  if (!parsed.success) {
    return Response.json(
      {
        ok: false,
        code: "validation_error",
        message: "Please fix the errors below.",
        errors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const { destination, policy_id } = parsed.data;

  // ── Rate limit: max 10 scans in the last 60 seconds ───────────────────────
  const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();
  const { count, error: countError } = await supabase
    .from("scans")
    .select("*", { count: "exact", head: true })
    .eq("user_id", session.userId)
    .gte("created_at", oneMinuteAgo);

  if (countError) {
    console.error("[scans/document POST] rate limit count error:", countError.code);
    return fail("internal_error", "Something went wrong. Please try again.", 500);
  }

  if ((count ?? 0) >= 10) {
    return fail(
      "rate_limited",
      "You have reached the limit of 10 scans per minute. Please wait before scanning again.",
      429
    );
  }

  // ── Extract text from file ────────────────────────────────────────────────
  const extractResult = await extractText(file);
  if (!extractResult.ok) {
    // 422 for no text, 400 for invalid file type
    const status =
      extractResult.message.includes("No selectable text") ? 422 : 400;
    return fail("invalid_file", extractResult.message, status);
  }

  const { text, truncated, pageCount } = extractResult;

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
      console.error("[scans/document POST] policy load error:", error.code);
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
      console.error("[scans/document POST] default policy load error:", error.code);
      return fail("internal_error", "Something went wrong. Please try again.", 500);
    }
    if (!data)
      return fail(
        "not_found",
        "No default policy found. Please create a policy first.",
        404
      );
    policy = data;
  }

  // ── Run document scan pipeline (raw text NEVER stored or logged) ──────────
  const result = await runDocumentScan({
    text,
    destination: destination as Destination,
    policy: {
      enabled_categories: policy.enabled_categories as Category[],
      custom_terms: policy.custom_terms ?? [],
      strictness: policy.strictness as "relaxed" | "balanced" | "strict",
    },
    truncated,
  });

  // Title: file name truncated to 80 chars, extension kept
  const rawName = file.name;
  let title = rawName;
  if (rawName.length > 80) {
    const dot = rawName.lastIndexOf(".");
    const ext = dot !== -1 ? rawName.slice(dot) : "";
    const maxBase = Math.max(1, 80 - ext.length - 3);
    title = `${rawName.slice(0, maxBase)}...${ext}`;
  }

  // ── Persist scan — only masked_text, findings, metadata; never raw text ───
  const { data: scan, error: insertError } = await supabase
    .from("scans")
    .insert({
      user_id: session.userId,
      policy_id: policy.id,
      title,
      destination,
      masked_text: result.maskedText,
      findings: result.findings,
      ai_status: result.ai_status,
      ai_analysis: result.ai_analysis,
      risk_score: result.riskScore,
      risk_level: result.riskLevel,
      source: "document",
      verdict: result.verdict,
    })
    .select()
    .single();

  if (insertError) {
    console.error("[scans/document POST] insert error:", insertError.code);
    return fail("internal_error", "Something went wrong. Please try again.", 500);
  }

  return ok({
    ...scan,
    truncated: result.truncated,
    ...(pageCount !== undefined ? { pageCount } : {}),
    ...(result.ai_notice ? { ai_notice: result.ai_notice } : {}),
  });
}

export const POST = withErrorHandler(postHandler);
