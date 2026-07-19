"use client";

import React, { useEffect, useState } from "react";
import { 
  FileText, Plus, Search, Trash2, CheckCircle2, Copy, Send, 
  Printer, ArrowLeft, RefreshCw, MessageSquare, Mail, ClipboardCopy, Check, UserPlus, FileCheck, Building, User
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
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
  productName: string;
  materialCategory?: string;
  material?: string;
  thickness?: string;
  profile?: string;
  length?: number;
  width?: number;
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

  // New Quote Form State
  const [showAddQuote, setShowAddQuote] = useState(false);
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
  const [formStatus, setFormStatus] = useState<"DRAFT" | "SENT" | "APPROVED">("DRAFT");
  const [formTerms, setFormTerms] = useState(
    "1. Price quoted is valid for 30 days.\n2. 50% advance along with order. Balance on delivery.\n3. Civil work / electrical wiring must be provided by client."
  );
  
  // Table Items State
  const [formItems, setFormItems] = useState<QuoteItem[]>([
    { productName: "GI Sheet (GI 21G Flat)", materialCategory: "GI Sheet", material: "GI", thickness: "21G", profile: "Flat", length: 10, width: 8, quantity: 1, unitPrice: 85, lineTotal: 6800, unit: "Sft" }
  ]);

  // Smart Autofill state
  const [suggestedItems, setSuggestedItems] = useState<any[] | null>(null);
  const [notification, setNotification] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const qRes = await fetch("/api/quotations");
      const cRes = await fetch("/api/customers");
      const mRes = await fetch("/api/master-data");
      const bRes = await fetch("/api/admin/branding");
      
      if (qRes.ok && cRes.ok && mRes.ok) {
        setQuotations(await qRes.json());
        setCustomers(await cRes.json());
        setMasterItems(await mRes.json());
      }
      if (bRes.ok) {
        setBranding(await bRes.json());
      }
    } catch (e) {}
    setLoading(false);
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

  // Autocalculate amount based on dimensions & unit
  const calculateAmount = (item: QuoteItem): number => {
    const len = item.length || 0;
    const wid = item.width || 0;
    const qty = item.quantity || 0;
    const rate = item.unitPrice || 0;
    const unit = (item.unit || "Pcs").toLowerCase();

    if (unit === "sft" || unit === "sqft" || unit === "sqrft") {
      return len * wid * qty * rate;
    } else if (unit === "rft" || unit === "ft" || unit === "feet") {
      return len * qty * rate;
    } else {
      return qty * rate;
    }
  };

  const addItemRow = () => {
    setFormItems((prev) => [
      ...prev,
      { productName: "Material Item", materialCategory: "Material Categories", material: "", quantity: 1, unitPrice: 0, lineTotal: 0, unit: "Pcs" }
    ]);
  };

  const updateItemRow = (index: number, field: keyof QuoteItem, value: any) => {
    setFormItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index] };

      if (field === "materialCategory") {
        item.materialCategory = value;
        item.material = "";
        item.thickness = "";
        item.profile = "";
        item.length = 0;
        item.width = 0;
        
        // Find default unit & rate if category directly matches a Master category
        const firstMatch = masterItems.find(mi => mi.category === value && !mi.isDisabled);
        item.unit = firstMatch ? firstMatch.unit : "Pcs";
        item.unitPrice = firstMatch ? firstMatch.rate : 0;
        item.productName = value;
      } else if (field === "material") {
        item.material = value;
        // Look up default rate & unit for this specific selection
        const dbItem = masterItems.find(mi => mi.category === item.materialCategory && mi.name === value);
        if (dbItem) {
          item.unit = dbItem.unit;
          item.unitPrice = dbItem.rate;
        }
        item.productName = `${item.materialCategory || ""} (${value})`;
        
        // Check for smart autofill trigger: GI + 21G + Flat
        if (item.material === "GI" && item.thickness === "21G" && item.profile === "Flat") {
          triggerAutofillSuggestions();
        }
      } else if (field === "thickness") {
        item.thickness = value;
        if (item.material === "GI" && item.thickness === "21G" && item.profile === "Flat") {
          triggerAutofillSuggestions();
        }
      } else if (field === "profile") {
        item.profile = value;
        if (item.material === "GI" && item.thickness === "21G" && item.profile === "Flat") {
          triggerAutofillSuggestions();
        }
      } else if (field === "length") {
        item.length = parseFloat(value) || 0;
      } else if (field === "width") {
        item.width = parseFloat(value) || 0;
      } else if (field === "quantity") {
        item.quantity = Math.max(1, Math.floor(parseFloat(value) || 1));
      } else if (field === "unitPrice") {
        item.unitPrice = Math.max(0, parseFloat(value) || 0);
      } else if (field === "productName") {
        item.productName = value;
      }

      item.lineTotal = calculateAmount(item);
      updated[index] = item;
      return updated;
    });
  };

  const triggerAutofillSuggestions = () => {
    // smart auto fill GI, 21G, Flat suggestions
    const suggestions = [
      { category: "Kabadi", name: "GI Flat" },
      { category: "Guides", name: "GC" },
      { category: "Springs", name: "SPR 5G" },
      { category: "Brackets", name: "13/16" }
    ];
    setSuggestedItems(suggestions);
  };

  const applySmartAutofill = () => {
    if (!suggestedItems) return;
    
    const newRows = suggestedItems.map(sug => {
      const dbItem = masterItems.find(mi => mi.category === sug.category && mi.name === sug.name);
      const rate = dbItem ? dbItem.rate : 0;
      const unit = dbItem ? dbItem.unit : "Pcs";
      return {
        productName: `${sug.category} (${sug.name})`,
        materialCategory: sug.category,
        material: sug.name,
        thickness: "",
        profile: "",
        length: sug.category === "Guides" ? 10 : 1, // sample length for Guides
        width: 0,
        quantity: sug.category === "Wheels" || sug.category === "Brackets" ? 2 : 1, // standard quantities
        unitPrice: rate,
        lineTotal: 0, // calculated below
        unit: unit
      };
    });

    const parsedRows = newRows.map(row => ({
      ...row,
      lineTotal: calculateAmount(row)
    }));

    setFormItems(prev => [...prev, ...parsedRows]);
    setSuggestedItems(null);
    triggerToast("Autofill accessories suggestions appended!");
  };

  const removeItemRow = (index: number) => {
    if (formItems.length === 1) return;
    setFormItems((prev) => prev.filter((_, i) => i !== index));
  };

  const triggerToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(""), 3500);
  };

  // Submit Quotation
  const handleCreateQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isNewCustomer && !formCustId) {
      alert("Please select an existing customer profile.");
      return;
    }
    if (isNewCustomer && (!newCustName || !newCustPhone || !newCustBilling)) {
      alert("Customer Name, Phone, and Billing Address are required for new registry.");
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
        triggerToast("Quotation document created successfully!");
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
        setFormItems([{ productName: "GI Sheet (GI 21G Flat)", materialCategory: "GI Sheet", material: "GI", thickness: "21G", profile: "Flat", length: 10, width: 8, quantity: 1, unitPrice: 85, lineTotal: 6800, unit: "Sft" }]);
        setShowAddQuote(false);
        fetchData();
      }
    } catch (e) {}
  };

  const handleUpdateStatus = async (id: string, newStatus: any) => {
    try {
      const res = await fetch(`/api/quotations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        triggerToast(`Quotation status updated to ${newStatus}!`);
        const updated = await res.json();
        if (selectedQuote && selectedQuote.id === id) {
          setSelectedQuote((prev) => prev ? { ...prev, status: newStatus } : null);
        }
        fetchData();
      }
    } catch (e) {}
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
        fetchData();
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
      `Hello! Please find the Rolling Shutter quotation ${q.quoteNumber} from Kohinoor Shutters.\nTotal: ₹${q.totalAmount.toLocaleString("en-IN")}\nAddress: ${q.customer?.billingAddress}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  };

  const shareEmail = (q: Quotation) => {
    const subject = encodeURIComponent(`Rolling Shutter Quotation ${q.quoteNumber} - Kohinoor Shutters`);
    const body = encodeURIComponent(`Dear Customer,\n\nPlease find attached quotation details for your rolling shutter installation.\nQuotation Number: ${q.quoteNumber}\nTotal Amount: ₹${q.totalAmount.toLocaleString("en-IN")}\n\nWarm regards,\nKohinoor Shutters`);
    window.open(`mailto:${q.customer?.email || ""}?subject=${subject}&body=${body}`, "_blank");
  };

  // Get options for master select fields
  const categoriesList = masterItems.filter(mi => mi.category === "Material Categories" && !mi.isDisabled);
  const thicknessList = masterItems.filter(mi => mi.category === "Thickness" && !mi.isDisabled);
  const profilesList = masterItems.filter(mi => mi.category === "Profiles" && !mi.isDisabled);

  return (
    <div className="flex flex-col gap-6 h-full relative">
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
              onClick={() => setShowAddQuote(true)}
              className="bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-semibold py-2 px-4 rounded-lg flex items-center gap-2 shadow-lg shadow-primary/25 cursor-pointer font-sans"
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
                    <th className="p-4 text-center">Actions</th>
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
                            <span
                              className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded border ${
                                q.status === "APPROVED"
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                  : q.status === "SENT"
                                  ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                  : q.status === "REJECTED"
                                  ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                  : "bg-muted/15 text-muted-foreground border-border"
                              }`}
                            >
                              {q.status}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => setSelectedQuote(q)}
                                className="bg-secondary/60 hover:bg-secondary border border-border/80 text-foreground font-semibold px-2.5 py-1 rounded text-[11px] flex items-center gap-1 transition-all"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>Preview / Print</span>
                              </button>
                              
                              <button
                                onClick={() => handleDuplicate(q.id)}
                                className="p-1 hover:bg-secondary border border-transparent hover:border-border rounded text-muted-foreground hover:text-foreground"
                                title="Duplicate (v1 Draft)"
                              >
                                <Copy className="w-3.5 h-3.5" />
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
              {/* Approval workflow buttons */}
              {selectedQuote.status !== "APPROVED" && (
                <>
                  <button
                    onClick={() => handleUpdateStatus(selectedQuote.id, "APPROVED")}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold py-1.5 px-3.5 rounded-lg flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve Proposal</span>
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedQuote.id, "REJECTED")}
                    className="border border-rose-500/25 bg-rose-500/5 hover:bg-rose-500/10 text-rose-400 text-xs font-semibold py-1.5 px-3.5 rounded-lg"
                  >
                    <span>Reject</span>
                  </button>
                </>
              )}

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
                  <span className="font-bold text-sm tracking-tight">{branding?.companyName || "KOHINOOR SHUTTERS"}</span>
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
                <p className="font-bold text-slate-800 leading-snug">{branding?.companyName || "Kohinoor Shutter Industries"}</p>
                <p className="text-slate-500">201, Industrial Development Area, GIDC, Thane, MH - 400604</p>
                <p className="text-slate-500">GSTIN: {branding?.gstNumber || "27AAACK5912K1Z9"}</p>
                <p className="text-slate-500">Bank: {branding?.bankName || "SBI"} | A/C: {branding?.bankAccountNo || "38927103829"} | IFSC: {branding?.bankIfsc || "SBIN0004561"}</p>
              </div>

              <div className="space-y-2">
                <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest leading-none font-bold">Customer Details</span>
                <p className="font-bold text-slate-800 leading-snug">{selectedQuote.customer?.name}</p>
                {selectedQuote.customer?.companyName && (
                  <p className="text-slate-600 font-semibold text-[11px] font-sans">Company: {selectedQuote.customer.companyName}</p>
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
                {selectedQuote.items?.map((item, idx) => {
                  const hasDimensions = item.length || item.width;
                  return (
                    <tr key={idx}>
                      <td className="py-3 text-slate-500 font-mono">{idx + 1}</td>
                      <td className="py-3 font-medium text-slate-800">{item.productName}</td>
                      <td className="py-3 text-center text-slate-600 font-mono">
                        {hasDimensions ? `${item.length || 0} x ${item.width || 0}` : "-"}
                      </td>
                      <td className="py-3 text-center text-slate-500 font-mono">{item.unit || "Pcs"}</td>
                      <td className="py-3 text-center text-slate-700">{item.quantity}</td>
                      <td className="py-3 text-right text-slate-700">₹{item.unitPrice.toLocaleString("en-IN")}</td>
                      <td className="py-3 text-right font-semibold text-slate-800">₹{item.lineTotal.toLocaleString("en-IN")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Total breakdown without GST or payment QR options */}
            <div className="flex justify-end pt-6 border-t border-slate-200">
              {/* Numeric summation */}
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

      {/* Add Quotation Form Modal */}
      {showAddQuote && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-4xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-border flex justify-between items-center bg-secondary/15">
              <h3 className="font-heading font-semibold text-sm">Draft New Quotation Proposal</h3>
              <button onClick={() => setShowAddQuote(false)} className="text-muted-foreground hover:text-foreground text-xs font-semibold">
                Cancel
              </button>
            </div>
            
            <form onSubmit={handleCreateQuotation} className="p-6 overflow-y-auto space-y-5">
              {/* Customer Selector Block */}
              <div className="bg-secondary/10 p-4 border border-border/60 rounded-xl space-y-4">
                <div className="flex items-center justify-between border-b border-border/30 pb-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-bold">Customer Configuration</span>
                  <div className="flex border rounded overflow-hidden text-xs">
                    <button
                      type="button"
                      onClick={() => setIsNewCustomer(false)}
                      className={`px-3 py-1 font-semibold transition-all ${!isNewCustomer ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`}
                    >
                      Existing Customer
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsNewCustomer(true)}
                      className={`px-3 py-1 font-semibold transition-all flex items-center gap-1 ${isNewCustomer ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`}
                    >
                      <UserPlus className="w-3 h-3" />
                      <span>Create New</span>
                    </button>
                  </div>
                </div>

                {!isNewCustomer ? (
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Select Customer Profile</label>
                    <select
                      required={!isNewCustomer}
                      value={formCustId}
                      onChange={(e) => setFormCustId(e.target.value)}
                      className="w-full bg-secondary/40 border border-border rounded-md px-3 py-2 text-xs outline-none text-foreground font-semibold"
                    >
                      <option value="" className="bg-card">Select Customer Registry...</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id} className="bg-card">
                          {c.name} {c.companyName ? `(${c.companyName})` : ""} - {c.phone}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono uppercase text-muted-foreground">Customer Name</label>
                      <input
                        type="text"
                        required={isNewCustomer}
                        placeholder="Anil Sharma"
                        value={newCustName}
                        onChange={(e) => setNewCustName(e.target.value)}
                        className="w-full bg-secondary/40 border border-border rounded-md px-3 py-1.5 text-xs outline-none text-foreground font-semibold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono uppercase text-muted-foreground">Company Name</label>
                      <input
                        type="text"
                        placeholder="Metro Retailers Ltd"
                        value={newCustCompanyName}
                        onChange={(e) => setNewCustCompanyName(e.target.value)}
                        className="w-full bg-secondary/40 border border-border rounded-md px-3 py-1.5 text-xs outline-none text-foreground font-semibold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono uppercase text-muted-foreground">Customer Type</label>
                      <select
                        value={newCustType}
                        onChange={(e) => setNewCustType(e.target.value as any)}
                        className="w-full bg-secondary/40 border border-border rounded-md px-2 py-1.5 text-xs outline-none text-foreground"
                      >
                        <option value="COMPANY" className="bg-card text-foreground">Company</option>
                        <option value="INDIVIDUAL" className="bg-card text-foreground">Individual</option>
                      </select>
                    </div>
                    <div className="space-y-1 font-mono">
                      <label className="text-[10px] font-mono uppercase text-muted-foreground">Phone Number</label>
                      <input
                        type="text"
                        required={isNewCustomer}
                        placeholder="+91 98765..."
                        value={newCustPhone}
                        onChange={(e) => setNewCustPhone(e.target.value)}
                        className="w-full bg-secondary/40 border border-border rounded-md px-3 py-1.5 text-xs outline-none text-foreground"
                      />
                    </div>
                    <div className="space-y-1 font-mono">
                      <label className="text-[10px] font-mono uppercase text-muted-foreground">WhatsApp No.</label>
                      <input
                        type="text"
                        placeholder="+91 98765..."
                        value={newCustWhatsapp}
                        onChange={(e) => setNewCustWhatsapp(e.target.value)}
                        className="w-full bg-secondary/40 border border-border rounded-md px-3 py-1.5 text-xs outline-none text-foreground"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono uppercase text-muted-foreground">Email Address</label>
                      <input
                        type="email"
                        placeholder="name@company.com"
                        value={newCustEmail}
                        onChange={(e) => setNewCustEmail(e.target.value)}
                        className="w-full bg-secondary/40 border border-border rounded-md px-3 py-1.5 text-xs outline-none text-foreground"
                      />
                    </div>
                    <div className="space-y-1 font-mono md:col-span-1">
                      <label className="text-[10px] font-mono uppercase text-muted-foreground">GSTIN Identification</label>
                      <input
                        type="text"
                        placeholder="27AAACK5..."
                        value={newCustGst}
                        onChange={(e) => setNewCustGst(e.target.value)}
                        className="w-full bg-secondary/40 border border-border rounded-md px-3 py-1.5 text-xs outline-none text-foreground"
                      />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-[10px] font-mono uppercase text-muted-foreground">Billing Address</label>
                      <input
                        type="text"
                        required={isNewCustomer}
                        placeholder="Complete billing location info"
                        value={newCustBilling}
                        onChange={(e) => setNewCustBilling(e.target.value)}
                        className="w-full bg-secondary/40 border border-border rounded-md px-3 py-1.5 text-xs outline-none text-foreground"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Smart Autofill alert bar */}
              {suggestedItems && (
                <div className="border border-emerald-500/20 bg-emerald-500/10 p-3 rounded-lg flex items-center justify-between gap-4 animate-pulse">
                  <div className="text-xs text-foreground flex items-center gap-2">
                    <span className="text-base">💡</span>
                    <div>
                      <p className="font-bold text-emerald-400">Smart Accessory Suggester</p>
                      <p className="text-muted-foreground">Automatically append GI Flat, Guide GC, Spring SPR 5G & Bracket 13/16 with default rates?</p>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={applySmartAutofill}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-1.5 px-3 rounded text-[11px] transition-all cursor-pointer"
                    >
                      Apply Autofill
                    </button>
                    <button
                      type="button"
                      onClick={() => setSuggestedItems(null)}
                      className="border border-border/80 bg-secondary/50 text-foreground font-semibold py-1.5 px-2 rounded text-[11px] transition-all cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              {/* Dynamic Materials items Table */}
              <div className="space-y-2">
                <div className="flex justify-between items-center border-b border-border/40 pb-1">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                    Materials Master Items Configuration Ledger
                  </label>
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Material Row</span>
                  </button>
                </div>

                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {formItems.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-end border border-border/40 p-3 rounded-lg bg-card/10 select-none">
                      
                      {/* Material Category select */}
                      <div className="w-40 space-y-1">
                        <label className="text-[9px] font-mono text-muted-foreground">Category</label>
                        <select
                          required
                          value={item.materialCategory || ""}
                          onChange={(e) => updateItemRow(idx, "materialCategory", e.target.value)}
                          className="w-full bg-secondary/40 border border-border rounded-md px-2 py-1 text-xs outline-none text-foreground font-semibold"
                        >
                          <option value="">Choose category...</option>
                          {categoriesList.map((cat) => (
                            <option key={cat.id} value={cat.name} className="bg-card text-foreground">{cat.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Material Type / spec select */}
                      <div className="w-36 space-y-1">
                        <label className="text-[9px] font-mono text-muted-foreground">Material / Spec</label>
                        <select
                          required
                          value={item.material || ""}
                          onChange={(e) => updateItemRow(idx, "material", e.target.value)}
                          className="w-full bg-secondary/40 border border-border rounded-md px-2 py-1 text-xs outline-none text-foreground"
                        >
                          <option value="">Spec...</option>
                          {masterItems
                            .filter(mi => mi.category === item.materialCategory && !mi.isDisabled)
                            .map((mi) => (
                              <option key={mi.id} value={mi.name} className="bg-card">{mi.name}</option>
                            ))}
                        </select>
                      </div>

                      {/* Thickness select (Only active for GI Sheet or similar sheet categories) */}
                      <div className="w-24 space-y-1">
                        <label className="text-[9px] font-mono text-muted-foreground">Thickness</label>
                        <select
                          disabled={item.materialCategory !== "GI Sheet"}
                          value={item.thickness || ""}
                          onChange={(e) => updateItemRow(idx, "thickness", e.target.value)}
                          className="w-full bg-secondary/40 border border-border rounded-md px-2 py-1 text-xs outline-none text-foreground disabled:opacity-40"
                        >
                          <option value="">Gauge</option>
                          {thicknessList.map((mi) => (
                            <option key={mi.id} value={mi.name} className="bg-card font-mono">{mi.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Profile select */}
                      <div className="w-24 space-y-1">
                        <label className="text-[9px] font-mono text-muted-foreground">Profile</label>
                        <select
                          disabled={item.materialCategory !== "GI Sheet"}
                          value={item.profile || ""}
                          onChange={(e) => updateItemRow(idx, "profile", e.target.value)}
                          className="w-full bg-secondary/40 border border-border rounded-md px-2 py-1 text-xs outline-none text-foreground disabled:opacity-40"
                        >
                          <option value="">Profile</option>
                          {profilesList.map((mi) => (
                            <option key={mi.id} value={mi.name} className="bg-card">{mi.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Length */}
                      <div className="w-16 space-y-1 font-mono">
                        <label className="text-[9px] font-mono text-muted-foreground">Len (Ft)</label>
                        <input
                          type="number"
                          placeholder="Len"
                          value={item.length || ""}
                          disabled={item.unit === "Pcs" || item.unit === "Kg"}
                          onChange={(e) => updateItemRow(idx, "length", e.target.value)}
                          className="w-full bg-secondary/40 border border-border rounded-md px-2 py-1 text-xs outline-none text-foreground text-center disabled:opacity-30"
                        />
                      </div>

                      {/* Width */}
                      <div className="w-16 space-y-1 font-mono">
                        <label className="text-[9px] font-mono text-muted-foreground">Wid (Ft)</label>
                        <input
                          type="number"
                          placeholder="Wid"
                          value={item.width || ""}
                          disabled={item.unit !== "Sft" && item.unit !== "Sqft"}
                          onChange={(e) => updateItemRow(idx, "width", e.target.value)}
                          className="w-full bg-secondary/40 border border-border rounded-md px-2 py-1 text-xs outline-none text-foreground text-center disabled:opacity-30"
                        />
                      </div>

                      {/* Qty */}
                      <div className="w-16 space-y-1 font-mono">
                        <label className="text-[9px] font-mono text-muted-foreground">Qty</label>
                        <input
                          type="number"
                          required
                          value={item.quantity || "1"}
                          onChange={(e) => updateItemRow(idx, "quantity", e.target.value)}
                          className="w-full bg-secondary/40 border border-border rounded-md px-2 py-1 text-xs outline-none text-foreground text-center"
                        />
                      </div>

                      {/* Rate */}
                      <div className="w-20 space-y-1 font-mono">
                        <label className="text-[9px] font-mono text-muted-foreground">Rate (₹)</label>
                        <input
                          type="number"
                          required
                          value={item.unitPrice || "0"}
                          onChange={(e) => updateItemRow(idx, "unitPrice", e.target.value)}
                          className="w-full bg-secondary/40 border border-border rounded-md px-2 py-1 text-xs outline-none text-foreground text-right"
                        />
                      </div>

                      {/* Amount calculated */}
                      <div className="w-24 text-right font-bold text-foreground font-mono leading-none pb-2 select-none text-xs">
                        ₹{(item.lineTotal || 0).toLocaleString("en-IN")}
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItemRow(idx)}
                        className="text-destructive hover:bg-destructive/10 p-1.5 border border-transparent hover:border-destructive/20 rounded shrink-0 mb-0.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status & Discount selectors (No GST on Quotation) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-border/40 pt-4 font-sans">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Quotation Stage</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full bg-secondary/40 border border-border rounded-md px-3 py-2 text-xs outline-none text-foreground font-semibold"
                  >
                    <option value="DRAFT" className="bg-card">Draft</option>
                    <option value="SENT" className="bg-card">Sent</option>
                    <option value="APPROVED" className="bg-card text-emerald-400">Approved</option>
                  </select>
                </div>

                <div className="space-y-1 font-mono">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Discount Deducted</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={formDiscount}
                    onChange={(e) => setFormDiscount(e.target.value)}
                    className="w-full bg-secondary/40 border border-border rounded-md px-3 py-1.5 text-xs outline-none text-foreground font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1 font-sans">
                <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Quotation Terms & Conditions</label>
                <textarea
                  rows={2}
                  value={formTerms}
                  onChange={(e) => setFormTerms(e.target.value)}
                  className="w-full bg-secondary/40 border border-border rounded-md px-3 py-1.5 text-xs outline-none text-foreground resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-primary text-primary-foreground font-semibold py-2.5 rounded-lg text-xs hover:bg-primary/95 shadow-md shadow-primary/25 cursor-pointer font-sans"
              >
                Draft and Store Quotation
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
