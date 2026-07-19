"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { 
  DollarSign, KanbanSquare, Package2, ShieldCheck, 
  ArrowUpRight, HardDrive, AlertTriangle, Play, ChevronRight, Activity, Calendar
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";

interface AuditLog {
  id: string;
  userEmail: string;
  action: string;
  details: string;
  timestamp: string;
}

export default function DashboardHome() {
  const { user } = useAuth();
  
  // Dashboard Metrics
  const [revenue, setRevenue] = useState(487220);
  const [leadsCount, setLeadsCount] = useState(3);
  const [logs, setLogs] = useState<AuditLog[]>([]);

  const [storageUsedBytes, setStorageUsedBytes] = useState(1.45 * 1024 * 1024 * 1024);
  const [storageTotalBytes, setStorageTotalBytes] = useState(10 * 1024 * 1024 * 1024);

  const [invoicesList, setInvoicesList] = useState<any[]>([]);
  const [quotesList, setQuotesList] = useState<any[]>([]);

  const fetchDashboardData = async () => {
    try {
      const invRes = await fetch("/api/invoices");
      const leadRes = await fetch("/api/leads");
      const logRes = await fetch("/api/audit-log");
      const storageRes = await fetch("/api/storage");
      const quoteRes = await fetch("/api/quotations");

      if (invRes.ok && leadRes.ok && logRes.ok && storageRes.ok && quoteRes.ok) {
        const invoices = await invRes.json();
        const leads = await leadRes.json();
        const auditLogs = await logRes.json();
        const storage = await storageRes.json();
        const quotations = await quoteRes.json();

        setInvoicesList(invoices);
        setQuotesList(quotations);

        // Calculate metrics
        const totalRev = invoices.reduce((sum: number, i: any) => sum + i.amountPaid, 0);
        setRevenue(totalRev);
        setLeadsCount(leads.length);
        setLogs(auditLogs.slice(0, 5)); // top 5
        setStorageUsedBytes(storage.usedBytes);
        setStorageTotalBytes(storage.totalQuotaBytes);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const storageUsedGB = storageUsedBytes / (1024 * 1024 * 1024);
  const storageTotalGB = storageTotalBytes / (1024 * 1024 * 1024);
  const storagePercent = Math.min((storageUsedBytes / storageTotalBytes) * 100, 100);

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
      {/* Dynamic storage full alert banner */}
      {storageUsedBytes >= storageTotalBytes && (
        <div className="border border-destructive/25 bg-destructive/10 p-4 rounded-xl flex items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
            <div className="text-xs">
              <p className="font-bold text-foreground">Storage Quota Exceeded</p>
              <p className="text-muted-foreground">
                You have reached your {storageTotalGB.toFixed(0)}GB limit. File uploads are disabled.
              </p>
            </div>
          </div>
          <Link
            href="/storage"
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs font-semibold py-1.5 px-4 rounded-lg shadow transition-all shrink-0"
          >
            Upgrade Capacity
          </Link>
        </div>
      )}

      {/* KPI summary tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Revenue */}
        <div className="bg-card/45 border border-border/80 p-5 rounded-xl flex flex-col gap-2 relative group hover:border-border transition-all">
          <div className="flex justify-between items-center text-muted-foreground">
            <span className="text-[10px] font-mono uppercase tracking-wider">Booked Revenue</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-2xl font-bold font-heading font-mono text-foreground leading-none">
            ₹{revenue.toLocaleString("en-IN")}
          </span>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
            <span className="text-emerald-400 font-bold font-mono">+12.4%</span> vs last month
          </span>
        </div>

        {/* Leads */}
        <div className="bg-card/45 border border-border/80 p-5 rounded-xl flex flex-col gap-2 relative group hover:border-border transition-all">
          <div className="flex justify-between items-center text-muted-foreground">
            <span className="text-[10px] font-mono uppercase tracking-wider">Active Leads Pipeline</span>
            <KanbanSquare className="w-4 h-4 text-sky-400" />
          </div>
          <span className="text-2xl font-bold font-heading font-mono text-foreground leading-none">
            {leadsCount} Leads
          </span>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
            {leadsCount > 0 ? "Awaiting measurements" : "Pipeline is empty"}
          </span>
        </div>
      </div>

      {/* Main visualization grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Revenue SVG area chart */}
        <div className="lg:col-span-2 border border-border/80 rounded-xl bg-card/45 backdrop-blur-md p-6 flex flex-col gap-4">
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

        {/* Right cloud storage breakdown */}
        <div className="lg:col-span-1 border border-border/80 rounded-xl bg-card/45 backdrop-blur-md p-6 flex flex-col justify-between gap-5">
          <div className="flex flex-col border-b border-border/40 pb-3">
            <h3 className="font-heading font-semibold text-sm">Storage Utilization</h3>
            <span className="text-[10px] text-muted-foreground">Attached docs and drawings</span>
          </div>

          <div className="flex flex-col items-center gap-3">
            <div className="relative w-24 h-24 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  className="stroke-border fill-none"
                  strokeWidth="8"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  className={`fill-none transition-all duration-500 ${
                    storageUsedBytes >= storageTotalBytes ? "stroke-destructive" : "stroke-primary"
                  }`}
                  strokeWidth="8"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - storagePercent / 100)}`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-base font-bold font-mono leading-none">{storagePercent.toFixed(0)}%</span>
                <span className="text-[8px] text-muted-foreground font-mono mt-0.5">USED</span>
              </div>
            </div>
            
            <p className="text-[11px] font-mono text-muted-foreground text-center">
              Using <span className="font-bold text-foreground">{storageUsedGB.toFixed(2)} GB</span> of {storageTotalGB.toFixed(0)} GB total quota limit.
            </p>
          </div>

          <Link
            href="/storage"
            className="w-full text-center border border-border hover:bg-secondary text-xs font-semibold py-2 rounded-lg transition-all text-foreground"
          >
            Manage Storage & Upgrade
          </Link>
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

      {/* Bottom ledger layout: Recent Audit logs and Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Audit Activity list */}
        <div className="lg:col-span-2 border border-border/80 rounded-xl bg-card/30 p-5 flex flex-col gap-4">
          <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-2 border-b border-border pb-2">
            <Activity className="w-4 h-4 text-primary" />
            <span>Recent System Activity Audit Logs</span>
          </h3>

          <div className="flex flex-col divide-y divide-border/40">
            {logs.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground">
                No logs reported recently.
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="py-2.5 flex justify-between items-center text-xs">
                  <div className="flex flex-col pr-3">
                    <span className="font-semibold text-foreground">{log.details}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      By: {log.userEmail} | {log.action}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString("en-IN")}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Sandboxed shortcuts */}
        <div className="lg:col-span-1 border border-border/80 rounded-xl bg-card/30 p-5 flex flex-col gap-4">
          <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-2 border-b border-border pb-2">
            <Play className="w-4 h-4 text-primary" />
            <span>Workspace Actions</span>
          </h3>

          <div className="flex flex-col gap-2">
            <Link
              href="/leads"
              className="flex justify-between items-center p-3 border rounded-lg bg-card/45 hover:bg-secondary/40 transition-all text-xs font-medium text-foreground"
            >
              <span>View Kanban Pipelines</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Link>
            
            <Link
              href="/quotations"
              className="flex justify-between items-center p-3 border rounded-lg bg-card/45 hover:bg-secondary/40 transition-all text-xs font-medium text-foreground"
            >
              <span>Build Quotations PDF</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
