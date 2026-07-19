import { NextResponse } from "next/server";
import { DataService } from "@/lib/data-service";

export async function GET() {
  try {
    const invoices = await DataService.getInvoices();
    const customers = await DataService.getCustomers();
    const leads = await DataService.getLeads();

    // 1. Monthly Sales / Revenue Trends
    const salesMap: Record<string, { billing: number; receipts: number }> = {};
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    months.forEach(m => {
      salesMap[m] = { billing: 0, receipts: 0 };
    });

    invoices.forEach((inv: any) => {
      const date = new Date(inv.createdAt);
      const monthName = months[date.getMonth()];
      if (monthName && salesMap[monthName]) {
        salesMap[monthName].billing += inv.totalAmount;
        salesMap[monthName].receipts += inv.amountPaid;
      }
    });

    const salesTrends = months.map(m => ({
      month: m,
      amount: salesMap[m].billing
    }));

    // 2. GST Summary (Billed, Paid, Unpaid)
    let totalGstAmount = 0;
    let gstPaid = 0;
    
    invoices.forEach((inv: any) => {
      const gst = inv.gstAmount || 0;
      totalGstAmount += gst;
      if (inv.status === "PAID") {
        gstPaid += gst;
      } else if (inv.status === "PARTIAL" && inv.totalAmount > 0) {
        gstPaid += gst * (inv.amountPaid / inv.totalAmount);
      }
    });

    const gstUnpaid = totalGstAmount - gstPaid;
    const gstSummary = {
      totalGstAmount,
      gstPaid,
      gstUnpaid
    };

    // 3. Pending Collections Ledger
    const pendingCollections = invoices
      .filter((inv: any) => inv.status !== "PAID")
      .map((inv: any) => {
        const custName = inv.customer?.name || "Unknown Customer";
        const balance = inv.totalAmount - inv.amountPaid;
        return {
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          customerName: custName,
          totalAmount: inv.totalAmount,
          outstanding: balance,
          phone: inv.customer?.phone || ""
        };
      })
      .filter((item: any) => item.outstanding > 0);

    // 4. Customer & Lead Acquisition Analytics
    const totalLeads = leads.length;
    const convertedLeads = leads.filter((l: any) => l.status === "WON").length;
    const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;
    const companyCount = customers.filter((c: any) => c.type === "COMPANY").length;
    const individualCount = customers.filter((c: any) => c.type === "INDIVIDUAL").length;

    const customerAcquisition = {
      totalLeads,
      convertedLeads,
      conversionRate,
      companyCount,
      individualCount
    };

    return NextResponse.json({
      salesTrends,
      gstSummary,
      pendingCollections,
      customerAcquisition
    });
  } catch (e) {
    return NextResponse.json({ error: "Failed to compile reports data" }, { status: 400 });
  }
}
