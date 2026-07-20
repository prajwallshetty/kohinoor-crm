import { NextResponse } from "next/server";
import { DataService } from "@/lib/data-service";

export async function GET() {
  try {
    const branding = await DataService.getCompanyBranding();
    return NextResponse.json(branding);
  } catch (e) {
    return NextResponse.json({ error: "Failed to fetch company branding" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const updated = await DataService.updateCompanyBranding(body);
    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json({ error: "Failed to update company branding" }, { status: 400 });
  }
}
