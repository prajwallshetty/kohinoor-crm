import { NextResponse } from "next/server";
import { DataService } from "@/lib/data-service";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const updated = await DataService.updateMasterItem(id, body);
    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json({ error: "Failed to update master item" }, { status: 400 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await DataService.deleteMasterItem(id);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: "Failed to delete master item" }, { status: 400 });
  }
}
