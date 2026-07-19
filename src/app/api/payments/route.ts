import { NextResponse } from "next/server";
import { DataService } from "@/lib/data-service";

export async function GET() {
  const payments = await DataService.getPayments();
  return NextResponse.json(payments);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const newPayment = await DataService.addPayment(body);
    return NextResponse.json(newPayment);
  } catch (e) {
    return NextResponse.json({ error: "Failed to record payment" }, { status: 400 });
  }
}
