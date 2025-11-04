import { NextResponse } from "next/server";

import { getLatestPriceSnapshot } from "@/lib/data/price";

export async function GET() {
  try {
    const snapshot = await getLatestPriceSnapshot();
    return NextResponse.json(
      { data: snapshot },
      {
        headers: {
          "Cache-Control": "s-maxage=120, stale-while-revalidate=60",
        },
      }
    );
  } catch (error) {
    console.error("[api/price/latest]", error);
    return NextResponse.json({ error: "Failed to load latest prices" }, { status: 500 });
  }
}
