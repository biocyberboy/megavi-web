import { NextResponse } from "next/server";

import { getSeriesRegionPairs, getSeriesSummaries } from "@/lib/data/price";
import { REGION_KEYS, deriveProductFromCode, normalizeRegion } from "@/lib/seriesCode";

export async function GET() {
  try {
    const [series, regionPairs] = await Promise.all([getSeriesSummaries(), getSeriesRegionPairs()]);

    const regionMap = new Map<string, Set<string>>();
    for (const pair of regionPairs) {
      const set = regionMap.get(pair.seriesId) ?? new Set<string>();
      set.add(normalizeRegion(pair.region));
      regionMap.set(pair.seriesId, set);
    }

    const payload = series.map((item) => ({
      ...item,
      product: deriveProductFromCode(item.code),
      regions: Array.from(regionMap.get(item.id) ?? new Set<string>(REGION_KEYS)),
    }));

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "s-maxage=300, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    console.error("[api/price/series]", error);
    return NextResponse.json({ error: "Failed to load price series" }, { status: 500 });
  }
}
