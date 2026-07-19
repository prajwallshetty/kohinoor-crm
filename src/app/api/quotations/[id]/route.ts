import { NextResponse } from "next/server";
import { DataService, QuoteStatus } from "@/lib/data-service";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { status } = await request.json();
    const updated = await DataService.updateQuotationStatus(id, status as QuoteStatus);
    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json({ error: "Failed to update quotation status" }, { status: 400 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { action } = await request.json();
    if (action === "duplicate") {
      const duplicated = await DataService.duplicateQuotation(id);
      return NextResponse.json(duplicated);
    } else if (action === "revision") {
      const revised = await DataService.createRevision(id);
      return NextResponse.json(revised);
    }
    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: "Failed to duplicate quotation" }, { status: 400 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await DataService.deleteQuotation(id);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to delete quotation" }, { status: 400 });
  }
}
