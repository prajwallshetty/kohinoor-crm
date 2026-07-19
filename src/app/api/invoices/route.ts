import { NextResponse } from "next/server";
import { DataService } from "@/lib/data-service";

export async function GET() {
  const invoices = await DataService.getInvoices();
  return NextResponse.json(invoices);
}

export async function POST(request: Request) {
  try {
    const { quotationId, items, discount, gstRate, paymentDue, terms } = await request.json();
    if (!quotationId) {
      return NextResponse.json({ error: "Missing quotationId" }, { status: 400 });
    }
    const newInvoice = await DataService.convertQuotationToInvoice(
      quotationId,
      items,
      discount !== undefined ? parseFloat(discount) : undefined,
      gstRate !== undefined ? parseFloat(gstRate) : undefined,
      paymentDue,
      terms
    );
    return NextResponse.json(newInvoice);
  } catch (e) {
    return NextResponse.json({ error: "Failed to convert quotation to invoice" }, { status: 400 });
  }
}
