"use client";

import React, { useEffect, useState } from "react";
import { 
  Receipt, Plus, Search, FileText, Printer, ArrowLeft, RefreshCw, 
  CreditCard, Calendar, Check, DollarSign, ExternalLink, Trash2
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
}

interface Quotation {
  id: string;
  quoteNumber: string;
  status: string;
  totalAmount: number;
  items?: any[];
}

interface Payment {
  id: string;
  amount: number;
  paymentType: "ADVANCE" | "PARTIAL" | "FULL" | "REMAINING";
  paymentMethod: "UPI" | "CASH" | "BANK" | "CHEQUE";
  transactionRef: string;
  createdAt: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  quotationId?: string;
  customerId: string;
  status: "PENDING" | "PARTIAL" | "PAID";
  amountPaid: number;
  totalAmount: number;
  discount: number;
  gstRate: number;
  gstAmount: number;
  paymentDue: string;
  terms: string;
  createdAt: string;
  customer?: Customer;
  quotation?: Quotation;
  payments?: Payment[];
}

export default function InvoicesPage() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [unconvertedQuotes, setUnconvertedQuotes] = useState<Quotation[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Active Invoice for details drawer
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState("");

  // Record Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<"UPI" | "CASH" | "BANK" | "CHEQUE">("UPI");
  const [payType, setPayType] = useState<"ADVANCE" | "PARTIAL" | "FULL" | "REMAINING">("REMAINING");
  const [payRef, setPayRef] = useState("");
  const [branding, setBranding] = useState<any>(null);

  // One click convert dropdown state
  const [showConvertMenu, setShowConvertMenu] = useState(false);

  const [notification, setNotification] = useState("");

  // Edit & Convert Modal State
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [quoteToConvert, setQuoteToConvert] = useState<any | null>(null);
  const [convertItems, setConvertItems] = useState<any[]>([]);
  const [convertDiscount, setConvertDiscount] = useState("0");
  const [convertGstRate, setConvertGstRate] = useState("18");
  const [convertPaymentDue, setConvertPaymentDue] = useState("");
  const [convertTerms, setConvertTerms] = useState("");
  const [masterItems, setMasterItems] = useState<any[]>([]);

  const categoriesList = masterItems.filter(mi => mi.category === "Material Categories" && !mi.isDisabled);
  const thicknessList = masterItems.filter(mi => mi.category === "Thickness" && !mi.isDisabled);
  const profilesList = masterItems.filter(mi => mi.category === "Profiles" && !mi.isDisabled);

  const fetchData = async () => {
    setLoading(true);
    try {
      const invRes = await fetch("/api/invoices");
      const quoteRes = await fetch("/api/quotations");
      const brandRes = await fetch("/api/admin/branding");
      const masterRes = await fetch("/api/master-data");
      
      if (invRes.ok && quoteRes.ok && masterRes.ok) {
        const invList: Invoice[] = await invRes.json();
        const quoteList: Quotation[] = await quoteRes.json();
        
        setInvoices(invList);
        setMasterItems(await masterRes.json());
        
        // Filter approved quotes that aren't converted to invoices yet
        const convertedQuoteIds = invList.map(i => i.quotationId);
        const approvedUnconverted = quoteList.filter(
          q => q.status === "APPROVED" && !convertedQuoteIds.includes(q.id)
        );
        setUnconvertedQuotes(approvedUnconverted);
      }
      if (brandRes.ok) {
        setBranding(await brandRes.json());
      }
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    
    // Check if redirecting from quotations to convert
    const params = new URLSearchParams(window.location.search);
    const convertQuoteId = params.get("convert");
    if (convertQuoteId) {
      setTimeout(() => {
        handleConvert(convertQuoteId);
      }, 600);
    }
  }, [branding]); // branding dependency ensures branding is loaded before trigger

  // Generate QR Code when invoice is selected
  useEffect(() => {
    if (selectedInvoice) {
      const upiString = `upi://pay?pa=kohinoor@sbi&pn=Kohinoor%20Shutters&am=${selectedInvoice.totalAmount - selectedInvoice.amountPaid}&cu=INR&tn=Invoice%20${selectedInvoice.invoiceNumber}`;
      QRCode.toDataURL(upiString, { width: 120, margin: 1 })
        .then(url => setQrCodeUrl(url))
        .catch(() => setQrCodeUrl(""));
    } else {
      setQrCodeUrl("");
    }
  }, [selectedInvoice]);

  const calculateConvertAmount = (item: any): number => {
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

  const addConvertItemRow = () => {
    setConvertItems((prev) => [
      ...prev,
      { productName: "Material Item", materialCategory: "Material Categories", material: "", quantity: 1, unitPrice: 0, lineTotal: 0, unit: "Pcs" }
    ]);
  };

  const removeConvertItemRow = (index: number) => {
    if (convertItems.length === 1) return;
    setConvertItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateConvertItemRow = (index: number, field: string, value: any) => {
    setConvertItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index] };

      if (field === "materialCategory") {
        item.materialCategory = value;
        item.material = "";
        item.thickness = "";
        item.profile = "";
        item.length = 0;
        item.width = 0;
        
        const firstMatch = masterItems.find(mi => mi.category === value && !mi.isDisabled);
        item.unit = firstMatch ? firstMatch.unit : "Pcs";
        item.unitPrice = firstMatch ? firstMatch.rate : 0;
        item.productName = value;
      } else if (field === "material") {
        item.material = value;
        const dbItem = masterItems.find(mi => mi.category === item.materialCategory && mi.name === value);
        if (dbItem) {
          item.unit = dbItem.unit;
          item.unitPrice = dbItem.rate;
        }
        item.productName = `${item.materialCategory || ""} (${value})`;
      } else if (field === "thickness") {
        item.thickness = value;
      } else if (field === "profile") {
        item.profile = value;
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
      } else if (field === "unit") {
        item.unit = value;
      }

      item.lineTotal = calculateConvertAmount(item);
      updated[index] = item;
      return updated;
    });
  };

  const handleConvert = async (quoteId: string) => {
    try {
      const res = await fetch("/api/quotations");
      if (res.ok) {
        const list = await res.json();
        const found = list.find((q: any) => q.id === quoteId);
        if (found) {
          setQuoteToConvert(found);
          setConvertItems(found.items || []);
          setConvertDiscount(found.discount.toString());
          setConvertGstRate("18"); // standard invoice GST
          const due = new Date(Date.now() + 15 * 24 * 3600 * 1000).toISOString().split("T")[0];
          setConvertPaymentDue(due);
          setConvertTerms(branding?.invoiceTerms || "1. Goods once sold will not be taken back.\n2. Interest @ 18% will be charged if payment is not made within due date.");
          setShowConvertModal(true);
        }
      }
    } catch(e) {}
    setShowConvertMenu(false);
  };

  const submitConversion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quoteToConvert) return;
    
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quotationId: quoteToConvert.id,
          items: convertItems,
          discount: parseFloat(convertDiscount) || 0,
          gstRate: parseFloat(convertGstRate) || 18,
          paymentDue: convertPaymentDue,
          terms: convertTerms
        })
      });

      if (res.ok) {
        const newInvoice = await res.json();
        setNotification(`Quotation successfully converted to Invoice ${newInvoice.invoiceNumber}!`);
        setTimeout(() => setNotification(""), 3000);
        setShowConvertModal(false);
        setQuoteToConvert(null);
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to convert quotation to invoice.");
      }
    } catch (e) {
      alert("Failed to connect to invoice conversion endpoint.");
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice || !payAmount) {
      alert("Please enter a valid payment amount.");
      return;
    }

    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: selectedInvoice.id,
          amount: parseFloat(payAmount),
          paymentType: payType,
          paymentMethod: payMethod,
          transactionRef: payRef
        })
      });

      if (res.ok) {
        setNotification("Payment logged successfully!");
        setTimeout(() => setNotification(""), 3000);
        
        // Reset and close
        setPayAmount("");
        setPayRef("");
        setShowPaymentModal(false);
        
        // Refresh detail view
        const refreshInvRes = await fetch("/api/invoices");
        if (refreshInvRes.ok) {
          const invList = await refreshInvRes.json();
          setInvoices(invList);
          const updated = invList.find((i: Invoice) => i.id === selectedInvoice.id);
          if (updated) setSelectedInvoice(updated);
        }
        fetchData();
      }
    } catch (e) {}
  };

  const filteredInvoices = invoices.filter(i => 
    i.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
    (i.customer && i.customer.name.toLowerCase().includes(search.toLowerCase()))
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

      {!selectedInvoice ? (
        <>
          {/* Header Controls */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card/45 border border-border/80 p-4 rounded-xl relative">
            <div className="relative flex-grow max-w-md w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search invoices by invoice number or client..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-secondary/40 border border-border/80 rounded-lg py-2 pl-10 pr-4 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/60 transition-all duration-150"
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button
                onClick={fetchData}
                className="p-2 bg-secondary/60 hover:bg-secondary border border-border/80 text-muted-foreground hover:text-foreground rounded-lg transition-all"
                title="Refresh Ledger"
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowConvertMenu(!showConvertMenu)}
                  className="bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-semibold py-2 px-4 rounded-lg flex items-center gap-2 shadow-lg shadow-primary/25 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Convert Quote to Invoice</span>
                </button>

                {/* Unconverted quotes selector popover */}
                {showConvertMenu && (
                  <div className="absolute right-0 mt-2 w-72 bg-card border border-border rounded-xl shadow-2xl z-40 p-2 flex flex-col gap-1 max-h-72 overflow-y-auto">
                    <span className="text-[9px] uppercase font-mono tracking-wider text-muted-foreground p-2 border-b border-border/60">
                      Approved Proposals ({unconvertedQuotes.length})
                    </span>
                    {unconvertedQuotes.length === 0 ? (
                      <span className="text-xs text-muted-foreground p-4 text-center">
                        No approved unconverted quotes available.
                      </span>
                    ) : (
                      unconvertedQuotes.map((q) => (
                        <button
                          key={q.id}
                          onClick={() => handleConvert(q.id)}
                          className="w-full text-left p-2 rounded hover:bg-secondary text-xs flex justify-between items-center group font-medium"
                        >
                          <div className="flex flex-col">
                            <span className="font-bold text-foreground font-mono">{q.quoteNumber}</span>
                            <span className="text-[10px] text-muted-foreground">₹{q.totalAmount.toLocaleString("en-IN")}</span>
                          </div>
                          <span className="text-[9px] bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground px-1.5 py-0.5 rounded uppercase font-mono">
                            Convert
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="border border-border/80 rounded-xl bg-card/30 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-secondary/20 text-[10px] font-mono uppercase tracking-wider text-muted-foreground border-b border-border/60">
                    <th className="p-4">Invoice No.</th>
                    <th className="p-4">Quotation Ref</th>
                    <th className="p-4">Client</th>
                    <th className="p-4 text-right">Grand Total (Inc Tax)</th>
                    <th className="p-4 text-right">Amount Paid</th>
                    <th className="p-4 text-right">Due Balance</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-xs">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="text-center p-8 text-muted-foreground">
                        Syncing account books...
                      </td>
                    </tr>
                  ) : filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center p-8 text-muted-foreground">
                        No invoice matches found.
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((inv) => {
                      const balance = inv.totalAmount - inv.amountPaid;

                      return (
                        <tr key={inv.id} className="hover:bg-secondary/25 transition-colors">
                          <td className="p-4 font-bold text-foreground font-mono">{inv.invoiceNumber}</td>
                          <td className="p-4 font-mono text-muted-foreground/80">
                            {inv.quotation?.quoteNumber || "Direct Invoice"}
                          </td>
                          <td className="p-4">
                            <span className="font-semibold text-foreground">{inv.customer?.name}</span>
                          </td>
                          <td className="p-4 text-right font-bold text-foreground font-mono">
                            ₹{inv.totalAmount.toLocaleString("en-IN")}
                          </td>
                          <td className="p-4 text-right text-emerald-400 font-mono">
                            ₹{inv.amountPaid.toLocaleString("en-IN")}
                          </td>
                          <td className="p-4 text-right font-mono font-bold text-foreground">
                            ₹{balance.toLocaleString("en-IN")}
                          </td>
                          <td className="p-4">
                            <span
                              className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded border ${
                                inv.status === "PAID"
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                  : inv.status === "PARTIAL"
                                  ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                  : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                              }`}
                            >
                              {inv.status}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => setSelectedInvoice(inv)}
                              className="bg-secondary/60 hover:bg-secondary border border-border/80 text-foreground font-semibold px-2.5 py-1 rounded text-[11px] flex items-center gap-1 transition-all inline-flex"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                              <span>View Receipt</span>
                            </button>
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
        /* INVOICE PREVIEW / RECEIPT DETAIL VIEW */
        <div className="flex flex-col gap-6">
          <div className="flex justify-between items-center bg-card/45 border p-4 rounded-xl print-hidden print:!hidden">
            <button
              onClick={() => setSelectedInvoice(null)}
              className="flex items-center gap-2 text-xs font-semibold hover:text-primary transition-colors text-muted-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Ledger</span>
            </button>

            <div className="flex items-center gap-3">
              {selectedInvoice.status !== "PAID" && (
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-semibold py-1.5 px-3.5 rounded-lg flex items-center gap-1.5 shadow-md shadow-primary/20"
                >
                  <DollarSign className="w-4 h-4" />
                  <span>Log Payment Receipt</span>
                </button>
              )}

              <button
                onClick={() => window.print()}
                className="bg-secondary text-foreground hover:bg-secondary/80 text-xs font-semibold py-1.5 px-3.5 border rounded-lg flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Print Invoice</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
             {/* Left Printable Invoice Card */}
            <div className="lg:col-span-2 bg-white text-slate-900 p-8 rounded-xl shadow-lg border border-slate-200 font-sans print:p-0 print:border-none print:shadow-none printable-card">
              <div className="flex justify-between items-center border-b-2 border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <img src="/logo.png" alt="Logo" className="w-10 h-10 rounded object-contain shrink-0" />
                  <span className="font-bold text-xs tracking-tight">{branding?.companyName || "KOHINOOR SHUTTERS"}</span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-slate-800">TAX INVOICE</span>
                  <p className="text-[10px] text-slate-400 font-mono font-bold">No: {selectedInvoice.invoiceNumber}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 my-6 text-[10px] leading-relaxed">
                <div>
                  <span className="text-[8px] font-mono text-slate-400 uppercase tracking-wider font-bold">ISSUER</span>
                  <p className="font-bold text-slate-800">{branding?.companyName || "Kohinoor Shutter Industries"}</p>
                  <p className="text-slate-500">201, GIDC Area, Thane, MH</p>
                  <p className="text-slate-500">GSTIN: {branding?.gstNumber || "27AAACK5912K1Z9"}</p>
                  {branding?.bankAccountNo && (
                    <p className="text-slate-500 mt-1">
                      Bank: {branding.bankName} | A/C: {branding.bankAccountNo} | IFSC: {branding.bankIfsc}
                    </p>
                  )}
                </div>
                <div>
                  <span className="text-[8px] font-mono text-slate-400 uppercase tracking-wider font-bold">BILL TO</span>
                  <p className="font-bold text-slate-800">{selectedInvoice.customer?.name}</p>
                  {selectedInvoice.customer?.companyName && (
                    <p className="text-slate-700 font-semibold text-[10px]">Company: {selectedInvoice.customer.companyName}</p>
                  )}
                  <p className="text-slate-500">{selectedInvoice.customer?.billingAddress}</p>
                  <p className="text-slate-500">Phone: {selectedInvoice.customer?.phone}</p>
                </div>
              </div>
                            {/* Itemized Table */}
              <div className="border-t border-b border-slate-200 py-3 my-4">
                <table className="w-full text-left text-[10px] text-slate-700">
                  <thead>
                    <tr className="font-bold border-b border-slate-200 pb-1 text-slate-500 uppercase tracking-wider text-[8px]">
                      <th className="py-1">Description of Goods</th>
                      <th className="py-1 text-center">HSN Code</th>
                      <th className="py-1 text-right">Qty</th>
                      <th className="py-1 text-right">Rate</th>
                      <th className="py-1 text-right font-bold text-slate-800">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedInvoice.quotation?.items?.map((item: any, idx: number) => {
                      const sizeStr = item.length || item.width ? `(${item.length} x ${item.width})` : "";
                      return (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-1.5 font-medium">{item.productName} {sizeStr}</td>
                          <td className="py-1.5 text-center font-mono">73083000</td>
                          <td className="py-1.5 text-right font-mono">{item.quantity} {item.unit || "Pcs"}</td>
                          <td className="py-1.5 text-right font-mono">₹{item.unitPrice.toLocaleString("en-IN")}</td>
                          <td className="py-1.5 text-right font-mono font-bold text-slate-800">
                            ₹{item.lineTotal.toLocaleString("en-IN")}
                          </td>
                        </tr>
                      );
                    })}
                    {(!selectedInvoice.quotation?.items || selectedInvoice.quotation.items.length === 0) && (
                      <tr>
                        <td className="py-1.5 font-medium">Standard Rolling Shutter Assembly (Custom Spec)</td>
                        <td className="py-1.5 text-center font-mono">73083000</td>
                        <td className="py-1.5 text-right font-mono">1 Pcs</td>
                        <td className="py-1.5 text-right font-mono">
                          ₹{(selectedInvoice.totalAmount - selectedInvoice.gstAmount + selectedInvoice.discount).toLocaleString("en-IN")}
                        </td>
                        <td className="py-1.5 text-right font-mono font-bold text-slate-800">
                          ₹{(selectedInvoice.totalAmount - selectedInvoice.gstAmount + selectedInvoice.discount).toLocaleString("en-IN")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Tax Calculations */}
              {(() => {
                const subtotal = selectedInvoice.quotation?.items?.reduce((sum: number, it: any) => sum + (it.quantity * it.unitPrice), 0) || (selectedInvoice.totalAmount - selectedInvoice.gstAmount + selectedInvoice.discount);
                const gstRate = selectedInvoice.gstRate || 18.0;
                const gstAmt = selectedInvoice.gstAmount || 0.0;
                const cgst = gstAmt / 2;
                const sgst = gstAmt / 2;
                const grandTotal = selectedInvoice.totalAmount;

                return (
                  <div className="flex justify-between items-start text-[10px] leading-relaxed my-4 border-b border-slate-200 pb-4">
                    <div className="text-[10px] text-slate-500">
                      <p className="font-bold text-slate-600 block mb-0.5">Date Information</p>
                      <p>Issued Date: {new Date(selectedInvoice.createdAt).toLocaleDateString("en-IN")}</p>
                      <p>Due Date: {new Date(selectedInvoice.paymentDue).toLocaleDateString("en-IN")}</p>
                    </div>

                    <div className="w-1/2 flex flex-col gap-1 text-right">
                      <div className="flex justify-between text-slate-500">
                        <span>Subtotal:</span>
                        <span className="font-mono font-bold text-slate-800">₹{subtotal.toLocaleString("en-IN")}</span>
                      </div>
                      {selectedInvoice.discount > 0 && (
                        <div className="flex justify-between text-rose-500 font-semibold">
                          <span>Discount Deducted:</span>
                          <span className="font-mono">-₹{selectedInvoice.discount.toLocaleString("en-IN")}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-slate-500">
                        <span>CGST ({gstRate / 2}%):</span>
                        <span className="font-mono text-slate-700">₹{cgst.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>SGST ({gstRate / 2}%):</span>
                        <span className="font-mono text-slate-700">₹{sgst.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="flex justify-between text-slate-800 font-bold border-t border-slate-100 pt-1.5 text-xs">
                        <span>Grand Total:</span>
                        <span className="font-mono text-slate-950 font-black">₹{grandTotal.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="flex justify-between text-emerald-600 font-semibold mt-0.5">
                        <span>Amount Paid:</span>
                        <span className="font-mono font-bold">₹{selectedInvoice.amountPaid.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="flex justify-between text-rose-500 font-bold border-t border-slate-100 pt-1 mt-0.5">
                        <span>Balance Due:</span>
                        <span className="font-mono">₹{(grandTotal - selectedInvoice.amountPaid).toLocaleString("en-IN")}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* QR payment layout */}
              <div className="flex items-center gap-4 bg-slate-50 border border-slate-100 rounded-lg p-3 my-6">
                {qrCodeUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qrCodeUrl} alt="Payment QR" className="w-20 h-20 bg-white p-1 border rounded" />
                ) : (
                  <div className="w-20 h-20 bg-slate-100 rounded flex items-center justify-center text-[10px]">QR</div>
                )}
                <div className="flex flex-col gap-0.5 text-[9px] text-slate-500 max-w-[280px]">
                  <span className="font-bold text-slate-700">UPI PAYMENT DECREE</span>
                  <span>Scan to pay pending balance of ₹{(selectedInvoice.totalAmount - selectedInvoice.amountPaid).toLocaleString("en-IN")}. Remits instantly to company ledger account.</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 mt-6 pt-4 border-t border-slate-100 text-[10px]">
                <div className="text-slate-400 leading-relaxed">
                  <span className="font-bold text-slate-600 uppercase font-mono tracking-wider block mb-1">Terms & Conditions</span>
                  <p className="whitespace-pre-line">{selectedInvoice.terms || branding?.invoiceTerms}</p>
                </div>
                <div className="flex flex-col justify-end items-end h-16">
                  <div className="w-40 border-b border-slate-300 pb-1 flex flex-col items-center">
                    <span className="text-[10px] text-slate-400">Authorized Signature</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Audit/Payments Log */}
            <div className="lg:col-span-1 border border-border/80 bg-card/45 backdrop-blur-md rounded-xl p-5 flex flex-col gap-4 print-hidden print:!hidden">
              <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-2 border-b border-border pb-2">
                <CreditCard className="w-4 h-4 text-primary" />
                <span>Transaction Receipts</span>
              </h3>

              <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-1">
                {!selectedInvoice.payments || selectedInvoice.payments.length === 0 ? (
                  <div className="text-center py-8 text-xs text-muted-foreground italic bg-secondary/15 rounded-lg border border-dashed border-border/60">
                    No transactions recorded against this invoice.
                  </div>
                ) : (
                  selectedInvoice.payments.map((pay) => (
                    <div key={pay.id} className="bg-secondary/20 border border-border/60 p-3 rounded-lg flex flex-col gap-1.5">
                      <div className="flex justify-between items-center text-[10px] border-b border-border/40 pb-1">
                        <span className="font-mono bg-card px-1.5 py-0.5 rounded text-foreground font-bold">
                          {pay.paymentMethod}
                        </span>
                        <span className="text-muted-foreground">
                          {new Date(pay.createdAt).toLocaleDateString("en-IN")}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs items-center">
                        <span className="text-muted-foreground">Allocation: {pay.paymentType}</span>
                        <span className="font-mono font-bold text-emerald-400">₹{pay.amount.toLocaleString("en-IN")}</span>
                      </div>
                      {pay.transactionRef && (
                        <div className="text-[9px] text-muted-foreground font-mono bg-card/50 p-1 rounded text-center">
                          Ref: {pay.transactionRef}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showPaymentModal && selectedInvoice && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-border flex justify-between items-center bg-secondary/10">
              <h3 className="font-heading font-semibold text-sm">Log Payment Receipt</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-muted-foreground hover:text-foreground text-xs font-semibold">
                Cancel
              </button>
            </div>
            
            <form onSubmit={handleRecordPayment} className="p-6 space-y-4">
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground font-mono">BILLING TARGET</span>
                <p className="text-xs font-bold text-foreground">
                  Invoice {selectedInvoice.invoiceNumber} (Total: ₹{selectedInvoice.totalAmount.toLocaleString("en-IN")})
                </p>
                <p className="text-[10px] text-muted-foreground font-mono">
                  Pending: ₹{(selectedInvoice.totalAmount - selectedInvoice.amountPaid).toLocaleString("en-IN")}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Payment Method</label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value as any)}
                    className="w-full bg-secondary/40 border border-border rounded-md px-3 py-2 text-xs outline-none text-foreground font-semibold"
                  >
                    <option value="UPI" className="bg-card">UPI Transfer</option>
                    <option value="CASH" className="bg-card">Cash</option>
                    <option value="BANK" className="bg-card">Bank Deposit</option>
                    <option value="CHEQUE" className="bg-card">Cheque Transfer</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Allocation Type</label>
                  <select
                    value={payType}
                    onChange={(e) => setPayType(e.target.value as any)}
                    className="w-full bg-secondary/40 border border-border rounded-md px-3 py-2 text-xs outline-none text-foreground font-semibold"
                  >
                    <option value="ADVANCE" className="bg-card">Advance Payment</option>
                    <option value="PARTIAL" className="bg-card">Partial Payment</option>
                    <option value="FULL" className="bg-card">Full Payment</option>
                    <option value="REMAINING" className="bg-card">Remaining Balance</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">Amount Received (₹)</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 40000"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full bg-secondary/40 border border-border rounded-md px-3 py-1.5 text-xs outline-none text-foreground font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Transaction Reference (ID / UTR)</label>
                <input
                  type="text"
                  placeholder="e.g. UPI8927104821 or Bank UTR"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  className="w-full bg-secondary/40 border border-border rounded-md px-3 py-1.5 text-xs outline-none text-foreground font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-primary text-primary-foreground font-semibold py-2.5 rounded-lg text-xs hover:bg-primary/95 shadow-md shadow-primary/25 cursor-pointer"
              >
                Log Receipt
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Edit & Convert Quotation to Invoice Modal */}
      {showConvertModal && quoteToConvert && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-5xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col my-8">
            <div className="p-6 border-b border-border flex justify-between items-center bg-secondary/15">
              <div className="flex flex-col gap-0.5">
                <h3 className="font-heading font-semibold text-sm">Convert Proposal to Invoice</h3>
                <span className="text-[10px] font-mono text-muted-foreground uppercase">
                  Source Document: {quoteToConvert.quoteNumber} (v{quoteToConvert.version})
                </span>
              </div>
              <button 
                onClick={() => { setShowConvertModal(false); setQuoteToConvert(null); }} 
                className="text-muted-foreground hover:text-foreground text-xs font-semibold"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={submitConversion} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* Customer summary (read-only) */}
              <div className="bg-secondary/10 p-4 border border-border/60 rounded-xl grid grid-cols-2 gap-4 text-xs font-sans">
                <div>
                  <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider block mb-1">BILLING TARGET CLIENT</span>
                  <span className="font-bold text-foreground">{quoteToConvert.customer?.name || "Unknown Customer"}</span>
                  {quoteToConvert.customer?.companyName && (
                    <span className="text-muted-foreground block text-[10px]">Company: {quoteToConvert.customer.companyName}</span>
                  )}
                </div>
                <div>
                  <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider block mb-1">SHIPPING ADDRESS</span>
                  <span className="text-muted-foreground">{quoteToConvert.customer?.billingAddress}</span>
                </div>
              </div>

              {/* Items editing workspace */}
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-border/40 pb-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-bold">Line Items Configurator</span>
                  <button
                    type="button"
                    onClick={addConvertItemRow}
                    className="text-[10px] bg-secondary hover:bg-secondary/80 border border-border text-foreground font-bold px-2 py-1 rounded transition-all flex items-center gap-1 shrink-0"
                  >
                    <Plus className="w-3 h-3 text-primary" />
                    <span>Add custom item</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {convertItems.map((item, idx) => (
                    <div key={idx} className="flex flex-wrap items-end gap-3 bg-secondary/10 p-3 rounded-lg border border-border/40 transition-all hover:border-border select-none">
                      {/* Product Name */}
                      <div className="flex-1 min-w-[200px] space-y-1">
                        <label className="text-[9px] font-mono text-muted-foreground">Product Description</label>
                        <input
                          type="text"
                          required
                          value={item.productName || ""}
                          onChange={(e) => updateConvertItemRow(idx, "productName", e.target.value)}
                          className="w-full bg-secondary/40 border border-border rounded-md px-2 py-1 text-xs outline-none text-foreground"
                        />
                      </div>

                      {/* Material Category select */}
                      <div className="w-32 space-y-1">
                        <label className="text-[9px] font-mono text-muted-foreground">Category</label>
                        <select
                          value={item.materialCategory || "Material Categories"}
                          onChange={(e) => updateConvertItemRow(idx, "materialCategory", e.target.value)}
                          className="w-full bg-secondary/40 border border-border rounded-md px-2 py-1 text-xs outline-none text-foreground font-semibold"
                        >
                          <option value="Material Categories">Select...</option>
                          <option value="GI Sheet" className="bg-card">GI Sheet</option>
                          <option value="Galvalume" className="bg-card">Galvalume</option>
                          <option value="Motors" className="bg-card">Motors</option>
                          <option value="Springs" className="bg-card">Springs</option>
                          <option value="Guides" className="bg-card">Guides</option>
                          <option value="Brackets" className="bg-card">Brackets</option>
                          <option value="Installation" className="bg-card">Installation</option>
                          <option value="Other" className="bg-card">Other</option>
                        </select>
                      </div>

                      {/* Material select */}
                      <div className="w-32 space-y-1">
                        <label className="text-[9px] font-mono text-muted-foreground">Specification</label>
                        <select
                          required
                          value={item.material || ""}
                          onChange={(e) => updateConvertItemRow(idx, "material", e.target.value)}
                          className="w-full bg-secondary/40 border border-border rounded-md px-2 py-1 text-xs outline-none text-foreground"
                        >
                          <option value="">Spec...</option>
                          {masterItems
                            .filter((mi: any) => mi.category === item.materialCategory && !mi.isDisabled)
                            .map((mi: any) => (
                              <option key={mi.id} value={mi.name} className="bg-card">{mi.name}</option>
                            ))}
                        </select>
                      </div>

                      {/* Thickness select */}
                      <div className="w-24 space-y-1">
                        <label className="text-[9px] font-mono text-muted-foreground">Thickness</label>
                        <select
                          disabled={item.materialCategory !== "GI Sheet"}
                          value={item.thickness || ""}
                          onChange={(e) => updateConvertItemRow(idx, "thickness", e.target.value)}
                          className="w-full bg-secondary/40 border border-border rounded-md px-2 py-1 text-xs outline-none text-foreground disabled:opacity-40"
                        >
                          <option value="">Gauge</option>
                          {thicknessList.map((mi: any) => (
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
                          onChange={(e) => updateConvertItemRow(idx, "profile", e.target.value)}
                          className="w-full bg-secondary/40 border border-border rounded-md px-2 py-1 text-xs outline-none text-foreground disabled:opacity-40"
                        >
                          <option value="">Profile</option>
                          {profilesList.map((mi: any) => (
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
                          onChange={(e) => updateConvertItemRow(idx, "length", e.target.value)}
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
                          onChange={(e) => updateConvertItemRow(idx, "width", e.target.value)}
                          className="w-full bg-secondary/40 border border-border rounded-md px-2 py-1 text-xs outline-none text-foreground text-center disabled:opacity-30"
                        />
                      </div>

                      {/* Unit */}
                      <div className="w-16 space-y-1 font-mono">
                        <label className="text-[9px] font-mono text-muted-foreground">Unit</label>
                        <select
                          value={item.unit || "Pcs"}
                          onChange={(e) => updateConvertItemRow(idx, "unit", e.target.value)}
                          className="w-full bg-secondary/40 border border-border rounded-md px-1 py-1 text-xs outline-none text-foreground text-center"
                        >
                          <option value="Pcs" className="bg-card">Pcs</option>
                          <option value="Sft" className="bg-card">Sft</option>
                          <option value="Rft" className="bg-card">Rft</option>
                          <option value="Kg" className="bg-card">Kg</option>
                        </select>
                      </div>

                      {/* Qty */}
                      <div className="w-16 space-y-1 font-mono">
                        <label className="text-[9px] font-mono text-muted-foreground">Qty</label>
                        <input
                          type="number"
                          required
                          value={item.quantity || "1"}
                          onChange={(e) => updateConvertItemRow(idx, "quantity", e.target.value)}
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
                          onChange={(e) => updateConvertItemRow(idx, "unitPrice", e.target.value)}
                          className="w-full bg-secondary/40 border border-border rounded-md px-2 py-1 text-xs outline-none text-foreground text-right"
                        />
                      </div>

                      {/* Amount calculated */}
                      <div className="w-24 text-right font-bold text-foreground font-mono leading-none pb-2 select-none text-xs">
                        ₹{(item.lineTotal || 0).toLocaleString("en-IN")}
                      </div>

                      <button
                        type="button"
                        onClick={() => removeConvertItemRow(idx)}
                        className="text-destructive hover:bg-destructive/10 p-1.5 border border-transparent hover:border-destructive/20 rounded shrink-0 mb-0.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Taxation & Settings */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-border/40 pt-4 font-sans">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">GST Percentage</label>
                  <select
                    value={convertGstRate}
                    onChange={(e) => setConvertGstRate(e.target.value)}
                    className="w-full bg-secondary/40 border border-border rounded-md px-3 py-2 text-xs outline-none text-foreground font-mono font-semibold"
                  >
                    <option value="0" className="bg-card">0% GST</option>
                    <option value="5" className="bg-card">5% GST</option>
                    <option value="12" className="bg-card">12% GST</option>
                    <option value="18" className="bg-card font-bold">18% GST (Standard)</option>
                    <option value="28" className="bg-card">28% GST</option>
                  </select>
                </div>

                <div className="space-y-1 font-mono">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Discount Deducted</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={convertDiscount}
                    onChange={(e) => setConvertDiscount(e.target.value)}
                    className="w-full bg-secondary/40 border border-border rounded-md px-3 py-1.5 text-xs outline-none text-foreground font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Payment Due Date</label>
                  <input
                    type="date"
                    required
                    value={convertPaymentDue}
                    onChange={(e) => setConvertPaymentDue(e.target.value)}
                    className="w-full bg-secondary/40 border border-border rounded-md px-3 py-1.5 text-xs outline-none text-foreground font-mono font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1 font-sans">
                <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Invoice Terms & Conditions</label>
                <textarea
                  rows={3}
                  value={convertTerms}
                  onChange={(e) => setConvertTerms(e.target.value)}
                  className="w-full bg-secondary/40 border border-border rounded-md px-3 py-1.5 text-xs outline-none text-foreground resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-primary text-primary-foreground font-semibold py-2.5 rounded-lg text-xs hover:bg-primary/95 shadow-md shadow-primary/25 cursor-pointer font-sans"
              >
                Approve changes & Generate Tax Invoice
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
