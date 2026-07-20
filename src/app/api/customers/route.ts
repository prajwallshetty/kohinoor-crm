import { NextResponse } from "next/server";
import { DataService } from "@/lib/data-service";

export async function GET() {
  const customers = await DataService.getCustomers();
  return NextResponse.json(customers);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const newCustomer = await DataService.addCustomer(body);
    return NextResponse.json(newCustomer);
  } catch (e) {
    return NextResponse.json({ error: "Failed to create customer" }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, ...updates } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "Missing customer ID" }, { status: 400 });
    }
    const updated = await DataService.updateCustomer(id, updates);
    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json({ error: "Failed to update customer" }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing customer ID" }, { status: 400 });
    }
    await DataService.deleteCustomer(id);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: "Failed to delete customer" }, { status: 400 });
  }
}
