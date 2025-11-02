export const REGION_KEYS = ["MIEN_BAC", "MIEN_TRUNG", "MIEN_NAM"] as const;
export type RegionKey = (typeof REGION_KEYS)[number];

export const REGION_SUFFIX: Record<RegionKey, string> = {
  MIEN_BAC: "MB",
  MIEN_TRUNG: "MT",
  MIEN_NAM: "MN",
};

const REGION_VARIANTS: Record<RegionKey, string[]> = {
  MIEN_BAC: [REGION_SUFFIX.MIEN_BAC, "MIEN_BAC"],
  MIEN_TRUNG: [REGION_SUFFIX.MIEN_TRUNG, "MIEN_TRUNG"],
  MIEN_NAM: [REGION_SUFFIX.MIEN_NAM, "MIEN_NAM"],
};

export function deriveProductFromCode(code: string, region?: RegionKey | string | null): string {
  if (!code) {
    return "";
  }

  const normalized = code.trim().toUpperCase();
  const targetRegion = region ?? inferRegionFromCode(normalized);

  if (targetRegion && typeof targetRegion === "string") {
    const variants = REGION_VARIANTS[targetRegion as RegionKey] ?? [String(targetRegion)];
    for (const variant of variants) {
      if (normalized.endsWith(`_${variant}`)) {
        return normalized.slice(0, -(variant.length + 1));
      }
    }
  }

  return normalized;
}

export function inferRegionFromCode(code: string): RegionKey | null {
  const normalized = code.trim().toUpperCase();

  for (const region of REGION_KEYS) {
    for (const variant of REGION_VARIANTS[region]) {
      if (normalized.endsWith(`_${variant}`)) {
        return region;
      }
    }
  }

  return null;
}

export function normalizeRegion(region: string): RegionKey | string {
  const upper = region.trim().toUpperCase();
  if (REGION_KEYS.includes(upper as RegionKey)) {
    return upper as RegionKey;
  }
  const inferred = inferRegionFromCode(upper);
  return inferred ?? upper;
}
