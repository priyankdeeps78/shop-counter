import { connection } from "next/server";
import { getCatalogReadCount } from "@/server/catalog";
import { json } from "@/server/http";

export async function GET() {
  await connection();
  return json({ catalogReads: getCatalogReadCount() });
}
