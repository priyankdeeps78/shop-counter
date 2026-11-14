/** "5 left" for stock-limited items, "Not stock-limited" when `remaining` is null. */
export function formatRemaining(remaining: number | null): string {
  return remaining === null ? "Not stock-limited" : `${remaining} left`;
}
