// The backend answered, but not with success — as opposed to fetch()
// rejecting, which means the request never got an answer (offline, server
// down). Kept apart from api.ts so callers can `instanceof` it even where
// api.ts is mocked in tests.
export class DeliveryRequestError extends Error {
  constructor(
    readonly status: number,
    // The backend's `error` code, e.g. "invalid_body" or "internal_error".
    readonly code: string | null,
    // Dotted paths of the fields a 400 rejected, e.g. "delivery_date" or
    // "items.3.quantity" (from the zod `issues` the backend returns).
    readonly fields: string[],
  ) {
    super(`Request failed with status ${status}${code ? ` (${code})` : ""}`);
    this.name = "DeliveryRequestError";
  }

  static async fromResponse(res: Response): Promise<DeliveryRequestError> {
    let code: string | null = null;
    let fields: string[] = [];
    try {
      const body = (await res.json()) as {
        error?: unknown;
        issues?: Array<{ path?: unknown[] }>;
      };
      if (typeof body.error === "string") code = body.error;
      if (Array.isArray(body.issues)) {
        fields = body.issues.flatMap((issue) =>
          Array.isArray(issue.path) && issue.path.length > 0 ? [issue.path.join(".")] : [],
        );
      }
    } catch {
      // Not JSON (e.g. a proxy's HTML error page) — the status alone will do.
    }
    return new DeliveryRequestError(res.status, code, fields);
  }
}
