import { clearSession } from "@/lib/auth";
import { ok, withErrorHandler } from "@/lib/api";

async function handler(_req: Request): Promise<Response> {
  await clearSession();
  return ok({ loggedOut: true });
}

export const POST = withErrorHandler(handler);
