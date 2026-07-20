import { NextResponse } from "next/server";
import { DataService } from "@/lib/data-service";

export async function GET() {
  try {
    const payments = await DataService.getPayments();
    return NextResponse.json(payments);
  } catch (e) {
    return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 });
  }
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
