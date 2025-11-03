import { NextRequest, NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { normalizeRegion } from "@/lib/seriesCode";

const REGION_LABELS: Record<string, string> = {
  MIEN_BAC: "Miền Bắc",
  MIEN_TRUNG: "Miền Trung",
  MIEN_NAM: "Miền Nam",
  ALL: "Tổng hợp",
};

type RouteContext = {
  params: Promise<{ code: string }>;
};

function formatPointValue(value: unknown): number {
  return typeof value === "number"
    ? value
    : Number((value as { toNumber?: () => number })?.toNumber?.() ?? value);
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { code } = await context.params;

  try {
    const product = code.trim().toUpperCase();
    const url = new URL(request.url);
    const regionParam = url.searchParams.get("region")?.toUpperCase() ?? "ALL";
    const companyParam = url.searchParams.get("company");
    const rangeParam = Number(url.searchParams.get("range"));
    const days = [7, 30, 90].includes(rangeParam) ? rangeParam : 30;

    const series = await prisma.priceSeries.findUnique({
      where: { code: product },
    });

    if (!series) {
      return NextResponse.json(
        { error: `Series ${product} not found` },
        { status: 404 }
      );
    }

    const fromDate = new Date();
    fromDate.setUTCDate(fromDate.getUTCDate() - (days - 1));
    fromDate.setUTCHours(0, 0, 0, 0);

    if (regionParam !== "ALL") {
      const normalizedRegion = normalizeRegion(regionParam);
      const regionValue = String(normalizedRegion).toUpperCase();

      const where: any = {
        seriesId: series.id,
        region: regionValue,
        ts: {
          gte: fromDate,
        },
      };

      // Add company filter if provided
      if (companyParam) {
        where.company = companyParam === "null" ? null : companyParam;
      }

      const points = await prisma.pricePoint.findMany({
        where,
        orderBy: { ts: "asc" },
      });

      if (points.length === 0) {
        return NextResponse.json(
          { error: `Không có dữ liệu cho vùng ${regionValue}` },
          { status: 404 }
        );
      }

      // If no specific company is requested, group by company for multi-line chart
      if (!companyParam) {
        const dataByCompany = new Map<string, Array<{ ts: string; value: number; source: string | null; company: string | null }>>();

        for (const point of points) {
          const companyKey = point.company ?? "null";
          const bucket = dataByCompany.get(companyKey) ?? [];
          bucket.push({
            ts: point.ts.toISOString(),
            value: formatPointValue(point.value),
            source: point.source ?? null,
            company: point.company,
          });
          dataByCompany.set(companyKey, bucket);
        }

        const companiesPayload = Object.fromEntries(
          Array.from(dataByCompany.entries()).map(([companyKey, companyPoints]) => [
            companyKey,
            companyPoints.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime()),
          ])
        );

        // Return with companies data for multi-line chart
        return NextResponse.json(
          {
            series: {
              code: series.code,
              name: series.name,
              unit: series.unit,
              region: regionValue,
              product,
            },
            range: days,
            points: [],
            companies: companiesPayload,
          },
          {
            headers: {
              "Cache-Control": "s-maxage=300, stale-while-revalidate=60",
            },
          }
        );
      }

      return NextResponse.json(
        {
          series: {
            code: series.code,
            name: series.name,
            unit: series.unit,
            region: regionValue,
            product,
          },
          range: days,
          points: points.map((point) => ({
            ts: point.ts.toISOString(),
            value: formatPointValue(point.value),
            source: point.source ?? null,
            region: point.region,
          })),
        },
        {
          headers: {
            "Cache-Control": "s-maxage=300, stale-while-revalidate=60",
          },
        }
      );
    }

    const points = await prisma.pricePoint.findMany({
      where: {
        seriesId: series.id,
        ts: {
          gte: fromDate,
        },
      },
      orderBy: { ts: "asc" },
    });

    if (points.length === 0) {
      return NextResponse.json(
        { error: `Không có dữ liệu cho series ${product}` },
        { status: 404 }
      );
    }

    const grouped = new Map<string, { sum: number; count: number }>();
    const dataByRegion = new Map<string, Array<{ ts: string; value: number; source: string | null; region?: string }>>();

    for (const point of points) {
      const tsKey = point.ts.toISOString();
      const value = formatPointValue(point.value);
      const bucket = grouped.get(tsKey);
      if (bucket) {
        bucket.sum += value;
        bucket.count += 1;
      } else {
        grouped.set(tsKey, { sum: value, count: 1 });
      }

      const regionKey = String(normalizeRegion(point.region ?? "")).toUpperCase();
      const regionBucket = dataByRegion.get(regionKey) ?? [];
      regionBucket.push({
        ts: tsKey,
        value,
        source: point.source ?? null,
        region: regionKey,
      });
      dataByRegion.set(regionKey, regionBucket);
    }

    const aggregated = Array.from(grouped.entries())
      .map(([ts, bucket]) => ({
        ts,
        value: bucket.sum / bucket.count,
        source: null,
        region: "ALL",
      }))
      .sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());

    const regionsPayload = Object.fromEntries(
      Array.from(dataByRegion.entries()).map(([regionKey, regionPoints]) => [
        regionKey,
        regionPoints.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime()),
      ])
    );

    return NextResponse.json(
      {
        series: {
          code: series.code,
          name: series.name,
          unit: series.unit,
          region: "ALL",
          product,
        },
        range: days,
        points: aggregated,
        regions: regionsPayload,
      },
      {
        headers: {
          "Cache-Control": "s-maxage=300, stale-while-revalidate=60",
        },
      }
    );
  } catch (error) {
    console.error("[api/price/[code]]", error);
    return NextResponse.json(
      { error: "Failed to load price data" },
      { status: 500 }
    );
  }
}
