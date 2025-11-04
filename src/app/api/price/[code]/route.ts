import { NextRequest, NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { normalizeRegion } from "@/lib/seriesCode";

type RouteContext = {
  params: Promise<{ code: string }>;
};

function formatPointValue(value: unknown): number {
  return typeof value === "number"
    ? value
    : Number((value as { toNumber?: () => number })?.toNumber?.() ?? value);
}

function startOfDayUtc(date: Date) {
  const copy = new Date(date);
  copy.setUTCHours(0, 0, 0, 0);
  return copy;
}

function endOfDayUtc(date: Date) {
  const copy = startOfDayUtc(date);
  copy.setUTCDate(copy.getUTCDate() + 1);
  return copy;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { code } = await context.params;

  try {
    const product = code.trim().toUpperCase();
    const url = new URL(request.url);
    const regionParam = url.searchParams.get("region")?.toUpperCase() ?? "ALL";
    const companyParam = url.searchParams.get("company");
    const rangeParam = Number(url.searchParams.get("range"));
    const regionsParam = url.searchParams.getAll("regions");

    const normalizedRegionList = Array.from(
      new Set(
        regionsParam
          .flatMap((value) => value.split(","))
          .map((value) => value.trim().toUpperCase())
          .filter((value) => value.length > 0)
      )
    );

    const hasCustomRegions =
      normalizedRegionList.length > 0 && !normalizedRegionList.includes("ALL");

    const isLatest = rangeParam === 0;
    const days = [1, 7, 30].includes(rangeParam) ? rangeParam : 7;

    const series = await prisma.priceSeries.findUnique({
      where: { code: product },
    });

    if (!series) {
      return NextResponse.json(
        { error: `Series ${product} not found` },
        { status: 404 }
      );
    }

    if (hasCustomRegions) {
      const normalizedRegions = normalizedRegionList.map((value) =>
        String(normalizeRegion(value)).toUpperCase()
      );

      const companyFilter =
        companyParam && companyParam !== "ALL"
          ? companyParam === "null"
            ? null
            : companyParam
          : undefined;

      const regionMap: Record<string, Array<{ ts: string; value: number; source: string | null; region: string; company: string | null }>> = {};

      for (const regionValue of normalizedRegions) {
        const where: Record<string, unknown> = {
          seriesId: series.id,
          region: regionValue,
        };

        if (companyFilter !== undefined) {
          where.company = companyFilter;
        }

        if (isLatest) {
          const latestPoint = await prisma.pricePoint.findFirst({
            where,
            orderBy: { ts: "desc" },
          });

          if (!latestPoint) {
            continue;
          }

          where.ts = {
            gte: startOfDayUtc(latestPoint.ts),
            lt: endOfDayUtc(latestPoint.ts),
          };
        } else {
          const fromDate = new Date();
          fromDate.setUTCDate(fromDate.getUTCDate() - (days - 1));
          fromDate.setUTCHours(0, 0, 0, 0);
          where.ts = { gte: fromDate };
        }

        const points = await prisma.pricePoint.findMany({
          where,
          orderBy: { ts: "asc" },
        });

        if (points.length === 0) {
          continue;
        }

        regionMap[regionValue] = points.map((point) => ({
          ts: point.ts.toISOString(),
          value: formatPointValue(point.value),
          source: point.source ?? null,
          region: regionValue,
          company: point.company ?? null,
        }));
      }

      if (Object.keys(regionMap).length === 0) {
        return NextResponse.json(
          { error: "Không có dữ liệu cho các vùng đã chọn." },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          series: {
            code: series.code,
            name: series.name,
            unit: series.unit,
            region: "MULTI",
            product,
          },
          range: isLatest ? 0 : days,
          points: [],
          regions: regionMap,
        },
        {
          headers: {
            "Cache-Control": "s-maxage=300, stale-while-revalidate=60",
          },
        }
      );
    }

    if (regionParam !== "ALL") {
      const normalizedRegion = normalizeRegion(regionParam);
      const regionValue = String(normalizedRegion).toUpperCase();

      const where: Record<string, unknown> = {
        seriesId: series.id,
        region: regionValue,
      };

      if (companyParam) {
        where.company = companyParam === "null" ? null : companyParam;
      }

      if (isLatest) {
        const latestPoint = await prisma.pricePoint.findFirst({
          where,
          orderBy: { ts: "desc" },
        });

        if (!latestPoint) {
          return NextResponse.json(
            { error: `Không có dữ liệu cho vùng ${regionValue}` },
            { status: 404 }
          );
        }

        where.ts = {
          gte: startOfDayUtc(latestPoint.ts),
          lt: endOfDayUtc(latestPoint.ts),
        };
      } else {
        const fromDate = new Date();
        fromDate.setUTCDate(fromDate.getUTCDate() - (days - 1));
        fromDate.setUTCHours(0, 0, 0, 0);
        where.ts = { gte: fromDate };
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

      if (!companyParam) {
        const dataByCompany = new Map<
          string,
          Array<{ ts: string; value: number; source: string | null; company: string | null }>
        >();

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

        return NextResponse.json(
          {
            series: {
              code: series.code,
              name: series.name,
              unit: series.unit,
              region: regionValue,
              product,
            },
            range: isLatest ? 0 : days,
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
          range: isLatest ? 0 : days,
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

    if (!isLatest) {
      const fromDate = new Date();
      fromDate.setUTCDate(fromDate.getUTCDate() - (days - 1));
      fromDate.setUTCHours(0, 0, 0, 0);

      const where: Record<string, unknown> = {
        seriesId: series.id,
        ts: {
          gte: fromDate,
        },
      };

      if (companyParam) {
        where.company = companyParam === "null" ? null : companyParam;
      }

      const points = await prisma.pricePoint.findMany({
        where,
        orderBy: { ts: "asc" },
      });

      if (points.length === 0) {
        return NextResponse.json(
          { error: `Không có dữ liệu cho series ${product}` },
          { status: 404 }
        );
      }

      const grouped = new Map<string, { sum: number; count: number }>();
      const dataByRegion = new Map<
        string,
        Array<{ ts: string; value: number; source: string | null; region?: string; company?: string | null }>
      >();

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
          company: point.company ?? null,
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
    }

    const latestWhere: Record<string, unknown> = {
      seriesId: series.id,
    };

    if (companyParam) {
      latestWhere.company = companyParam === "null" ? null : companyParam;
    }

    const allPoints = await prisma.pricePoint.findMany({
      where: latestWhere,
      orderBy: { ts: "desc" },
    });

    if (allPoints.length === 0) {
      return NextResponse.json(
        { error: `Không có dữ liệu cho series ${product}` },
        { status: 404 }
      );
    }

    const dataByRegion = new Map<
      string,
      {
        start: number;
        end: number;
        points: Array<{ ts: string; value: number; source: string | null; region: string; company: string | null }>;
      }
    >();

    for (const point of allPoints) {
      const regionKey = String(normalizeRegion(point.region ?? "")).toUpperCase();
      const tsMs = point.ts.getTime();
      const start = Date.UTC(
        point.ts.getUTCFullYear(),
        point.ts.getUTCMonth(),
        point.ts.getUTCDate()
      );
      const end = start + 86_400_000;

      const entry = dataByRegion.get(regionKey);
      if (!entry) {
        dataByRegion.set(regionKey, {
          start,
          end,
        points: [
          {
            ts: point.ts.toISOString(),
            value: formatPointValue(point.value),
            source: point.source ?? null,
            region: regionKey,
            company: point.company ?? null,
          },
        ],
      });
    } else if (tsMs >= entry.start && tsMs < entry.end) {
      entry.points.push({
        ts: point.ts.toISOString(),
        value: formatPointValue(point.value),
        source: point.source ?? null,
        region: regionKey,
        company: point.company ?? null,
      });
    }
    }

    const regionsPayload = Object.fromEntries(
      Array.from(dataByRegion.entries()).map(([regionKey, entry]) => [
        regionKey,
        entry.points.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime()),
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
        range: 0,
        points: [],
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
