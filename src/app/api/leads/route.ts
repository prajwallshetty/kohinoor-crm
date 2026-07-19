import { NextResponse } from "next/server";
import { DataService } from "@/lib/data-service";

export async function GET() {
  const leads = await DataService.getLeads();
  return NextResponse.json(leads);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const lead = await DataService.addLead(body);
    return NextResponse.json(lead);
  } catch (e) {
    return NextResponse.json({ error: "Failed to create lead" }, { status: 400 });
  }
}
