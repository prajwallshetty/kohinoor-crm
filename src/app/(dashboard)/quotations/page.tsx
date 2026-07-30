"use client";

import React, { useEffect, useState } from "react";
import {
  FileText, Plus, Search, Trash2, Copy, Printer, ArrowLeft, RefreshCw,
  MessageSquare, Mail, Check, UserPlus, User, Receipt, X, Sparkles,
  LayoutTemplate, AlertTriangle
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { PageSkeleton } from "@/components/ui/loaders";
import QRCode from "qrcode";
import { generateAndSharePDF } from "@/lib/share-pdf";
import { generateQuotation, getCategoryVariants, type QuotationTemplate } from "@/lib/rule-engine";

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
  categoryId?: string | null;
  configJson?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  lineTotal: number;
  material?: string | null;
  thickness?: string | null;
  profile?: string | null;
  length?: number | null;
  width?: number | null;
  height?: number | null;
  shutterName?: string | null;
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
  quotationDate?: string;
  bookNumber?: string;
  templateName?: string;
  customer?: Customer;
  items: QuoteItem[];
}

const BOOK_NUMBER_OPTIONS = ["Book 1", "Book 2", "Book 3"];

// A generated / editable line in the create flow
interface GenLine {
  ruleId: string | null;
  productName: string;
  materialCategory: string | null;
  variant: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  lineTotal: number;
  description: string;
  formula: string;
  formulaResult: number;
  editable: boolean;
}

export default function QuotationsPage() {
  const { user } = useAuth();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [masterItems, setMasterItems] = useState<any[]>([]);
  const [templates, setTemplates] = useState<QuotationTemplate[]>([]);
  const [branding, setBranding] = useState<any>(null);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [selectedQuote, setSelectedQuote] = useState<Quotation | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState("");

  // Create flow
  const [showAddQuote, setShowAddQuote] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [formCustId, setFormCustId] = useState("");

  // New customer fields
  const [newCustName, setNewCustName] = useState("");
  const [newCustCompanyName, setNewCustCompanyName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustBilling, setNewCustBilling] = useState("");

  // Financial / status
  const [formDiscount, setFormDiscount] = useState("0");
  const [formGstOff, setFormGstOff] = useState(true);
  const [formGstRate, setFormGstRate] = useState("18");
  const [formStatus, setFormStatus] = useState<"DRAFT" | "SENT" | "APPROVED" | "REJECTED">("DRAFT");
  const [formTerms, setFormTerms] = useState("");

  // Book Number (mandatory, chosen right after the customer, before the template)
  const [bookNumber, setBookNumber] = useState("");

  // Template + shutter spec (the only inputs the salesperson provides)
  const [quotationDate, setQuotationDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [specWidth, setSpecWidth] = useState("122");
  const [specHeight, setSpecHeight] = useState("36");
  const [specMaterial, setSpecMaterial] = useState("");
  const [specThickness, setSpecThickness] = useState("");
  const [specProfile, setSpecProfile] = useState("");
  const [specQty, setSpecQty] = useState("1");

  // Generated, editable result
  const [generated, setGenerated] = useState(false);
  const [genLines, setGenLines] = useState<GenLine[]>([]);
  const [genWarnings, setGenWarnings] = useState<string[]>([]);
  const [formulaResults, setFormulaResults] = useState<Record<string, number>>({});

  const [notification, setNotification] = useState("");
  const triggerToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(""), 3500);
  };

  const fetchData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const [qRes, cRes, mRes, tRes, bRes] = await Promise.all([
        fetch("/api/quotations"),
        fetch("/api/customers"),
        fetch("/api/master-data"),
        fetch("/api/quotation-templates"),
        fetch("/api/admin/branding"),
      ]);
      const [qData, cData, mData, tData, bData] = await Promise.all([
        qRes.ok ? qRes.json() : [],
        cRes.ok ? cRes.json() : [],
        mRes.ok ? mRes.json() : [],
        tRes.ok ? tRes.json() : [],
        bRes.ok ? bRes.json() : null,
      ]);
      setQuotations(qData);
      setCustomers(cData);
      setMasterItems(mData);
      setTemplates(tData);
      if (bData) {
        setBranding(bData);
        setFormTerms(bData.quotationTerms || "1. Price quoted is valid for 30 days.\n2. 50% advance along with order. Balance on delivery.");
      }
    } catch (e) {}
    if (showLoading) setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

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

  // --- Master Data option helpers (spec dropdowns) ---
  const getOptions = (catName: string): string[] => {
    const raw = catName.trim().toLowerCase();
    return masterItems
      .filter((i) => !i.isDisabled && (i.category || "").trim().toLowerCase() === raw)
      .map((i) => i.name);
  };
  const materialOptions = getOptions("Material Types");
  const thicknessOptions = getOptions("Thickness");
  const profileOptions = getOptions("Profiles");

  const lookupRate = (cat: string | null, variant: string): number | null => {
    if (!cat || !variant) return null;
    const m = masterItems.find(
      (mi) =>
        !mi.isDisabled &&
        (mi.category || "").trim().toLowerCase() === cat.trim().toLowerCase() &&
        (mi.name || "").trim().toLowerCase() === variant.trim().toLowerCase()
    );
    return m ? m.rate : null;
  };

  const activeTemplates = templates.filter((t) => t.active !== false);

  const resetCreateForm = () => {
    setGenerated(false);
    setGenLines([]);
    setGenWarnings([]);
    setFormulaResults({});
    setFormCustId("");
    setIsNewCustomer(false);
    setNewCustName("");
    setNewCustCompanyName("");
    setNewCustPhone("");
    setNewCustBilling("");
    setFormDiscount("0");
    setFormGstOff(true);
    setFormStatus("DRAFT");
    setBookNumber("");
    setSelectedTemplateId("");
    setSpecMaterial(materialOptions[0] || "");
    setSpecThickness(thicknessOptions[0] || "");
    setSpecProfile(profileOptions[0] || "");
    setSpecQty("1");
    setQuotationDate(new Date().toISOString().slice(0, 10));
  };

  const openCreate = () => {
    resetCreateForm();
    setSpecMaterial(materialOptions[0] || "");
    setSpecThickness(thicknessOptions[0] || "");
    setSpecProfile(profileOptions[0] || "");
    if (activeTemplates.length) setSelectedTemplateId(activeTemplates[0].id);
    setShowAddQuote(true);
  };

  // --- Generate ---
  const handleGenerate = () => {
    if (!bookNumber) {
      alert("Please select a Book Number first.");
      return;
    }
    const tpl = templates.find((t) => t.id === selectedTemplateId);
    if (!tpl) {
      alert("Please select a quotation template.");
      return;
    }
    const result = generateQuotation(
      tpl,
      {
        width: parseFloat(specWidth) || 0,
        height: parseFloat(specHeight) || 0,
        quantity: parseInt(specQty) || 1,
        material: specMaterial,
        thickness: specThickness,
        profile: specProfile,
      },
      masterItems
    );
    setGenLines(
      result.lines.map((l) => ({
        ruleId: l.ruleId,
        productName: l.label,
        materialCategory: l.materialCategory,
        variant: l.variant,
        quantity: l.quantity,
        unit: l.unit,
        unitPrice: l.rate,
        lineTotal: l.amount,
        description: l.description,
        formula: l.formula,
        formulaResult: l.formulaResult,
        editable: l.editable,
      }))
    );
    setFormulaResults(result.formulaResults);
    setGenWarnings(result.warnings);
    setGenerated(true);
    if (result.lines.length === 0) {
      triggerToast("Template produced no lines — check its rules & formulas.");
    }
  };

  // --- Line editing ---
  const recompute = (line: GenLine): GenLine => ({
    ...line,
    lineTotal: Math.round(line.quantity * line.unitPrice * 100) / 100,
  });

  const updateLine = (idx: number, patch: Partial<GenLine>) => {
    setGenLines((prev) =>
      prev.map((l, i) => {
        if (i !== idx) return l;
        let nl = { ...l, ...patch };
        if (patch.variant !== undefined && nl.materialCategory) {
          const r = lookupRate(nl.materialCategory, nl.variant);
          if (r !== null) nl.unitPrice = r;
        }
        return recompute(nl);
      })
    );
  };

  const deleteLine = (idx: number) => setGenLines((prev) => prev.filter((_, i) => i !== idx));

  const addExtraLine = () =>
    setGenLines((prev) => [
      ...prev,
      {
        ruleId: null,
        productName: "",
        materialCategory: null,
        variant: "",
        quantity: 1,
        unit: "Pcs",
        unitPrice: 0,
        lineTotal: 0,
        description: "",
        formula: "",
        formulaResult: 0,
        editable: true,
      },
    ]);

  // --- Totals ---
  const subtotal = genLines.reduce((s, l) => s + l.lineTotal, 0);
  const discVal = parseFloat(formDiscount) || 0;
  const taxable = Math.max(0, subtotal - discVal);
  const gstRateVal = formGstOff ? 0 : parseFloat(formGstRate) || 18;
  const gstAmt = (taxable * gstRateVal) / 100;
  const grandTotal = Math.round(taxable + gstAmt);
  const roundOff = parseFloat((grandTotal - (taxable + gstAmt)).toFixed(2));

  // --- Save ---
  const handleCreateQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!generated || genLines.length === 0) {
      alert("Please generate the quotation first.");
      return;
    }
    if (!isNewCustomer && !formCustId) {
      alert("Please select a customer.");
      return;
    }
    if (isNewCustomer && (!newCustName || !newCustPhone || !newCustBilling)) {
      alert("Customer Name, Phone and Billing Address are required.");
      return;
    }
    if (!bookNumber) {
      alert("Please select a Book Number.");
      return;
    }

    setIsSubmitting(true);
    try {
      let customerId = formCustId;
      if (isNewCustomer) {
        const custRes = await fetch("/api/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newCustName,
            companyName: newCustCompanyName || null,
            type: newCustCompanyName ? "COMPANY" : "INDIVIDUAL",
            phone: newCustPhone,
            billingAddress: newCustBilling,
          }),
        });
        if (!custRes.ok) {
          alert("Failed to register new customer.");
          setIsSubmitting(false);
          return;
        }
        customerId = (await custRes.json()).id;
      }

      const tpl = templates.find((t) => t.id === selectedTemplateId);
      const spec = {
        width: parseFloat(specWidth) || 0,
        height: parseFloat(specHeight) || 0,
        quantity: parseInt(specQty) || 1,
        material: specMaterial,
        thickness: specThickness,
        profile: specProfile,
      };

      const items = genLines.map((l) => ({
        productName: l.productName || "Item",
        materialCategory: l.materialCategory,
        material: specMaterial,
        thickness: specThickness,
        profile: specProfile,
        width: spec.width,
        height: spec.height,
        quantity: l.quantity,
        unit: l.unit,
        unitPrice: l.unitPrice,
        lineTotal: l.lineTotal,
        shutterName: l.productName,
        configJson: JSON.stringify({
          description: l.description,
          variant: l.variant,
          formula: l.formula,
          formulaResult: l.formulaResult,
          quantity: l.quantity,
          unit: l.unit,
          rate: l.unitPrice,
          materialCategory: l.materialCategory,
        }),
      }));

      const res = await fetch("/api/quotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quotation: {
            customerId,
            discount: discVal,
            gstRate: gstRateVal,
            gstAmount: gstAmt,
            totalAmount: grandTotal,
            terms: formTerms,
            status: formStatus,
            quotationDate: new Date(quotationDate).toISOString(),
            bookNumber,
            templateId: tpl?.id || null,
            templateName: tpl?.name || null,
            templateVersion: tpl?.version ?? null,
            templateSnapshotJson: tpl ? JSON.stringify(tpl) : null,
            specJson: JSON.stringify(spec),
            formulaResultsJson: JSON.stringify(formulaResults),
          },
          items,
        }),
      });

      if (res.ok) {
        triggerToast("Quotation generated & saved!");
        resetCreateForm();
        setShowAddQuote(false);
        fetchData();
      } else {
        alert("Failed to save quotation.");
      }
    } catch (e) {
      alert("Failed to save quotation.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Ledger actions ---
  const handleUpdateStatus = async (id: string, newStatus: any) => {
    setQuotations((prev) => prev.map((q) => (q.id === id ? { ...q, status: newStatus } : q)));
    if (selectedQuote && selectedQuote.id === id) {
      setSelectedQuote((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
    try {
      const res = await fetch(`/api/quotations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        triggerToast(`Status updated to ${newStatus}!`);
        fetchData(false);
      } else fetchData(true);
    } catch (e) {
      fetchData(true);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const res = await fetch(`/api/quotations/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "duplicate" }),
      });
      if (res.ok) {
        triggerToast("Quotation duplicated to Draft!");
        fetchData(false);
      }
    } catch (e) {}
  };

  const handleDeleteQuote = async (id: string) => {
    if (!confirm("Delete this quotation draft?")) return;
    try {
      const res = await fetch(`/api/quotations/${id}`, { method: "DELETE" });
      if (res.ok) {
        triggerToast("Quotation deleted.");
        setSelectedQuote(null);
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || "Cannot delete this quotation.");
      }
    } catch (e) {}
  };

  const handleConvertToInvoice = (quoteId: string) => {
    window.location.href = `/invoices?convert=${quoteId}`;
  };

  const handleCreateRevision = async (quoteId: string) => {
    try {
      const res = await fetch(`/api/quotations/${quoteId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revision" }),
      });
      if (res.ok) {
        const revised = await res.json();
        triggerToast(`Revision ${revised.quoteNumber} created!`);
        setSelectedQuote(null);
        fetchData();
      }
    } catch (e) {}
  };

  const shareWhatsApp = async (q: Quotation) => {
    await generateAndSharePDF({
      fileName: `Quotation_${q.quoteNumber}`,
      phone: q.customer?.phone || "",
      message:
        `Hello ${q.customer?.name || ""},\n\n` +
        `Please find your Quotation from ${branding?.companyName || "Kohinoor Rolling Shutters"}\n\n` +
        `📋 Quote No: ${q.quoteNumber}\n` +
        `📅 Date: ${new Date(q.quotationDate || q.createdAt).toLocaleDateString("en-IN")}\n` +
        (q.bookNumber ? `📖 Book No: ${q.bookNumber}\n` : "") +
        `💰 Total Amount: ₹${q.totalAmount.toLocaleString("en-IN")}\n` +
        `📊 Status: ${q.status}\n\n` +
        `Thank you!\nRegards,\n${branding?.companyName || "Kohinoor Rolling Shutters"}`,
    });
  };

  const shareEmail = (q: Quotation) => {
    const subject = encodeURIComponent(`Quotation ${q.quoteNumber} - Kohinoor Rolling Shutters`);
    const body = encodeURIComponent(
      `Dear Customer,\n\nPlease find attached quotation details.\nQuotation Number: ${q.quoteNumber}\n${q.bookNumber ? `Book Number: ${q.bookNumber}\n` : ""}Total Amount: ₹${q.totalAmount.toLocaleString("en-IN")}\n\nWarm regards,\nKohinoor Rolling Shutters`
    );
    window.open(`mailto:${q.customer?.email || ""}?subject=${subject}&body=${body}`, "_blank");
  };

  // Prefer the template-generated description stored in configJson; fall back for legacy quotes.
  const getVariantSummary = (item: any): string => {
    if (item.configJson) {
      try {
        const cfg = JSON.parse(item.configJson);
        if (cfg && cfg.description) return cfg.description;
      } catch (e) {}
    }
    const fallbacks: string[] = [];
    if (item.material) fallbacks.push(item.material);
    if (item.thickness) fallbacks.push(item.thickness);
    if (item.profile) fallbacks.push(item.profile);
    return fallbacks.join(" • ") || item.shutterName || "Standard";
  };

  const filteredQuotes = quotations.filter(
    (q) =>
      q.quoteNumber.toLowerCase().includes(search.toLowerCase()) ||
      (q.customer && q.customer.name.toLowerCase().includes(search.toLowerCase())) ||
      (q.customer && q.customer.phone.includes(search))
  );

  const selectedTemplateObj = templates.find((t) => t.id === selectedTemplateId);

  if (loading) return <PageSkeleton rows={7} />;

  return (
    <div className="flex flex-col gap-6 h-full relative font-sans">
      {notification && (
        <div className="fixed bottom-4 right-4 bg-primary text-primary-foreground text-xs px-4 py-3 rounded-lg shadow-xl z-50 flex items-center gap-2 border border-primary/20 animate-bounce">
          <Check className="w-4 h-4" />
          <span>{notification}</span>
        </div>
      )}

      {!selectedQuote ? (
        <>
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card/45 border border-border/80 p-4 rounded-xl">
            <div className="relative flex-grow max-w-md w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search quotations by number, customer, or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-secondary/40 border border-border/80 rounded-lg py-2 pl-10 pr-4 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/60 transition-all duration-150 font-medium"
              />
            </div>

            <button
              onClick={openCreate}
              className="bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-bold py-2.5 px-5 rounded-lg flex items-center gap-2 shadow-lg shadow-primary/25 cursor-pointer transition-all hover:scale-[1.01]"
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate Quotation</span>
            </button>
          </div>

          {/* Ledger */}
          <div className="border border-border/80 rounded-xl bg-card/30 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-secondary/20 text-[10px] font-mono uppercase tracking-wider text-muted-foreground border-b border-border/60">
                    <th className="p-4">Quote Number</th>
                    <th className="p-4">Customer</th>
                    <th className="p-4">Book #</th>
                    <th className="p-4">Template</th>
                    <th className="p-4">Revision</th>
                    <th className="p-4 text-right">Taxable Subtotal</th>
                    <th className="p-4 text-right">Grand Total</th>
                    <th className="p-4">Stage</th>
                    <th className="p-4 text-right pr-6">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-xs">
                  {filteredQuotes.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center p-8 text-muted-foreground">
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
                          <td className="p-4">
                            {q.bookNumber ? (
                              <span className="text-[10px] font-mono font-bold bg-secondary/80 border px-1.5 py-0.5 rounded">
                                {q.bookNumber}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="p-4 text-muted-foreground font-sans">
                            {q.templateName || "—"}
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
                                <button
                                  onClick={() => handleConvertToInvoice(q.id)}
                                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-2.5 py-1 rounded-md text-[11px] flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 transition-all shrink-0 cursor-pointer"
                                >
                                  <Receipt className="w-3.5 h-3.5" />
                                  <span>Convert to Invoice</span>
                                </button>
                              )}

                              <button
                                onClick={() => setSelectedQuote(q)}
                                className="bg-secondary hover:bg-secondary/80 border border-border/80 text-foreground font-semibold px-2.5 py-1 rounded-md text-[11px] flex items-center gap-1.5 transition-all shrink-0 cursor-pointer"
                              >
                                <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                                <span>Preview / Print</span>
                              </button>

                              <button
                                onClick={() => handleDuplicate(q.id)}
                                className="p-1.5 hover:bg-secondary border border-border/60 hover:border-border rounded-md text-muted-foreground hover:text-foreground transition-all shrink-0 cursor-pointer"
                                title="Duplicate"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleDeleteQuote(q.id)}
                                className="p-1.5 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 rounded-md text-muted-foreground hover:text-rose-500 transition-all shrink-0 cursor-pointer"
                                title="Delete"
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
        /* DETAIL / PRINT PREVIEW */
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap justify-between items-center bg-card/45 border p-4 rounded-xl gap-4 print-hidden print:!hidden">
            <button
              onClick={() => setSelectedQuote(null)}
              className="flex items-center gap-2 text-xs font-semibold hover:text-primary transition-colors text-muted-foreground cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Ledger</span>
            </button>

            <div className="flex flex-wrap items-center gap-3">
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

              {selectedQuote.status === "APPROVED" && (
                <button
                  onClick={() => handleConvertToInvoice(selectedQuote.id)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-1.5 px-3.5 rounded-lg flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                >
                  <Receipt className="w-4 h-4" />
                  <span>Convert to Invoice</span>
                </button>
              )}

              <button
                onClick={() => shareWhatsApp(selectedQuote)}
                className="border border-emerald-500/25 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-400 p-2 rounded-lg cursor-pointer transition-colors"
                title="Share on WhatsApp"
              >
                <MessageSquare className="w-4 h-4" />
              </button>

              <button
                onClick={() => shareEmail(selectedQuote)}
                className="border border-sky-500/25 bg-sky-500/5 hover:bg-sky-500/10 text-sky-400 p-2 rounded-lg cursor-pointer transition-colors"
                title="Share via Email"
              >
                <Mail className="w-4 h-4" />
              </button>

              <button
                onClick={() => handleCreateRevision(selectedQuote.id)}
                className="bg-secondary text-foreground hover:bg-secondary/80 text-xs font-semibold py-1.5 px-3.5 border border-border rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <RefreshCw className="w-4 h-4 text-muted-foreground" />
                <span>Create Revision</span>
              </button>

              <button
                onClick={() => window.print()}
                className="bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-bold py-1.5 px-3.5 rounded-lg flex items-center gap-1.5 shadow-md shadow-primary/20 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print PDF / Invoice</span>
              </button>
            </div>
          </div>

          {/* Print Template Card */}
          <div className="bg-white text-slate-900 p-8 sm:p-12 rounded-xl shadow-lg border border-slate-200 max-w-4xl mx-auto w-full font-sans print:p-0 print:border-none print:shadow-none printable-card">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b-2 border-slate-100 pb-6 gap-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-slate-100 flex items-center justify-center border text-slate-700 font-black font-sans shrink-0">
                  K
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-sm tracking-tight">{branding?.companyName || "KOHINOOR ROLLING SHUTTERS"}</span>
                  <span className="text-[9px] text-slate-500 font-mono tracking-widest uppercase">CRM & Quotation Portal</span>
                </div>
              </div>

              <div className="flex flex-col text-right sm:items-end gap-1">
                <span className="text-xl font-bold tracking-tight text-slate-800">QUOTATION</span>
                <span className="text-xs font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                  No: {selectedQuote.quoteNumber} (v{selectedQuote.version})
                </span>
                <span className="text-[10px] text-slate-400">
                  Date: {new Date(selectedQuote.quotationDate || selectedQuote.createdAt).toLocaleDateString("en-IN")}
                </span>
                {selectedQuote.templateName && (
                  <span className="text-[10px] text-slate-400 font-mono">Template: {selectedQuote.templateName}</span>
                )}
                {selectedQuote.bookNumber && (
                  <span className="text-[10px] text-slate-400 font-mono">Book No: {selectedQuote.bookNumber}</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 my-8 text-xs">
              <div className="space-y-2 border-r border-slate-100 pr-4">
                <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest font-bold block">Issuer / Vendor</span>
                <p className="font-bold text-slate-800 leading-snug">{branding?.companyName || "Kohinoor Rolling Shutters"}</p>
                <p className="text-slate-500">201, Industrial Area, Thane, MH - 400604</p>
                <p className="text-slate-500">GSTIN: {branding?.gstNumber || "27AAACK5912K1Z9"}</p>
                {branding?.bankName && (
                  <p className="text-slate-500">
                    Bank: {branding.bankName} | A/C: {branding.bankAccountNo} | IFSC: {branding.bankIfsc}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest font-bold block">Client Information</span>
                <p className="font-bold text-slate-800 leading-snug">{selectedQuote.customer?.name}</p>
                {selectedQuote.customer?.companyName && (
                  <p className="text-slate-600 font-semibold text-[11px]">Company: {selectedQuote.customer.companyName}</p>
                )}
                <p className="text-slate-500">{selectedQuote.customer?.billingAddress}</p>
                <p className="text-slate-500">Phone: {selectedQuote.customer?.phone}</p>
                {selectedQuote.customer?.gstNumber && (
                  <p className="text-slate-500 font-mono">GSTIN: {selectedQuote.customer.gstNumber}</p>
                )}
              </div>
            </div>

            {/* Generated material table */}
            <table className="w-full text-left border-collapse my-8 text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] font-mono uppercase text-slate-400">
                  <th className="pb-2">S.No</th>
                  <th className="pb-2">Material / Description</th>
                  <th className="pb-2 text-center">Qty</th>
                  <th className="pb-2 text-center">Unit</th>
                  <th className="pb-2 text-right">Rate (₹)</th>
                  <th className="pb-2 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {selectedQuote.items?.map((item: any, idx) => (
                  <tr key={idx}>
                    <td className="py-3 text-slate-500 font-mono">{idx + 1}</td>
                    <td className="py-3 font-medium text-slate-800">
                      <div className="font-bold text-slate-900">{item.productName}</div>
                      <div className="text-slate-600 text-[11px] mt-0.5">{getVariantSummary(item)}</div>
                    </td>
                    <td className="py-3 text-center text-slate-700 font-bold">{item.quantity}</td>
                    <td className="py-3 text-center text-slate-500 font-mono">{item.unit || "PCS"}</td>
                    <td className="py-3 text-right text-slate-700">₹{item.unitPrice.toLocaleString("en-IN")}</td>
                    <td className="py-3 text-right font-semibold text-slate-800">₹{item.lineTotal.toLocaleString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="flex justify-end pt-6 border-t border-slate-200">
              <div className="w-full sm:w-72 flex flex-col gap-2 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal</span>
                  <span>₹{selectedQuote.items?.reduce((sum, i) => sum + i.lineTotal, 0).toLocaleString("en-IN")}</span>
                </div>
                {selectedQuote.discount > 0 && (
                  <div className="flex justify-between text-rose-500 font-medium">
                    <span>Discount</span>
                    <span>- ₹{selectedQuote.discount.toLocaleString("en-IN")}</span>
                  </div>
                )}
                {selectedQuote.gstAmount > 0 && (
                  <div className="flex justify-between text-slate-500">
                    <span>GST Amount ({selectedQuote.gstRate}%)</span>
                    <span>₹{selectedQuote.gstAmount.toLocaleString("en-IN")}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-bold text-slate-800 font-sans">
                  <span>Grand Total (Rounded)</span>
                  <span>₹{selectedQuote.totalAmount.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>

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
                  <span className="text-[10px] text-slate-400 font-sans">Authorized Signatory</span>
                </div>
              </div>
            </div>

            {qrCodeUrl && (
              <div className="flex items-center gap-3 border-t border-slate-100 pt-4 print:hidden">
                <img src={qrCodeUrl} alt="UPI QR" className="w-16 h-16 border rounded" />
                <span className="text-[10px] text-slate-400 font-mono">Scan to pay advance via UPI</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============ GENERATE QUOTATION MODAL ============ */}
      {showAddQuote && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="w-full max-w-4xl bg-card border border-border/90 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto">
            {/* Header */}
            <div className="bg-secondary/30 border-b border-border px-6 py-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 text-primary rounded-xl">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base text-foreground">Generate Quotation</h3>
                  <p className="text-xs text-muted-foreground">
                    Pick a template, enter the shutter spec, and the ERP builds the full quotation.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddQuote(false)}
                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleCreateQuotation} className="flex-grow overflow-y-auto p-6 space-y-6">
              {/* Customer & stage */}
              <div className="bg-secondary/15 border border-border/70 p-4 rounded-xl space-y-3">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <h4 className="font-bold text-xs text-foreground flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-primary" />
                    <span>Customer</span>
                  </h4>
                  <div className="flex bg-background border border-border p-1 rounded-xl text-xs">
                    <button
                      type="button"
                      onClick={() => setIsNewCustomer(false)}
                      className={`px-3 py-1 font-bold rounded-lg transition-all cursor-pointer ${!isNewCustomer ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      Existing
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsNewCustomer(true)}
                      className={`px-3 py-1 font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${isNewCustomer ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      <UserPlus className="w-3 h-3" />
                      <span>New</span>
                    </button>
                  </div>
                </div>

                {!isNewCustomer ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div className="md:col-span-2 space-y-1">
                      <label className="font-semibold text-foreground">Select Customer *</label>
                      <select
                        value={formCustId}
                        onChange={(e) => setFormCustId(e.target.value)}
                        className="w-full bg-secondary/40 border border-border rounded-xl px-3.5 py-2 text-xs outline-none text-foreground font-semibold focus:border-primary cursor-pointer"
                      >
                        <option value="">Choose customer profile...</option>
                        {customers.map((c) => (
                          <option key={c.id} value={c.id} className="bg-card text-foreground font-medium">
                            {c.name} {c.companyName ? `(${c.companyName})` : ""} - {c.phone}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="font-semibold text-foreground">Stage</label>
                      <select
                        value={formStatus}
                        onChange={(e) => setFormStatus(e.target.value as any)}
                        className="w-full bg-secondary/40 border border-border rounded-xl px-3.5 py-2 text-xs outline-none text-foreground font-semibold focus:border-primary cursor-pointer"
                      >
                        <option value="DRAFT" className="bg-card">Draft</option>
                        <option value="SENT" className="bg-card">Sent</option>
                        <option value="APPROVED" className="bg-card">Approved</option>
                        <option value="REJECTED" className="bg-card">Rejected</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-secondary/20 p-3.5 rounded-xl border border-border/50 text-xs">
                    <div className="space-y-1">
                      <label className="font-semibold text-foreground">Full Name *</label>
                      <input
                        type="text"
                        placeholder="Anil Kumar"
                        value={newCustName}
                        onChange={(e) => setNewCustName(e.target.value)}
                        className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs outline-none focus:border-primary text-foreground font-semibold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-semibold text-foreground">Company Name</label>
                      <input
                        type="text"
                        placeholder="Metro Builders"
                        value={newCustCompanyName}
                        onChange={(e) => setNewCustCompanyName(e.target.value)}
                        className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs outline-none focus:border-primary text-foreground font-semibold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-semibold text-foreground">Phone *</label>
                      <input
                        type="text"
                        placeholder="+91 9876543210"
                        value={newCustPhone}
                        onChange={(e) => setNewCustPhone(e.target.value)}
                        className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs outline-none focus:border-primary text-foreground"
                      />
                    </div>
                    <div className="space-y-1 md:col-span-3">
                      <label className="font-semibold text-foreground">Billing Address *</label>
                      <input
                        type="text"
                        placeholder="Building / site location address"
                        value={newCustBilling}
                        onChange={(e) => setNewCustBilling(e.target.value)}
                        className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs outline-none focus:border-primary text-foreground font-medium"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Book Number (mandatory, chosen right after the customer) */}
              <div className="bg-secondary/15 border border-border/70 p-4 rounded-xl space-y-2">
                <label className="font-bold text-xs text-foreground uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-primary" />
                  <span>Book Number *</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {BOOK_NUMBER_OPTIONS.map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setBookNumber(b)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        bookNumber === b
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>

              {/* Spec inputs */}
              <div className="border border-border/80 p-5 rounded-2xl bg-card space-y-4">
                <div className="flex justify-between items-center border-b border-border/50 pb-2">
                  <h4 className="font-bold text-xs text-foreground uppercase tracking-wider flex items-center gap-2">
                    <LayoutTemplate className="w-3.5 h-3.5 text-primary" />
                    <span>Shutter Specification</span>
                  </h4>
                  {selectedTemplateObj?.description && (
                    <span className="text-[10px] text-muted-foreground hidden sm:block max-w-xs truncate">
                      {selectedTemplateObj.description}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Quotation Date</label>
                    <input
                      type="date"
                      value={quotationDate}
                      onChange={(e) => setQuotationDate(e.target.value)}
                      className="w-full bg-secondary/35 border border-border rounded-xl px-3 py-2 text-xs text-foreground font-semibold outline-none focus:border-primary"
                    />
                  </div>
                  <div className="space-y-1 col-span-2 sm:col-span-1">
                    <label className="font-semibold text-foreground">Template *</label>
                    <select
                      value={selectedTemplateId}
                      onChange={(e) => { setSelectedTemplateId(e.target.value); setGenerated(false); }}
                      className="w-full bg-secondary/35 border border-border rounded-xl px-3 py-2 text-xs text-foreground font-bold outline-none focus:border-primary cursor-pointer"
                    >
                      <option value="">Select template...</option>
                      {activeTemplates.map((t) => (
                        <option key={t.id} value={t.id} className="bg-card text-foreground">{t.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Width *</label>
                    <input
                      type="number" step="any" min="0"
                      value={specWidth}
                      onChange={(e) => setSpecWidth(e.target.value)}
                      className="w-full bg-secondary/35 border border-border rounded-xl px-3 py-2 text-xs text-foreground font-bold font-mono outline-none focus:border-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Height *</label>
                    <input
                      type="number" step="any" min="0"
                      value={specHeight}
                      onChange={(e) => setSpecHeight(e.target.value)}
                      className="w-full bg-secondary/35 border border-border rounded-xl px-3 py-2 text-xs text-foreground font-bold font-mono outline-none focus:border-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Material</label>
                    <select
                      value={specMaterial}
                      onChange={(e) => setSpecMaterial(e.target.value)}
                      className="w-full bg-secondary/35 border border-border rounded-xl px-3 py-2 text-xs text-foreground font-bold outline-none focus:border-primary cursor-pointer"
                    >
                      {materialOptions.length === 0 && <option value="">—</option>}
                      {materialOptions.map((o) => <option key={o} value={o} className="bg-card">{o}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Thickness</label>
                    <select
                      value={specThickness}
                      onChange={(e) => setSpecThickness(e.target.value)}
                      className="w-full bg-secondary/35 border border-border rounded-xl px-3 py-2 text-xs text-foreground font-bold outline-none focus:border-primary cursor-pointer"
                    >
                      {thicknessOptions.length === 0 && <option value="">—</option>}
                      {thicknessOptions.map((o) => <option key={o} value={o} className="bg-card">{o}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Profile</label>
                    <select
                      value={specProfile}
                      onChange={(e) => setSpecProfile(e.target.value)}
                      className="w-full bg-secondary/35 border border-border rounded-xl px-3 py-2 text-xs text-foreground font-bold outline-none focus:border-primary cursor-pointer"
                    >
                      {profileOptions.length === 0 && <option value="">—</option>}
                      {profileOptions.map((o) => <option key={o} value={o} className="bg-card">{o}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Quantity</label>
                    <input
                      type="number" min="1"
                      value={specQty}
                      onChange={(e) => setSpecQty(e.target.value)}
                      className="w-full bg-secondary/35 border border-border rounded-xl px-3 py-2 text-xs text-foreground font-bold font-mono outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="flex justify-end items-center gap-2">
                  {!bookNumber && (
                    <span className="text-[11px] text-amber-500 font-semibold">Select a Book Number above first</span>
                  )}
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={!bookNumber}
                    className="bg-primary text-primary-foreground hover:bg-primary/95 disabled:opacity-40 disabled:cursor-not-allowed font-bold px-6 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-primary/20 cursor-pointer hover:scale-[1.01] transition-all"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Quotation</span>
                  </button>
                </div>
              </div>

              {/* Warnings */}
              {generated && genWarnings.length > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 space-y-1">
                  {genWarnings.map((w, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-[11px] text-amber-500">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Generated editable lines */}
              {generated && (
                <div className="border border-border/80 rounded-2xl bg-card overflow-hidden">
                  <div className="flex justify-between items-center px-4 py-3 border-b border-border/60 bg-secondary/20">
                    <h4 className="font-bold text-xs text-foreground uppercase tracking-wider">
                      Generated Materials <span className="font-mono text-muted-foreground">({genLines.length})</span>
                    </h4>
                    <button
                      type="button"
                      onClick={addExtraLine}
                      className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Extra Item
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs min-w-[720px]">
                      <thead>
                        <tr className="bg-secondary/15 text-[9px] font-mono uppercase tracking-wider text-muted-foreground border-b border-border/60">
                          <th className="p-2.5">Material</th>
                          <th className="p-2.5 w-40">Variant</th>
                          <th className="p-2.5 w-20 text-center">Qty</th>
                          <th className="p-2.5 w-16 text-center">Unit</th>
                          <th className="p-2.5 w-24 text-right">Rate</th>
                          <th className="p-2.5 w-24 text-right">Amount</th>
                          <th className="p-2.5 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {genLines.map((line, idx) => {
                          const variants = line.materialCategory
                            ? getCategoryVariants(masterItems, line.materialCategory).map((v) => v.name)
                            : [];
                          return (
                            <tr key={idx} className="hover:bg-secondary/10">
                              <td className="p-2 align-top">
                                <input
                                  value={line.productName}
                                  onChange={(e) => updateLine(idx, { productName: e.target.value })}
                                  placeholder="Material"
                                  className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-xs font-bold text-foreground outline-none focus:border-primary"
                                />
                                {line.description && (
                                  <span className="text-[10px] text-muted-foreground block mt-1 leading-snug">{line.description}</span>
                                )}
                              </td>
                              <td className="p-2 align-top">
                                {variants.length > 0 ? (
                                  <select
                                    value={line.variant}
                                    onChange={(e) => updateLine(idx, { variant: e.target.value })}
                                    className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-xs text-foreground font-semibold outline-none focus:border-primary cursor-pointer"
                                  >
                                    {!variants.includes(line.variant) && line.variant && (
                                      <option value={line.variant}>{line.variant}</option>
                                    )}
                                    {variants.map((v) => <option key={v} value={v}>{v}</option>)}
                                  </select>
                                ) : (
                                  <input
                                    value={line.variant}
                                    onChange={(e) => updateLine(idx, { variant: e.target.value })}
                                    className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-xs text-foreground font-semibold outline-none focus:border-primary"
                                  />
                                )}
                              </td>
                              <td className="p-2 align-top">
                                <input
                                  type="number" step="any"
                                  value={line.quantity}
                                  onChange={(e) => updateLine(idx, { quantity: parseFloat(e.target.value) || 0 })}
                                  className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-xs text-foreground font-mono font-bold text-center outline-none focus:border-primary"
                                />
                              </td>
                              <td className="p-2 align-top">
                                <input
                                  value={line.unit}
                                  onChange={(e) => updateLine(idx, { unit: e.target.value })}
                                  className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-xs text-foreground font-mono text-center outline-none focus:border-primary"
                                />
                              </td>
                              <td className="p-2 align-top">
                                <input
                                  type="number" step="any"
                                  value={line.unitPrice}
                                  onChange={(e) => updateLine(idx, { unitPrice: parseFloat(e.target.value) || 0 })}
                                  className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-xs text-foreground font-mono text-right outline-none focus:border-primary"
                                />
                              </td>
                              <td className="p-2 align-top text-right font-mono font-bold text-foreground pt-3.5">
                                ₹{line.lineTotal.toLocaleString("en-IN")}
                              </td>
                              <td className="p-2 align-top text-center pt-3">
                                <button
                                  type="button"
                                  onClick={() => deleteLine(idx)}
                                  className="p-1 hover:bg-rose-500/10 rounded text-rose-400"
                                  title="Delete line"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                        {genLines.length === 0 && (
                          <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No lines. Add an extra item or adjust the template.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Financial summary */}
              {generated && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border border-border/80 p-5 rounded-2xl bg-secondary/15 items-center">
                  <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">Discount (₹)</label>
                      <input
                        type="number" min="0"
                        value={formDiscount}
                        onChange={(e) => setFormDiscount(e.target.value)}
                        className="w-full bg-background border border-border rounded-xl px-3.5 py-2 text-xs outline-none text-foreground font-bold font-mono focus:border-primary text-right"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">GST</label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setFormGstOff(!formGstOff)}
                          className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                            formGstOff ? "bg-secondary text-muted-foreground border-border" : "bg-primary text-primary-foreground border-primary"
                          }`}
                        >
                          {formGstOff ? "GST OFF" : "GST ON"}
                        </button>
                        <select
                          disabled={formGstOff}
                          value={formGstRate}
                          onChange={(e) => setFormGstRate(e.target.value)}
                          className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground font-bold font-mono outline-none focus:border-primary disabled:opacity-40 cursor-pointer"
                        >
                          <option value="5">5%</option>
                          <option value="12">12%</option>
                          <option value="18">18%</option>
                          <option value="28">28%</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="bg-card border border-border p-4 rounded-xl space-y-2 font-mono">
                    <div className="flex justify-between items-center text-xs text-muted-foreground font-sans">
                      <span>Subtotal</span>
                      <strong className="text-foreground font-mono">₹{Math.round(subtotal).toLocaleString("en-IN")}</strong>
                    </div>
                    {gstAmt > 0 && (
                      <div className="flex justify-between items-center text-xs text-muted-foreground font-sans">
                        <span>GST ({gstRateVal}%)</span>
                        <strong className="text-foreground font-mono">₹{Math.round(gstAmt).toLocaleString("en-IN")}</strong>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-xs text-muted-foreground font-sans">
                      <span>Round Off</span>
                      <strong className="text-foreground font-mono">₹{roundOff.toLocaleString("en-IN")}</strong>
                    </div>
                    <div className="pt-2 border-t border-border/60 flex justify-between items-baseline font-sans">
                      <span className="text-xs font-bold text-foreground uppercase tracking-wider">Grand Total</span>
                      <span className="text-2xl font-black text-foreground font-mono tracking-tight">
                        ₹{grandTotal.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="flex justify-between items-center pt-2 border-t border-border/40">
                <button
                  type="button"
                  onClick={() => setShowAddQuote(false)}
                  className="bg-secondary hover:bg-secondary/80 text-foreground font-semibold px-5 py-2.5 rounded-xl text-xs border border-border cursor-pointer transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting || !generated}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-8 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/20 cursor-pointer hover:scale-[1.01] transition-all"
                >
                  {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>{isSubmitting ? "Saving..." : "Save Quotation"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
