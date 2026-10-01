// ─── Response helpers ─────────────────────────────────────────────────────────

export function ok<T>(data: T): Response {
  return Response.json({ ok: true, data }, { status: 200 });
}

export function fail(
  code: string,
  message: string,
  status: number = 400
): Response {
  return Response.json({ ok: false, code, message }, { status });
}

// ─── Handler wrapper ──────────────────────────────────────────────────────────

type Handler = (req: Request) => Promise<Response>;

export function withErrorHandler(handler: Handler): Handler {
  return async (req: Request) => {
    try {
      return await handler(req);
    } catch (err: unknown) {
      // Log full details server-side only — never send raw error to client.
      // Config errors (missing env vars) get a distinct prefix so they're easy
      // to spot in the terminal.
      const message =
        err instanceof Error ? err.message : String(err);
      const isConfigError =
        message.includes("Missing or invalid environment variable");

      if (isConfigError) {
        console.error(
          "\n❌ [CONFIG ERROR] A required environment variable is missing.\n" +
            `   ${message}\n` +
            "   Add it to .env.local and restart the dev server.\n"
        );
      } else {
        console.error("[API Error]", err);
      }

      return fail(
        isConfigError ? "config_error" : "internal_error",
        "Something went wrong. Please try again.",
        500
      );
    }
  };
}
