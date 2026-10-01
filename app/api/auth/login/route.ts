import { supabase } from "@/lib/supabase-server";
import { verifyPassword, hashPassword, setSession } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";
import { ok, fail, withErrorHandler } from "@/lib/api";

// Lazily-initialized dummy hash to prevent timing attacks when a user email is not found.
// bcrypt.compare always runs so response time doesn't reveal whether the email exists.
let _dummyHash: string | undefined;
async function getDummyHash(): Promise<string> {
  if (!_dummyHash) {
    _dummyHash = await hashPassword("DummyPass1_timing_safe");
  }
  return _dummyHash;
}

async function handler(req: Request): Promise<Response> {
  const body = await req.json();

  // Zod validation — return field-level errors on 400
  const parsed = loginSchema.safeParse(body);
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

  const { email, password } = parsed.data;

  // Fetch user by email
  const { data: user, error: dbError } = await supabase
    .from("users")
    .select("id, name, email, password_hash")
    .eq("email", email)
    .maybeSingle();

  if (dbError) {
    console.error("[login] db error:", dbError.code, dbError.message);
    return fail("internal_error", "Something went wrong. Please try again.", 500);
  }

  // Always run bcrypt to prevent timing attacks when user doesn't exist
  const hashToCompare = user?.password_hash ?? (await getDummyHash());
  const passwordMatch = await verifyPassword(password, hashToCompare);

  // Return the same generic message regardless of whether email or password was wrong
  if (!user || !passwordMatch) {
    return fail("invalid_credentials", "Invalid email or password.", 401);
  }

  await setSession({ userId: user.id, name: user.name, email: user.email });

  return ok({ id: user.id, name: user.name, email: user.email });
}

export const POST = withErrorHandler(handler);
