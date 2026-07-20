"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { 
  FileText, Plus, Search, Trash2, CheckCircle2, Copy, Send, 
  Printer, ArrowLeft, RefreshCw, MessageSquare, Mail, ClipboardCopy, Check, UserPlus, FileCheck, Building, User,
  ChevronRight, ChevronLeft, Layers, Maximize2, Calculator, CheckCircle, X, Zap, Receipt
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { PageSkeleton } from "@/components/ui/loaders";
import QRCode from "qrcode";

interface Customer {
  id: string;
  name: string;
  companyName?: string;
  phone: string;
  whatsapp?: string;
  email: string;
  billingAddress: string;
  gstNumber: string;
}

interface QuoteItem {
  id?: string;
  productName?: string;
  shutterName?: string;
  materialCategory?: string;
  material?: string;
  thickness?: string;
  profile?: string;
  length?: number;
  height?: number;
  width?: number;
  color?: string;
  operationType?: string;
  motorType?: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  unit?: string;
}

interface Quotation {
  id: string;
  quoteNumber: string;
  customerId: string;
  leadId?: string;
  status: "DRAFT" | "SENT" | "APPROVED" | "REJECTED";
  discount: number;
  gstRate: number;
  gstAmount: number;
  totalAmount: number;
  terms: string;
  version: number;
  parentQuoteId?: string;
  createdAt: string;
  customer?: Customer;
  items: QuoteItem[];
}

export default function QuotationsPage() {
  const { user } = useAuth();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [masterItems, setMasterItems] = useState<any[]>([]);
  const [branding, setBranding] = useState<any>(null);
  
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Active Quote for Details Drawer / PDF Preview
  const [selectedQuote, setSelectedQuote] = useState<Quotation | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState("");

  // New Quote Form & Wizard State
  const [showAddQuote, setShowAddQuote] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [formCustId, setFormCustId] = useState("");
  
  // New Customer Form State
  const [newCustName, setNewCustName] = useState("");
  const [newCustCompanyName, setNewCustCompanyName] = useState("");
  const [newCustType, setNewCustType] = useState<"COMPANY" | "INDIVIDUAL">("COMPANY");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustWhatsapp, setNewCustWhatsapp] = useState("");
  const [newCustEmail, setNewCustEmail] = useState("");
  const [newCustGst, setNewCustGst] = useState("");
  const [newCustBilling, setNewCustBilling] = useState("");
  const [newCustShipping, setNewCustShipping] = useState("");

  const [formDiscount, setFormDiscount] = useState("0");
  const [formGstOff, setFormGstOff] = useState(true); // GST OFF by default
  const [formGstRate, setFormGstRate] = useState("18");
  const [formStatus, setFormStatus] = useState<"DRAFT" | "SENT" | "APPROVED" | "REJECTED">("DRAFT");
  const [formTerms, setFormTerms] = useState(
    "1. Price quoted is valid for 30 days.\n2. 50% advance along with order. Balance on delivery.\n3. Civil work / electrical wiring must be provided by client."
  );
  
  // Table Items State (Rolling Shutter Configurations)
  const [formItems, setFormItems] = useState<any[]>([
    {
      shutterName: "Main Entrance Shutter",
      width: 10,
      height: 8,
      material: "GI",
      thickness: "21G",
      profile: "Flat",
      color: "Slate Grey",
      operationType: "Manual",
      motorType: "",
      quantity: 1,
      unitPrice: 18000,
      lineTotal: 18000
    }
  ]);

  const [notification, setNotification] = useState("");

  const fetchData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const [qRes, cRes, mRes, bRes] = await Promise.all([
        fetch("/api/quotations"),
        fetch("/api/customers"),
        fetch("/api/master-data"),
        fetch("/api/admin/branding")
      ]);

      const [qData, cData, mData, bData] = await Promise.all([
        qRes.ok ? qRes.json() : [],
        cRes.ok ? cRes.json() : [],
        mRes.ok ? mRes.json() : [],
        bRes.ok ? bRes.json() : null
      ]);

      setQuotations(qData);
      setCustomers(cData);
      setMasterItems(mData);
      if (bData) setBranding(bData);
    } catch (e) {}
    if (showLoading) setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Generate QR Code when a quotation is selected
  useEffect(() => {
    if (selectedQuote) {
      const upiString = `upi://pay?pa=${branding?.bankAccountNo || "kohinoor"}@sbi&pn=Kohinoor%20Shutters&am=${selectedQuote.totalAmount}&cu=INR&tn=Quote%20${selectedQuote.quoteNumber}`;
      QRCode.toDataURL(upiString, { width: 100, margin: 1 })
        .then((url) => setQrCodeUrl(url))
        .catch(() => setQrCodeUrl(""));
    } else {
      setQrCodeUrl("");
    }
  }, [selectedQuote, branding]);

  const addItemRow = () => {
    const defaultShutter = {
      shutterName: `Shutter #${formItems.length + 1}`,
      width: 10,
      height: 8,
      material: "GI",
      thickness: "21G",
      profile: "Flat",
      color: "Slate Grey",
      operationType: "Manual",
      motorType: "",
      quantity: 1,
      unitPrice: 18000,
      lineTotal: 18000
    };
    
    setFormItems((prev) => [...prev, defaultShutter]);
    triggerToast(`Added Shutter #${formItems.length + 1}`);
  };

  const addPresetShutter = (presetType: "SHOP" | "INDUSTRIAL" | "COMMERCIAL") => {
    let preset: any = {};
    if (presetType === "SHOP") {
      preset = {
        shutterName: `Standard Shop Shutter #${formItems.length + 1}`,
        width: 10,
        height: 8,
        material: "GI",
        thickness: "21G",
        profile: "Flat",
        color: "Slate Grey",
        operationType: "Manual",
        motorType: "",
        quantity: 1,
        unitPrice: 18000,
        lineTotal: 18000
      };
    } else if (presetType === "INDUSTRIAL") {
      const match = masterItems.find(mi => mi.category === "Motors" && !mi.isDisabled);
      preset = {
        shutterName: `Heavy Industrial Shutter #${formItems.length + 1}`,
        width: 15,
        height: 12,
        material: "GI",
        thickness: "18G",
        profile: "Round",
        color: "Industrial Grey",
        operationType: "Motorized",
        motorType: match ? match.name : "Somfy 120Nm",
        quantity: 1,
        unitPrice: 48000,
        lineTotal: 48000
      };
    } else if (presetType === "COMMERCIAL") {
      const match = masterItems.find(mi => mi.category === "Motors" && !mi.isDisabled);
      preset = {
        shutterName: `Commercial Motorized Shutter #${formItems.length + 1}`,
        width: 12,
        height: 10,
        material: "PPGI",
        thickness: "20G",
        profile: "Semi",
        color: "Pure White",
        operationType: "Motorized",
        motorType: match ? match.name : "Somfy 80Nm",
        quantity: 1,
        unitPrice: 32000,
        lineTotal: 32000
      };
    }
    setFormItems((prev) => [...prev, preset]);
    triggerToast(`Added preset: ${preset.shutterName}`);
  };

  const duplicateItemRow = (index: number) => {
    const original = formItems[index];
    const copy = {
      ...JSON.parse(JSON.stringify(original)),
      shutterName: `${original.shutterName || "Shutter"} (Copy)`
    };
    setFormItems((prev) => [...prev, copy]);
    triggerToast("Shutter configuration duplicated!");
  };

  const updateItemRow = (index: number, field: string, value: any) => {
    setFormItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index] };

      if (field === "shutterName") {
        item.shutterName = value;
      } else if (field === "width") {
        item.width = parseFloat(value) || 0;
      } else if (field === "height") {
        item.height = parseFloat(value) || 0;
      } else if (field === "material") {
        item.material = value;
      } else if (field === "thickness") {
        item.thickness = value;
      } else if (field === "profile") {
        item.profile = value;
      } else if (field === "color") {
        item.color = value;
      } else if (field === "operationType") {
        item.operationType = value;
        if (value === "Manual") {
          item.motorType = "";
        } else {
          const match = masterItems.find(mi => mi.category === "Motors" && !mi.isDisabled);
          item.motorType = match ? match.name : "Somfy 120Nm";
        }
      } else if (field === "motorType") {
        item.motorType = value;
      } else if (field === "quantity") {
        item.quantity = Math.max(1, Math.floor(parseFloat(value) || 1));
      } else if (field === "unitPrice") {
        item.unitPrice = Math.max(0, parseFloat(value) || 0);
      }

      item.lineTotal = item.quantity * item.unitPrice;
      updated[index] = item;
      return updated;
    });
  };

  const removeItemRow = (index: number) => {
    if (formItems.length === 1) {
      triggerToast("Quotation must contain at least 1 shutter.");
      return;
    }
    setFormItems((prev) => prev.filter((_, i) => i !== index));
  };

  const triggerToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(""), 3500);
  };

  const handleOpenAddModal = () => {
    setWizardStep(1);
    setShowAddQuote(true);
  };

  // Submit Quotation
  const handleCreateQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isNewCustomer && !formCustId) {
      alert("Please select an existing customer profile.");
      setWizardStep(1);
      return;
    }
    if (isNewCustomer && (!newCustName || !newCustPhone || !newCustBilling)) {
      alert("Customer Name, Phone, and Billing Address are required for new registry.");
      setWizardStep(1);
      return;
    }

    try {
      let customerId = formCustId;

      // 1. Create customer inline first if new customer selected
      if (isNewCustomer) {
        const custRes = await fetch("/api/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newCustName,
            companyName: newCustCompanyName || null,
            type: newCustType,
            phone: newCustPhone,
            whatsapp: newCustWhatsapp || null,
            email: newCustEmail || null,
            gstNumber: newCustGst || null,
            billingAddress: newCustBilling,
            shippingAddress: newCustShipping || null
          })
        });
        if (!custRes.ok) {
          alert("Failed to register new customer profile.");
          return;
        }
        const newCust = await custRes.json();
        customerId = newCust.id;
      }

      // 2. Submit Quotation
      const subtotal = formItems.reduce((sum, item) => sum + item.lineTotal, 0);
      const disc = parseFloat(formDiscount) || 0;
      const discountedTotal = Math.max(0, subtotal - disc);
      const gstRate = formGstOff ? 0.0 : parseFloat(formGstRate) || 0.0;
      const gstAmt = discountedTotal * (gstRate / 100);
      const grandTotal = Math.round(discountedTotal + gstAmt);

      const res = await fetch("/api/quotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quotation: {
            customerId,
            discount: disc,
            gstRate,
            gstAmount: gstAmt,
            totalAmount: grandTotal,
            terms: formTerms,
            status: formStatus
          },
          items: formItems
        })
      });

      if (res.ok) {
        triggerToast("Quotation proposal created successfully!");
        // Reset form
        setFormCustId("");
        setNewCustName("");
        setNewCustCompanyName("");
        setNewCustPhone("");
        setNewCustWhatsapp("");
        setNewCustEmail("");
        setNewCustGst("");
        setNewCustBilling("");
        setNewCustShipping("");
        setIsNewCustomer(false);
        setFormDiscount("0");
        setFormGstOff(true);
        setFormItems([{ shutterName: "Main Entrance Shutter", width: 10, height: 8, material: "GI", thickness: "21G", profile: "Flat", color: "Slate Grey", operationType: "Manual", motorType: "", quantity: 1, unitPrice: 18000, lineTotal: 18000 }]);
        setWizardStep(1);
        setShowAddQuote(false);
        fetchData();
      }
    } catch (e) {}
  };

  const handleUpdateStatus = async (id: string, newStatus: any) => {
    // Optimistic instant UI update (no loading spinner or page flicker)
    setQuotations((prev) =>
      prev.map((q) => (q.id === id ? { ...q, status: newStatus } : q))
    );
    if (selectedQuote && selectedQuote.id === id) {
      setSelectedQuote((prev) => (prev ? { ...prev, status: newStatus } : null));
    }

    try {
      const res = await fetch(`/api/quotations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        triggerToast(`Quotation status updated to ${newStatus}!`);
        // Quiet background sync without unmounting table
        fetchData(false);
      } else {
        // Rollback on server error
        fetchData(true);
      }
    } catch (e) {
      fetchData(true);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const res = await fetch(`/api/quotations/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "duplicate" })
      });

      if (res.ok) {
        triggerToast("Quotation duplicated to Draft!");
        fetchData(false);
      }
    } catch (e) {}
  };

  const handleDeleteQuote = async (id: string) => {
    if (!confirm("Are you sure you want to delete this quotation draft?")) return;
    try {
      const res = await fetch(`/api/quotations/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        triggerToast("Quotation deleted successfully.");
        setSelectedQuote(null);
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || "Cannot delete this quotation.");
      }
    } catch(e) {}
  };

  const handleConvertToInvoice = (quoteId: string) => {
    window.location.href = `/invoices?convert=${quoteId}`;
  };

  const handleCreateRevision = async (quoteId: string) => {
    try {
      const res = await fetch(`/api/quotations/${quoteId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revision" })
      });

      if (res.ok) {
        const revised = await res.json();
        triggerToast(`Quotation revision ${revised.quoteNumber} created!`);
        setSelectedQuote(null);
        fetchData();
      }
    } catch (e) {}
  };

  const filteredQuotes = quotations.filter(q => 
    q.quoteNumber.toLowerCase().includes(search.toLowerCase()) ||
    (q.customer && q.customer.name.toLowerCase().includes(search.toLowerCase())) ||
    (q.customer && q.customer.phone.includes(search))
  );

  const shareWhatsApp = (q: Quotation) => {
    const text = encodeURIComponent(
      `Hello! Please find the Rolling Shutter quotation ${q.quoteNumber} from Kohinoor Rolling Shutters.\nTotal: ₹${q.totalAmount.toLocaleString("en-IN")}\nAddress: ${q.customer?.billingAddress}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  };

  const shareEmail = (q: Quotation) => {
    const subject = encodeURIComponent(`Rolling Shutter Quotation ${q.quoteNumber} - Kohinoor Rolling Shutters`);
    const body = encodeURIComponent(`Dear Customer,\n\nPlease find attached quotation details for your rolling shutter installation.\nQuotation Number: ${q.quoteNumber}\nTotal Amount: ₹${q.totalAmount.toLocaleString("en-IN")}\n\nWarm regards,\nKohinoor Rolling Shutters`);
    window.open(`mailto:${q.customer?.email || ""}?subject=${subject}&body=${body}`, "_blank");
  };

  const thicknessList = masterItems.filter(mi => mi.category === "Thickness" && !mi.isDisabled);
  const selectedCustomerObj = customers.find(c => c.id === formCustId);

  // Summaries for active form
  const totalFormArea = formItems.reduce((sum, item) => sum + ((parseFloat(item.width) || 0) * (parseFloat(item.height) || 0) * (parseInt(item.quantity) || 1)), 0);
  const totalFormSubtotal = formItems.reduce((sum, item) => sum + (parseFloat(item.lineTotal) || 0), 0);
  const netFormTotal = Math.max(0, totalFormSubtotal - (parseFloat(formDiscount) || 0));

  if (loading) return <PageSkeleton rows={7} />;

  return (
    <div className="flex flex-col gap-6 h-full relative font-sans">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-4 right-4 bg-primary text-primary-foreground text-xs px-4 py-3 rounded-lg shadow-xl z-50 flex items-center gap-2 border border-primary/20 animate-bounce">
          <Check className="w-4 h-4" />
          <span>{notification}</span>
        </div>
      )}

      {/* Primary quotes view or details */}
      {!selectedQuote ? (
        <>
          {/* Header Actions */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card/45 border border-border/80 p-4 rounded-xl">
            <div className="relative flex-grow max-w-md w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search quotations by number, customer, or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-secondary/40 border border-border/80 rounded-lg py-2 pl-10 pr-4 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/60 transition-all duration-150"
              />
            </div>

            <button
              onClick={handleOpenAddModal}
              className="bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-semibold py-2.5 px-4 rounded-lg flex items-center gap-2 shadow-lg shadow-primary/25 cursor-pointer transition-all hover:scale-[1.01]"
            >
              <Plus className="w-4 h-4" />
              <span>Draft New Shutter Quotation</span>
            </button>
          </div>

          {/* List Table */}
          <div className="border border-border/80 rounded-xl bg-card/30 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-secondary/20 text-[10px] font-mono uppercase tracking-wider text-muted-foreground border-b border-border/60">
                    <th className="p-4">Quote Number</th>
                    <th className="p-4">Customer</th>
                    <th className="p-4">Company Name</th>
                    <th className="p-4">Revision</th>
                    <th className="p-4 text-right">Taxable Subtotal</th>
                    <th className="p-4 text-right">Grand Total (Rounded)</th>
                    <th className="p-4">Stage</th>
                    <th className="p-4 text-right pr-6">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-xs">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="text-center p-8 text-muted-foreground">
                        Loading documents ledger...
                      </td>
                    </tr>
                  ) : filteredQuotes.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center p-8 text-muted-foreground">
                        No quotes found matching filter parameters.
                      </td>
                    </tr>
                  ) : (
                    filteredQuotes.map((q) => {
                      const totalSub = q.items?.reduce((sum, item) => sum + item.lineTotal, 0) || 0;

                      return (
                        <tr key={q.id} className="hover:bg-secondary/25 transition-colors">
                          <td className="p-4 font-bold text-foreground font-mono">{q.quoteNumber}</td>
                          <td className="p-4">
                            <div className="flex flex-col">
                              <span className="font-semibold text-foreground">{q.customer?.name}</span>
                              <span className="text-[10px] text-muted-foreground">{q.customer?.phone}</span>
                            </div>
                          </td>
                          <td className="p-4 text-muted-foreground font-sans">
                            {q.customer?.companyName || "Individual"}
                          </td>
                          <td className="p-4">
                            <span className="text-[10px] font-mono bg-secondary/80 border px-1.5 py-0.5 rounded">
                              v{q.version}
                            </span>
                          </td>
                          <td className="p-4 text-right font-mono text-muted-foreground">
                            ₹{totalSub.toLocaleString("en-IN")}
                          </td>
                          <td className="p-4 text-right font-bold text-foreground font-mono">
                            ₹{q.totalAmount.toLocaleString("en-IN")}
                          </td>
                          <td className="p-4">
                            <select
                              value={q.status}
                              onChange={(e) => handleUpdateStatus(q.id, e.target.value)}
                              className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg border outline-none cursor-pointer transition-all ${
                                q.status === "APPROVED"
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                  : q.status === "SENT"
                                  ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                                  : q.status === "REJECTED"
                                  ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                                  : "bg-secondary/60 text-muted-foreground border-border"
                              }`}
                            >
                              <option value="DRAFT" className="bg-card text-foreground font-sans">DRAFT</option>
                              <option value="SENT" className="bg-card text-amber-400 font-sans">SENT</option>
                              <option value="APPROVED" className="bg-card text-emerald-400 font-sans">APPROVED</option>
                              <option value="REJECTED" className="bg-card text-rose-400 font-sans">REJECTED</option>
                            </select>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center justify-end gap-2 pr-2">
                              {q.status === "APPROVED" && (
                                <Link
                                  href={`/invoices?convert=${q.id}`}
                                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-2.5 py-1 rounded-md text-[11px] flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 transition-all shrink-0"
                                >
                                  <Receipt className="w-3.5 h-3.5" />
                                  <span>Convert to Invoice</span>
                                </Link>
                              )}

                              <button
                                onClick={() => setSelectedQuote(q)}
                                className="bg-secondary hover:bg-secondary/80 border border-border/80 text-foreground font-semibold px-2.5 py-1 rounded-md text-[11px] flex items-center gap-1.5 transition-all shrink-0"
                              >
                                <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                                <span>Preview / Print</span>
                              </button>
                              
                              <button
                                onClick={() => handleDuplicate(q.id)}
                                className="p-1.5 hover:bg-secondary border border-border/60 hover:border-border rounded-md text-muted-foreground hover:text-foreground transition-all shrink-0"
                                title="Duplicate (v1 Draft)"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleDeleteQuote(q.id)}
                                className="p-1.5 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 rounded-md text-muted-foreground hover:text-rose-500 transition-all shrink-0 cursor-pointer"
                                title="Delete Quotation"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* DETAIL DRAWER / PRINT PREVIEW */
        <div className="flex flex-col gap-6">
          {/* Back Action Bar */}
          <div className="flex justify-between items-center bg-card/45 border p-4 rounded-xl print-hidden print:!hidden">
            <button
              onClick={() => setSelectedQuote(null)}
              className="flex items-center gap-2 text-xs font-semibold hover:text-primary transition-colors text-muted-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Ledger</span>
            </button>

            <div className="flex items-center gap-3">
              {/* Approval workflow dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground">Status:</span>
                <select
                  value={selectedQuote.status}
                  onChange={(e) => handleUpdateStatus(selectedQuote.id, e.target.value)}
                  className={`text-xs font-bold uppercase px-3 py-1.5 rounded-lg border outline-none cursor-pointer transition-all ${
                    selectedQuote.status === "APPROVED"
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      : selectedQuote.status === "SENT"
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                      : selectedQuote.status === "REJECTED"
                      ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                      : "bg-secondary/60 text-muted-foreground border-border"
                  }`}
                >
                  <option value="DRAFT" className="bg-card text-foreground font-sans">DRAFT</option>
                  <option value="SENT" className="bg-card text-amber-400 font-sans">SENT</option>
                  <option value="APPROVED" className="bg-card text-emerald-400 font-sans">APPROVED</option>
                  <option value="REJECTED" className="bg-card text-rose-400 font-sans">REJECTED</option>
                </select>
              </div>

              {/* Conversion flow */}
              {selectedQuote.status === "APPROVED" && (
                <button
                  onClick={() => handleConvertToInvoice(selectedQuote.id)}
                  className="bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-semibold py-1.5 px-3.5 rounded-lg flex items-center gap-1.5 shadow-md shadow-primary/20"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>Convert to Invoice</span>
                </button>
              )}

              {/* Share actions */}
              <button
                onClick={() => shareWhatsApp(selectedQuote)}
                className="border border-emerald-500/25 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-400 p-2 rounded-lg"
                title="Share on WhatsApp"
              >
                <MessageSquare className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => shareEmail(selectedQuote)}
                className="border border-sky-500/25 bg-sky-500/5 hover:bg-sky-500/10 text-sky-400 p-2 rounded-lg"
                title="Share via Email"
              >
                <Mail className="w-4 h-4" />
              </button>

              <button
                onClick={() => handleCreateRevision(selectedQuote.id)}
                className="bg-secondary text-foreground hover:bg-secondary/80 text-xs font-semibold py-1.5 px-3.5 border rounded-lg flex items-center gap-1.5"
                title="Create revision"
              >
                <RefreshCw className="w-4 h-4 text-muted-foreground" />
                <span>Create Revision</span>
              </button>

              {selectedQuote.status === "APPROVED" && (
                <Link
                  href={`/invoices?convert=${selectedQuote.id}`}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold py-1.5 px-3.5 rounded-lg flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all"
                >
                  <Receipt className="w-4 h-4" />
                  <span>Convert to GST Invoice</span>
                </Link>
              )}

              <button
                onClick={() => handleDeleteQuote(selectedQuote.id)}
                className="bg-rose-500/15 text-rose-400 hover:bg-rose-500/20 text-xs font-semibold py-1.5 px-3.5 border border-rose-500/20 rounded-lg flex items-center gap-1.5"
                title="Delete draft quotation"
              >
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span>Delete Draft</span>
              </button>

              <button
                onClick={() => window.print()}
                className="bg-secondary text-foreground hover:bg-secondary/80 text-xs font-semibold py-1.5 px-3.5 border rounded-lg flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Print PDF</span>
              </button>
            </div>
          </div>

          {/* Paper Mockup container */}
          <div className="bg-white text-slate-900 p-8 sm:p-12 rounded-xl shadow-lg border border-slate-200 max-w-4xl mx-auto w-full font-sans print:p-0 print:border-none print:shadow-none printable-card">
            {/* Header info */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b-2 border-slate-100 pb-6 gap-6">
              <div className="flex items-center gap-3">
                <img src="/logo.png" alt="Logo" className="w-10 h-10 rounded object-contain shrink-0" />

                <div className="flex flex-col">
                  <span className="font-bold text-sm tracking-tight">{branding?.companyName || "KOHINOOR ROLLING SHUTTERS"}</span>
                  <span className="text-[9px] text-slate-500 font-mono tracking-widest uppercase">Industries & Installation</span>
                </div>
              </div>
              
              <div className="flex flex-col text-right sm:items-end gap-1">
                <span className="text-xl font-bold tracking-tight text-slate-800">QUOTATION</span>
                <span className="text-xs font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                  No: {selectedQuote.quoteNumber} (v{selectedQuote.version})
                </span>
                <span className="text-[10px] text-slate-400">
                  Date: {new Date(selectedQuote.createdAt).toLocaleDateString("en-IN")}
                </span>
              </div>
            </div>

            {/* Address fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 my-8 text-xs">
              <div className="space-y-2 border-r border-slate-100 pr-4">
                <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest leading-none font-bold">Issuer / Vendor Details</span>
                <p className="font-bold text-slate-800 leading-snug">{branding?.companyName || "Kohinoor Rolling Shutters"}</p>
                <p className="text-slate-500">201, Industrial Development Area, GIDC, Thane, MH - 400604</p>
                <p className="text-slate-500">GSTIN: {branding?.gstNumber || "27AAACK5912K1Z9"}</p>
                <p className="text-slate-500">Bank: {branding?.bankName || "SBI"} | A/C: {branding?.bankAccountNo || "38927103829"} | IFSC: {branding?.bankIfsc || "SBIN0004561"}</p>
              </div>

              <div className="space-y-2">
                <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest leading-none font-bold">Customer Details</span>
                <p className="font-bold text-slate-800 leading-snug">{selectedQuote.customer?.name}</p>
                {selectedQuote.customer?.companyName && (
                  <p className="text-slate-600 font-semibold text-[11px]">Company: {selectedQuote.customer.companyName}</p>
                )}
                <p className="text-slate-500">{selectedQuote.customer?.billingAddress}</p>
                <p className="text-slate-500">Phone: {selectedQuote.customer?.phone}</p>
                {selectedQuote.customer?.whatsapp && (
                  <p className="text-slate-500">WhatsApp: {selectedQuote.customer.whatsapp}</p>
                )}
              </div>
            </div>

            {/* Product items table */}
            <table className="w-full text-left border-collapse my-8 text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] font-mono uppercase text-slate-400">
                  <th className="pb-2">S.No</th>
                  <th className="pb-2">Product Description</th>
                  <th className="pb-2 text-center font-mono">Size / Specs</th>
                  <th className="pb-2 text-center font-mono">Unit</th>
                  <th className="pb-2 text-center">Qty</th>
                  <th className="pb-2 text-right">Unit Rate (₹)</th>
                  <th className="pb-2 text-right">Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {selectedQuote.items?.map((item: any, idx) => {
                  return (
                    <tr key={idx}>
                      <td className="py-3 text-slate-500 font-mono">{idx + 1}</td>
                      <td className="py-3 font-medium text-slate-800">
                        <div className="font-bold text-slate-900">{item.shutterName || `Rolling Shutter ${idx + 1}`}</div>
                        <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                          Specs: {item.material} {item.thickness} {item.profile} | {item.operationType} {item.motorType && `(${item.motorType})`} {item.color && `| Color: ${item.color}`}
                        </div>
                      </td>
                      <td className="py-3 text-center text-slate-600 font-mono">
                        {item.width}Ft x {item.height}Ft
                      </td>
                      <td className="py-3 text-center text-slate-500 font-mono">Nos</td>
                      <td className="py-3 text-center text-slate-700">{item.quantity}</td>
                      <td className="py-3 text-right text-slate-700">₹{item.unitPrice.toLocaleString("en-IN")}</td>
                      <td className="py-3 text-right font-semibold text-slate-800">₹{item.lineTotal.toLocaleString("en-IN")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Total breakdown */}
            <div className="flex justify-end pt-6 border-t border-slate-200">
              <div className="w-full sm:w-72 flex flex-col gap-2 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal</span>
                  <span>₹{(selectedQuote.items?.reduce((sum, i) => sum + i.lineTotal, 0) || 0).toLocaleString("en-IN")}</span>
                </div>
                {selectedQuote.discount > 0 && (
                  <div className="flex justify-between text-rose-500">
                    <span>Discount</span>
                    <span>- ₹{selectedQuote.discount.toLocaleString("en-IN")}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-bold text-slate-800">
                  <span>Grand Total (Rounded)</span>
                  <span>₹{Math.round((selectedQuote.items?.reduce((sum, i) => sum + i.lineTotal, 0) || 0) - selectedQuote.discount).toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>

            {/* Terms and Signatures */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 my-8 text-[10px] border-t border-slate-100 pt-6">
              <div className="space-y-1.5">
                <span className="font-bold text-slate-700 uppercase font-mono tracking-wider">Terms & Conditions</span>
                <p className="text-slate-400 leading-relaxed whitespace-pre-line">{selectedQuote.terms || branding?.quotationTerms}</p>
              </div>

              <div className="flex flex-col justify-end items-end h-24">
                <div className="w-48 border-b border-slate-300 pb-1 flex flex-col items-center">
                  {selectedQuote.status === "APPROVED" && (
                    <span className="font-mono text-[9px] uppercase tracking-wider text-emerald-500 font-bold bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded leading-none mb-1">
                      Approved Digitally
                    </span>
                  )}
                  <span className="text-[10px] text-slate-400 font-sans">Authorized Signature</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Quotation Step-by-Step Wizard Modal */}
      {showAddQuote && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="w-full max-w-5xl bg-card border border-border/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto">
            
            {/* Modal Header & Wizard Navigation Bar */}
            <div className="bg-secondary/30 border-b border-border px-6 py-4 flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 text-primary rounded-xl">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-base text-foreground">Draft New Quotation Proposal</h3>
                    <p className="text-xs text-muted-foreground">Configure shutter specifications, customer details, and pricing</p>
                  </div>
                </div>

                <button 
                  onClick={() => setShowAddQuote(false)} 
                  className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Wizard Step Tabs */}
              <div className="grid grid-cols-3 gap-2 bg-background/60 p-1.5 rounded-xl border border-border/50">
                <button
                  type="button"
                  onClick={() => setWizardStep(1)}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                    wizardStep === 1 
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
                      : (formCustId || (isNewCustomer && newCustName)) 
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                      : "text-muted-foreground hover:bg-secondary/40"
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">1. Customer Info</span>
                  <span className="sm:hidden">1. Customer</span>
                  {(formCustId || (isNewCustomer && newCustName)) && wizardStep !== 1 && (
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setWizardStep(2)}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                    wizardStep === 2 
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
                      : "text-muted-foreground hover:bg-secondary/40"
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">2. Shutter Configurator ({formItems.length})</span>
                  <span className="sm:hidden">2. Shutters ({formItems.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setWizardStep(3)}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                    wizardStep === 3 
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
                      : "text-muted-foreground hover:bg-secondary/40"
                  }`}
                >
                  <Calculator className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">3. Summary & Terms</span>
                  <span className="sm:hidden">3. Summary</span>
                </button>
              </div>
            </div>
            
            {/* Modal Body Form */}
            <form onSubmit={handleCreateQuotation} className="flex-grow overflow-y-auto p-6 space-y-6">
              
              {/* STEP 1: CUSTOMER SELECTION & PROFILE REGISTRATION */}
              {wizardStep === 1 && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-secondary/15 p-4 rounded-xl border border-border/60">
                    <div>
                      <h4 className="font-semibold text-sm text-foreground">Customer Registry</h4>
                      <p className="text-xs text-muted-foreground">Select an existing customer or create a new profile inline</p>
                    </div>

                    <div className="flex bg-background border border-border p-1 rounded-xl text-xs">
                      <button
                        type="button"
                        onClick={() => setIsNewCustomer(false)}
                        className={`px-4 py-1.5 font-semibold rounded-lg transition-all ${!isNewCustomer ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                      >
                        Existing Customer
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsNewCustomer(true)}
                        className={`px-4 py-1.5 font-semibold rounded-lg transition-all flex items-center gap-1.5 ${isNewCustomer ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Create New</span>
                      </button>
                    </div>
                  </div>

                  {!isNewCustomer ? (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          <User className="w-4 h-4 text-primary" />
                          <span>Select Customer Profile</span>
                        </label>
                        <select
                          required={!isNewCustomer}
                          value={formCustId}
                          onChange={(e) => setFormCustId(e.target.value)}
                          className="w-full bg-secondary/30 border border-border/80 rounded-xl px-4 py-3 text-xs outline-none text-foreground font-semibold focus:border-primary transition-all"
                        >
                          <option value="" className="bg-card text-foreground">Choose customer from registry...</option>
                          {customers.map((c) => (
                            <option key={c.id} value={c.id} className="bg-card text-foreground">
                              {c.name} {c.companyName ? `(${c.companyName})` : ""} - {c.phone}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Selected Customer Preview Card */}
                      {selectedCustomerObj && (
                        <div className="bg-primary/5 border border-primary/20 p-5 rounded-2xl space-y-3">
                          <div className="flex items-center justify-between border-b border-primary/10 pb-2">
                            <span className="text-[10px] font-mono uppercase tracking-wider text-primary font-bold">Selected Customer Preview</span>
                            <span className="text-xs font-semibold bg-primary/10 text-primary px-2.5 py-0.5 rounded-md">
                              {selectedCustomerObj.companyName ? "Corporate Client" : "Individual Client"}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                            <div>
                              <span className="text-muted-foreground text-[10px] uppercase block">Customer Name</span>
                              <span className="font-bold text-foreground">{selectedCustomerObj.name}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground text-[10px] uppercase block">Phone / WhatsApp</span>
                              <span className="font-mono font-semibold text-foreground">{selectedCustomerObj.phone}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground text-[10px] uppercase block">GSTIN</span>
                              <span className="font-mono text-muted-foreground">{selectedCustomerObj.gstNumber || "N/A"}</span>
                            </div>
                            <div className="md:col-span-3">
                              <span className="text-muted-foreground text-[10px] uppercase block">Billing Address</span>
                              <span className="text-foreground">{selectedCustomerObj.billingAddress}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Inline New Customer Creation Form */
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-secondary/10 p-5 rounded-2xl border border-border/60 text-xs">
                      <div className="space-y-1.5">
                        <label className="font-semibold text-foreground">Customer Full Name *</label>
                        <input
                          type="text"
                          required={isNewCustomer}
                          placeholder="e.g. Anil Sharma"
                          value={newCustName}
                          onChange={(e) => setNewCustName(e.target.value)}
                          className="w-full bg-secondary/40 border border-border rounded-xl px-3 py-2 text-xs outline-none focus:border-primary text-foreground font-semibold"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="font-semibold text-foreground">Company Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Metro Retailers Ltd"
                          value={newCustCompanyName}
                          onChange={(e) => setNewCustCompanyName(e.target.value)}
                          className="w-full bg-secondary/40 border border-border rounded-xl px-3 py-2 text-xs outline-none focus:border-primary text-foreground font-semibold"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="font-semibold text-foreground">Client Type</label>
                        <select
                          value={newCustType}
                          onChange={(e) => setNewCustType(e.target.value as any)}
                          className="w-full bg-secondary/40 border border-border rounded-xl px-3 py-2 text-xs outline-none focus:border-primary text-foreground"
                        >
                          <option value="COMPANY" className="bg-card">Company</option>
                          <option value="INDIVIDUAL" className="bg-card">Individual</option>
                        </select>
                      </div>

                      <div className="space-y-1.5 font-mono">
                        <label className="font-semibold text-foreground font-sans">Phone Number *</label>
                        <input
                          type="text"
                          required={isNewCustomer}
                          placeholder="+91 98765 43210"
                          value={newCustPhone}
                          onChange={(e) => setNewCustPhone(e.target.value)}
                          className="w-full bg-secondary/40 border border-border rounded-xl px-3 py-2 text-xs outline-none focus:border-primary text-foreground"
                        />
                      </div>

                      <div className="space-y-1.5 font-mono">
                        <label className="font-semibold text-foreground font-sans">WhatsApp Number</label>
                        <input
                          type="text"
                          placeholder="+91 98765 43210"
                          value={newCustWhatsapp}
                          onChange={(e) => setNewCustWhatsapp(e.target.value)}
                          className="w-full bg-secondary/40 border border-border rounded-xl px-3 py-2 text-xs outline-none focus:border-primary text-foreground"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="font-semibold text-foreground">Email Address</label>
                        <input
                          type="email"
                          placeholder="client@company.com"
                          value={newCustEmail}
                          onChange={(e) => setNewCustEmail(e.target.value)}
                          className="w-full bg-secondary/40 border border-border rounded-xl px-3 py-2 text-xs outline-none focus:border-primary text-foreground"
                        />
                      </div>

                      <div className="space-y-1.5 font-mono md:col-span-1">
                        <label className="font-semibold text-foreground font-sans">GSTIN Number</label>
                        <input
                          type="text"
                          placeholder="27AAACK5912K1Z9"
                          value={newCustGst}
                          onChange={(e) => setNewCustGst(e.target.value)}
                          className="w-full bg-secondary/40 border border-border rounded-xl px-3 py-2 text-xs outline-none focus:border-primary text-foreground"
                        />
                      </div>

                      <div className="space-y-1.5 md:col-span-2">
                        <label className="font-semibold text-foreground">Billing Address *</label>
                        <input
                          type="text"
                          required={isNewCustomer}
                          placeholder="Complete site/billing location address"
                          value={newCustBilling}
                          onChange={(e) => setNewCustBilling(e.target.value)}
                          className="w-full bg-secondary/40 border border-border rounded-xl px-3 py-2 text-xs outline-none focus:border-primary text-foreground"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end pt-4 border-t border-border/40">
                    <button
                      type="button"
                      onClick={() => {
                        if (!isNewCustomer && !formCustId) {
                          alert("Please select a customer before continuing.");
                          return;
                        }
                        if (isNewCustomer && (!newCustName || !newCustPhone || !newCustBilling)) {
                          alert("Name, Phone, and Billing Address are required for new customer registry.");
                          return;
                        }
                        setWizardStep(2);
                      }}
                      className="bg-primary text-primary-foreground hover:bg-primary/95 font-semibold px-6 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-primary/20"
                    >
                      <span>Proceed to Shutter Configurations</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: STRUCTURED SHUTTER CONFIGURATOR CARDS */}
              {wizardStep === 2 && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  
                  {/* Quick Shutter Presets & Live Summary Bar */}
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-secondary/20 p-4 rounded-2xl border border-border/80">
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        Quick Preset Templates
                      </span>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => addPresetShutter("SHOP")}
                          className="bg-background hover:bg-secondary border border-border text-foreground text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shadow-sm"
                        >
                          <Plus className="w-3 h-3 text-primary" />
                          <span>Standard Shop (10×8 Ft Manual)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => addPresetShutter("INDUSTRIAL")}
                          className="bg-background hover:bg-secondary border border-border text-foreground text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shadow-sm"
                        >
                          <Plus className="w-3 h-3 text-primary" />
                          <span>Industrial Heavy (15×12 Ft Motorized)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => addPresetShutter("COMMERCIAL")}
                          className="bg-background hover:bg-secondary border border-border text-foreground text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shadow-sm"
                        >
                          <Plus className="w-3 h-3 text-primary" />
                          <span>Commercial PPGI (12×10 Ft Motorized)</span>
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={addItemRow}
                      className="bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-2 shadow-md shadow-primary/20 shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Custom Shutter</span>
                    </button>
                  </div>

                  {/* List of Structured Shutter Cards */}
                  <div className="space-y-4">
                    {formItems.map((item, idx) => {
                      const width = parseFloat(item.width) || 0;
                      const height = parseFloat(item.height) || 0;
                      const areaSft = width * height;
                      const qty = parseInt(item.quantity) || 1;
                      const pricePerSft = areaSft > 0 ? Math.round(item.unitPrice / areaSft) : 0;

                      return (
                        <div key={idx} className="bg-card border border-border rounded-2xl shadow-sm hover:border-primary/50 transition-all p-5 space-y-4">
                          
                          {/* Card Header */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/50 pb-3">
                            <div className="flex items-center gap-3">
                              <span className="bg-primary/10 text-primary font-mono font-bold text-xs px-2.5 py-1 rounded-lg">
                                #{idx + 1}
                              </span>
                              <input
                                type="text"
                                placeholder="Shutter identifier name..."
                                value={item.shutterName || ""}
                                onChange={(e) => updateItemRow(idx, "shutterName", e.target.value)}
                                className="bg-secondary/30 border border-border/80 hover:border-primary/40 focus:border-primary rounded-lg px-3 py-1 text-xs outline-none text-foreground font-bold min-w-[200px]"
                              />
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              {/* Live Computed Area Badge */}
                              <span className="bg-secondary text-foreground text-xs font-mono font-bold px-3 py-1 rounded-lg border border-border/80 flex items-center gap-1.5">
                                <Maximize2 className="w-3.5 h-3.5 text-primary" />
                                {width}Ft × {height}Ft = <span className="text-primary font-black">{areaSft} Sft</span>
                              </span>

                              <button
                                type="button"
                                onClick={() => duplicateItemRow(idx)}
                                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg border border-border/60 transition-colors"
                                title="Duplicate this shutter"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => removeItemRow(idx)}
                                className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg border border-rose-500/20 transition-colors"
                                title="Remove shutter"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Form Grid Section 1: Dimensions & Quantity */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-secondary/10 p-3.5 rounded-xl border border-border/40">
                            <div className="space-y-1 font-mono">
                              <label className="text-[10px] font-sans font-semibold text-muted-foreground uppercase">Width (Feet)</label>
                              <input
                                type="number"
                                step="any"
                                required
                                placeholder="Width"
                                value={item.width || ""}
                                onChange={(e) => updateItemRow(idx, "width", e.target.value)}
                                className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground font-bold outline-none focus:border-primary text-center"
                              />
                            </div>

                            <div className="space-y-1 font-mono">
                              <label className="text-[10px] font-sans font-semibold text-muted-foreground uppercase">Height (Feet)</label>
                              <input
                                type="number"
                                step="any"
                                required
                                placeholder="Height"
                                value={item.height || ""}
                                onChange={(e) => updateItemRow(idx, "height", e.target.value)}
                                className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground font-bold outline-none focus:border-primary text-center"
                              />
                            </div>

                            <div className="space-y-1 font-mono">
                              <label className="text-[10px] font-sans font-semibold text-muted-foreground uppercase">Quantity (Nos)</label>
                              <input
                                type="number"
                                required
                                min="1"
                                value={item.quantity || "1"}
                                onChange={(e) => updateItemRow(idx, "quantity", e.target.value)}
                                className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground font-bold outline-none focus:border-primary text-center"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-sans font-semibold text-muted-foreground uppercase">Color Finish</label>
                              <input
                                type="text"
                                placeholder="e.g. Slate Grey"
                                value={item.color || ""}
                                onChange={(e) => updateItemRow(idx, "color", e.target.value)}
                                className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground font-semibold outline-none focus:border-primary"
                              />
                            </div>
                          </div>

                          {/* Form Grid Section 2: Material & Specs */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] font-semibold text-muted-foreground uppercase">Material</label>
                              <select
                                value={item.material || "GI"}
                                onChange={(e) => updateItemRow(idx, "material", e.target.value)}
                                className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-1.5 text-xs outline-none text-foreground font-semibold focus:border-primary"
                              >
                                <option value="GI" className="bg-card">GI (Galvanized Iron)</option>
                                <option value="ZN" className="bg-card">ZN (Zinc Coated)</option>
                                <option value="PPGI" className="bg-card">PPGI (Pre-Painted GI)</option>
                              </select>
                            </div>

                            <div className="space-y-1 font-mono">
                              <label className="text-[10px] font-sans font-semibold text-muted-foreground uppercase">Gauge / Thickness</label>
                              <select
                                value={item.thickness || "21G"}
                                onChange={(e) => updateItemRow(idx, "thickness", e.target.value)}
                                className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-1.5 text-xs outline-none text-foreground font-semibold focus:border-primary font-mono"
                              >
                                {thicknessList.map((mi) => (
                                  <option key={mi.id} value={mi.name} className="bg-card">{mi.name}</option>
                                ))}
                              </select>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-semibold text-muted-foreground uppercase">Profile Shape</label>
                              <select
                                value={item.profile || "Flat"}
                                onChange={(e) => updateItemRow(idx, "profile", e.target.value)}
                                className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-1.5 text-xs outline-none text-foreground font-semibold focus:border-primary"
                              >
                                <option value="Flat" className="bg-card">Flat Slat</option>
                                <option value="Semi" className="bg-card">Semi Curved</option>
                                <option value="Half Round" className="bg-card">Half Round</option>
                                <option value="Round" className="bg-card">Round Slat</option>
                              </select>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-semibold text-muted-foreground uppercase">Operation Type</label>
                              <select
                                value={item.operationType || "Manual"}
                                onChange={(e) => updateItemRow(idx, "operationType", e.target.value)}
                                className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-1.5 text-xs outline-none text-foreground font-semibold focus:border-primary"
                              >
                                <option value="Manual" className="bg-card">Manual Drive</option>
                                <option value="Motorized" className="bg-card text-emerald-400">Motorized Drive</option>
                              </select>
                            </div>

                            <div className="space-y-1 md:col-span-2">
                              <label className="text-[10px] font-semibold text-muted-foreground uppercase">
                                Motor Drive Model {item.operationType === "Manual" && "(Requires Motorized)"}
                              </label>
                              <select
                                disabled={item.operationType !== "Motorized"}
                                value={item.motorType || ""}
                                onChange={(e) => updateItemRow(idx, "motorType", e.target.value)}
                                className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-1.5 text-xs outline-none text-foreground font-semibold focus:border-primary disabled:opacity-30"
                              >
                                <option value="">Select Motorized Model...</option>
                                {masterItems
                                  .filter(mi => mi.category === "Motors" && !mi.isDisabled)
                                  .map((mi) => (
                                    <option key={mi.id} value={mi.name} className="bg-card">{mi.name}</option>
                                  ))}
                              </select>
                            </div>

                            {/* Section 3: Rate & Line Total */}
                            <div className="space-y-1 font-mono md:col-span-2">
                              <div className="flex justify-between items-center">
                                <label className="text-[10px] font-sans font-semibold text-muted-foreground uppercase">Unit Selling Rate (₹)</label>
                                {pricePerSft > 0 && (
                                  <span className="text-[10px] font-sans text-muted-foreground">≈ ₹{pricePerSft} / Sft</span>
                                )}
                              </div>
                              <input
                                type="number"
                                required
                                value={item.unitPrice || "0"}
                                onChange={(e) => updateItemRow(idx, "unitPrice", e.target.value)}
                                className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-1.5 text-xs text-right text-emerald-400 font-bold outline-none focus:border-primary"
                              />
                            </div>
                          </div>

                          {/* Footer Line Total */}
                          <div className="flex justify-end items-center gap-3 pt-3 border-t border-border/40 font-mono">
                            <span className="text-xs text-muted-foreground">Line Total:</span>
                            <span className="text-base font-black text-foreground">
                              ₹{(item.lineTotal || 0).toLocaleString("en-IN")}
                            </span>
                          </div>

                        </div>
                      );
                    })}
                  </div>

                  {/* Wizard Step 2 Footer Navigation */}
                  <div className="flex justify-between items-center pt-4 border-t border-border/40">
                    <button
                      type="button"
                      onClick={() => setWizardStep(1)}
                      className="bg-secondary hover:bg-secondary/80 text-foreground font-semibold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 border border-border"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Back: Customer Info</span>
                    </button>

                    <div className="flex items-center gap-4">
                      <div className="hidden sm:flex flex-col text-right font-mono text-xs">
                        <span className="text-[10px] text-muted-foreground uppercase">Subtotal ({formItems.length} Shutters):</span>
                        <span className="font-bold text-foreground">₹{totalFormSubtotal.toLocaleString("en-IN")}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setWizardStep(3)}
                        className="bg-primary text-primary-foreground hover:bg-primary/95 font-semibold px-6 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-primary/20"
                      >
                        <span>Proceed to Pricing & Terms</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                </div>
              )}

              {/* STEP 3: PRICING, TERMS & FINAL CONFIRMATION */}
              {wizardStep === 3 && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  
                  {/* Final Quote Summary Breakdown Card */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    
                    {/* Left 2 Cols: Stage, Discount & Terms */}
                    <div className="md:col-span-2 space-y-5">
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-foreground">Quotation Initial Stage</label>
                          <select
                            value={formStatus}
                            onChange={(e) => setFormStatus(e.target.value as any)}
                            className="w-full bg-secondary/30 border border-border rounded-xl px-4 py-2.5 text-xs outline-none text-foreground font-semibold focus:border-primary"
                          >
                            <option value="DRAFT" className="bg-card">Draft (Internal Review)</option>
                            <option value="SENT" className="bg-card">Sent to Customer</option>
                            <option value="APPROVED" className="bg-card text-emerald-400">Approved by Client</option>
                            <option value="REJECTED" className="bg-card text-rose-400">Rejected</option>
                          </select>
                        </div>

                        <div className="space-y-1.5 font-mono">
                          <label className="text-xs font-semibold text-foreground font-sans">Special Discount Deduction (₹)</label>
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={formDiscount}
                            onChange={(e) => setFormDiscount(e.target.value)}
                            className="w-full bg-secondary/30 border border-border rounded-xl px-4 py-2 text-xs outline-none text-foreground font-bold focus:border-primary"
                          />
                        </div>
                      </div>

                      {/* Payment Terms & Conditions */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-semibold text-foreground">Terms & Conditions Statement</label>
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => setFormTerms("1. Price quoted is valid for 30 days.\n2. 50% advance along with order. Balance on delivery.\n3. Civil work / electrical wiring must be provided by client.")}
                              className="text-[10px] bg-secondary hover:bg-secondary/80 border px-2 py-0.5 rounded text-muted-foreground"
                            >
                              Standard Terms
                            </button>
                            <button
                              type="button"
                              onClick={() => setFormTerms("1. 100% advance against proforma invoice.\n2. Delivery within 7 working days from site approval.")}
                              className="text-[10px] bg-secondary hover:bg-secondary/80 border px-2 py-0.5 rounded text-muted-foreground"
                            >
                              100% Advance
                            </button>
                          </div>
                        </div>

                        <textarea
                          rows={4}
                          value={formTerms}
                          onChange={(e) => setFormTerms(e.target.value)}
                          className="w-full bg-secondary/30 border border-border rounded-xl p-3 text-xs outline-none text-foreground resize-none focus:border-primary leading-relaxed"
                        />
                      </div>

                    </div>

                    {/* Right Col: Live Calculation Ledger Summary Card */}
                    <div className="bg-secondary/15 border border-border p-5 rounded-2xl flex flex-col justify-between space-y-4 font-mono">
                      <div className="space-y-3">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block border-b border-border/40 pb-2">
                          Calculated Financial Summary
                        </span>

                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Total Configured Shutters</span>
                          <span className="font-bold text-foreground">{formItems.length} Nos</span>
                        </div>

                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Total Combined Area</span>
                          <span className="font-bold text-foreground">{totalFormArea} Sft</span>
                        </div>

                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Gross Subtotal</span>
                          <span className="font-bold text-foreground">₹{totalFormSubtotal.toLocaleString("en-IN")}</span>
                        </div>

                        {parseFloat(formDiscount) > 0 && (
                          <div className="flex justify-between text-xs text-rose-400">
                            <span>Discount Subtracted</span>
                            <span>- ₹{parseFloat(formDiscount).toLocaleString("en-IN")}</span>
                          </div>
                        )}

                        <div className="pt-3 border-t border-border/60">
                          <span className="text-[10px] uppercase text-muted-foreground block font-sans">Final Estimated Amount</span>
                          <span className="text-2xl font-black text-foreground block tracking-tight">
                            ₹{netFormTotal.toLocaleString("en-IN")}
                          </span>
                        </div>
                      </div>

                      <div className="bg-primary/10 border border-primary/20 p-3 rounded-xl text-[11px] font-sans text-primary">
                        <span className="font-bold block">Ready for Generation</span>
                        <span>This document will be assigned quote ID and saved to your CRM ledger.</span>
                      </div>
                    </div>

                  </div>

                  {/* Wizard Step 3 Footer CTA */}
                  <div className="flex justify-between items-center pt-4 border-t border-border/40">
                    <button
                      type="button"
                      onClick={() => setWizardStep(2)}
                      className="bg-secondary hover:bg-secondary/80 text-foreground font-semibold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 border border-border"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Back: Shutters Config</span>
                    </button>

                    <button
                      type="submit"
                      className="bg-primary text-primary-foreground font-bold px-8 py-3 rounded-xl text-xs hover:bg-primary/95 shadow-xl shadow-primary/25 cursor-pointer flex items-center gap-2 hover:scale-[1.01] transition-all"
                    >
                      <Check className="w-4 h-4" />
                      <span>Draft and Store Quotation Proposal</span>
                    </button>
                  </div>

                </div>
              )}

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
