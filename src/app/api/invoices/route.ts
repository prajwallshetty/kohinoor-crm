import { NextResponse } from "next/server";
import { DataService } from "@/lib/data-service";

export async function GET() {
  try {
    const invoices = await DataService.getInvoices();
    return NextResponse.json(invoices);
  } catch (e) {
    return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { quotationId, items, materialItems, discount, gstRate, paymentDue, terms } = await request.json();
    if (!quotationId) {
      return NextResponse.json({ error: "Missing quotationId" }, { status: 400 });
    }
    const newInvoice = await DataService.convertQuotationToInvoice(
      quotationId,
      items,
      discount !== undefined ? parseFloat(discount) : undefined,
      gstRate !== undefined ? parseFloat(gstRate) : undefined,
      paymentDue,
      terms,
      materialItems
    );
    return NextResponse.json(newInvoice);
  } catch (e) {
    return NextResponse.json({ error: "Failed to convert quotation to invoice" }, { status: 400 });
  }
}
