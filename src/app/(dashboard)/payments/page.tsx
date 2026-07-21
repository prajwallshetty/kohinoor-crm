"use client";

import React, { useEffect, useState } from "react";
import { 
  CreditCard, Search, Landmark, Banknote, HelpCircle, 
  ArrowDownRight, Check, RefreshCw, Download, FileText, Printer
} from "lucide-react";
import { PageSkeleton } from "@/components/ui/loaders";

interface Customer {
  name: string;
}

interface Invoice {
  invoiceNumber: string;
  customer?: Customer;
}

interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  paymentType: "ADVANCE" | "REMAINING";
  paymentMethod: "UPI" | "CASH" | "BANK";
  transactionRef: string;
  createdAt: string;
  invoice?: Invoice;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/payments");
      if (res.ok) {
        setPayments(await res.json());
      }
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const filteredPayments = payments.filter(p => 
    p.transactionRef?.toLowerCase().includes(search.toLowerCase()) ||
    (p.invoice?.invoiceNumber && p.invoice.invoiceNumber.toLowerCase().includes(search.toLowerCase())) ||
    (p.invoice?.customer?.name && p.invoice.customer.name.toLowerCase().includes(search.toLowerCase()))
  );

  // Compute metrics
  const totalReceived = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
  const upiTotal = filteredPayments.filter(p => p.paymentMethod === "UPI").reduce((sum, p) => sum + p.amount, 0);
  const cashTotal = filteredPayments.filter(p => p.paymentMethod === "CASH").reduce((sum, p) => sum + p.amount, 0);
  const bankTotal = filteredPayments.filter(p => p.paymentMethod === "BANK").reduce((sum, p) => sum + p.amount, 0);

  const exportCSV = () => {
    const headers = ["Transaction ID", "Invoice No", "Customer", "Allocation", "Payment Method", "Reference UTR", "Amount", "Date"];
    const rows = filteredPayments.map(p => [
      p.id,
      p.invoice?.invoiceNumber || "N/A",
      p.invoice?.customer?.name || "Individual",
      p.paymentType || "INSTALMENT",
      p.paymentMethod || "UPI",
      p.transactionRef || "",
      p.amount.toString(),
      p.createdAt ? new Date(p.createdAt).toLocaleString("en-IN") : "N/A"
    ]);
    const csvContent = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payment_ledger_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    window.print();
  };

  if (loading) return <PageSkeleton rows={6} />;

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Top metrics grids */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Ledger */}
        <div className="bg-card/45 border border-border/80 p-5 rounded-xl flex flex-col gap-2">
          <div className="flex justify-between items-center text-muted-foreground">
            <span className="text-[10px] font-mono uppercase tracking-wider">Total Received (Ledger)</span>
            <ArrowDownRight className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-xl font-bold font-heading font-mono text-foreground">
            ₹{totalReceived.toLocaleString("en-IN")}
          </span>
        </div>

        {/* UPI Ledger */}
        <div className="bg-card/45 border border-border/80 p-5 rounded-xl flex flex-col gap-2">
          <div className="flex justify-between items-center text-muted-foreground">
            <span className="text-[10px] font-mono uppercase tracking-wider">UPI Collections</span>
            <Landmark className="w-4 h-4 text-sky-400" />
          </div>
          <span className="text-xl font-bold font-heading font-mono text-foreground">
            ₹{upiTotal.toLocaleString("en-IN")}
          </span>
        </div>

        {/* Cash Ledger */}
        <div className="bg-card/45 border border-border/80 p-5 rounded-xl flex flex-col gap-2">
          <div className="flex justify-between items-center text-muted-foreground">
            <span className="text-[10px] font-mono uppercase tracking-wider">Cash Ledger</span>
            <Banknote className="w-4 h-4 text-amber-400" />
          </div>
          <span className="text-xl font-bold font-heading font-mono text-foreground">
            ₹{cashTotal.toLocaleString("en-IN")}
          </span>
        </div>

        {/* Bank Transfers */}
        <div className="bg-card/45 border border-border/80 p-5 rounded-xl flex flex-col gap-2">
          <div className="flex justify-between items-center text-muted-foreground">
            <span className="text-[10px] font-mono uppercase tracking-wider">Direct Bank Transfer</span>
            <CreditCard className="w-4 h-4 text-indigo-400" />
          </div>
          <span className="text-xl font-bold font-heading font-mono text-foreground">
            ₹{bankTotal.toLocaleString("en-IN")}
          </span>
        </div>
      </div>

      {/* Header controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card/45 border border-border/80 p-4 rounded-xl">
        <div className="relative flex-grow max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search payments by invoice, client, or UTR/reference..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-secondary/40 border border-border/80 rounded-lg py-2 pl-10 pr-4 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/60 transition-all duration-150"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-semibold transition-all print-hidden"
            title="Export CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
          <button
            onClick={exportPDF}
            className="flex items-center gap-1.5 px-3 py-2 bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary rounded-lg text-xs font-semibold transition-all print-hidden"
            title="Print / Save PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>PDF</span>
          </button>
          <button
            onClick={fetchPayments}
            className="p-2 bg-secondary/60 hover:bg-secondary border border-border/80 text-muted-foreground hover:text-foreground rounded-lg transition-all print-hidden"
            title="Refresh ledger"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Table grid */}
      <div className="border border-border/80 rounded-xl bg-card/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-secondary/20 text-[10px] font-mono uppercase tracking-wider text-muted-foreground border-b border-border/60">
                <th className="p-4">Transaction ID</th>
                <th className="p-4">Invoice No</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Allocation</th>
                <th className="p-4">Payment Method</th>
                <th className="p-4">Reference UTR</th>
                <th className="p-4 text-right">Amount</th>
                <th className="p-4">Logged Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center p-8 text-muted-foreground">
                    Fetching accounting records...
                  </td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center p-8 text-muted-foreground">
                    No payment logs recorded.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => {
                  const amt = Number(p.amount || 0);
                  const method = p.paymentMethod || "UPI";

                  return (
                    <tr key={p.id} className="hover:bg-secondary/25 transition-colors">
                      <td className="p-4 font-mono text-muted-foreground/60">{p.id}</td>
                      <td className="p-4 font-bold text-foreground font-mono">
                        {p.invoice?.invoiceNumber || "N/A"}
                      </td>
                      <td className="p-4 font-semibold text-foreground">
                        {p.invoice?.customer?.name || "Individual"}
                      </td>
                      <td className="p-4">
                        <span className="font-bold text-foreground text-[11px] px-2 py-0.5 rounded bg-secondary/80 border border-border">
                          {p.paymentType || "INSTALMENT"}
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                            method === "UPI"
                              ? "bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30"
                              : method === "CASH"
                              ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"
                              : method === "BANK"
                              ? "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-500/30"
                              : "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30"
                          }`}
                        >
                          {method}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-muted-foreground">
                        {p.transactionRef ? (
                          <span className="bg-card/80 border px-1.5 py-0.5 rounded text-foreground font-bold">
                            {p.transactionRef}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/60 italic">None</span>
                        )}
                      </td>
                      <td className="p-4 text-right font-bold text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                        +₹{amt.toLocaleString("en-IN")}
                      </td>
                      <td className="p-4 text-muted-foreground font-mono text-[11px]">
                        {p.createdAt ? new Date(p.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "N/A"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
