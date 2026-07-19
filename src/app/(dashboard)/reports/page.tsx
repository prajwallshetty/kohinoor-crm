"use client";

import React, { useEffect, useState } from "react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area, Legend
} from "recharts";
import { 
  BarChart3, Coins, Users, Percent, TrendingUp, Download, 
  ArrowUpRight, AlertCircle, Phone, Search, FileText, CheckCircle2 
} from "lucide-react";

interface SalesTrend {
  month: string;
  amount: number;
}

interface GstSummary {
  totalGstAmount: number;
  gstPaid: number;
  gstUnpaid: number;
}

interface PendingCollection {
  id: string;
  invoiceNumber: string;
  customerName: string;
  totalAmount: number;
  outstanding: number;
  phone: string;
}

interface CustomerAcquisition {
  totalLeads: number;
  convertedLeads: number;
  conversionRate: number;
  companyCount: number;
  individualCount: number;
}

interface ReportData {
  salesTrends: SalesTrend[];
  gstSummary: GstSummary;
  pendingCollections: PendingCollection[];
  customerAcquisition: CustomerAcquisition;
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<"sales" | "tax" | "collections" | "acquisition">("sales");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reports");
      if (res.ok) {
        setData(await res.json());
      }
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => {
    fetchReportData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-160px)]">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-mono text-muted-foreground">Calculating Business Metrics...</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 text-center text-xs text-rose-400">
        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-rose-500" />
        <span>Failed to compile business reports. Please check database connectivity.</span>
      </div>
    );
  }

  // Calculate high-level summary cards from report details
  const totalBilled = data.salesTrends.reduce((sum, item) => sum + item.amount, 0);
  const pendingGst = data.gstSummary.gstUnpaid;
  const pendingAmt = data.pendingCollections.reduce((sum, item) => sum + item.outstanding, 0);
  const rateOfConversion = data.customerAcquisition.conversionRate;

  // Filter collections
  const filteredCollections = data.pendingCollections.filter(item => 
    item.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 font-sans">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary animate-pulse" />
            <span>Business Reports & Intelligence</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time analytics for sales performance, tax ledgers, outstanding balances, and lead metrics.
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="border border-border bg-secondary/50 hover:bg-secondary text-xs font-semibold py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition-all text-foreground"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export PDF Report</span>
        </button>
      </div>

      {/* KPI Stats Panel Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border p-4 rounded-xl flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-muted-foreground">
            <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">Total Revenue (FY)</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-xl font-bold font-mono text-foreground">
            ₹{totalBilled.toLocaleString("en-IN")}
          </span>
          <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-0.5">
            <ArrowUpRight className="w-3 h-3" />
            <span>+14.2% vs last quarter</span>
          </span>
        </div>

        <div className="bg-card border border-border p-4 rounded-xl flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-muted-foreground">
            <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">Pending Collection</span>
            <Coins className="w-4 h-4 text-rose-400" />
          </div>
          <span className="text-xl font-bold font-mono text-rose-400">
            ₹{pendingAmt.toLocaleString("en-IN")}
          </span>
          <span className="text-[10px] text-muted-foreground font-mono">
            Across {data.pendingCollections.length} unpaid invoices
          </span>
        </div>

        <div className="bg-card border border-border p-4 rounded-xl flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-muted-foreground">
            <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">Tax Liability (GST)</span>
            <FileText className="w-4 h-4 text-amber-400" />
          </div>
          <span className="text-xl font-bold font-mono text-amber-400">
            ₹{pendingGst.toLocaleString("en-IN")}
          </span>
          <span className="text-[10px] text-muted-foreground font-mono">
            Pending GST remittance to treasury
          </span>
        </div>

        <div className="bg-card border border-border p-4 rounded-xl flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-muted-foreground">
            <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">Lead Conversion Rate</span>
            <Percent className="w-4 h-4 text-indigo-400" />
          </div>
          <span className="text-xl font-bold font-mono text-foreground">
            {rateOfConversion.toFixed(1)}%
          </span>
          <span className="text-[10px] text-indigo-400 font-mono">
            {data.customerAcquisition.convertedLeads} converted of {data.customerAcquisition.totalLeads} leads
          </span>
        </div>
      </div>

      {/* Segmented Sub-module tabs */}
      <div className="flex border-b border-border select-none overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveSubTab("sales")}
          className={`px-5 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
            activeSubTab === "sales" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Sales Trends</span>
        </button>

        <button
          onClick={() => setActiveSubTab("tax")}
          className={`px-5 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
            activeSubTab === "tax" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Coins className="w-4 h-4" />
          <span>GST Liability Ledger</span>
        </button>

        <button
          onClick={() => setActiveSubTab("collections")}
          className={`px-5 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
            activeSubTab === "collections" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Pending Collections</span>
        </button>

        <button
          onClick={() => setActiveSubTab("acquisition")}
          className={`px-5 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
            activeSubTab === "acquisition" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Customer & Lead Analytics</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div className="min-h-80">
        {/* TAB 1: SALES TRENDS */}
        {activeSubTab === "sales" && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 bg-card border border-border p-6 rounded-xl flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-mono uppercase tracking-wider text-foreground font-bold">
                  Invoiced Sales Performance (Monthly Trend)
                </h3>
              </div>
              <div className="w-full h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.salesTrends} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={10} className="font-mono" />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} className="font-mono" tickFormatter={(v) => `₹${v/1000}k`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "rgba(10,10,10,0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }}
                      labelStyle={{ color: "hsl(var(--muted-foreground))", fontSize: "11px", fontWeight: "bold" }}
                      itemStyle={{ color: "hsl(var(--primary))", fontSize: "12px", fontFamily: "monospace" }}
                    />
                    <Area type="monotone" dataKey="amount" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorSales)" strokeWidth={2} name="Total Invoiced" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-card border border-border p-6 rounded-xl flex flex-col gap-4">
              <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                Revenue Ledger By Month
              </h3>
              <div className="flex-grow overflow-y-auto max-h-80 border border-border rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-secondary/40 text-[9px] font-mono uppercase tracking-wider text-muted-foreground border-b border-border">
                      <th className="p-3">Month</th>
                      <th className="p-3 text-right">Invoiced Amt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.salesTrends.map((s, idx) => (
                      <tr key={idx} className="hover:bg-secondary/15">
                        <td className="p-3 font-semibold text-foreground">{s.month}</td>
                        <td className="p-3 text-right font-mono font-bold">₹{s.amount.toLocaleString("en-IN")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: GST LIABILITY LEDGER */}
        {activeSubTab === "tax" && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 bg-card border border-border p-6 rounded-xl flex flex-col gap-6">
              <div className="flex justify-between items-center border-b border-border pb-3">
                <h3 className="text-xs font-mono uppercase tracking-wider text-foreground font-bold">
                  GST Remittance Breakdown
                </h3>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-secondary/20 p-4 border border-border/80 rounded-xl flex flex-col gap-1">
                  <span className="text-[9px] font-mono text-muted-foreground uppercase">GST Billed (Total)</span>
                  <span className="text-base font-bold font-mono text-foreground">
                    ₹{data.gstSummary.totalGstAmount.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="bg-emerald-500/5 p-4 border border-emerald-500/10 rounded-xl flex flex-col gap-1">
                  <span className="text-[9px] font-mono text-emerald-400 uppercase">GST Collected (Paid)</span>
                  <span className="text-base font-bold font-mono text-emerald-400">
                    ₹{data.gstSummary.gstPaid.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="bg-rose-500/5 p-4 border border-rose-500/10 rounded-xl flex flex-col gap-1">
                  <span className="text-[9px] font-mono text-rose-400 uppercase">GST Outstanding (Unpaid)</span>
                  <span className="text-base font-bold font-mono text-rose-400">
                    ₹{data.gstSummary.gstUnpaid.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              <div className="w-full h-64 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { name: "Total GST Billed", amount: data.gstSummary.totalGstAmount, fill: "#3b82f6" },
                    { name: "GST Collected", amount: data.gstSummary.gstPaid, fill: "#10b981" },
                    { name: "GST Outstanding", amount: data.gstSummary.gstUnpaid, fill: "#f43f5e" }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} className="font-mono" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "rgba(10,10,10,0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }}
                      itemStyle={{ color: "#fff", fontSize: "12px" }}
                    />
                    <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={50} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-card border border-border p-6 rounded-xl flex flex-col gap-4">
              <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <span>GST Tax Compliance Notes</span>
              </h3>
              <div className="space-y-4 text-xs leading-relaxed text-muted-foreground">
                <p>
                  As a rolling shutter manufacturer, GST is calculated at standard rate options. Ensure all item-level catalog listings carry precise GST configuration.
                </p>
                <div className="bg-secondary/20 border border-border p-3 rounded-lg flex flex-col gap-2 font-mono text-[10px]">
                  <span className="font-bold text-foreground">Pending remittal checks:</span>
                  <span>1. CGST / SGST breakdown for local supply site state.</span>
                  <span>2. IGST applicable on cross-state dealer dispatches.</span>
                  <span>3. Remit GST amount only upon actual invoice clearance.</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: PENDING COLLECTIONS LEDGER */}
        {activeSubTab === "collections" && (
          <div className="bg-card border border-border p-6 rounded-xl flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row justify-between gap-3 sm:items-center">
              <div>
                <h3 className="text-xs font-mono uppercase tracking-wider text-foreground font-bold">
                  Defaulter Ledger & Collections Queue
                </h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Follow up with clients who have unpaid invoice balances.
                </p>
              </div>

              <div className="relative min-w-[240px]">
                <input
                  type="text"
                  placeholder="Filter by customer name / invoice..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-secondary/40 border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs outline-none text-foreground"
                />
                <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
              </div>
            </div>

            <div className="border border-border rounded-xl overflow-hidden mt-2">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-secondary/40 text-[9px] font-mono uppercase tracking-wider text-muted-foreground border-b border-border">
                    <th className="p-3 font-semibold">Invoice No</th>
                    <th className="p-3 font-semibold">Client Name</th>
                    <th className="p-3 font-semibold">Phone Contact</th>
                    <th className="p-3 text-right font-semibold">Invoice Total</th>
                    <th className="p-3 text-right font-semibold">Deficit / Outstanding</th>
                    <th className="p-3 text-center font-semibold">Call Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredCollections.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center p-8 text-muted-foreground italic">
                        No pending collections found matching search filter. All cleared!
                      </td>
                    </tr>
                  ) : (
                    filteredCollections.map((col) => (
                      <tr key={col.id} className="hover:bg-secondary/15">
                        <td className="p-3 font-mono font-bold text-foreground">{col.invoiceNumber}</td>
                        <td className="p-3 font-medium text-foreground">{col.customerName}</td>
                        <td className="p-3 font-mono text-muted-foreground">{col.phone || "N/A"}</td>
                        <td className="p-3 text-right font-mono">₹{col.totalAmount.toLocaleString("en-IN")}</td>
                        <td className="p-3 text-right font-mono font-bold text-rose-400">₹{col.outstanding.toLocaleString("en-IN")}</td>
                        <td className="p-3 text-center">
                          <a
                            href={`tel:${col.phone}`}
                            className="inline-flex items-center gap-1 text-[10px] bg-secondary hover:bg-secondary/80 border border-border px-2 py-1 rounded transition-all text-foreground font-semibold"
                          >
                            <Phone className="w-3 h-3 text-primary" />
                            <span>Call Remind</span>
                          </a>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: CUSTOMER & LEAD ACQUISITION METRICS */}
        {activeSubTab === "acquisition" && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 bg-card border border-border p-6 rounded-xl flex flex-col gap-4">
              <h3 className="text-xs font-mono uppercase tracking-wider text-foreground font-bold border-b border-border pb-3">
                Customer Breakdown by Profile Category
              </h3>
              <div className="grid grid-cols-2 gap-4 my-2">
                <div className="bg-secondary/20 p-5 border border-border/80 rounded-xl flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-mono text-muted-foreground uppercase">Dealers & Businesses</span>
                    <span className="text-2xl font-bold font-mono text-foreground">
                      {data.customerAcquisition.companyCount}
                    </span>
                  </div>
                  <Users className="w-8 h-8 text-primary/30" />
                </div>

                <div className="bg-secondary/20 p-5 border border-border/80 rounded-xl flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-mono text-muted-foreground uppercase">Individual Clients</span>
                    <span className="text-2xl font-bold font-mono text-foreground">
                      {data.customerAcquisition.individualCount}
                    </span>
                  </div>
                  <Users className="w-8 h-8 text-indigo-400/30" />
                </div>
              </div>

              <div className="w-full h-56 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { name: "Dealers/B2B Companies", count: data.customerAcquisition.companyCount },
                    { name: "Direct B2C Individuals", count: data.customerAcquisition.individualCount }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} className="font-mono" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "rgba(10,10,10,0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }}
                      itemStyle={{ color: "#fff", fontSize: "12px" }}
                    />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-card border border-border p-6 rounded-xl flex flex-col gap-4">
              <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold border-b border-border pb-3">
                Lead Conversion funnel
              </h3>
              <div className="flex-grow flex flex-col justify-center gap-5 font-mono text-xs">
                <div className="flex justify-between items-center">
                  <span>Total Leads Ingested</span>
                  <span className="font-bold font-mono">{data.customerAcquisition.totalLeads}</span>
                </div>
                <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden">
                  <div className="bg-indigo-500 h-2.5" style={{ width: "100%" }}></div>
                </div>

                <div className="flex justify-between items-center">
                  <span>Converted (Won) Leads</span>
                  <span className="font-bold font-mono text-emerald-400">
                    {data.customerAcquisition.convertedLeads}
                  </span>
                </div>
                <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-400 h-2.5" style={{ width: `${rateOfConversion}%` }}></div>
                </div>

                <div className="text-center bg-emerald-500/10 border border-emerald-500/20 py-2.5 rounded-lg text-emerald-400 font-bold">
                  Funnel Efficiency: {rateOfConversion.toFixed(1)}% Conversion Rate
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
