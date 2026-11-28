// Formats an amount in cents as Kenyan shillings, e.g. 150000 -> "KES 1,500".
export function formatKes(cents: number): string {
  return `KES ${(cents / 100).toLocaleString("en-KE", { maximumFractionDigits: 2 })}`;
}
