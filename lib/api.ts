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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Handler = (req: Request, ctx?: any) => Promise<Response>;

export function withErrorHandler(handler: Handler): Handler {
  return async (req: Request, ctx?: unknown) => {
    try {
      return await handler(req, ctx);
    } catch (err: unknown) {
      // Log full details server-side only — never send raw error to client.
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
