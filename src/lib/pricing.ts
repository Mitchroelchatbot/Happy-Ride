/** Prijs zonder extra's. Extra's komen in stap 2. */
export function basePriceCents(pricePerDayCents: number, days: number): number {
  return pricePerDayCents * days;
}
