import { getSession } from "@/lib/auth";
import { supabase } from "@/lib/supabase-server";
import { ok, fail, withErrorHandler } from "@/lib/api";

// ─── GET /api/scans/[id] ──────────────────────────────────────────────────────

async function getHandler(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const session = await getSession();
  if (!session) return fail("unauthorized", "Not authenticated.", 401);

  const { id } = await params;

  const { data, error } = await supabase
    .from("scans")
    .select("*")
    .eq("id", id)
    .eq("user_id", session.userId)
    .maybeSingle();

  if (error) {
    console.error("[scans/[id] GET] error:", error.code);
    return fail("internal_error", "Something went wrong. Please try again.", 500);
  }

  // Return 404 regardless of whether it exists elsewhere (don't leak 403)
  if (!data) return fail("not_found", "Scan not found.", 404);

  return ok(data);
}

// ─── DELETE /api/scans/[id] ───────────────────────────────────────────────────

async function deleteHandler(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const session = await getSession();
  if (!session) return fail("unauthorized", "Not authenticated.", 401);

  const { id } = await params;

  // First check it exists and belongs to this user
  const { data: existing, error: fetchError } = await supabase
    .from("scans")
    .select("id")
    .eq("id", id)
    .eq("user_id", session.userId)
    .maybeSingle();

  if (fetchError) {
    console.error("[scans/[id] DELETE] fetch error:", fetchError.code);
    return fail("internal_error", "Something went wrong. Please try again.", 500);
  }

  if (!existing) return fail("not_found", "Scan not found.", 404);

  const { error: deleteError } = await supabase
    .from("scans")
    .delete()
    .eq("id", id)
    .eq("user_id", session.userId);

  if (deleteError) {
    console.error("[scans/[id] DELETE] delete error:", deleteError.code);
    return fail("internal_error", "Something went wrong. Please try again.", 500);
  }

  return ok({ deleted: true });
}

export const GET = withErrorHandler(getHandler);
export const DELETE = withErrorHandler(deleteHandler);
