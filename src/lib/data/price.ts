import { unstable_cache } from "next/cache";

import prisma from "@/lib/prisma";
import { REGION_KEYS, normalizeRegion } from "@/lib/seriesCode";

const DEFAULT_REVALIDATE_SECONDS = 120;

export const getSeriesSummaries = unstable_cache(
  async () =>
    prisma.priceSeries.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        code: true,
        name: true,
        unit: true,
      },
    }),
  ["price:series:summaries"],
  {
    tags: ["price:series"],
    revalidate: DEFAULT_REVALIDATE_SECONDS,
  }
);

export const getSeriesRegionPairs = unstable_cache(
  async () =>
    prisma.pricePoint.findMany({
      select: {
        seriesId: true,
        region: true,
      },
      distinct: ["seriesId", "region"],
    }),
  ["price:series:regions"],
  {
    tags: ["price:points"],
    revalidate: DEFAULT_REVALIDATE_SECONDS,
  }
);

export async function getSeriesWithRegions() {
  const [series, regionPairs] = await Promise.all([getSeriesSummaries(), getSeriesRegionPairs()]);

  const regionMap = new Map<string, Set<string>>();
  regionPairs.forEach((pair) => {
    const normalized = normalizeRegion(pair.region);
    const set = regionMap.get(pair.seriesId) ?? new Set<string>();
    set.add(typeof normalized === "string" ? normalized : String(normalized));
    regionMap.set(pair.seriesId, set);
  });

  return series.map((item) => ({
    ...item,
    regions: Array.from(regionMap.get(item.id) ?? new Set<string>(REGION_KEYS)),
  }));
}
