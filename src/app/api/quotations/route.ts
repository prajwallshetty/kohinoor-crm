import { NextResponse } from "next/server";
import { DataService } from "@/lib/data-service";

export async function GET() {
  try {
    const quotations = await DataService.getQuotations();
    return NextResponse.json(quotations);
  } catch (e) {
    return NextResponse.json({ error: "Failed to fetch quotations" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { quotation, items } = await request.json();
    const newQuotation = await DataService.addQuotation(quotation, items);
    return NextResponse.json(newQuotation);
  } catch (e) {
    return NextResponse.json({ error: "Failed to create quotation" }, { status: 400 });
  }
}
