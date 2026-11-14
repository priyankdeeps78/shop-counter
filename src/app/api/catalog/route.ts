import { connection } from "next/server";
import { getLiveCatalog } from "@/server/catalog";
import { json } from "@/server/http";

export async function GET() {
  // Always answer at request time from the live store, never from a build-time prerender.
  await connection();
  return json(getLiveCatalog());
}
