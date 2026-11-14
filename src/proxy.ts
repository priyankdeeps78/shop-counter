import { NextResponse, type NextRequest } from "next/server";
import { isSku } from "@/types/domain";

/** A path no route matches, so Next.js serves its fully server-rendered 404 page. */
export const UNMATCHED_PATH = "/shop/unknown-item/not-found";

function skuFromPath(pathname: string): string | null {
  try {
    return decodeURIComponent(pathname.slice("/shop/".length));
  } catch {
    return null; // malformed percent-encoding
  }
}

/**
 * Sends unknown `/shop/<sku>` URLs to a path that matches no route.
 *
 * Why: in Next.js 16.4.6, `notFound()` thrown from a page answers HTTP 404, but
 * the body is an empty `<html id="__next_error__">` shell that the client fills
 * in with JavaScript (checked with Cache Components both on and off). A URL that
 * matches no route gets the not-found page rendered on the server instead.
 *
 * Runs before Next's static cache, so the match is always exact and
 * case-sensitive, on every file system. The page keeps its own `notFound()`.
 */
export function proxy(request: NextRequest) {
  const sku = skuFromPath(request.nextUrl.pathname);
  if (sku !== null && isSku(sku)) return NextResponse.next();
  return NextResponse.rewrite(new URL(UNMATCHED_PATH, request.url));
}

export const config = { matcher: "/shop/:sku" };
