import { NextResponse } from "next/server";
import { DataService, LeadStatus } from "@/lib/data-service";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { status } = await request.json();
    const updated = await DataService.updateLeadStatus(id, status as LeadStatus);
    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json({ error: "Failed to update lead status" }, { status: 400 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await DataService.deleteLead(id);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: "Failed to delete lead" }, { status: 400 });
  }
}
