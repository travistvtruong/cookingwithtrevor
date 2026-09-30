// Read-only star display, e.g. ★★★★☆ for 4. Rounds to the nearest whole star.
// Empty stars are outlines in the same colour, so they stay visible (grey fill
// was below the 3:1 contrast needed for meaningful graphics).
export function Stars({ value, className = "" }: { value: number; className?: string }) {
  const full = Math.round(value);
  return (
    <span className={`text-orange-600 ${className}`} role="img" aria-label={`${value} out of 5 stars`}>
      {"★".repeat(full)}
      {"☆".repeat(5 - full)}
    </span>
  );
}
