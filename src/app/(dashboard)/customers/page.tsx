"use client";

import React, { useEffect, useState } from "react";
import { 
  Plus, Search, MapPin, Building, User, Mail, Phone, FileText, 
  ChevronRight, Check, Clock, Paperclip, DollarSign, MessageSquare, 
  PlusCircle, Trash2, Calendar, FileCode, Receipt, CreditCard
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";

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
  contactHistoryJson?: string;
  attachmentsJson?: string;
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
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  
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

  // Add Site Form state
  const [showAddSite, setShowAddSite] = useState(false);
  const [siteAddress, setSiteAddress] = useState("");
  const [siteContactPerson, setSiteContactPerson] = useState("");
  const [siteContactPhone, setSiteContactPhone] = useState("");
  const [siteNotes, setSiteNotes] = useState("");

  // Customer Tabs and Custom Specs States
  const [activeTab, setActiveTab] = useState<"sites" | "contacts" | "docs" | "balance" | "timeline" | "quotations" | "invoices" | "payments">("sites");
  const [customerNotes, setCustomerNotes] = useState("");

  const [contactType, setContactType] = useState<"CALL" | "EMAIL" | "MEETING">("CALL");
  const [contactNotes, setContactNotes] = useState("");

  const [attachmentName, setAttachmentName] = useState("");
  const [attachmentCategory, setAttachmentCategory] = useState<"PHOTO" | "DRAWING" | "CONTRACT_PDF">("PHOTO");
  const [attachmentSizeMB, setAttachmentSizeMB] = useState("5");

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
        // Refresh customer list
        fetchCustomers();
      }
    } catch (e) {}
  };

  const handleAddContactLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !contactNotes) return;

    let history = [];
    try {
      history = JSON.parse(selectedCustomer.contactHistoryJson || "[]");
    } catch (err) {}

    const newLog = {
      date: new Date().toLocaleDateString("en-IN") + " " + new Date().toLocaleTimeString("en-IN"),
      type: contactType,
      notes: contactNotes,
      loggedBy: user?.name || "System"
    };

    history.unshift(newLog);

    try {
      const res = await fetch("/api/customers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedCustomer.id, contactHistoryJson: JSON.stringify(history) })
      });

      if (res.ok) {
        setNotification("Contact log recorded!");
        setTimeout(() => setNotification(""), 3000);
        setContactNotes("");
        // Refresh
        const updatedRes = await fetch("/api/customers");
        if (updatedRes.ok) {
          const data = await updatedRes.json();
          setCustomers(data);
          const found = data.find((c: any) => c.id === selectedCustomer.id);
          if (found) setSelectedCustomer(found);
        }
      }
    } catch (e) {}
  };

  const handleAddAttachment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !attachmentName) return;

    let attachments = [];
    try {
      attachments = JSON.parse(selectedCustomer.attachmentsJson || "[]");
    } catch (err) {}

    const sizeBytes = parseFloat(attachmentSizeMB) * 1024 * 1024;
    const newAttach = {
      id: `att-${Date.now()}`,
      name: attachmentName + (attachmentCategory === "PHOTO" ? ".jpg" : attachmentCategory === "DRAWING" ? ".dwg" : ".pdf"),
      category: attachmentCategory,
      sizeBytes,
      uploadedAt: new Date().toLocaleDateString("en-IN")
    };

    try {
      const storRes = await fetch("/api/storage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sizeBytes })
      });
      if (!storRes.ok) {
        alert("Upload rejected: Storage quota limit exceeded!");
        return;
      }
    } catch (err) {}

    attachments.unshift(newAttach);

    try {
      const res = await fetch("/api/customers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedCustomer.id, attachmentsJson: JSON.stringify(attachments) })
      });

      if (res.ok) {
        setNotification("Document uploaded successfully!");
        setTimeout(() => setNotification(""), 3000);
        setAttachmentName("");
        // Refresh
        const updatedRes = await fetch("/api/customers");
        if (updatedRes.ok) {
          const data = await updatedRes.json();
          setCustomers(data);
          const found = data.find((c: any) => c.id === selectedCustomer.id);
          if (found) setSelectedCustomer(found);
        }
      }
    } catch (e) {}
  };

  const fetchCustomers = async () => {
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
        // Reset form
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
        // Refresh list
        fetchCustomers();
        setSelectedCustomer(newCust);
      }
    } catch (e) {}
  };

  const handleAddSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    if (!siteAddress) {
      alert("Site address is required.");
      return;
    }

    try {
      const res = await fetch(`/api/customers/${selectedCustomer.id}/site`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: siteAddress,
          contactPerson: siteContactPerson,
          contactPhone: siteContactPhone,
          notes: siteNotes
        })
      });

      if (res.ok) {
        setNotification("Site address successfully added!");
        setTimeout(() => setNotification(""), 3000);
        // Reset form
        setSiteAddress("");
        setSiteContactPerson("");
        setSiteContactPhone("");
        setSiteNotes("");
        setShowAddSite(false);
        // Refresh
        const updatedRes = await fetch("/api/customers");
        if (updatedRes.ok) {
          const data = await updatedRes.json();
          setCustomers(data);
          const found = data.find((c: Customer) => c.id === selectedCustomer.id);
          if (found) setSelectedCustomer(found);
        }
      }
    } catch (e) {}
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email && c.email.toLowerCase().includes(search.toLowerCase())) ||
    c.phone.includes(search)
  );

  return (
    <div className="flex flex-col gap-6 h-full relative">
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
          className="bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-semibold py-2 px-4 rounded-lg flex items-center gap-2 shadow-lg shadow-primary/25 cursor-pointer"
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
            {filteredCustomers.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No customer profiles match.
              </div>
            ) : (
              filteredCustomers.map((cust) => (
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
        </div>

        {/* Right Detail sheet */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {selectedCustomer ? (
            <div className="border border-border/80 rounded-xl bg-card/45 backdrop-blur-md p-6 flex flex-col gap-6">
              {/* Header profile */}
              <div className="flex justify-between items-start border-b border-border/60 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center border text-muted-foreground shadow-sm">
                    {selectedCustomer.type === "COMPANY" ? <Building className="w-5 h-5" /> : <User className="w-5 h-5" />}
                  </div>
                  <div>
                    <h2 className="text-base font-bold font-heading">{selectedCustomer.name}</h2>
                    <div className="flex gap-2 items-center mt-1">
                      <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-secondary/80 border text-muted-foreground">
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
                {/* Pending Amount highlighted at the top */}
                <div className="text-right flex flex-col bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-lg">
                  <span className="text-[9px] font-mono uppercase tracking-wider text-rose-400 font-bold">Pending Amount</span>
                  <span className="text-sm font-bold font-mono text-rose-400 leading-none mt-1">
                    ₹{((selectedCustomer.invoices?.reduce((sum: number, i: any) => sum + i.totalAmount, 0) || 0) - 
                      (selectedCustomer.invoices?.reduce((sum: number, i: any) => sum + i.amountPaid, 0) || 0)).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {/* General Contact Specs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-secondary/10 p-4 border border-border/40 rounded-lg">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Primary Contact Phone</span>
                  <div className="flex items-center gap-2 text-xs text-foreground font-mono">
                    <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{selectedCustomer.phone}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">WhatsApp Shutter Dispatch</span>
                  <div className="flex items-center gap-2 text-xs text-foreground font-mono">
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-bold">{selectedCustomer.whatsapp || selectedCustomer.phone}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Corporate Email</span>
                  <div className="flex items-center gap-2 text-xs text-foreground font-mono">
                    <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{selectedCustomer.email || "No email stored"}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">GST Identity (IN)</span>
                  <div className="flex items-center gap-2 text-xs text-foreground font-mono">
                    <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{selectedCustomer.gstNumber || "Not Registered"}</span>
                  </div>
                </div>

                <div className="space-y-1 md:col-span-2 border-t border-border/30 pt-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Billing Address</span>
                  <div className="flex items-start gap-2 text-xs text-foreground leading-relaxed">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    <span>{selectedCustomer.billingAddress}</span>
                  </div>
                </div>
              </div>

              {/* Premium Tab Buttons */}
              <div className="flex border-b border-border/60 overflow-x-auto select-none no-scrollbar">
                <button
                  onClick={() => setActiveTab("sites")}
                  className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
                    activeTab === "sites" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Sites ({selectedCustomer.sites?.length || 0})</span>
                </button>
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
                <button
                  onClick={() => setActiveTab("timeline")}
                  className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
                    activeTab === "timeline" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Recent Activity</span>
                </button>
                <button
                  onClick={() => setActiveTab("contacts")}
                  className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
                    activeTab === "contacts" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Interaction Log</span>
                </button>
                <button
                  onClick={() => setActiveTab("docs")}
                  className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
                    activeTab === "docs" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Paperclip className="w-3.5 h-3.5" />
                  <span>Attachments</span>
                </button>
              </div>

              {/* Tab Content Panels */}
              <div className="pt-2">
                {/* 1. SITES TAB */}
                {activeTab === "sites" && (
                  <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                        Linked Sites
                      </h3>
                      <button
                        onClick={() => setShowAddSite(true)}
                        className="border border-border bg-secondary/50 hover:bg-secondary text-[11px] font-semibold py-1.5 px-3 rounded-md flex items-center gap-1.5 transition-all cursor-pointer text-foreground"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Installation Site</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {!selectedCustomer.sites || selectedCustomer.sites.length === 0 ? (
                        <div className="col-span-2 text-center py-6 text-xs text-muted-foreground bg-secondary/15 rounded-lg border border-dashed">
                          No installation sites linked.
                        </div>
                      ) : (
                        selectedCustomer.sites.map((site: Site, idx: number) => (
                          <div key={site.id} className="bg-secondary/20 border border-border/60 p-4 rounded-lg flex flex-col gap-2">
                            <span className="text-[9px] font-mono font-bold uppercase text-primary">
                              Location #{idx + 1}
                            </span>
                            <p className="text-xs text-foreground font-medium leading-relaxed">
                              {site.address}
                            </p>
                            {(site.contactPerson || site.contactPhone) && (
                              <div className="text-[10px] text-muted-foreground font-mono flex flex-col gap-0.5 border-t border-border/20 pt-2">
                                <span>Contact: {site.contactPerson}</span>
                                <span>Phone: {site.contactPhone}</span>
                              </div>
                            )}
                            {site.notes && (
                              <p className="text-[10px] text-muted-foreground italic bg-card p-1.5 border rounded">
                                {site.notes}
                              </p>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* 2. CONTACT HISTORY TAB */}
                {activeTab === "contacts" && (
                  <div className="flex flex-col gap-4">
                    <form onSubmit={handleAddContactLog} className="bg-secondary/15 p-4 rounded-lg border border-border/60 flex flex-col gap-3">
                      <h4 className="text-xs font-bold text-foreground">Log Customer Interaction</h4>
                      <div className="grid grid-cols-3 gap-2">
                        {["CALL", "EMAIL", "MEETING"].map((type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setContactType(type as any)}
                            className={`py-1 text-[11px] font-semibold border rounded capitalize transition-all ${
                              contactType === type ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {type.toLowerCase()}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Interaction details/notes..."
                          required
                          value={contactNotes}
                          onChange={(e) => setContactNotes(e.target.value)}
                          className="flex-grow bg-secondary/40 border border-border rounded-md px-3 py-1.5 text-xs outline-none text-foreground"
                        />
                        <button
                          type="submit"
                          className="bg-primary text-primary-foreground font-semibold px-3 py-1.5 rounded-md text-xs hover:bg-primary/95 shadow-sm"
                        >
                          Log Entry
                        </button>
                      </div>
                    </form>

                    <div className="flex flex-col gap-3 max-h-60 overflow-y-auto">
                      {(() => {
                        let logs = [];
                        try {
                          logs = JSON.parse(selectedCustomer.contactHistoryJson || "[]");
                        } catch (err) {}

                        if (logs.length === 0) {
                          return (
                            <div className="text-center py-6 text-xs text-muted-foreground border border-dashed rounded-lg">
                              No contacts logged yet.
                            </div>
                          );
                        }

                        return logs.map((log: any, idx: number) => (
                          <div key={idx} className="bg-card border border-border/60 p-3 rounded-lg flex flex-col gap-1 text-xs">
                            <div className="flex justify-between items-center text-[10px] text-muted-foreground font-mono">
                              <span className="font-bold text-primary uppercase">{log.type}</span>
                              <span>By: {log.loggedBy} | {log.date}</span>
                            </div>
                            <p className="text-foreground leading-relaxed mt-0.5">{log.notes}</p>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                )}

                {/* 3. ATTACHMENTS TAB */}
                {activeTab === "docs" && (
                  <div className="flex flex-col gap-4">
                    <form onSubmit={handleAddAttachment} className="bg-secondary/15 p-4 rounded-lg border border-border/60 flex flex-col gap-3">
                      <h4 className="text-xs font-bold text-foreground">Upload Drawing / Site Photo</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="text-[9px] font-mono text-muted-foreground uppercase">File Name (No Ext)</label>
                          <input
                            type="text"
                            required
                            placeholder="elevation-sketch"
                            value={attachmentName}
                            onChange={(e) => setAttachmentName(e.target.value)}
                            className="w-full bg-secondary/40 border border-border rounded-md px-3 py-1 text-xs outline-none text-foreground font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-mono text-muted-foreground uppercase">Category</label>
                          <select
                            value={attachmentCategory}
                            onChange={(e) => setAttachmentCategory(e.target.value as any)}
                            className="w-full bg-secondary/40 border border-border rounded-md px-2 py-1 text-xs outline-none text-foreground"
                          >
                            <option value="PHOTO">Elevation Photo</option>
                            <option value="DRAWING">Technical Drawing</option>
                            <option value="CONTRACT_PDF">Agreement/PDF</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-mono text-muted-foreground uppercase">Simulate Size (MB)</label>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={attachmentSizeMB}
                            onChange={(e) => setAttachmentSizeMB(e.target.value)}
                            className="w-full bg-secondary/40 border border-border rounded-md px-3 py-1 text-xs outline-none text-foreground font-mono"
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        className="bg-primary text-primary-foreground font-semibold py-1.5 rounded-lg text-xs hover:bg-primary/95 shadow-sm mt-1"
                      >
                        Simulate File Upload
                      </button>
                    </form>

                    <div className="flex flex-col gap-3 max-h-60 overflow-y-auto">
                      {(() => {
                        let docs = [];
                        try {
                          docs = JSON.parse(selectedCustomer.attachmentsJson || "[]");
                        } catch (err) {}

                        if (docs.length === 0) {
                          return (
                            <div className="text-center py-6 text-xs text-muted-foreground border border-dashed rounded-lg">
                              No attachments linked. Upload technical diagrams, PDFs or site images.
                            </div>
                          );
                        }

                        return docs.map((doc: any) => (
                          <div key={doc.id} className="bg-card border border-border/60 p-3 rounded-lg flex justify-between items-center text-xs">
                            <div className="flex items-center gap-2.5">
                              <div className="bg-secondary/80 p-2 border rounded">
                                <Paperclip className="w-4 h-4 text-muted-foreground" />
                              </div>
                              <div className="flex flex-col gap-0.5">
                                <span className="font-semibold text-foreground font-mono">{doc.name}</span>
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  Category: {doc.category} | {(doc.sizeBytes / (1024 * 1024)).toFixed(2)} MB
                                </span>
                              </div>
                            </div>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {doc.uploadedAt}
                            </span>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                )}

                {/* 4. OUTSTANDING BALANCES TAB */}
                {activeTab === "balance" && (
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-3 gap-3 bg-secondary/15 p-4 border border-border/60 rounded-lg">
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-mono text-muted-foreground uppercase">Total Invoiced</span>
                        <span className="text-base font-bold font-mono text-foreground">
                          ₹{(selectedCustomer.invoices?.reduce((sum: number, i: any) => sum + i.totalAmount, 0) || 0).toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-mono text-muted-foreground uppercase">Amount Paid</span>
                        <span className="text-base font-bold font-mono text-emerald-400">
                          ₹{(selectedCustomer.invoices?.reduce((sum: number, i: any) => sum + i.amountPaid, 0) || 0).toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1 border-l pl-3">
                        <span className="text-[9px] font-mono text-muted-foreground uppercase">Outstanding</span>
                        <span className="text-base font-bold font-mono text-rose-400">
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

                {/* 5. TIMELINE TAB */}
                {activeTab === "timeline" && (
                  <div className="flex flex-col gap-4 font-sans">
                    <div className="relative pl-6 border-l border-border/60 ml-2 space-y-5 py-2">
                      <div className="relative">
                        <div className="absolute -left-[30px] top-0 w-4 h-4 rounded-full bg-secondary border border-border flex items-center justify-center">
                          <User className="w-2.5 h-2.5 text-muted-foreground" />
                        </div>
                        <div className="text-xs">
                          <span className="font-semibold text-foreground">Customer Registered</span>
                          <p className="text-[10px] text-muted-foreground font-mono">
                            {new Date(selectedCustomer.createdAt || Date.now()).toLocaleDateString("en-IN")}
                          </p>
                        </div>
                      </div>

                      {selectedCustomer.leads?.map((lead: any) => (
                        <div key={lead.id} className="relative">
                          <div className="absolute -left-[30px] top-0 w-4 h-4 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                            <Clock className="w-2.5 h-2.5 text-indigo-400" />
                          </div>
                          <div className="text-xs">
                            <span className="font-semibold text-foreground">Lead Created: {lead.title}</span>
                            <span className="text-[9px] bg-secondary border rounded px-1.5 py-0.5 ml-2 font-mono uppercase">
                              {lead.status}
                            </span>
                            <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                              Value: ₹{lead.value.toLocaleString("en-IN")}
                            </p>
                          </div>
                        </div>
                      ))}

                      {selectedCustomer.quotations?.map((q: any) => (
                        <div key={q.id} className="relative">
                          <div className="absolute -left-[30px] top-0 w-4 h-4 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                            <FileText className="w-2.5 h-2.5 text-amber-400" />
                          </div>
                          <div className="text-xs">
                            <span className="font-semibold text-foreground">Quotation Issued: {q.quoteNumber}</span>
                            <span className="text-[9px] bg-secondary border rounded px-1.5 py-0.5 ml-2 font-mono uppercase">
                              {q.status}
                            </span>
                            <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                              Total: ₹{q.totalAmount.toLocaleString("en-IN")}
                            </p>
                          </div>
                        </div>
                      ))}

                      {selectedCustomer.invoices?.map((i: any) => (
                        <div key={i.id} className="relative">
                          <div className="absolute -left-[30px] top-0 w-4 h-4 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                            <DollarSign className="w-2.5 h-2.5 text-emerald-400" />
                          </div>
                          <div className="text-xs">
                            <span className="font-semibold text-foreground">Invoice Generated: {i.invoiceNumber}</span>
                            <span className="text-[9px] bg-secondary border rounded px-1.5 py-0.5 ml-2 font-mono uppercase">
                              {i.status}
                            </span>
                            <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                              Billed: ₹{i.totalAmount.toLocaleString("en-IN")} | Collected: ₹{i.amountPaid.toLocaleString("en-IN")}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 6. QUOTATIONS TAB */}
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
                                <td className="p-2.5 font-sans">{new Date(q.createdAt).toLocaleDateString("en-IN")}</td>
                                <td className="p-2.5 text-right font-bold text-foreground">₹{q.totalAmount.toLocaleString("en-IN")}</td>
                                <td className="p-2.5 text-center">
                                  <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                                    q.status === "APPROVED" 
                                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                                      : q.status === "SENT"
                                      ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                      : q.status === "REJECTED"
                                      ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                      : "bg-muted/10 text-muted-foreground border-border"
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

                {/* 7. INVOICES TAB */}
                {activeTab === "invoices" && (
                  <div className="flex flex-col gap-4">
                    <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                      Billed Invoices ({selectedCustomer.invoices?.length || 0})
                    </h3>
                    <div className="border border-border/80 rounded-lg overflow-hidden">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-secondary/35 text-[9px] font-mono uppercase tracking-wider text-muted-foreground border-b border-border/60">
                            <th className="p-2.5">Invoice No</th>
                            <th className="p-2.5">Due Date</th>
                            <th className="p-2.5 text-right">Invoice Value</th>
                            <th className="p-2.5 text-right">Amount Paid</th>
                            <th className="p-2.5 text-right">Outstanding</th>
                            <th className="p-2.5 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60 font-mono">
                          {!selectedCustomer.invoices || selectedCustomer.invoices.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="text-center p-4 text-muted-foreground font-sans">
                                No invoices issued.
                              </td>
                            </tr>
                          ) : (
                            selectedCustomer.invoices.map((inv: any) => {
                              const bal = inv.totalAmount - inv.amountPaid;
                              return (
                                <tr key={inv.id} className="hover:bg-secondary/15">
                                  <td className="p-2.5 font-bold">{inv.invoiceNumber}</td>
                                  <td className="p-2.5 font-sans">{new Date(inv.paymentDue || Date.now()).toLocaleDateString("en-IN")}</td>
                                  <td className="p-2.5 text-right">₹{inv.totalAmount.toLocaleString("en-IN")}</td>
                                  <td className="p-2.5 text-right text-emerald-400">₹{inv.amountPaid.toLocaleString("en-IN")}</td>
                                  <td className="p-2.5 text-right font-bold text-rose-400">₹{bal.toLocaleString("en-IN")}</td>
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
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 8. PAYMENTS TAB */}
                {activeTab === "payments" && (
                  <div className="flex flex-col gap-4">
                    <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                      Remittance Transactions
                    </h3>
                    <div className="border border-border/80 rounded-lg overflow-hidden">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-secondary/35 text-[9px] font-mono uppercase tracking-wider text-muted-foreground border-b border-border/60">
                            <th className="p-2.5">Receipt ID</th>
                            <th className="p-2.5">Invoice No</th>
                            <th className="p-2.5">Method</th>
                            <th className="p-2.5">Reference UTR</th>
                            <th className="p-2.5 text-right">Amount</th>
                            <th className="p-2.5 font-sans">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60 font-mono">
                          {(() => {
                            const payments: any[] = [];
                            selectedCustomer.invoices?.forEach((inv: any) => {
                              inv.payments?.forEach((p: any) => {
                                payments.push({ ...p, invoiceNo: inv.invoiceNumber });
                              });
                            });
                            payments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

                            if (payments.length === 0) {
                              return (
                                <tr>
                                  <td colSpan={6} className="text-center p-4 text-muted-foreground font-sans">
                                    No payments received from this customer.
                                  </td>
                                </tr>
                              );
                            }

                            return payments.map((p: any) => (
                              <tr key={p.id} className="hover:bg-secondary/15">
                                <td className="p-2.5 text-[10px] text-muted-foreground">{p.id}</td>
                                <td className="p-2.5 font-bold">{p.invoiceNo}</td>
                                <td className="p-2.5">{p.paymentMethod}</td>
                                <td className="p-2.5 text-muted-foreground">{p.transactionRef || "N/A"}</td>
                                <td className="p-2.5 text-right font-bold text-emerald-400 font-mono">₹{p.amount.toLocaleString("en-IN")}</td>
                                <td className="p-2.5 font-sans">{new Date(p.createdAt).toLocaleDateString("en-IN")}</td>
                              </tr>
                            ));
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Internal Private Notes Section */}
              <div className="border-t border-border/60 pt-4 flex flex-col gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                  Internal Customer Notes
                </span>
                <div className="flex gap-2">
                  <textarea
                    rows={2}
                    placeholder="Write private notes on customer preferences (e.g. requires Somfy remote config, prefers credit terms)..."
                    value={customerNotes}
                    onChange={(e) => setCustomerNotes(e.target.value)}
                    className="flex-grow bg-secondary/40 border border-border rounded-md px-3 py-1.5 text-xs outline-none text-foreground resize-none"
                  />
                  <button
                    onClick={handleSaveNotes}
                    className="bg-secondary hover:bg-secondary/80 border border-border/80 text-foreground font-semibold px-3 rounded-lg text-xs transition-all shrink-0 h-auto"
                  >
                    Save Notes
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="border border-border/80 border-dashed rounded-xl p-12 text-center text-xs text-muted-foreground bg-card/20">
              Select or register a customer profile to display site location ledger.
            </div>
          )}
        </div>
      </div>

      {/* Add Customer Modal */}
      {showAddCustomer && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-border flex justify-between items-center bg-secondary/10">
              <h3 className="font-heading font-semibold text-sm">Add Customer Profile</h3>
              <button onClick={() => setShowAddCustomer(false)} className="text-muted-foreground hover:text-foreground text-xs font-semibold">
                Cancel
              </button>
            </div>
            
            <form onSubmit={handleAddCustomer} className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Type</label>
                  <select
                    value={custType}
                    onChange={(e) => setCustType(e.target.value as "COMPANY" | "INDIVIDUAL")}
                    className="w-full bg-secondary/40 border border-border rounded-md px-3 py-2 text-xs outline-none text-foreground"
                  >
                    <option value="COMPANY" className="bg-card text-foreground">Company</option>
                    <option value="INDIVIDUAL" className="bg-card text-foreground">Individual</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Phone Number</label>
                  <input
                    type="text"
                    required
                    placeholder="+91 98765..."
                    value={custPhone}
                    onChange={(e) => setCustPhone(e.target.value)}
                    className="w-full bg-secondary/40 border border-border rounded-md px-3 py-1.5 text-xs outline-none text-foreground font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">WhatsApp No.</label>
                  <input
                    type="text"
                    placeholder="+91 98765..."
                    value={custWhatsapp}
                    onChange={(e) => setCustWhatsapp(e.target.value)}
                    className="w-full bg-secondary/40 border border-border rounded-md px-3 py-1.5 text-xs outline-none text-foreground font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Customer Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Anil Sharma"
                    value={custName}
                    onChange={(e) => setCustName(e.target.value)}
                    className="w-full bg-secondary/40 border border-border rounded-md px-3 py-1.5 text-xs outline-none text-foreground font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Company Name</label>
                  <input
                    type="text"
                    placeholder="Metro Retailers Ltd"
                    value={custCompanyName}
                    onChange={(e) => setCustCompanyName(e.target.value)}
                    className="w-full bg-secondary/40 border border-border rounded-md px-3 py-1.5 text-xs outline-none text-foreground font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Email Address</label>
                  <input
                    type="email"
                    placeholder="name@company.com"
                    value={custEmail}
                    onChange={(e) => setCustEmail(e.target.value)}
                    className="w-full bg-secondary/40 border border-border rounded-md px-3 py-1.5 text-xs outline-none text-foreground"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">GST Identification No. (Optional)</label>
                  <input
                    type="text"
                    placeholder="27AAACM1234F1Z5"
                    value={custGst}
                    onChange={(e) => setCustGst(e.target.value)}
                    className="w-full bg-secondary/40 border border-border rounded-md px-3 py-1.5 text-xs outline-none text-foreground font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Billing Address</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Complete billing address of the customer"
                  value={custBilling}
                  onChange={(e) => setCustBilling(e.target.value)}
                  className="w-full bg-secondary/40 border border-border rounded-md px-3 py-1.5 text-xs outline-none text-foreground resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Shipping Address (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Complete delivery address if different from billing"
                  value={custShipping}
                  onChange={(e) => setCustShipping(e.target.value)}
                  className="w-full bg-secondary/40 border border-border rounded-md px-3 py-1.5 text-xs outline-none text-foreground resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-primary text-primary-foreground font-semibold py-2 rounded-md text-xs hover:bg-primary/95 shadow-md shadow-primary/25 cursor-pointer"
              >
                Create Profile Entry
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Site Modal */}
      {showAddSite && selectedCustomer && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-border flex justify-between items-center bg-secondary/10">
              <h3 className="font-heading font-semibold text-sm">Add Installation Site</h3>
              <button onClick={() => setShowAddSite(false)} className="text-muted-foreground hover:text-foreground text-xs font-semibold">
                Cancel
              </button>
            </div>
            
            <form onSubmit={handleAddSite} className="p-6 space-y-4">
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground font-mono">CUSTOMER PROFILE</span>
                <p className="text-xs font-bold text-foreground">{selectedCustomer.name}</p>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">Site Address</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Provide precise location coordinates / full address"
                  value={siteAddress}
                  onChange={(e) => setSiteAddress(e.target.value)}
                  className="w-full bg-secondary/40 border border-border rounded-md px-3 py-1.5 text-xs outline-none text-foreground resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Site Supervisor / Contact Name</label>
                  <input
                    type="text"
                    placeholder="Mr. Verma"
                    value={siteContactPerson}
                    onChange={(e) => setSiteContactPerson(e.target.value)}
                    className="w-full bg-secondary/40 border border-border rounded-md px-3 py-1.5 text-xs outline-none text-foreground"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Site Contact Phone</label>
                  <input
                    type="text"
                    placeholder="+91 99999 XXXXX"
                    value={siteContactPhone}
                    onChange={(e) => setSiteContactPhone(e.target.value)}
                    className="w-full bg-secondary/40 border border-border rounded-md px-3 py-1.5 text-xs outline-none text-foreground"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Installation Instruction Notes</label>
                <textarea
                  rows={2}
                  placeholder="Any structural constraints, wiring offsets, custom height overrides etc."
                  value={siteNotes}
                  onChange={(e) => setSiteNotes(e.target.value)}
                  className="w-full bg-secondary/40 border border-border rounded-md px-3 py-1.5 text-xs outline-none text-foreground resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-primary text-primary-foreground font-semibold py-2 rounded-md text-xs hover:bg-primary/95 shadow-md shadow-primary/25 cursor-pointer"
              >
                Link Site Location
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
