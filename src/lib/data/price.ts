import { unstable_cache } from "next/cache";

import prisma from "@/lib/prisma";
import { REGION_KEYS, deriveProductFromCode, normalizeRegion } from "@/lib/seriesCode";
import { Prisma } from "@prisma/client";

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
    product: deriveProductFromCode(item.code),
    regions: Array.from(regionMap.get(item.id) ?? new Set<string>(REGION_KEYS)),
  }));
}

type PointPayload = {
  ts: string;
  value: number;
  valueMin: number;
  valueMax: number;
  source: string | null;
  region?: string;
};

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  const decimal = value as { toNumber?: () => number };
  if (decimal?.toNumber) {
    return decimal.toNumber();
  }
  return Number(value);
}

type ValueSource = {
  value: unknown;
  valueMin?: unknown | null;
  valueMax?: unknown | null;
};

function extractValueRange(source: ValueSource) {
  const baseValue = toNumber(source.value);
  const minRaw = source.valueMin != null ? toNumber(source.valueMin) : baseValue;
  const maxRaw = source.valueMax != null ? toNumber(source.valueMax) : baseValue;
  const valueMin = Math.min(minRaw, maxRaw);
  const valueMax = Math.max(minRaw, maxRaw);
  const value = Number.isFinite(baseValue) ? baseValue : (valueMin + valueMax) / 2;
  return { value, valueMin, valueMax };
}

function getFromDate(days: number) {
  const fromDate = new Date();
  const safeDays = Math.max(1, Number.isFinite(days) ? days : 30);
  fromDate.setUTCDate(fromDate.getUTCDate() - (safeDays - 1));
  fromDate.setUTCHours(0, 0, 0, 0);
  return fromDate;
}

export async function getPricePointsForProduct(
  productCode: string,
  region: string,
  rangeDays: number
) {
  const series = await prisma.priceSeries.findUnique({
    where: { code: productCode },
    select: { id: true, code: true, name: true, unit: true },
  });

  if (!series) {
    return null;
  }

  const fromDate = getFromDate(rangeDays);

  if (region !== "ALL") {
    const normalizedRegion = normalizeRegion(region);
    const regionValue = String(normalizedRegion).toUpperCase();

    const points = await prisma.pricePoint.findMany({
      where: {
        seriesId: series.id,
        region: regionValue,
        ts: { gte: fromDate },
      },
      orderBy: { ts: "asc" },
    });

    return {
      meta: {
        code: series.code,
        name: series.name,
        unit: series.unit,
        region: regionValue,
        product: deriveProductFromCode(series.code),
      },
      data: points.map<PointPayload>((point) => ({
        ts: point.ts.toISOString(),
        ...extractValueRange(point),
        source: point.source ?? null,
        region: point.region,
      })),
    };
  }

  const points = await prisma.pricePoint.findMany({
    where: {
      seriesId: series.id,
      ts: { gte: fromDate },
    },
    orderBy: { ts: "asc" },
  });

  const dataByRegion = new Map<string, PointPayload[]>();

  points.forEach((point) => {
    const regionKey = String(normalizeRegion(point.region ?? "")).toUpperCase();
    const bucket = dataByRegion.get(regionKey) ?? [];
    bucket.push({
      ts: point.ts.toISOString(),
      ...extractValueRange(point),
      source: point.source ?? null,
      region: regionKey,
    });
    dataByRegion.set(regionKey, bucket);
  });

  return {
    meta: {
      code: series.code,
      name: series.name,
      unit: series.unit,
      region: "ALL",
      product: deriveProductFromCode(series.code),
    },
    dataByRegion: Object.fromEntries(dataByRegion.entries()),
  };
}

export type LatestPriceSnapshot = {
  seriesId: string;
  seriesCode: string;
  seriesName: string;
  unit: string;
  region: string;
  company: string | null;
  value: number;
  valueMin: number;
  valueMax: number;
  recordedAt: string;
};

export async function getLatestPriceSnapshot(): Promise<LatestPriceSnapshot[]> {
  const rows: Array<{
    series_id: string;
    region: string;
    company: string | null;
    value: Prisma.Decimal;
    value_min: Prisma.Decimal | null;
    value_max: Prisma.Decimal | null;
    ts: Date;
    code: string;
    name: string;
    unit: string;
  }> = await prisma.$queryRaw(
    Prisma.sql`
      SELECT DISTINCT ON (pp."seriesId", pp."region", COALESCE(pp."company", ''))
        pp."seriesId" as series_id,
        pp."region" as region,
        pp."company" as company,
        pp."value" as value,
        pp."valueMin" as value_min,
        pp."valueMax" as value_max,
        pp."ts" as ts,
        s.code,
        s.name,
        s.unit
      FROM "PricePoint" pp
      INNER JOIN "PriceSeries" s ON s.id = pp."seriesId"
      ORDER BY pp."seriesId", pp."region", COALESCE(pp."company", ''), pp."ts" DESC
    `
  );

  return rows.map((row) => ({
    seriesId: row.series_id,
    seriesCode: row.code,
    seriesName: row.name,
    unit: row.unit,
    region: String(normalizeRegion(row.region ?? "")).toUpperCase(),
    company: row.company,
    ...extractValueRange({
      value: row.value,
      valueMin: row.value_min,
      valueMax: row.value_max,
    }),
    recordedAt: row.ts.toISOString(),
  }));
}
