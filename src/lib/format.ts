// formatTokens writes a count the way tokenstat does: 1.2B, 345.6M, 12.3K.
export function formatTokens(n: number): string {
  const units: [number, string][] = [
    [1e12, "T"],
    [1e9, "B"],
    [1e6, "M"],
    [1e3, "K"],
  ];
  for (const [size, unit] of units) {
    if (n >= size) {
      const v = n / size;
      return (v >= 100 ? v.toFixed(0) : v.toFixed(1)) + unit;
    }
  }
  return String(Math.round(n));
}

export function formatDay(day: string): string {
  return new Date(day + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

// shortModel trims the date suffix that some model ids carry.
export function shortModel(model: string): string {
  return model.replace(/-\d{8}$/, "");
}
