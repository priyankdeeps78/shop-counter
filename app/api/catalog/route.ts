import { connection } from "next/server";
import { readCatalog } from "@/lib/store";

/** Live store, never cached, and not counted as a `getCatalog()` read. */
export async function GET() {
  // Opt out of build-time prerendering: the answer depends on live stock.
  await connection();
  return Response.json(readCatalog());
}
