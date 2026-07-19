import { NextResponse } from "next/server";
import { DataService } from "@/lib/data-service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const site = await DataService.addSite(id, body);
    return NextResponse.json(site);
  } catch (e) {
    return NextResponse.json({ error: "Failed to add site" }, { status: 400 });
  }
}
