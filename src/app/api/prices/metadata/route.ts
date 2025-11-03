import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const seriesId = searchParams.get("series");
    const region = searchParams.get("region");

    // Build where clause
    const where: any = {
      company: { not: null }, // Only get non-null companies
    };

    if (seriesId) {
      where.seriesId = seriesId;
    }

    if (region && region !== "Tất cả") {
      where.region = region;
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
