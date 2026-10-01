import { supabase } from "@/lib/supabase-server";
import { hashPassword, setSession } from "@/lib/auth";
import { registerSchema } from "@/lib/validation";
import { ok, fail, withErrorHandler } from "@/lib/api";

async function handler(req: Request): Promise<Response> {
  const body = await req.json();

  // Zod validation — return field-level errors on 400
  const parsed = registerSchema.safeParse(body);
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

  const { name, email, password } = parsed.data;
  const passwordHash = await hashPassword(password);

  // ── Step 1: Insert user ───────────────────────────────────────────────────
  const { data: user, error: userError } = await supabase
    .from("users")
    .insert({ name, email, password_hash: passwordHash })
    .select("id, name, email")
    .single();

  if (userError) {
    // Postgres unique violation code
    if (userError.code === "23505") {
      return fail("duplicate_email", "An account with that email already exists.", 409);
    }
    console.error("[register] user insert error:", userError.code, userError.message);
    return fail("internal_error", "Something went wrong. Please try again.", 500);
  }

  // ── Step 2: Create a default policy (atomic: roll back user on failure) ───
  const { error: policyError } = await supabase.from("policies").insert({
    user_id: user.id,
    name: "Default policy",
    is_default: true,
  });

  if (policyError) {
    console.error("[register] policy insert error:", policyError.code, policyError.message);

    // Roll back: delete the user row so we don't leave an orphaned account
    const { error: deleteError } = await supabase
      .from("users")
      .delete()
      .eq("id", user.id);

    if (deleteError) {
      console.error("[register] rollback delete error:", deleteError.code, deleteError.message);
    }

    return fail("internal_error", "Something went wrong. Please try again.", 500);
  }

  // ── Step 3: Set session cookie ────────────────────────────────────────────
  await setSession({ userId: user.id, name: user.name, email: user.email });

  return ok({ id: user.id, name: user.name, email: user.email });
}

export const POST = withErrorHandler(handler);
