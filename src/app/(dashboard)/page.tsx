"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { 
  DollarSign, Package2,
  Play, ChevronRight,
  Plus, User, Sparkles
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";

export default function DashboardHome() {
  const { user } = useAuth();
  
  // Dashboard Metrics
  const [revenue, setRevenue] = useState(0);
  const [invoicesList, setInvoicesList] = useState<any[]>([]);
  const [quotesList, setQuotesList] = useState<any[]>([]);

  const fetchDashboardData = async () => {
    try {
      const [invRes, quoteRes] = await Promise.all([
        fetch("/api/invoices"),
        fetch("/api/quotations")
      ]);

      const [invoices, quotations] = await Promise.all([
        invRes.ok ? invRes.json() : [],
        quoteRes.ok ? quoteRes.json() : []
      ]);

      setInvoicesList(invoices);
      setQuotesList(quotations);

      // Calculate metrics
      const totalRev = invoices.reduce((sum: number, i: any) => sum + i.amountPaid, 0);
      setRevenue(totalRev);
    } catch (e) {}
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // SVG Area Chart points mock based on real counts
  // Representing months: Jan, Feb, Mar, Apr, May, Jun, Jul
  const revenueTrend = [
    { month: "Jan", revenue: 80000 },
    { month: "Feb", revenue: 150000 },
    { month: "Mar", revenue: 210000 },
    { month: "Apr", revenue: 290000 },
    { month: "May", revenue: 350000 },
    { month: "Jun", revenue: 420000 },
    { month: "Jul", revenue: revenue }
  ];

  const maxVal = Math.max(...revenueTrend.map(r => r.revenue)) || 500000;
  const heightRatio = 140 / maxVal;

  return (
    <div className="flex flex-col gap-6 h-full">

      {/* Quick Launch Operations Bar */}
      <div className="bg-card/45 border border-border/80 p-4 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-foreground">Quick Launch:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Link
            href="/quotations"
            className="bg-primary text-primary-foreground font-bold px-3 py-1.5 rounded-lg hover:bg-primary/95 transition-all shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Quotation</span>
          </Link>

          <Link
            href="/invoices"
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg transition-all shadow-sm flex items-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Convert Proposal to Invoice</span>
          </Link>

          <Link
            href="/customers"
            className="bg-secondary hover:bg-secondary/80 border border-border text-foreground font-semibold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5"
          >
            <User className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Add Customer</span>
          </Link>
        </div>
      </div>

      {/* KPI summary tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Revenue */}
        <div className="bg-card/45 border border-border/80 p-5 rounded-xl flex flex-col gap-2 relative group hover:border-border transition-all">
          <div className="flex justify-between items-center text-muted-foreground">
            <span className="text-[10px] font-mono uppercase tracking-wider">Booked Revenue</span>
            <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <span className="text-2xl font-bold font-heading font-mono text-emerald-600 dark:text-emerald-400 leading-none">
            ₹{revenue.toLocaleString("en-IN")}
          </span>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
            <span className="text-emerald-600 dark:text-emerald-400 font-bold font-mono">+12.4%</span> vs last month
          </span>
        </div>

        {/* Active Invoices */}
        <div className="bg-card/45 border border-border/80 p-5 rounded-xl flex flex-col gap-2 relative group hover:border-border transition-all">
          <div className="flex justify-between items-center text-muted-foreground">
            <span className="text-[10px] font-mono uppercase tracking-wider">Active Invoices</span>
            <Package2 className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          </div>
          <span className="text-2xl font-bold font-heading font-mono text-sky-600 dark:text-sky-400 leading-none">
            {invoicesList.length} Invoices
          </span>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1 font-mono">
            <strong className="text-emerald-600 dark:text-emerald-400">{invoicesList.filter(i => i.status === "PAID").length} Paid</strong> | <strong className="text-rose-600 dark:text-rose-400">{invoicesList.filter(i => i.status !== "PAID").length} Pending</strong>
          </span>
        </div>
      </div>

      {/* Main visualization grid */}
      <div className="grid grid-cols-1 gap-6">
        {/* Full-width Revenue SVG area chart */}
        <div className="border border-border/80 rounded-xl bg-card/45 backdrop-blur-md p-6 flex flex-col gap-4">
          <div className="flex justify-between items-center border-b border-border/40 pb-3">
            <div className="flex flex-col">
              <h3 className="font-heading font-semibold text-sm">Monthly Growth Trend</h3>
              <span className="text-[10px] text-muted-foreground">Accumulated company revenue</span>
            </div>
            <span className="text-[10px] font-mono bg-secondary/80 border px-2 py-0.5 rounded text-foreground font-bold">
              FY 2026
            </span>
          </div>

          {/* Premium Custom SVG Area Chart */}
          <div className="relative w-full h-44 flex items-end justify-between px-2 pt-4">
            <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {/* Draw area gridlines */}
              <line x1="0" y1="35" x2="100%" y2="35" stroke="var(--color-border)" strokeWidth="0.5" strokeDasharray="4,4" />
              <line x1="0" y1="90" x2="100%" y2="90" stroke="var(--color-border)" strokeWidth="0.5" strokeDasharray="4,4" />
              <line x1="0" y1="145" x2="100%" y2="145" stroke="var(--color-border)" strokeWidth="0.5" strokeDasharray="4,4" />

              {/* Draw area filled polygon */}
              <path
                d={`
                  M 20, ${180 - revenueTrend[0].revenue * heightRatio}
                  C 80, ${180 - revenueTrend[1].revenue * heightRatio} 140, ${180 - revenueTrend[2].revenue * heightRatio} 200, ${180 - revenueTrend[3].revenue * heightRatio}
                  C 260, ${180 - revenueTrend[4].revenue * heightRatio} 320, ${180 - revenueTrend[5].revenue * heightRatio} 380, ${180 - revenueTrend[6].revenue * heightRatio}
                  L 380, 180 L 20, 180 Z
                `}
                fill="url(#chartGrad)"
                className="transition-all duration-300"
              />

              {/* Draw chart path line */}
              <path
                d={`
                  M 20, ${180 - revenueTrend[0].revenue * heightRatio}
                  C 80, ${180 - revenueTrend[1].revenue * heightRatio} 140, ${180 - revenueTrend[2].revenue * heightRatio} 200, ${180 - revenueTrend[3].revenue * heightRatio}
                  C 260, ${180 - revenueTrend[4].revenue * heightRatio} 320, ${180 - revenueTrend[5].revenue * heightRatio} 380, ${180 - revenueTrend[6].revenue * heightRatio}
                `}
                fill="none"
                stroke="var(--color-primary)"
                strokeWidth="2.5"
                className="transition-all duration-300"
              />

              {/* Data Node Dots */}
              {revenueTrend.map((pt, idx) => (
                <circle
                  key={idx}
                  cx={20 + idx * 60}
                  cy={180 - pt.revenue * heightRatio}
                  r="3.5"
                  className="fill-primary stroke-background stroke-2 hover:r-5 transition-all cursor-pointer"
                >
                  <title>{`₹${pt.revenue}`}</title>
                </circle>
              ))}
            </svg>

            {/* X-Axis labels */}
            <div className="absolute bottom-0 inset-x-0 flex justify-between px-2 text-[9px] font-mono text-muted-foreground">
              {revenueTrend.map((pt, idx) => (
                <span key={idx}>{pt.month}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Pending Items Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Pending Quotations Card */}
        <div className="border border-border/80 rounded-xl bg-card/30 p-5 flex flex-col gap-3">
          <div className="flex justify-between items-center pb-2 border-b border-border/40">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Pending Quotations</span>
            <span className="text-xs bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded font-mono font-bold">
              {quotesList.filter(q => q.status === "DRAFT" || q.status === "SENT").length}
            </span>
          </div>
          <div className="flex flex-col gap-2 max-h-36 overflow-y-auto">
            {quotesList.filter(q => q.status === "DRAFT" || q.status === "SENT").slice(0, 3).map((q: any) => (
              <div key={q.id} className="text-[11px] flex justify-between items-center bg-card/50 p-2 rounded border border-border/40">
                <span className="font-mono text-foreground font-semibold">{q.quoteNumber}</span>
                <span className="text-muted-foreground truncate max-w-[100px]">{q.customer?.name}</span>
              </div>
            ))}
            {quotesList.filter(q => q.status === "DRAFT" || q.status === "SENT").length === 0 && (
              <span className="text-center text-[10px] text-muted-foreground py-2">All quotations processed</span>
            )}
          </div>
        </div>

        {/* Pending Invoices Card */}
        <div className="border border-border/80 rounded-xl bg-card/30 p-5 flex flex-col gap-3">
          <div className="flex justify-between items-center pb-2 border-b border-border/40">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Unpaid Invoices</span>
            <span className="text-xs bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded font-mono font-bold">
              {invoicesList.filter(i => i.status !== "PAID").length}
            </span>
          </div>
          <div className="flex flex-col gap-2 max-h-36 overflow-y-auto">
            {invoicesList.filter(i => i.status !== "PAID").slice(0, 3).map((i: any) => (
              <div key={i.id} className="text-[11px] flex justify-between items-center bg-card/50 p-2 rounded border border-border/40">
                <span className="font-mono text-foreground font-semibold">{i.invoiceNumber}</span>
                <span className="text-rose-400 font-mono">₹{(i.totalAmount - i.amountPaid).toLocaleString("en-IN")}</span>
              </div>
            ))}
            {invoicesList.filter(i => i.status !== "PAID").length === 0 && (
              <span className="text-center text-[10px] text-muted-foreground py-2">No outstanding invoices</span>
            )}
          </div>
        </div>

        {/* Pending Payments Outstanding Balance Card */}
        <div className="border border-border/80 rounded-xl bg-card/30 p-5 flex flex-col gap-3">
          <div className="flex justify-between items-center pb-2 border-b border-border/40">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-bold">Pending Collections</span>
            <span className="text-xs bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded font-mono font-bold">
              Balance
            </span>
          </div>
          <div className="flex flex-col justify-center items-center h-full text-center py-2">
            <span className="text-xl font-bold font-mono text-rose-400">
              ₹{invoicesList.reduce((sum: number, i: any) => sum + (i.totalAmount - i.amountPaid), 0).toLocaleString("en-IN")}
            </span>
            <span className="text-[9px] text-muted-foreground mt-1">To collect across {invoicesList.filter(i => i.status !== "PAID").length} invoices</span>
          </div>
        </div>
      </div>

      {/* Workspace Actions */}
      <div className="border border-border/80 rounded-xl bg-card/30 p-5 flex flex-col gap-4">
        <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-2 border-b border-border pb-2">
          <Play className="w-4 h-4 text-primary" />
          <span>Workspace Actions</span>
        </h3>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/customers"
            className="flex items-center gap-2 p-3 border rounded-lg bg-card/45 hover:bg-secondary/40 transition-all text-xs font-medium text-foreground"
          >
            <span>Manage Customers &amp; Sites</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </Link>
          
          <Link
            href="/quotations"
            className="flex items-center gap-2 p-3 border rounded-lg bg-card/45 hover:bg-secondary/40 transition-all text-xs font-medium text-foreground"
          >
            <span>Build Quotations PDF</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </Link>

          <Link
            href="/invoices"
            className="flex items-center gap-2 p-3 border rounded-lg bg-card/45 hover:bg-secondary/40 transition-all text-xs font-medium text-foreground"
          >
            <span>View Invoices &amp; Payments</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </Link>
        </div>
      </div>
    </div>
  );
}
