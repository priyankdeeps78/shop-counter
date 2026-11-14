import "server-only";

/** JSON response that browsers and CDNs must not cache: every API answer reflects live state. */
export function json(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
