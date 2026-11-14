import "server-only";

/** JSON response that browsers and CDNs must not cache: every API answer reflects live state. */
export function json(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

/**
 * The parsed JSON body, or `undefined` when the body is empty or not valid JSON.
 * Never throws: callers validate whatever comes back.
 */
export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}
