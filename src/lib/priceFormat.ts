const EPSILON = 1e-6;

function trimTrailingZeros(value: string) {
  if (!value.includes(".")) {
    return value;
  }
  return value.replace(/\.?0+$/, "");
}

function normalizeToThousands(value: number) {
  if (!Number.isFinite(value)) {
    return null;
  }
  return value / 1000;
}

export function formatCompactPrice(value: number) {
  const scaled = normalizeToThousands(value);
  if (scaled === null) {
    return "—";
  }

  const roundedTwo = Math.round(scaled * 100) / 100;
  if (Math.abs(roundedTwo - Math.round(roundedTwo)) < EPSILON) {
    return `${Math.round(roundedTwo)}k`;
  }
  if (Math.abs(roundedTwo * 10 - Math.round(roundedTwo * 10)) < EPSILON) {
    return `${trimTrailingZeros((Math.round(roundedTwo * 10) / 10).toFixed(1))}k`;
  }
  return `${trimTrailingZeros(roundedTwo.toFixed(2))}k`;
}

export function formatCompactPriceRange(value: number, valueMin?: number | null, valueMax?: number | null) {
  const minValue = typeof valueMin === "number" ? valueMin : value;
  const maxValue = typeof valueMax === "number" ? valueMax : value;

  if (Math.abs(minValue - maxValue) < EPSILON) {
    return formatCompactPrice(value);
  }

  return `${formatCompactPrice(minValue)} - ${formatCompactPrice(maxValue)}`;
}
