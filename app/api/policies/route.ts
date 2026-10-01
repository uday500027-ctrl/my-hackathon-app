import { getSession } from "@/lib/auth";
import { supabase } from "@/lib/supabase-server";
import { ok, fail, withErrorHandler } from "@/lib/api";
import { createPolicySchema } from "@/lib/validation";

// ─── GET /api/policies ────────────────────────────────────────────────────────

async function getHandler(): Promise<Response> {
  const session = await getSession();
  if (!session) return fail("unauthorized", "Not authenticated.", 401);

  const { data, error } = await supabase
    .from("policies")
    .select("*")
    .eq("user_id", session.userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[policies GET] error:", error.code);
    return fail("internal_error", "Something went wrong. Please try again.", 500);
  }

  return ok(data ?? []);
}

// ─── POST /api/policies ───────────────────────────────────────────────────────

async function postHandler(req: Request): Promise<Response> {
  const session = await getSession();
  if (!session) return fail("unauthorized", "Not authenticated.", 401);

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return fail("invalid_json", "Invalid request body.", 400);
  }

  const parsed = createPolicySchema.safeParse(rawBody);
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

  // Check policy limit: max 10 per user
  const { count, error: countError } = await supabase
    .from("policies")
    .select("id", { count: "exact", head: true })
    .eq("user_id", session.userId);

  if (countError) {
    console.error("[policies POST] count error:", countError.code);
    return fail("internal_error", "Something went wrong. Please try again.", 500);
  }

  if ((count ?? 0) >= 10) {
    return fail(
      "policy_limit_reached",
      "You have reached the limit of 10 policies. Please remove an unused policy before adding a new one.",
      400
    );
  }

  const { name, enabled_categories, custom_terms, strictness, is_default } = parsed.data;

  // If this policy is set to default, first unset user's current default
  if (is_default) {
    const { error: unsetError } = await supabase
      .from("policies")
      .update({ is_default: false })
      .eq("user_id", session.userId)
      .eq("is_default", true);

    if (unsetError) {
      console.error("[policies POST] unset default error:", unsetError.code);
      return fail("internal_error", "Something went wrong. Please try again.", 500);
    }
  }

  const { data: newPolicy, error: insertError } = await supabase
    .from("policies")
    .insert({
      user_id: session.userId,
      name,
      enabled_categories,
      custom_terms,
      strictness,
      is_default,
    })
    .select()
    .single();

  if (insertError) {
    console.error("[policies POST] insert error:", insertError.code);
    return fail("internal_error", "Something went wrong. Please try again.", 500);
  }

  return ok(newPolicy);
}

export const GET = withErrorHandler(getHandler);
export const POST = withErrorHandler(postHandler);
