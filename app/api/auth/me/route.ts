import { getSession } from "@/lib/auth";
import { ok, fail, withErrorHandler } from "@/lib/api";

async function handler(_req: Request): Promise<Response> {
  const session = await getSession();
  if (!session) {
    return fail("unauthorized", "Not authenticated.", 401);
  }
  return ok({ id: session.userId, name: session.name, email: session.email });
}

export const GET = withErrorHandler(handler);
