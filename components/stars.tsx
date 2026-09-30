// Read-only star display, e.g. ★★★★☆ for 4. Rounds to the nearest whole star.
export function Stars({ value, className = "" }: { value: number; className?: string }) {
  const full = Math.round(value);
  return (
    <span className={`text-orange-600 ${className}`} role="img" aria-label={`${value} out of 5 stars`}>
      {"★".repeat(full)}
      <span className="text-stone-300">{"★".repeat(5 - full)}</span>
    </span>
  );
}
