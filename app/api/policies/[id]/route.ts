import { getSession } from "@/lib/auth";
import { supabase } from "@/lib/supabase-server";
import { ok, fail, withErrorHandler } from "@/lib/api";
import { updatePolicySchema } from "@/lib/validation";

// ─── GET /api/policies/[id] ───────────────────────────────────────────────────

async function getHandler(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const session = await getSession();
  if (!session) return fail("unauthorized", "Not authenticated.", 401);

  const { id } = await params;

  const { data, error } = await supabase
    .from("policies")
    .select("*")
    .eq("id", id)
    .eq("user_id", session.userId)
    .maybeSingle();

  if (error) {
    console.error("[policies/[id] GET] error:", error.code);
    return fail("internal_error", "Something went wrong. Please try again.", 500);
  }

  if (!data) return fail("not_found", "Policy not found.", 404);

  return ok(data);
}

// ─── PATCH /api/policies/[id] ─────────────────────────────────────────────────

async function patchHandler(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const session = await getSession();
  if (!session) return fail("unauthorized", "Not authenticated.", 401);

  const { id } = await params;

  // Verify ownership
  const { data: existing, error: findError } = await supabase
    .from("policies")
    .select("id, is_default")
    .eq("id", id)
    .eq("user_id", session.userId)
    .maybeSingle();

  if (findError) {
    console.error("[policies/[id] PATCH find] error:", findError.code);
    return fail("internal_error", "Something went wrong. Please try again.", 500);
  }

  if (!existing) return fail("not_found", "Policy not found.", 404);

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return fail("invalid_json", "Invalid request body.", 400);
  }

  const parsed = updatePolicySchema.safeParse(rawBody);
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

  const updates = parsed.data;

  // If setting this policy to default, unset previous default first
  if (updates.is_default === true) {
    const { error: unsetError } = await supabase
      .from("policies")
      .update({ is_default: false })
      .eq("user_id", session.userId)
      .eq("is_default", true)
      .neq("id", id);

    if (unsetError) {
      console.error("[policies/[id] PATCH unset default] error:", unsetError.code);
      return fail("internal_error", "Something went wrong. Please try again.", 500);
    }
  }

  const { data: updated, error: updateError } = await supabase
    .from("policies")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", session.userId)
    .select()
    .single();

  if (updateError) {
    console.error("[policies/[id] PATCH update] error:", updateError.code);
    return fail("internal_error", "Something went wrong. Please try again.", 500);
  }

  return ok(updated);
}

// ─── DELETE /api/policies/[id] ────────────────────────────────────────────────

async function deleteHandler(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const session = await getSession();
  if (!session) return fail("unauthorized", "Not authenticated.", 401);

  const { id } = await params;

  // Check policy ownership and default status
  const { data: existing, error: findError } = await supabase
    .from("policies")
    .select("id, is_default")
    .eq("id", id)
    .eq("user_id", session.userId)
    .maybeSingle();

  if (findError) {
    console.error("[policies/[id] DELETE find] error:", findError.code);
    return fail("internal_error", "Something went wrong. Please try again.", 500);
  }

  if (!existing) return fail("not_found", "Policy not found.", 404);

  // Must refuse deleting the default policy
  if (existing.is_default) {
    return fail(
      "cannot_delete_default",
      "Choose another default policy first",
      400
    );
  }

  const { error: deleteError } = await supabase
    .from("policies")
    .delete()
    .eq("id", id)
    .eq("user_id", session.userId);

  if (deleteError) {
    console.error("[policies/[id] DELETE] error:", deleteError.code);
    return fail("internal_error", "Something went wrong. Please try again.", 500);
  }

  return ok({ deleted: true });
}

export const GET = withErrorHandler(getHandler);
export const PATCH = withErrorHandler(patchHandler);
export const DELETE = withErrorHandler(deleteHandler);
