import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { passcode } = await request.json();
    const correctPasscode = process.env.ADMIN_PASSCODE;

    if (!correctPasscode) {
      return NextResponse.json({ valid: false, error: "Server configuration error" }, { status: 500 });
    }

    const isValid = passcode?.trim() === correctPasscode;

    return NextResponse.json({ valid: isValid });
  } catch (error) {
    console.error("[admin-verify]", error);
    return NextResponse.json({ valid: false, error: "Invalid request" }, { status: 400 });
  }
}
