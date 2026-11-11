import * as begin from "@/app/api/checkout/begin/route";
import * as complete from "@/app/api/checkout/complete/route";
import * as payments from "@/app/api/payments/route";
import * as preview from "@/app/api/payments/preview/route";

const routes: Record<string, { POST: (req: Request) => Promise<Response> }> = {
  "/api/checkout/begin": begin,
  "/api/checkout/complete": complete,
  "/api/payments": payments,
  "/api/payments/preview": preview,
};

/**
 * A `fetch` that sends the component's requests straight into the real route
 * handlers, so component tests exercise the server logic too, not a mock of it.
 */
export async function routeFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const path = typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
  const route = routes[path];
  if (!route) throw new Error(`No route handler for ${path}`);
  return route.POST(new Request(`http://test.local${path}`, init));
}

export function post(path: string, body: unknown): Promise<Response> {
  return routeFetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
