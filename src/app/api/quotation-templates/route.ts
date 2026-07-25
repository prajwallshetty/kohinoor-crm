import { NextResponse } from "next/server";
import { DataService } from "@/lib/data-service";

export async function GET() {
  try {
    const templates = await DataService.getQuotationTemplates();
    return NextResponse.json(templates);
  } catch (e: any) {
    console.error("GET /api/quotation-templates error:", e);
    return NextResponse.json({ error: e?.message || "Failed to fetch templates" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const template = await DataService.addQuotationTemplate(body);
    return NextResponse.json(template);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to create template" }, { status: 400 });
  }
}
