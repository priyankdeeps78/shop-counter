import { connection } from "next/server";
import { catalogReads } from "@/lib/store";

export async function GET() {
  await connection();
  return Response.json({ catalogReads: catalogReads() });
}
