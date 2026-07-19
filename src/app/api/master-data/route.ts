import { NextResponse } from "next/server";
import { DataService } from "@/lib/data-service";

export async function GET() {
  try {
    const items = await DataService.getMasterItems();
    return NextResponse.json(items);
  } catch (e) {
    return NextResponse.json({ error: "Failed to fetch master items" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const newItem = await DataService.addMasterItem(body);
    return NextResponse.json(newItem);
  } catch (e) {
    return NextResponse.json({ error: "Failed to create master item" }, { status: 400 });
  }
}
