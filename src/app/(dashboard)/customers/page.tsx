"use client";

import React, { useEffect, useState } from "react";
import { 
  Plus, Search, MapPin, Building, User, Mail, Phone, FileText, 
  ChevronRight, Check, DollarSign, MessageSquare, 
  Trash2, Receipt, CreditCard
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { PageSkeleton } from "@/components/ui/loaders";

interface Site {
  id: string;
  address: string;
  contactPerson: string;
  contactPhone: string;
  notes: string;
}

interface Customer {
  id: string;
  name: string;
  companyName?: string;
  type: "COMPANY" | "INDIVIDUAL";
  email: string;
  phone: string;
  whatsapp?: string;
  gstNumber: string;
  billingAddress: string;
  shippingAddress: string;
  notes?: string;
  createdAt?: string;
  sites: Site[];
  leads?: any[];
  quotations?: any[];
  invoices?: any[];
}

export default function CustomersPage() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Add Customer Form state
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [custName, setCustName] = useState("");
  const [custCompanyName, setCustCompanyName] = useState("");
  const [custType, setCustType] = useState<"COMPANY" | "INDIVIDUAL">("COMPANY");
  const [custEmail, setCustEmail] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [custWhatsapp, setCustWhatsapp] = useState("");
  const [custGst, setCustGst] = useState("");
  const [custBilling, setCustBilling] = useState("");
  const [custShipping, setCustShipping] = useState("");

  const [showAddSite, setShowAddSite] = useState(false);

  // Customer Tabs
  const [activeTab, setActiveTab] = useState<"balance" | "quotations" | "invoices" | "payments">("quotations");
  const [customerNotes, setCustomerNotes] = useState("");

  // Notification state
  const [notification, setNotification] = useState("");

  useEffect(() => {
    if (selectedCustomer) {
      setCustomerNotes(selectedCustomer.notes || "");
    }
  }, [selectedCustomer]);

  const handleSaveNotes = async () => {
    if (!selectedCustomer) return;
    try {
      const res = await fetch("/api/customers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedCustomer.id, notes: customerNotes })
      });
      if (res.ok) {
        setNotification("Notes updated successfully!");
        setTimeout(() => setNotification(""), 3000);
        fetchCustomers();
      }
    } catch (e) {}
  };

  const handleDeleteCustomer = async (id: string) => {
    if (!confirm("Are you sure you want to delete this customer profile?")) return;
    try {
      const res = await fetch(`/api/customers?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setNotification("Customer profile deleted.");
        setTimeout(() => setNotification(""), 3000);
        fetchCustomers();
        setSelectedCustomer(null);
      }
    } catch (e) {}
  };

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/customers");
      if (res.ok) {
        const data = await res.json();
        setCustomers(data);
        if (data.length > 0 && !selectedCustomer) {
          setSelectedCustomer(data[0]);
        }
      }
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName || !custPhone || !custBilling) {
      alert("Name, Phone, and Billing Address are required.");
      return;
    }

    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: custName,
          companyName: custCompanyName || null,
          type: custType,
          email: custEmail || null,
          phone: custPhone,
          whatsapp: custWhatsapp || null,
          gstNumber: custGst || null,
          billingAddress: custBilling,
          shippingAddress: custShipping || null
        })
      });

      if (res.ok) {
        const newCust = await res.json();
        setNotification("Customer successfully added!");
        setTimeout(() => setNotification(""), 3000);
        setCustName("");
        setCustCompanyName("");
        setCustType("COMPANY");
        setCustEmail("");
        setCustPhone("");
        setCustWhatsapp("");
        setCustGst("");
        setCustBilling("");
        setCustShipping("");
        setShowAddCustomer(false);
        fetchCustomers();
        setSelectedCustomer(newCust);
      }
    } catch (e) {}
  };


  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email && c.email.toLowerCase().includes(search.toLowerCase())) ||
    c.phone.includes(search)
  );

  const totalItems = filteredCustomers.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCustomers = filteredCustomers.slice(startIndex, startIndex + itemsPerPage);

  if (loading) return <PageSkeleton rows={5} />;

  return (
    <div className="flex flex-col gap-6 h-full relative font-sans">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-4 right-4 bg-primary text-primary-foreground text-xs px-4 py-3 rounded-lg shadow-xl z-50 flex items-center gap-2 border border-primary/20 animate-bounce">
          <Check className="w-4 h-4" />
          <span>{notification}</span>
        </div>
      )}

      {/* Action Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card/40 border border-border/80 p-4 rounded-xl">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search customers by name, phone, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-secondary/40 border border-border/80 rounded-lg py-2 pl-10 pr-4 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/60 transition-all duration-150"
          />
        </div>

        <button
          onClick={() => setShowAddCustomer(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-semibold py-2.5 px-4 rounded-lg flex items-center gap-2 shadow-lg shadow-primary/25 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Customer Profile</span>
        </button>
      </div>

      {/* Main Grid: List left, detail card right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Customer list */}
        <div className="lg:col-span-1 border border-border/80 rounded-xl bg-card/30 overflow-hidden flex flex-col max-h-[calc(100vh-250px)]">
          <div className="p-4 border-b border-border/60 bg-secondary/10">
            <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              Customer Registry ({filteredCustomers.length})
            </h3>
          </div>
          <div className="overflow-y-auto flex-1 divide-y divide-border/60">
            {paginatedCustomers.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No customer profiles match.
              </div>
            ) : (
              paginatedCustomers.map((cust) => (
                <div
                  key={cust.id}
                  onClick={() => setSelectedCustomer(cust)}
                  className={`p-4 cursor-pointer transition-all duration-150 flex justify-between items-center ${
                    selectedCustomer?.id === cust.id
                      ? "bg-primary/5 border-l-2 border-primary"
                      : "hover:bg-secondary/40"
                  }`}
                >
                  <div className="flex flex-col gap-1 pr-2">
                    <span className="text-xs font-bold text-foreground leading-snug">{cust.name}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">{cust.phone}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/60" />
                </div>
              ))
            )}
          </div>
          {/* Pagination Footer */}
          {totalItems > itemsPerPage && (
            <div className="p-3 border-t border-border bg-secondary/15 flex items-center justify-between gap-2 text-[10px] font-bold text-muted-foreground">
              <span>Page {currentPage} of {totalPages}</span>
              <div className="flex gap-1">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-2 py-1 border border-border bg-card rounded hover:bg-secondary disabled:opacity-40 transition-all cursor-pointer"
                >
                  Prev
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2 py-1 border border-border bg-card rounded hover:bg-secondary disabled:opacity-40 transition-all cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Detail sheet */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {selectedCustomer ? (
            <div className="border border-border/80 rounded-xl bg-card/45 backdrop-blur-md p-6 flex flex-col gap-6">
              {/* Header profile */}
              <div className="flex justify-between items-start border-b border-border/60 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-sm">
                    {selectedCustomer.type === "COMPANY" ? <Building className="w-5 h-5" /> : <User className="w-5 h-5" />}
                  </div>
                  <div>
                    <h2 className="text-base font-bold font-heading">{selectedCustomer.name}</h2>
                    <div className="flex gap-2 items-center mt-1">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-secondary/80 border border-border text-foreground">
                        {selectedCustomer.type}
                      </span>
                      {selectedCustomer.companyName && (
                        <span className="text-[10px] text-muted-foreground font-semibold">
                          ({selectedCustomer.companyName})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Delete Profile button */}
                  <button
                    onClick={() => handleDeleteCustomer(selectedCustomer.id)}
                    className="p-2 bg-secondary/60 hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 rounded-lg border border-border/80 transition-all cursor-pointer"
                    title="Delete Customer Profile"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  {/* Pending Amount highlighted at the top */}
                  <div className="text-right flex flex-col bg-rose-500/15 border border-rose-500/30 px-3.5 py-1.5 rounded-lg shadow-sm">
                    <span className="text-[9px] font-mono uppercase tracking-wider text-rose-700 dark:text-rose-400 font-bold">Pending Amount</span>
                    <span className="text-sm font-black font-mono text-rose-700 dark:text-rose-400 leading-none mt-1">
                      ₹{((selectedCustomer.invoices?.reduce((sum: number, i: any) => sum + i.totalAmount, 0) || 0) - 
                        (selectedCustomer.invoices?.reduce((sum: number, i: any) => sum + i.amountPaid, 0) || 0)).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </div>

              {/* General Contact Specs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-secondary/15 p-4 border border-border/60 rounded-xl">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-bold">Primary Contact Phone</span>
                  <div className="flex items-center gap-2 text-xs text-foreground font-mono font-semibold">
                    <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{selectedCustomer.phone}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-bold">WhatsApp Dispatch</span>
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <a
                      href={`https://wa.me/91${(selectedCustomer.whatsapp || selectedCustomer.phone).replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline flex items-center gap-1"
                    >
                      <span>{selectedCustomer.whatsapp || selectedCustomer.phone}</span>
                      <span className="text-[9px] font-sans bg-emerald-500/15 px-1.5 py-0.2 rounded border border-emerald-500/20">Chat →</span>
                    </a>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-bold">Corporate Email</span>
                  <div className="flex items-center gap-2 text-xs text-foreground font-mono">
                    <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{selectedCustomer.email || "No email stored"}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-bold">GST Identity (IN)</span>
                  <div className="flex items-center gap-2 text-xs text-foreground font-mono">
                    <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="font-bold">{selectedCustomer.gstNumber || "Not Registered"}</span>
                  </div>
                </div>

                <div className="space-y-1 md:col-span-2 border-t border-border/40 pt-2.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-bold">Billing Address</span>
                  <div className="flex items-start gap-2 text-xs text-foreground leading-relaxed">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    <span>{selectedCustomer.billingAddress}</span>
                  </div>
                </div>
              </div>

              {/* Tab Buttons */}
              <div className="flex border-b border-border/60 overflow-x-auto select-none no-scrollbar">
                <button
                  onClick={() => setActiveTab("quotations")}
                  className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
                    activeTab === "quotations" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Quotations ({selectedCustomer.quotations?.length || 0})</span>
                </button>
                <button
                  onClick={() => setActiveTab("invoices")}
                  className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
                    activeTab === "invoices" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Invoices ({selectedCustomer.invoices?.length || 0})</span>
                </button>
                <button
                  onClick={() => setActiveTab("payments")}
                  className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
                    activeTab === "payments" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Payments</span>
                </button>
                <button
                  onClick={() => setActiveTab("balance")}
                  className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
                    activeTab === "balance" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Outstanding Balances</span>
                </button>
              </div>

              {/* Tab Content Panels */}
              <div className="pt-2">

                {/* 2. OUTSTANDING BALANCES TAB */}
                {activeTab === "balance" && (
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-3 gap-3 bg-secondary/15 p-4 border border-border/60 rounded-lg font-mono text-xs">
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] text-muted-foreground uppercase">Total Invoiced</span>
                        <span className="text-base font-bold text-foreground">
                          ₹{(selectedCustomer.invoices?.reduce((sum: number, i: any) => sum + i.totalAmount, 0) || 0).toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] text-muted-foreground uppercase">Amount Paid</span>
                        <span className="text-base font-bold text-emerald-400">
                          ₹{(selectedCustomer.invoices?.reduce((sum: number, i: any) => sum + i.amountPaid, 0) || 0).toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1 border-l pl-3">
                        <span className="text-[9px] text-muted-foreground uppercase">Outstanding</span>
                        <span className="text-base font-bold text-rose-400">
                          ₹{((selectedCustomer.invoices?.reduce((sum: number, i: any) => sum + i.totalAmount, 0) || 0) - 
                            (selectedCustomer.invoices?.reduce((sum: number, i: any) => sum + i.amountPaid, 0) || 0)).toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>

                    <div className="border border-border/80 rounded-lg overflow-hidden">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-secondary/35 text-[9px] font-mono uppercase tracking-wider text-muted-foreground border-b border-border/60">
                            <th className="p-2.5">Invoice No</th>
                            <th className="p-2.5 text-right">Invoice Value</th>
                            <th className="p-2.5 text-right">Amount Paid</th>
                            <th className="p-2.5 text-right">Outstanding</th>
                            <th className="p-2.5">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {!selectedCustomer.invoices || selectedCustomer.invoices.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="text-center p-4 text-muted-foreground">
                                No invoices issued.
                              </td>
                            </tr>
                          ) : (
                            selectedCustomer.invoices.map((inv: any) => {
                              const bal = inv.totalAmount - inv.amountPaid;
                              return (
                                <tr key={inv.id} className="hover:bg-secondary/15">
                                  <td className="p-2.5 font-bold font-mono">{inv.invoiceNumber}</td>
                                  <td className="p-2.5 text-right font-mono">₹{inv.totalAmount.toLocaleString("en-IN")}</td>
                                  <td className="p-2.5 text-right font-mono text-emerald-400">₹{inv.amountPaid.toLocaleString("en-IN")}</td>
                                  <td className="p-2.5 text-right font-bold font-mono text-rose-400">₹{bal.toLocaleString("en-IN")}</td>
                                  <td className="p-2.5">
                                    <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                                      inv.status === "PAID" 
                                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                                        : inv.status === "PARTIAL"
                                        ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                        : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                    }`}>
                                      {inv.status}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 3. QUOTATIONS TAB */}
                {activeTab === "quotations" && (
                  <div className="flex flex-col gap-4">
                    <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                      Drafted Quotations ({selectedCustomer.quotations?.length || 0})
                    </h3>
                    <div className="border border-border/80 rounded-lg overflow-hidden">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-secondary/35 text-[9px] font-mono uppercase tracking-wider text-muted-foreground border-b border-border/60">
                            <th className="p-2.5">Quote No</th>
                            <th className="p-2.5">Version</th>
                            <th className="p-2.5">Date</th>
                            <th className="p-2.5 text-right">Total Amount</th>
                            <th className="p-2.5 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60 font-mono">
                          {!selectedCustomer.quotations || selectedCustomer.quotations.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="text-center p-4 text-muted-foreground font-sans">
                                No quotations drafted for this customer.
                              </td>
                            </tr>
                          ) : (
                            selectedCustomer.quotations.map((q: any) => (
                              <tr key={q.id} className="hover:bg-secondary/15">
                                <td className="p-2.5 font-bold">{q.quoteNumber}</td>
                                <td className="p-2.5">v{q.version}</td>
                                <td className="p-2.5 text-muted-foreground">
                                  {new Date(q.createdAt).toLocaleDateString("en-IN")}
                                </td>
                                <td className="p-2.5 text-right font-bold text-foreground">
                                  ₹{q.totalAmount.toLocaleString("en-IN")}
                                </td>
                                <td className="p-2.5 text-center">
                                  <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                                    q.status === "APPROVED" 
                                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                                      : q.status === "SENT"
                                      ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                      : "bg-muted/15 text-muted-foreground border-border"
                                  }`}>
                                    {q.status}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 4. INVOICES TAB */}
                {activeTab === "invoices" && (
                  <div className="flex flex-col gap-4">
                    <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                      Invoices Ledger ({selectedCustomer.invoices?.length || 0})
                    </h3>
                    <div className="border border-border/80 rounded-lg overflow-hidden">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-secondary/35 text-[9px] font-mono uppercase tracking-wider text-muted-foreground border-b border-border/60">
                            <th className="p-2.5">Invoice No</th>
                            <th className="p-2.5">Issued Date</th>
                            <th className="p-2.5 text-right">Amount Paid</th>
                            <th className="p-2.5 text-right">Total Amount</th>
                            <th className="p-2.5 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60 font-mono">
                          {!selectedCustomer.invoices || selectedCustomer.invoices.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="text-center p-4 text-muted-foreground font-sans">
                                No invoices issued.
                              </td>
                            </tr>
                          ) : (
                            selectedCustomer.invoices.map((inv: any) => (
                              <tr key={inv.id} className="hover:bg-secondary/15">
                                <td className="p-2.5 font-bold">{inv.invoiceNumber}</td>
                                <td className="p-2.5 text-muted-foreground">
                                  {new Date(inv.createdAt).toLocaleDateString("en-IN")}
                                </td>
                                <td className="p-2.5 text-right text-emerald-400 font-bold">
                                  ₹{inv.amountPaid.toLocaleString("en-IN")}
                                </td>
                                <td className="p-2.5 text-right font-bold text-foreground">
                                  ₹{inv.totalAmount.toLocaleString("en-IN")}
                                </td>
                                <td className="p-2.5 text-center">
                                  <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                                    inv.status === "PAID" 
                                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                                      : inv.status === "PARTIAL"
                                      ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                      : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                  }`}>
                                    {inv.status}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 5. PAYMENTS TAB */}
                {activeTab === "payments" && (
                  <div className="flex flex-col gap-4">
                    <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                      Collected Payments Receipts
                    </h3>
                    <div className="border border-border/80 rounded-lg overflow-hidden">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-secondary/35 text-[9px] font-mono uppercase tracking-wider text-muted-foreground border-b border-border/60">
                            <th className="p-2.5">Invoice No</th>
                            <th className="p-2.5">Payment Method</th>
                            <th className="p-2.5">Type</th>
                            <th className="p-2.5 text-right">Amount Received</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60 font-mono">
                          {(() => {
                            const payments: any[] = [];
                            selectedCustomer.invoices?.forEach((inv: any) => {
                              inv.payments?.forEach((p: any) => {
                                payments.push({ ...p, invoiceNumber: inv.invoiceNumber });
                              });
                            });

                            if (payments.length === 0) {
                              return (
                                <tr>
                                  <td colSpan={4} className="text-center p-4 text-muted-foreground font-sans">
                                    No recorded payment transactions.
                                  </td>
                                </tr>
                              );
                            }

                            return payments.map((p: any) => (
                              <tr key={p.id} className="hover:bg-secondary/15">
                                <td className="p-2.5 font-bold">{p.invoiceNumber}</td>
                                <td className="p-2.5 font-bold text-primary">{p.paymentMethod}</td>
                                <td className="p-2.5 text-muted-foreground">{p.paymentType}</td>
                                <td className="p-2.5 text-right font-bold text-emerald-400">
                                  ₹{p.amount.toLocaleString("en-IN")}
                                </td>
                              </tr>
                            ));
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

              </div>
            </div>
          ) : (
            <div className="border border-border/80 rounded-xl bg-card/45 p-12 text-center text-xs text-muted-foreground">
              Select a customer profile from the left registry to view full records.
            </div>
          )}
        </div>
      </div>

      {/* Add Customer Modal */}
      {showAddCustomer && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl overflow-hidden font-sans">
            <div className="p-5 border-b border-border flex justify-between items-center bg-secondary/15">
              <h3 className="font-heading font-semibold text-sm">Register New Customer Profile</h3>
              <button onClick={() => setShowAddCustomer(false)} className="text-muted-foreground hover:text-foreground text-xs font-semibold">
                Cancel
              </button>
            </div>
            
            <form onSubmit={handleAddCustomer} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-muted-foreground font-bold">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Anil Sharma"
                    value={custName}
                    onChange={(e) => setCustName(e.target.value)}
                    className="w-full bg-secondary/30 border border-border rounded-xl px-3 py-2 text-xs outline-none focus:border-primary font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-muted-foreground font-bold">Company Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Metro Retailers Ltd"
                    value={custCompanyName}
                    onChange={(e) => setCustCompanyName(e.target.value)}
                    className="w-full bg-secondary/30 border border-border rounded-xl px-3 py-2 text-xs outline-none focus:border-primary font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-muted-foreground font-bold">Customer Type</label>
                  <select
                    value={custType}
                    onChange={(e) => setCustType(e.target.value as any)}
                    className="w-full bg-secondary/30 border border-border rounded-xl px-3 py-2 text-xs outline-none focus:border-primary"
                  >
                    <option value="COMPANY" className="bg-card">Company</option>
                    <option value="INDIVIDUAL" className="bg-card">Individual</option>
                  </select>
                </div>
                <div className="space-y-1 font-mono">
                  <label className="text-[10px] font-sans font-bold uppercase text-muted-foreground">Phone Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="+91 98765 43210"
                    value={custPhone}
                    onChange={(e) => setCustPhone(e.target.value)}
                    className="w-full bg-secondary/30 border border-border rounded-xl px-3 py-2 text-xs outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 font-mono">
                <div className="space-y-1">
                  <label className="text-[10px] font-sans font-bold uppercase text-muted-foreground">WhatsApp Number</label>
                  <input
                    type="text"
                    placeholder="+91 98765 43210"
                    value={custWhatsapp}
                    onChange={(e) => setCustWhatsapp(e.target.value)}
                    className="w-full bg-secondary/30 border border-border rounded-xl px-3 py-2 text-xs outline-none focus:border-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-sans font-bold uppercase text-muted-foreground">Email Address</label>
                  <input
                    type="email"
                    placeholder="client@company.com"
                    value={custEmail}
                    onChange={(e) => setCustEmail(e.target.value)}
                    className="w-full bg-secondary/30 border border-border rounded-xl px-3 py-2 text-xs outline-none focus:border-primary font-sans"
                  />
                </div>
              </div>

              <div className="space-y-1 font-mono">
                <label className="text-[10px] font-sans font-bold uppercase text-muted-foreground">GSTIN Identification</label>
                <input
                  type="text"
                  placeholder="27AAACK5912K1Z9"
                  value={custGst}
                  onChange={(e) => setCustGst(e.target.value)}
                  className="w-full bg-secondary/30 border border-border rounded-xl px-3 py-2 text-xs outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-muted-foreground font-bold">Billing Address *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Complete office/billing location info"
                  value={custBilling}
                  onChange={(e) => setCustBilling(e.target.value)}
                  className="w-full bg-secondary/30 border border-border rounded-xl p-2.5 text-xs outline-none focus:border-primary resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-primary text-primary-foreground font-bold py-2.5 rounded-xl text-xs hover:bg-primary/95 shadow-md shadow-primary/25 cursor-pointer mt-2"
              >
                Register Customer Profile
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
