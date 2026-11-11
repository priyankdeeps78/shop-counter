/** Reads a JSON body, answering `undefined` for an empty or malformed body. */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}
