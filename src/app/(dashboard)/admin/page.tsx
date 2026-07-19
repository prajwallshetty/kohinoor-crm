"use client";

import React, { useEffect, useState } from "react";
import { 
  Settings, Building, CreditCard, Landmark, FileText, 
  Users, ShieldCheck, Check, RefreshCw, Eye, ShieldAlert
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";

interface CompanyBranding {
  companyName: string;
  logoUrl: string;
  gstNumber: string;
  bankName: string;
  bankAccountNo: string;
  bankIfsc: string;
  invoiceTerms: string;
  quotationTerms: string;
}

export default function AdminSettingsPage() {
  const { user } = useAuth();
  
  // Settings Form State
  const [companyName, setCompanyName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccountNo, setBankAccountNo] = useState("");
  const [bankIfsc, setBankIfsc] = useState("");
  const [invoiceTerms, setInvoiceTerms] = useState("");
  const [quotationTerms, setQuotationTerms] = useState("");

  const [notification, setNotification] = useState("");
  const [loading, setLoading] = useState(true);

  // Users listing state
  const [systemUsers, setSystemUsers] = useState([
    { name: "Administrator", email: "owner@kohinoor.com", status: "Active" }
  ]);

  const fetchBranding = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/branding");
      if (res.ok) {
        const data: CompanyBranding = await res.json();
        setCompanyName(data.companyName || "Kohinoor Shutters");
        setLogoUrl(data.logoUrl || "");
        setGstNumber(data.gstNumber || "");
        setBankName(data.bankName || "");
        setBankAccountNo(data.bankAccountNo || "");
        setBankIfsc(data.bankIfsc || "");
        setInvoiceTerms(data.invoiceTerms || "");
        setQuotationTerms(data.quotationTerms || "");
      }
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => {
    fetchBranding();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/branding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          logoUrl,
          gstNumber,
          bankName,
          bankAccountNo,
          bankIfsc,
          invoiceTerms,
          quotationTerms
        })
      });

      if (res.ok) {
        setNotification("Branding settings saved successfully!");
        setTimeout(() => setNotification(""), 3000);
        fetchBranding();
      }
    } catch (e) {}
  };

  // Restrict access
  if (!user) return null;

  return (
    <div className="flex flex-col gap-6 h-full relative">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-4 right-4 bg-primary text-primary-foreground text-xs px-4 py-3 rounded-lg shadow-xl z-50 flex items-center gap-2 border border-primary/20 animate-bounce">
          <Check className="w-4 h-4" />
          <span>{notification}</span>
        </div>
      )}

      {/* Main Grid: Settings Form left, Visual live preview right */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        
        {/* Left Settings inputs form */}
        <div className="xl:col-span-2 border border-border/80 rounded-xl bg-card/45 backdrop-blur-md p-6 flex flex-col gap-5">
          <h2 className="text-sm font-bold font-heading uppercase tracking-wider text-muted-foreground border-b border-border pb-2 flex justify-between items-center">
            <span className="flex items-center gap-2">
              <Building className="w-4 h-4 text-primary" />
              <span>Company Profile & Templates Settings</span>
            </span>
            <button onClick={fetchBranding} className="text-muted-foreground hover:text-foreground">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </h2>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">Company Registered Name</label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full bg-secondary/40 border border-border rounded-md px-3 py-1.5 text-xs outline-none text-foreground"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">GST Registration Number</label>
                <input
                  type="text"
                  placeholder="27AAACK5912K1Z9"
                  value={gstNumber}
                  onChange={(e) => setGstNumber(e.target.value)}
                  className="w-full bg-secondary/40 border border-border rounded-md px-3 py-1.5 text-xs outline-none text-foreground font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-border/40 pt-4">
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Bank Name</label>
                <input
                  type="text"
                  placeholder="State Bank of India"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full bg-secondary/40 border border-border rounded-md px-3 py-1.5 text-xs outline-none text-foreground"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Account Number</label>
                <input
                  type="text"
                  placeholder="38927103829"
                  value={bankAccountNo}
                  onChange={(e) => setBankAccountNo(e.target.value)}
                  className="w-full bg-secondary/40 border border-border rounded-md px-3 py-1.5 text-xs outline-none text-foreground font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Bank IFSC Code</label>
                <input
                  type="text"
                  placeholder="SBIN0004561"
                  value={bankIfsc}
                  onChange={(e) => setBankIfsc(e.target.value)}
                  className="w-full bg-secondary/40 border border-border rounded-md px-3 py-1.5 text-xs outline-none text-foreground font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-border/40 pt-4">
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Quotation Terms Template</label>
                <textarea
                  rows={3}
                  placeholder="Quotation default terms & conditions"
                  value={quotationTerms}
                  onChange={(e) => setQuotationTerms(e.target.value)}
                  className="w-full bg-secondary/40 border border-border rounded-md px-3 py-1.5 text-xs outline-none text-foreground resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Invoice Terms Template</label>
                <textarea
                  rows={3}
                  placeholder="Invoice default terms & conditions"
                  value={invoiceTerms}
                  onChange={(e) => setInvoiceTerms(e.target.value)}
                  className="w-full bg-secondary/40 border border-border rounded-md px-3 py-1.5 text-xs outline-none text-foreground resize-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-primary text-primary-foreground font-semibold py-2.5 rounded-lg text-xs hover:bg-primary/95 shadow-md shadow-primary/25 cursor-pointer"
            >
              Commit Branding Configurations
            </button>
          </form>
        </div>

        {/* Right Live Preview & User List */}
        <div className="xl:col-span-1 flex flex-col gap-6">
          {/* Live Print Header Preview */}
          <div className="border border-border/80 rounded-xl bg-card/35 backdrop-blur-md p-5 flex flex-col gap-3">
            <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 border-b border-border/40 pb-2">
              <Eye className="w-3.5 h-3.5 text-primary" />
              <span>Live Printed Header Preview</span>
            </h3>

            <div className="bg-white border rounded p-4 text-slate-800 flex justify-between items-center text-[10px] leading-relaxed">
              <div className="flex flex-col">
                <span className="font-bold text-slate-900 uppercase font-sans tracking-tight">
                  {companyName || "Kohinoor Shutters"}
                </span>
                <span className="text-slate-400 text-[8px] font-mono leading-none mt-0.5">
                  GST: {gstNumber || "AWAITING CODE"}
                </span>
                <span className="text-slate-400 text-[8px] font-mono leading-none mt-0.5">
                  Bank: {bankName || "SBI"}
                </span>
              </div>
              
              <div className="w-8 h-8 bg-slate-900 text-white font-bold rounded flex items-center justify-center text-sm font-sans shrink-0">
                {companyName ? companyName.charAt(0).toUpperCase() : "K"}
              </div>
            </div>
            <span className="text-[9px] text-muted-foreground font-mono text-center block">
              Header preview auto-updates as you type.
            </span>
          </div>

          {/* User management list */}
          <div className="border border-border/80 rounded-xl bg-card/30 p-5 flex flex-col gap-3">
            <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 border-b border-border/40 pb-2">
              <Users className="w-3.5 h-3.5 text-primary" />
              <span>Registered Accounts ({systemUsers.length})</span>
            </h3>

            <div className="flex flex-col gap-3">
              {systemUsers.map((u) => (
                <div key={u.email} className="bg-secondary/20 border border-border/60 p-3 rounded-lg flex justify-between items-center text-xs">
                  <div className="flex flex-col gap-0.5 pr-2">
                    <span className="font-bold text-foreground">{u.name}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">{u.email}</span>
                  </div>
                  
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[8px] text-emerald-400 font-bold font-mono">
                      ● {u.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
