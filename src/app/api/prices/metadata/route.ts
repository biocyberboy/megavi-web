import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { normalizeRegion } from "@/lib/seriesCode";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const seriesId = searchParams.get("series");
    const region = searchParams.get("region");
    const regionsParam = searchParams.get("regions");

    // Build where clause
    const where: any = {
      company: { not: null }, // Only get non-null companies
    };

    if (seriesId) {
      where.seriesId = seriesId;
    }

    if (regionsParam) {
      const regionList = regionsParam
        .split(",")
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
        .map((value) => String(normalizeRegion(value)).toUpperCase());
      if (regionList.length > 0) {
        where.region = { in: regionList };
      }
    } else if (region && region !== "Tất cả" && region !== "ALL") {
      where.region = String(normalizeRegion(region)).toUpperCase();
    }

    // Get distinct companies
    const companies = await prisma.pricePoint.findMany({
      where,
      distinct: ["company"],
      select: { company: true },
      orderBy: { company: "asc" },
    });

    // Filter out null and return array of strings
    const companyList = companies.map((c) => c.company).filter((c): c is string => c !== null);

    return NextResponse.json({ companies: companyList });
  } catch (error) {
    console.error("[prices-metadata]", error);
    return NextResponse.json({ error: "Failed to fetch metadata" }, { status: 500 });
  }
}
