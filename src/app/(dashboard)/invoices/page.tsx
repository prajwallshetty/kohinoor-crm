"use client";

import React, { useEffect, useState } from "react";
import { 
  Receipt, Plus, Search, FileText, Printer, ArrowLeft, RefreshCw, 
  CreditCard, Calendar, Check, DollarSign, ExternalLink, Trash2,
  CheckCircle2, Clock, AlertCircle, Sparkles, Building, ChevronRight, User,
  Landmark, Banknote, Smartphone, MessageSquare
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { PageSkeleton } from "@/components/ui/loaders";
import QRCode from "qrcode";
import { generateAndSharePDF } from "@/lib/share-pdf";

interface Customer {
  id: string;
  name: string;
  companyName?: string;
  phone: string;
  whatsapp?: string;
  email: string;
  billingAddress: string;
  shippingAddress?: string;
  gstNumber?: string;
}

interface Quotation {
  id: string;
  quoteNumber: string;
  status: string;
  totalAmount: number;
  items?: any[];
  customer?: Customer;
}

interface Payment {
  id: string;
  amount: number;
  paymentType: "ADVANCE" | "PARTIAL" | "FULL" | "REMAINING";
  paymentMethod: "UPI" | "CASH" | "BANK" | "CHEQUE";
  transactionRef: string;
  createdAt: string;
}

interface InvoiceMaterialItem {
  slNo?: number;
  description: string;
  hsnCode: string;
  quantity: number;
  unit: string;
  rate: number;
  discountPct: number;
  amount: number;
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
  materialItems?: InvoiceMaterialItem[];
}

// Convert amount number to Indian Rupees in words
function numberToWordsINR(amount: number): string {
  if (!amount || isNaN(amount) || amount === 0) return "Rupees Zero Only";
  
  const valInt = Math.floor(Math.abs(amount));
  const single = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
  const teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function convertTwoDigits(n: number): string {
    if (n < 10) return single[n];
    if (n >= 10 && n < 20) return teens[n - 10];
    const t = Math.floor(n / 10);
    const r = n % 10;
    return (tens[t] + (r > 0 ? " " + single[r] : "")).trim();
  }

  function convertThreeDigits(n: number): string {
    const h = Math.floor(n / 100);
    const r = n % 100;
    let res = "";
    if (h > 0) res += single[h] + " Hundred";
    if (r > 0) res += (res ? " " : "") + convertTwoDigits(r);
    return res;
  }

  let words = "";
  let v = valInt;

  const crore = Math.floor(v / 10000000);
  v %= 10000000;
  
  const lakh = Math.floor(v / 100000);
  v %= 100000;

  const thousand = Math.floor(v / 1000);
  v %= 1000;

  const hundred = v;

  if (crore > 0) words += convertTwoDigits(crore) + " Crore ";
  if (lakh > 0) words += convertTwoDigits(lakh) + " Lakh ";
  if (thousand > 0) words += convertTwoDigits(thousand) + " Thousand ";
  if (hundred > 0) words += convertThreeDigits(hundred);

  return "Rupees " + words.trim() + " Only";
}

// Expand shutter into individual traditional rolling shutter material items
function expandShutterToBOMMaterials(shutter: any): InvoiceMaterialItem[] {
  const width = parseFloat(shutter.width || 10);
  const height = parseFloat(shutter.height || 8);
  const qty = parseInt(shutter.quantity || 1);
  const area = width * height;
  const mat = shutter.material || "GI";
  const gauge = shutter.thickness || "21G";
  const prof = shutter.profile || "Flat";
  const opType = shutter.operationType || "Manual";
  const motor = shutter.motorType || "";

  const shutterTotal = (parseFloat(shutter.unitPrice || 18000)) * qty;

  const list: any[] = [
    {
      description: `CR/HR Strips (${mat} ${gauge} ${prof} Profile Slats)`,
      hsnCode: "73083000",
      quantity: Math.round(area * 2.85 * qty),
      unit: "FT",
      rate: Math.round((shutterTotal * 0.44) / Math.max(1, Math.round(area * 2.85 * qty))),
      discountPct: 0
    },
    {
      description: `Bottom Plate (Heavy Duty Stiffened Angle)`,
      hsnCode: "73089090",
      quantity: Math.round(width * qty),
      unit: "FT",
      rate: 180,
      discountPct: 0
    },
    {
      description: `MS Pipe ${width > 12 ? '3"' : '1¼"'} Top Shaft Octagonal Pipe`,
      hsnCode: "73063090",
      quantity: Math.round((width + 0.5) * qty),
      unit: "FT",
      rate: 320,
      discountPct: 0
    },
    {
      description: `Guide Sections (U-Channel Side Rails)`,
      hsnCode: "73089090",
      quantity: 2 * qty,
      unit: "PCS",
      rate: Math.round(height * 45),
      discountPct: 0
    }
  ];

  if (opType === "Manual") {
    list.push({
      description: `5G Spring (High-Tensile Torsion Counterbalance)`,
      hsnCode: "73202090",
      quantity: (width > 12 ? 3 : 2) * qty,
      unit: "PCS",
      rate: 450,
      discountPct: 0
    });
  }

  list.push(
    {
      description: `13/16 Bracket (Bearing Support Side Plates)`,
      hsnCode: "73089090",
      quantity: 2 * qty,
      unit: "PCS",
      rate: 650,
      discountPct: 0
    },
    {
      description: `Clamp Set (Shaft Pipe & Guide Mounting Clamps)`,
      hsnCode: "73181500",
      quantity: 1 * qty,
      unit: "SET",
      rate: 250,
      discountPct: 0
    },
    {
      description: `Wheel (Heavy Pulley Wheels Assembly)`,
      hsnCode: "84839000",
      quantity: 2 * qty,
      unit: "PCS",
      rate: 180,
      discountPct: 0
    },
    {
      description: `Kabadi (Side Guide End Lock Safety Caps)`,
      hsnCode: "83014090",
      quantity: 2 * qty,
      unit: "PCS",
      rate: 120,
      discountPct: 0
    },
    {
      description: `Top Cap (Shaft End Hood Cap)`,
      hsnCode: "73089090",
      quantity: 2 * qty,
      unit: "PCS",
      rate: 150,
      discountPct: 0
    },
    {
      description: `Handle (Steel Pull Down Handle)`,
      hsnCode: "83024110",
      quantity: 1 * qty,
      unit: "PCS",
      rate: 150,
      discountPct: 0
    },
    {
      description: `Lock Set (Center Bottom Interlock)`,
      hsnCode: "83014090",
      quantity: 1 * qty,
      unit: "SET",
      rate: 350,
      discountPct: 0
    },
    {
      description: `Fittings (High-Strength Rivets, Nuts & Bolts)`,
      hsnCode: "73181500",
      quantity: 1 * qty,
      unit: "SET",
      rate: 250,
      discountPct: 0
    }
  );

  if (opType === "Motorized" || motor) {
    list.push(
      {
        description: `Motor (${motor || "Somfy Tubular Motor 120Nm"})`,
        hsnCode: "85011019",
        quantity: 1 * qty,
        unit: "SET",
        rate: 12000,
        discountPct: 0
      },
      {
        description: `Remote (Wireless Keyfob Transmitter)`,
        hsnCode: "85269200",
        quantity: 2 * qty,
        unit: "PCS",
        rate: 1500,
        discountPct: 0
      }
    );
  }

  return list.map((item, idx) => {
    const rate = item.rate || 100;
    const qtyVal = item.quantity || 1;
    const disc = item.discountPct || 0;
    const amount = Math.round(qtyVal * rate * (1 - disc / 100));
    return {
      slNo: idx + 1,
      description: item.description,
      hsnCode: item.hsnCode,
      quantity: qtyVal,
      unit: item.unit,
      rate,
      discountPct: disc,
      amount
    };
  });
}

export default function InvoicesPage() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [unconvertedQuotes, setUnconvertedQuotes] = useState<Quotation[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PAID" | "PARTIAL" | "PENDING">("ALL");
  const [loading, setLoading] = useState(true);

  // Active Invoice for details / print view
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
  const [convertMaterialItems, setConvertMaterialItems] = useState<InvoiceMaterialItem[]>([]);
  const [convertDiscount, setConvertDiscount] = useState("0");
  const [convertGstRate, setConvertGstRate] = useState("18");
  const [convertPaymentDue, setConvertPaymentDue] = useState("");
  const [convertTerms, setConvertTerms] = useState("");

  const fetchData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const [invRes, quoteRes, brandRes] = await Promise.all([
        fetch("/api/invoices"),
        fetch("/api/quotations"),
        fetch("/api/admin/branding")
      ]);

      const [invList, quoteList, brandData] = await Promise.all([
        invRes.ok ? invRes.json() : [],
        quoteRes.ok ? quoteRes.json() : [],
        brandRes.ok ? brandRes.json() : null
      ]);

      setInvoices(invList);
      if (brandData) setBranding(brandData);

      const approvedList = quoteList.filter(
        (q: any) => (q.status || "").toString().trim().toUpperCase() === "APPROVED"
      );
      setUnconvertedQuotes(approvedList);
    } catch (e) {}
    if (showLoading) setLoading(false);
  };

  useEffect(() => {
    fetchData();

    const params = new URLSearchParams(window.location.search);
    const convertQuoteId = params.get("convert");
    if (convertQuoteId) {
      handleConvert(convertQuoteId);
    }
  }, []);

  // Generate QR Code when invoice is selected
  useEffect(() => {
    if (selectedInvoice) {
      const upiString = `upi://pay?pa=${branding?.bankAccountNo || "kohinoor"}@sbi&pn=Kohinoor%20Shutters&am=${selectedInvoice.totalAmount - selectedInvoice.amountPaid}&cu=INR&tn=Invoice%20${selectedInvoice.invoiceNumber}`;
      QRCode.toDataURL(upiString, { width: 120, margin: 1 })
        .then(url => setQrCodeUrl(url))
        .catch(() => setQrCodeUrl(""));
    } else {
      setQrCodeUrl("");
    }
  }, [selectedInvoice, branding]);

  const triggerToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(""), 3000);
  };

  const handleConvert = async (quoteId: string) => {
    setShowConvertMenu(false);
    try {
      let found: Quotation | undefined;
      const res = await fetch(`/api/quotations/${quoteId}`);
      if (res.ok) {
        found = await res.json();
      } else {
        const allRes = await fetch("/api/quotations");
        if (allRes.ok) {
          const quotes: Quotation[] = await allRes.json();
          found = quotes.find(q => q.id === quoteId);
        }
      }

      if (found) {
        setQuoteToConvert(found);
        
        // AUTOMATICALLY EXPAND EVERY SHUTTER INTO BOM MATERIAL ITEMS
        let allMaterials: InvoiceMaterialItem[] = [];
        if (found.items && found.items.length > 0) {
          found.items.forEach((shutter: any) => {
            const expanded = expandShutterToBOMMaterials(shutter);
            allMaterials = [...allMaterials, ...expanded];
          });
        } else {
          allMaterials = expandShutterToBOMMaterials({ width: 10, height: 8, quantity: 1, unitPrice: 18000 });
        }

        // Re-index Sl No
        allMaterials = allMaterials.map((item, idx) => ({ ...item, slNo: idx + 1 }));

        setConvertMaterialItems(allMaterials);
        const today = new Date();
        today.setDate(today.getDate() + 15);
        setConvertPaymentDue(today.toISOString().split("T")[0]);
        setConvertDiscount("0");
        setConvertGstRate("18");
        setConvertTerms(branding?.invoiceTerms || "1. Payment due within 15 days of invoice date.\n2. Goods once sold will not be taken back.\n3. Interest @18% p.a. will be charged if payment is delayed.");
        setShowConvertModal(true);
      }
    } catch (e) {
      alert("Failed to connect to invoice conversion endpoint.");
    }
  };

  const updateMaterialItemRow = (index: number, field: keyof InvoiceMaterialItem, value: any) => {
    setConvertMaterialItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index] };
      if (field === "description") item.description = value;
      else if (field === "hsnCode") item.hsnCode = value;
      else if (field === "quantity") item.quantity = parseFloat(value) || 0;
      else if (field === "unit") item.unit = value;
      else if (field === "rate") item.rate = parseFloat(value) || 0;
      else if (field === "discountPct") item.discountPct = parseFloat(value) || 0;

      item.amount = Math.round(item.quantity * item.rate * (1 - item.discountPct / 100));
      updated[index] = item;
      return updated;
    });
  };

  const addMaterialItemRow = () => {
    const newItem: InvoiceMaterialItem = {
      slNo: convertMaterialItems.length + 1,
      description: "Additional Shutter Material Fittings",
      hsnCode: "73089090",
      quantity: 1,
      unit: "PCS",
      rate: 500,
      discountPct: 0,
      amount: 500
    };
    setConvertMaterialItems((prev) => [...prev, newItem]);
  };

  const removeMaterialItemRow = (index: number) => {
    if (convertMaterialItems.length === 1) {
      alert("At least one material item is required for GST Invoice.");
      return;
    }
    setConvertMaterialItems((prev) => 
      prev.filter((_, idx) => idx !== index).map((it, idx) => ({ ...it, slNo: idx + 1 }))
    );
  };

  const submitConversion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quoteToConvert) return;

    const subtotal = convertMaterialItems.reduce((sum, item) => sum + item.amount, 0);
    const disc = parseFloat(convertDiscount) || 0;
    const discountedTotal = Math.max(0, subtotal - disc);
    const gstRate = parseFloat(convertGstRate) || 0.0;
    const gstAmt = discountedTotal * (gstRate / 100);
    const rawTotal = discountedTotal + gstAmt;
    const grandTotal = Math.round(rawTotal);

    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quotationId: quoteToConvert.id,
          discount: disc,
          gstRate,
          gstAmount: gstAmt,
          totalAmount: grandTotal,
          paymentDue: convertPaymentDue,
          terms: convertTerms,
          materialItems: convertMaterialItems
        })
      });

      if (res.ok) {
        const createdInvoice = await res.json();
        triggerToast("GST Tax Invoice created with expanded BOM material items!");
        setShowConvertModal(false);
        setQuoteToConvert(null);
        fetchData(false);
        setSelectedInvoice({ ...createdInvoice, materialItems: convertMaterialItems });
      } else {
        alert("Failed to generate tax invoice.");
      }
    } catch (e) {
      alert("Error generating tax invoice.");
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
        triggerToast("Payment receipt logged!");
        setPayAmount("");
        setPayRef("");
        setShowPaymentModal(false);
        
        const refreshInvRes = await fetch("/api/invoices");
        if (refreshInvRes.ok) {
          const invList = await refreshInvRes.json();
          setInvoices(invList);
          const updated = invList.find((i: Invoice) => i.id === selectedInvoice.id);
          if (updated) setSelectedInvoice(updated);
        }
        fetchData(false);
      }
    } catch (e) {}
  };

  const handleDeleteInvoice = async (id: string) => {
    if (!confirm("Are you sure you want to delete this GST Invoice?")) return;
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        triggerToast("Invoice record deleted.");
        if (selectedInvoice?.id === id) setSelectedInvoice(null);
        fetchData(false);
      }
    } catch (e) {}
  };

  const filteredInvoices = invoices.filter(i => {
    const matchesSearch = 
      i.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      (i.customer && i.customer.name.toLowerCase().includes(search.toLowerCase())) ||
      (i.customer?.companyName && i.customer.companyName.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;

    if (statusFilter === "PAID") return i.status === "PAID";
    if (statusFilter === "PARTIAL") return i.status === "PARTIAL";
    if (statusFilter === "PENDING") return i.status === "PENDING";
    return true;
  });

  const totalBilled = invoices.reduce((sum, i) => sum + i.totalAmount, 0);
  const totalCollected = invoices.reduce((sum, i) => sum + i.amountPaid, 0);
  const totalReceivable = totalBilled - totalCollected;
  const pendingCount = invoices.filter(i => i.status !== "PAID").length;

  // Selected Invoice Material Items & HSN Tax Calculations
  const activeInvoiceMaterialItems: InvoiceMaterialItem[] = (() => {
    if (!selectedInvoice) return [];
    if (selectedInvoice.materialItems && selectedInvoice.materialItems.length > 0) {
      return selectedInvoice.materialItems;
    }
    // Fallback: Expand from quotation shutters if available
    let list: InvoiceMaterialItem[] = [];
    if (selectedInvoice.quotation?.items && selectedInvoice.quotation.items.length > 0) {
      selectedInvoice.quotation.items.forEach((shutter: any) => {
        list = [...list, ...expandShutterToBOMMaterials(shutter)];
      });
    } else {
      list = expandShutterToBOMMaterials({ width: 10, height: 8, quantity: 1, unitPrice: selectedInvoice.totalAmount / 1.18 });
    }
    return list.map((it, idx) => ({ ...it, slNo: idx + 1 }));
  })();

  const subtotal = activeInvoiceMaterialItems.reduce((sum, item) => sum + item.amount, 0);
  const discount = selectedInvoice?.discount || 0;
  const gstRate = selectedInvoice?.gstRate || 18.0;
  const cgstRate = gstRate / 2;
  const sgstRate = gstRate / 2;
  const taxableValue = Math.max(0, subtotal - discount);
  const cgstAmount = gstRate > 0 ? (taxableValue * (cgstRate / 100)) : 0;
  const sgstAmount = gstRate > 0 ? (taxableValue * (sgstRate / 100)) : 0;
  const totalGstAmount = cgstAmount + sgstAmount;
  const calculatedGrandTotal = taxableValue + totalGstAmount;
  const grandTotal = selectedInvoice ? selectedInvoice.totalAmount : Math.round(calculatedGrandTotal);
  const roundOff = grandTotal - calculatedGrandTotal;
  const amountInWords = numberToWordsINR(grandTotal);

  // Group items by HSN for HSN Tax Summary Table
  const hsnSummaryMap = new Map<string, { taxableValue: number; cgstAmount: number; sgstAmount: number; totalTax: number }>();
  activeInvoiceMaterialItems.forEach((item) => {
    const code = item.hsnCode || "73089090";
    const itemTaxable = item.amount;
    const itemCgst = Math.round(itemTaxable * (cgstRate / 100));
    const itemSgst = Math.round(itemTaxable * (sgstRate / 100));
    
    if (hsnSummaryMap.has(code)) {
      const prev = hsnSummaryMap.get(code)!;
      hsnSummaryMap.set(code, {
        taxableValue: prev.taxableValue + itemTaxable,
        cgstAmount: prev.cgstAmount + itemCgst,
        sgstAmount: prev.sgstAmount + itemSgst,
        totalTax: prev.totalTax + itemCgst + itemSgst
      });
    } else {
      hsnSummaryMap.set(code, {
        taxableValue: itemTaxable,
        cgstAmount: itemCgst,
        sgstAmount: itemSgst,
        totalTax: itemCgst + itemSgst
      });
    }
  });

  const hsnSummaryList = Array.from(hsnSummaryMap.entries()).map(([hsnCode, vals]) => ({
    hsnCode,
    ...vals
  }));

  if (loading) return <PageSkeleton rows={6} />;

  return (
    <div className="flex flex-col gap-6 h-full relative font-sans">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-4 right-4 bg-primary text-primary-foreground text-xs px-4 py-3 rounded-lg shadow-xl z-50 flex items-center gap-2 border border-primary/20 animate-bounce">
          <Check className="w-4 h-4" />
          <span>{notification}</span>
        </div>
      )}

      {!selectedInvoice ? (
        <>
          {/* Top Financial KPI Tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-card/45 border border-border/80 p-5 rounded-xl flex flex-col gap-2 relative group hover:border-border transition-all">
              <div className="flex justify-between items-center text-muted-foreground">
                <span className="text-[10px] font-mono uppercase tracking-wider font-bold">Total Billed Invoices</span>
                <Receipt className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              </div>
              <span className="text-2xl font-bold font-heading font-mono text-foreground leading-none">
                ₹{totalBilled.toLocaleString("en-IN")}
              </span>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1 font-mono">
                <strong className="text-sky-600 dark:text-sky-400">{invoices.length}</strong> Total GST Invoices
              </span>
            </div>

            <div className="bg-card/45 border border-border/80 p-5 rounded-xl flex flex-col gap-2 relative group hover:border-border transition-all">
              <div className="flex justify-between items-center text-muted-foreground">
                <span className="text-[10px] font-mono uppercase tracking-wider font-bold">Collected Payments</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-2xl font-bold font-heading font-mono text-emerald-600 dark:text-emerald-400 leading-none">
                ₹{totalCollected.toLocaleString("en-IN")}
              </span>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1 font-mono">
                <strong className="text-emerald-600 dark:text-emerald-400">
                  {totalBilled > 0 ? ((totalCollected / totalBilled) * 100).toFixed(0) : 0}%
                </strong> Settlement Ratio
              </span>
            </div>

            <div className="bg-card/45 border border-border/80 p-5 rounded-xl flex flex-col gap-2 relative group hover:border-border transition-all">
              <div className="flex justify-between items-center text-muted-foreground">
                <span className="text-[10px] font-mono uppercase tracking-wider font-bold">Outstanding Receivables</span>
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              </div>
              <span className="text-2xl font-bold font-heading font-mono text-rose-600 dark:text-rose-400 leading-none">
                ₹{totalReceivable.toLocaleString("en-IN")}
              </span>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1 font-mono">
                <strong className="text-rose-600 dark:text-rose-400">{pendingCount}</strong> Invoices Pending
              </span>
            </div>

            <div className="bg-card/45 border border-border/80 p-5 rounded-xl flex flex-col gap-2 relative group hover:border-border transition-all">
              <div className="flex justify-between items-center text-muted-foreground">
                <span className="text-[10px] font-mono uppercase tracking-wider font-bold">Approved Proposals</span>
                <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-2xl font-bold font-heading font-mono text-emerald-600 dark:text-emerald-400 leading-none">
                {unconvertedQuotes.length} Quotes
              </span>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1 font-mono">
                <strong className="text-emerald-600 dark:text-emerald-400">Ready</strong> for Automatic BOM Expansion
              </span>
            </div>
          </div>

          {/* Header Controls & Filter Tabs */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card/45 border border-border/80 p-4 rounded-xl relative">
            <div className="flex items-center gap-4 flex-1 w-full md:w-auto">
              <div className="relative flex-grow max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search invoices by number or client..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-secondary/40 border border-border/80 rounded-lg py-2 pl-10 pr-4 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/60 transition-all duration-150"
                />
              </div>

              {/* Status Filter Tabs */}
              <div className="flex bg-secondary/30 p-1 border border-border/80 rounded-lg overflow-x-auto text-[11px] font-semibold">
                {(["ALL", "PENDING", "PARTIAL", "PAID"] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1 rounded-md transition-all uppercase font-mono ${
                      statusFilter === st
                        ? "bg-emerald-600 text-white dark:bg-emerald-500 dark:text-slate-950 shadow-sm font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {st === "ALL" ? `All (${invoices.length})` : st}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
              <button
                onClick={() => fetchData()}
                className="p-2 bg-secondary/60 hover:bg-secondary border border-border/80 text-muted-foreground hover:text-foreground rounded-lg transition-all"
                title="Refresh Ledger"
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              <button
                onClick={() => setShowConvertMenu(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-4 rounded-lg flex items-center gap-2 shadow-lg shadow-emerald-600/25 cursor-pointer transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Convert Quote to Invoice</span>
              </button>
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
                    <th className="p-4 w-44">Payment Progress</th>
                    <th className="p-4 text-right">Due Balance</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right pr-6">Actions</th>
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
                        No invoice matches found matching your filters.
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((inv) => {
                      const balance = inv.totalAmount - inv.amountPaid;
                      const paidPct = inv.totalAmount > 0 ? Math.min(100, Math.round((inv.amountPaid / inv.totalAmount) * 100)) : 0;

                      return (
                        <tr key={inv.id} className="hover:bg-secondary/25 transition-colors">
                          <td className="p-4 font-bold text-foreground font-mono">{inv.invoiceNumber}</td>
                          <td className="p-4 font-mono text-muted-foreground/80">
                            {inv.quotation?.quoteNumber || "Direct Invoice"}
                          </td>
                          <td className="p-4">
                            <div className="flex flex-col">
                              <span className="font-semibold text-foreground">{inv.customer?.name}</span>
                              {inv.customer?.companyName && (
                                <span className="text-[10px] text-muted-foreground">{inv.customer.companyName}</span>
                              )}
                            </div>
                          </td>
                          <td className="p-4 text-right font-bold text-foreground font-mono">
                            ₹{inv.totalAmount.toLocaleString("en-IN")}
                          </td>
                          <td className="p-4">
                            <div className="flex flex-col gap-1 w-full">
                              <div className="flex justify-between text-[10px] font-mono">
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold">₹{inv.amountPaid.toLocaleString("en-IN")}</span>
                                <span className="text-muted-foreground font-bold">{paidPct}%</span>
                              </div>
                              <div className="w-full h-2 bg-secondary rounded-full overflow-hidden border border-border/40">
                                <div
                                  className={`h-full transition-all duration-300 ${
                                    paidPct === 100 ? "bg-emerald-500" : paidPct > 0 ? "bg-amber-500" : "bg-rose-500"
                                  }`}
                                  style={{ width: `${paidPct}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                            ₹{balance.toLocaleString("en-IN")}
                          </td>
                          <td className="p-4">
                            <span
                              className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-md border ${
                                inv.status === "PAID"
                                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                                  : inv.status === "PARTIAL"
                                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"
                                  : "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30"
                              }`}
                            >
                              {inv.status}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center justify-end gap-2 pr-2">
                              {inv.status !== "PAID" && (
                                <button
                                  onClick={() => { setSelectedInvoice(inv); setShowPaymentModal(true); }}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1 rounded-md text-xs flex items-center gap-1 shadow-sm transition-all shrink-0 cursor-pointer"
                                  title="Log Payment"
                                >
                                  <DollarSign className="w-3.5 h-3.5" />
                                  <span>Pay</span>
                                </button>
                              )}

                              <button
                                onClick={() => setSelectedInvoice(inv)}
                                className="bg-secondary hover:bg-secondary/80 border border-border/80 text-foreground font-semibold px-2.5 py-1 rounded-md text-xs flex items-center gap-1.5 transition-all shrink-0 cursor-pointer"
                              >
                                <Receipt className="w-3.5 h-3.5 text-muted-foreground" />
                                <span>Preview GST Tax Invoice</span>
                              </button>

                              <button
                                onClick={() => handleDeleteInvoice(inv.id)}
                                className="p-1.5 hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 rounded-md transition-all shrink-0 cursor-pointer"
                                title="Delete Invoice"
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
        /* TRADITIONAL ROLLING SHUTTER GST INVOICE - PRINTABLE A4 PREVIEW */
        <div className="flex flex-col gap-6">
          <div className="flex justify-between items-center bg-card/45 border p-4 rounded-xl print-hidden print:!hidden">
            <button
              onClick={() => setSelectedInvoice(null)}
              className="flex items-center gap-2 text-xs font-semibold hover:text-primary transition-colors text-muted-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Invoice Ledger</span>
            </button>

            <div className="flex items-center gap-3">
              {selectedInvoice.status !== "PAID" && (
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold py-1.5 px-3.5 rounded-lg flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
                >
                  <DollarSign className="w-4 h-4" />
                  <span>Log Payment Receipt</span>
                </button>
              )}

              <button
                onClick={async () => {
                  const btn = document.activeElement as HTMLButtonElement;
                  if (btn) btn.disabled = true;
                  try {
                    await generateAndSharePDF({
                      fileName: `Invoice_${selectedInvoice.invoiceNumber}`,
                      phone: selectedInvoice.customer?.phone || "",
                      message:
                        `Hello ${selectedInvoice.customer?.name || ""},\n\n` +
                        `Please find your Tax Invoice from ${branding?.companyName || "Kohinoor Rolling Shutters"}\n\n` +
                        `📄 Invoice No: ${selectedInvoice.invoiceNumber}\n` +
                        `📅 Date: ${new Date(selectedInvoice.createdAt).toLocaleDateString("en-IN")}\n` +
                        `💰 Total Amount: ₹${Number(selectedInvoice.totalAmount).toLocaleString("en-IN")}\n` +
                        `📊 Status: ${selectedInvoice.status}\n\n` +
                        `Thank you for your business!\nRegards,\n${branding?.companyName || "Kohinoor Rolling Shutters"}`,
                    });
                  } finally {
                    if (btn) btn.disabled = false;
                  }
                }}
                className="border border-emerald-500/25 bg-emerald-500/5 hover:bg-emerald-500/15 text-emerald-500 text-xs font-semibold py-1.5 px-3.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Share PDF via WhatsApp"
              >
                <MessageSquare className="w-4 h-4" />
                <span>WhatsApp PDF</span>
              </button>

              <button
                onClick={() => window.print()}
                className="bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-semibold py-1.5 px-3.5 rounded-lg flex items-center gap-1.5 shadow-md shadow-primary/20"
              >
                <Printer className="w-4 h-4" />
                <span>Print A4 GST Tax Invoice</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start print:block print:w-full print:m-0 print:p-0">
            {/* TRADITIONAL GST TAX INVOICE PRINT CARD */}
            <div className="lg:col-span-2 bg-white text-slate-900 p-6 sm:p-8 rounded-xl shadow-xl border border-slate-300 font-sans max-w-4xl mx-auto w-full printable-card">
              
              {/* TOP HEADER: COMPANY DETAILS (Left) & INVOICE DETAILS (Right) */}
              <div className="grid grid-cols-2 border-b-2 border-slate-900 pb-3 mb-3 gap-3">
                {/* Top Left: Company Details */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-3 mb-1">
                    <img src="/logo.png" alt="Logo" className="w-12 h-12 object-contain shrink-0" />
                    <div className="flex flex-col">
                      <span className="text-base font-black tracking-tight text-slate-950 uppercase">{branding?.companyName || "KOHINOOR ROLLING SHUTTERS"}</span>
                      <span className="text-[9px] text-slate-600 font-mono tracking-widest uppercase font-bold">Rolling Shutter Manufacturers & Contractors</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-700 leading-tight">Plot 42, GIDC Industrial Estate, Thane West, Maharashtra - 400601</p>
                  <p className="text-[10px] text-slate-700 leading-tight font-mono"><strong>GSTIN:</strong> {branding?.gstNumber || "27AAACK5912K1Z9"} | <strong>State:</strong> 27 - Maharashtra</p>
                  <p className="text-[10px] text-slate-700 leading-tight font-mono"><strong>Email:</strong> billing@kohinoor.com | <strong>Phone:</strong> +91 98765 43210</p>
                </div>

                {/* Top Right: Invoice Details */}
                <div className="flex flex-col justify-between items-end text-right border-l border-slate-200 pl-4">
                  <div>
                    <span className="text-2xl font-black tracking-wider text-slate-900 block uppercase">TAX INVOICE</span>
                    <span className="text-xs font-mono font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-300">
                      No: {selectedInvoice.invoiceNumber}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[9px] text-slate-700 text-left font-mono mt-2 bg-slate-50 p-2 border rounded border-slate-200 w-full">
                    <div><strong>Invoice Date:</strong> {new Date(selectedInvoice.createdAt).toLocaleDateString("en-IN")}</div>
                    <div><strong>Delivery Note:</strong> DN-2026-091</div>
                    <div><strong>Ref. Quote:</strong> {selectedInvoice.quotation?.quoteNumber || "Direct"}</div>
                    <div><strong>Buyer Order No:</strong> PO-9821-2026</div>
                    <div><strong>Dispatch Details:</strong> Local Transport (MH-04-AZ-9912)</div>
                    <div><strong>Terms of Delivery:</strong> Ex-Factory / Site</div>
                  </div>
                </div>
              </div>

              {/* CUSTOMER DETAILS: BUYER & CONSIGNEE */}
              <div className="grid grid-cols-2 gap-3 border border-slate-300 rounded p-2 mb-3 text-[9px] leading-snug bg-slate-50/50">
                <div className="border-r border-slate-200 pr-3">
                  <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wider font-bold block mb-1">BUYER (BILL TO)</span>
                  <p className="font-bold text-slate-900 text-xs">{selectedInvoice.customer?.name}</p>
                  {selectedInvoice.customer?.companyName && (
                    <p className="font-semibold text-slate-800">M/s {selectedInvoice.customer.companyName}</p>
                  )}
                  <p className="text-slate-600">{selectedInvoice.customer?.billingAddress}</p>
                  <p className="text-slate-700 font-mono mt-1"><strong>GSTIN:</strong> {selectedInvoice.customer?.gstNumber || "Unregistered / B2C"}</p>
                  <p className="text-slate-700 font-mono"><strong>State Code:</strong> 27 - Maharashtra</p>
                </div>

                <div>
                  <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wider font-bold block mb-1">CONSIGNEE (SHIP TO)</span>
                  <p className="font-bold text-slate-900 text-xs">{selectedInvoice.customer?.name}</p>
                  <p className="text-slate-600">{selectedInvoice.customer?.shippingAddress || selectedInvoice.customer?.billingAddress}</p>
                  <p className="text-slate-700 font-mono mt-1"><strong>Contact Phone:</strong> {selectedInvoice.customer?.phone}</p>
                  <p className="text-slate-700 font-mono"><strong>State Code:</strong> 27 - Maharashtra</p>
                </div>
              </div>

              {/* EXPANDED INVOICE MATERIAL TABLE (AUTOMATIC BOM EXPANSION) */}
              <div className="border border-slate-300 rounded overflow-hidden mb-3">
                <table className="w-full text-left text-[9px] text-slate-800 border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-300 text-[8px] font-mono uppercase">
                      <th className="p-1.5 text-center w-8 border-r border-slate-300">Sl</th>
                      <th className="p-1.5 border-r border-slate-300">Description of Goods</th>
                      <th className="p-1.5 text-center w-16 border-r border-slate-300">HSN</th>
                      <th className="p-1.5 text-right w-12 border-r border-slate-300">Qty</th>
                      <th className="p-1.5 text-center w-10 border-r border-slate-300">Unit</th>
                      <th className="p-1.5 text-right w-16 border-r border-slate-300">Rate</th>
                      <th className="p-1.5 text-right w-12 border-r border-slate-300">Disc%</th>
                      <th className="p-1.5 text-right w-20 font-black">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {activeInvoiceMaterialItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 font-sans">
                        <td className="p-1.5 text-center font-mono font-bold border-r border-slate-200">{idx + 1}</td>
                        <td className="p-1.5 border-r border-slate-200 font-semibold text-slate-900">{item.description}</td>
                        <td className="p-1.5 text-center font-mono border-r border-slate-200">{item.hsnCode}</td>
                        <td className="p-1.5 text-right font-mono border-r border-slate-200">{item.quantity}</td>
                        <td className="p-1.5 text-center font-mono border-r border-slate-200">{item.unit}</td>
                        <td className="p-1.5 text-right font-mono border-r border-slate-200">₹{item.rate.toLocaleString("en-IN")}</td>
                        <td className="p-1.5 text-right font-mono border-r border-slate-200">{item.discountPct || 0}%</td>
                        <td className="p-1.5 text-right font-mono font-bold text-slate-950">₹{item.amount.toLocaleString("en-IN")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* FINANCIAL CALCULATIONS & AUTO CALCULATED TOTALS */}
              <div className="flex justify-between items-start border border-slate-300 rounded p-2 mb-3 text-[9px]">
                <div className="flex flex-col gap-2 max-w-md">
                  <div>
                    <span className="font-bold text-slate-600 font-mono uppercase text-[9px] block">Amount Chargeable (in words)</span>
                    <span className="font-bold text-slate-950 text-xs italic">{amountInWords}</span>
                  </div>
                </div>

                <div className="w-64 flex flex-col gap-1 text-right font-mono">
                  <div className="flex justify-between text-slate-700">
                    <span>Subtotal:</span>
                    <span className="font-bold text-slate-900">₹{subtotal.toLocaleString("en-IN")}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-rose-600">
                      <span>Less: Discount:</span>
                      <span>-₹{discount.toLocaleString("en-IN")}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-700">
                    <span>CGST ({gstRate / 2}%):</span>
                    <span>₹{cgstAmount.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span>SGST ({gstRate / 2}%):</span>
                    <span>₹{sgstAmount.toLocaleString("en-IN")}</span>
                  </div>
                  {Math.abs(roundOff) > 0.001 && (
                    <div className="flex justify-between text-slate-600 text-[9px]">
                      <span>Round Off:</span>
                      <span>{roundOff >= 0 ? `+₹${roundOff.toFixed(2)}` : `-₹${Math.abs(roundOff).toFixed(2)}`}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-950 font-black border-t-2 border-slate-900 pt-1 text-sm mt-1">
                    <span>Grand Total:</span>
                    <span>₹{grandTotal.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>

              {/* HSN / SAC TAX BREAKDOWN SUMMARY TABLE */}
              <div className="border border-slate-300 rounded overflow-hidden mb-3">
                <div className="bg-slate-100 p-1.5 border-b border-slate-300 font-mono text-[9px] font-bold uppercase text-slate-800">
                  HSN / SAC Tax Breakdown Summary
                </div>
                <table className="w-full text-left text-[9px] text-slate-800 font-mono border-collapse">
                  <thead>
                    <tr className="bg-slate-50 font-bold border-b border-slate-300 uppercase">
                      <th className="p-1.5 border-r border-slate-300">HSN / SAC</th>
                      <th className="p-1.5 text-right border-r border-slate-300">Taxable Value (₹)</th>
                      <th className="p-1.5 text-right border-r border-slate-300">CGST Rate</th>
                      <th className="p-1.5 text-right border-r border-slate-300">CGST Amt (₹)</th>
                      <th className="p-1.5 text-right border-r border-slate-300">SGST Rate</th>
                      <th className="p-1.5 text-right border-r border-slate-300">SGST Amt (₹)</th>
                      <th className="p-1.5 text-right font-bold">Total Tax (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {hsnSummaryList.map((hsn, idx) => (
                      <tr key={idx}>
                        <td className="p-1.5 font-bold border-r border-slate-200">{hsn.hsnCode}</td>
                        <td className="p-1.5 text-right border-r border-slate-200">₹{hsn.taxableValue.toLocaleString("en-IN")}</td>
                        <td className="p-1.5 text-right border-r border-slate-200">{gstRate / 2}%</td>
                        <td className="p-1.5 text-right border-r border-slate-200">₹{hsn.cgstAmount.toLocaleString("en-IN")}</td>
                        <td className="p-1.5 text-right border-r border-slate-200">{gstRate / 2}%</td>
                        <td className="p-1.5 text-right border-r border-slate-200">₹{hsn.sgstAmount.toLocaleString("en-IN")}</td>
                        <td className="p-1.5 text-right font-bold text-slate-900">₹{hsn.totalTax.toLocaleString("en-IN")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* DECLARATION, BANK DETAILS, SIGNATURE & SEAL */}
              <div className="grid grid-cols-2 gap-3 border border-slate-300 rounded p-2 text-[8px] leading-snug mb-2">
                <div>
                  <span className="font-bold text-slate-700 uppercase font-mono tracking-wider block mb-1">Company Bank Details</span>
                  <p className="text-slate-800 font-mono"><strong>Bank:</strong> {branding?.bankName || "State Bank of India"}</p>
                  <p className="text-slate-800 font-mono"><strong>A/C No:</strong> {branding?.bankAccountNo || "39810293812"}</p>
                  <p className="text-slate-800 font-mono"><strong>IFSC:</strong> {branding?.bankIfsc || "SBIN0001824"}</p>
                  <p className="text-slate-800 font-mono"><strong>Branch:</strong> Thane Commercial Branch</p>

                  <span className="font-bold text-slate-700 uppercase font-mono tracking-wider block mt-3 mb-1">Declaration</span>
                  <p className="text-slate-600 italic">We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</p>
                </div>

                <div className="flex flex-col justify-between items-end text-right">
                  <div className="flex flex-col items-end">
                    <span className="font-bold text-slate-900 text-[10px] uppercase">For {branding?.companyName || "KOHINOOR ROLLING SHUTTERS"}</span>
                  </div>

                  <div className="flex gap-3 items-end mt-6">
                    <div className="w-32 border-b border-slate-400 pb-1 text-center text-[9px] text-slate-600 font-mono">
                      Authorized Signatory
                    </div>
                  </div>
                </div>
              </div>

              {/* FOOTER NOTE */}
              <div className="text-center text-[8px] text-slate-400 font-mono uppercase tracking-widest border-t border-slate-200 pt-2">
                This is a Computer Generated Invoice
              </div>
            </div>

            {/* Right Audit/Payments Log */}
            <div className="lg:col-span-1 border border-border/80 bg-card/45 backdrop-blur-md rounded-xl p-5 flex flex-col gap-4 print-hidden print:!hidden font-sans">
              <div className="flex justify-between items-center border-b border-border pb-3">
                <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-2 font-bold">
                  <CreditCard className="w-4 h-4 text-emerald-400" />
                  <span>Transaction Receipts Log</span>
                </h3>
                <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-bold">
                  {(selectedInvoice.payments || []).length} Receipt{(selectedInvoice.payments || []).length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Summary Progress Box */}
              <div className="bg-secondary/20 border border-border/80 rounded-xl p-3.5 flex flex-col gap-2 font-mono">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground font-sans">Total Billed:</span>
                  <span className="font-bold text-foreground">₹{selectedInvoice.totalAmount.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground font-sans">Collected:</span>
                  <span className="font-bold text-emerald-400">₹{selectedInvoice.amountPaid.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground font-sans">Outstanding:</span>
                  <span className="font-bold text-rose-400">
                    ₹{Math.max(0, selectedInvoice.totalAmount - selectedInvoice.amountPaid).toLocaleString("en-IN")}
                  </span>
                </div>

                <div className="w-full h-2 bg-secondary rounded-full overflow-hidden mt-1">
                  <div
                    className={`h-full transition-all duration-300 ${
                      selectedInvoice.status === "PAID" ? "bg-emerald-500" : "bg-amber-500"
                    }`}
                    style={{
                      width: `${selectedInvoice.totalAmount > 0 ? Math.min(100, Math.round((selectedInvoice.amountPaid / selectedInvoice.totalAmount) * 100)) : 0}%`
                    }}
                  />
                </div>
              </div>

              {/* Individual Receipt Cards */}
              <div className="flex flex-col gap-3 max-h-[450px] overflow-y-auto pr-1">
                {(!selectedInvoice.payments || selectedInvoice.payments.length === 0) ? (
                  <div className="text-center py-10 flex flex-col items-center gap-2 bg-secondary/15 rounded-xl border border-dashed border-border/60">
                    <Clock className="w-6 h-6 text-muted-foreground/60" />
                    <span className="text-xs text-muted-foreground font-semibold">No transactions recorded yet</span>
                    <span className="text-[10px] text-muted-foreground/70">
                      Log a payment receipt using the button above to track instalments.
                    </span>
                  </div>
                ) : (
                  selectedInvoice.payments.map((pay) => {
                    const amt = Number(pay.amount || 0);
                    const method = pay.paymentMethod || "UPI";
                    
                    let MethodIcon = Smartphone;
                    let badgeStyle = "bg-sky-500/10 text-sky-400 border-sky-500/20";
                    
                    if (method === "CASH") {
                      MethodIcon = Banknote;
                      badgeStyle = "bg-amber-500/10 text-amber-400 border-amber-500/20";
                    } else if (method === "BANK") {
                      MethodIcon = Landmark;
                      badgeStyle = "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
                    } else if (method === "CHEQUE") {
                      MethodIcon = CreditCard;
                      badgeStyle = "bg-purple-500/10 text-purple-400 border-purple-500/20";
                    }

                    return (
                      <div key={pay.id} className="bg-secondary/25 border border-border/80 hover:border-border p-3.5 rounded-xl flex flex-col gap-2 transition-all">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className={`font-mono px-2 py-0.5 rounded border ${badgeStyle} font-bold flex items-center gap-1`}>
                            <MethodIcon className="w-3 h-3" />
                            <span>{method}</span>
                          </span>
                          <span className="text-muted-foreground font-mono text-[10px]">
                            {pay.createdAt ? new Date(pay.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Recent"}
                          </span>
                        </div>

                        <div className="flex justify-between items-baseline font-sans">
                          <span className="text-[11px] text-muted-foreground font-medium">
                            Allocation: <strong className="text-foreground">{pay.paymentType || "Instalment"}</strong>
                          </span>
                          <span className="font-mono font-bold text-sm text-emerald-400">
                            +₹{amt.toLocaleString("en-IN")}
                          </span>
                        </div>

                        {pay.transactionRef && (
                          <div className="text-[10px] font-mono text-muted-foreground bg-card/60 border border-border/40 p-1.5 rounded flex justify-between items-center">
                            <span>Ref: <strong className="text-foreground">{pay.transactionRef}</strong></span>
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showPaymentModal && selectedInvoice && (() => {
        const currentDue = selectedInvoice.totalAmount - selectedInvoice.amountPaid;
        const numericPay = parseFloat(payAmount) || 0;
        const newDue = Math.max(0, currentDue - numericPay);
        const isOverpaying = numericPay > currentDue;

        return (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl overflow-hidden font-sans">
              {/* Header */}
              <div className="p-5 border-b border-border flex justify-between items-center bg-secondary/15">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                    <h3 className="font-heading font-bold text-sm">Log Payment Receipt</h3>
                    <span className="text-[10px] font-mono text-muted-foreground uppercase">
                      Invoice {selectedInvoice.invoiceNumber} • {selectedInvoice.customer?.name || "Client"}
                    </span>
                  </div>
                </div>
                <button onClick={() => setShowPaymentModal(false)} className="text-muted-foreground hover:text-foreground text-xs font-semibold px-2 py-1 bg-secondary rounded">
                  Cancel
                </button>
              </div>

              <form onSubmit={handleRecordPayment} className="p-6 space-y-5">
                {/* FINANCIAL DUE BREAKDOWN CARD */}
                <div className="bg-secondary/20 border border-border/80 rounded-xl p-4 flex flex-col gap-3 font-mono">
                  <div className="grid grid-cols-3 gap-2 text-center border-b border-border/60 pb-3">
                    <div className="flex flex-col">
                      <span className="text-[9px] text-muted-foreground uppercase font-sans font-bold">Total Billed</span>
                      <span className="text-xs font-bold text-foreground">₹{selectedInvoice.totalAmount.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex flex-col border-x border-border/60 px-1">
                      <span className="text-[9px] text-muted-foreground uppercase font-sans font-bold">Already Paid</span>
                      <span className="text-xs font-bold text-emerald-400">₹{selectedInvoice.amountPaid.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] text-rose-400 uppercase font-sans font-bold">Current Due</span>
                      <span className="text-sm font-black text-rose-400">₹{currentDue.toLocaleString("en-IN")}</span>
                    </div>
                  </div>

                  {/* Live New Balance Indicator */}
                  <div className="flex justify-between items-center text-xs font-sans">
                    <span className="text-muted-foreground">New Remaining Balance:</span>
                    <span className={`font-mono font-bold ${newDue === 0 ? "text-emerald-400" : "text-amber-400"}`}>
                      {newDue === 0 ? "₹0 (Fully Paid 🎉)" : `₹${newDue.toLocaleString("en-IN")}`}
                    </span>
                  </div>
                </div>

                {/* Quick Pay Buttons */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase font-bold">Quick Fill:</span>
                  <button
                    type="button"
                    onClick={() => setPayAmount(currentDue.toString())}
                    className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold px-2.5 py-1 rounded-md transition-all"
                  >
                    Pay Full Due (₹{currentDue.toLocaleString("en-IN")})
                  </button>
                  {currentDue > 1000 && (
                    <button
                      type="button"
                      onClick={() => setPayAmount(Math.round(currentDue / 2).toString())}
                      className="bg-secondary hover:bg-secondary/80 border border-border text-foreground text-[10px] font-mono font-bold px-2.5 py-1 rounded-md transition-all"
                    >
                      50% (₹{Math.round(currentDue / 2).toLocaleString("en-IN")})
                    </button>
                  )}
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-2 gap-4 font-sans">
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-bold">Payment Method</label>
                    <select
                      value={payMethod}
                      onChange={(e) => setPayMethod(e.target.value as any)}
                      className="w-full bg-secondary/40 border border-border rounded-xl px-3 py-2 text-xs outline-none text-foreground font-semibold"
                    >
                      <option value="UPI" className="bg-card">UPI Transfer</option>
                      <option value="CASH" className="bg-card">Cash</option>
                      <option value="BANK" className="bg-card">Bank Deposit / NEFT</option>
                      <option value="CHEQUE" className="bg-card">Cheque Transfer</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-bold">Allocation Type</label>
                    <select
                      value={payType}
                      onChange={(e) => setPayType(e.target.value as any)}
                      className="w-full bg-secondary/40 border border-border rounded-xl px-3 py-2 text-xs outline-none text-foreground font-semibold"
                    >
                      <option value="REMAINING" className="bg-card">Remaining Due Settlement</option>
                      <option value="PARTIAL" className="bg-card">Partial Instalment</option>
                      <option value="ADVANCE" className="bg-card">Advance Token</option>
                      <option value="FULL" className="bg-card">Full Settlement</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1 font-mono">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-sans font-bold uppercase tracking-wider text-muted-foreground">Amount Received (₹) *</label>
                    {isOverpaying && (
                      <span className="text-[10px] text-amber-400 font-sans font-semibold">Exceeds current due balance</span>
                    )}
                  </div>
                  <input
                    type="number"
                    required
                    placeholder={`e.g. ${currentDue}`}
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="w-full bg-secondary/40 border border-border rounded-xl px-3 py-2.5 text-sm outline-none text-foreground font-bold text-emerald-400 focus:border-emerald-500 transition-all"
                  />
                </div>

                <div className="space-y-1 font-mono">
                  <label className="text-[10px] font-sans font-bold uppercase tracking-wider text-muted-foreground">Transaction Reference (UTR / UPI Ref / Cheque No.)</label>
                  <input
                    type="text"
                    placeholder="e.g. UPI8927104821 or Bank UTR #98210"
                    value={payRef}
                    onChange={(e) => setPayRef(e.target.value)}
                    className="w-full bg-secondary/40 border border-border rounded-xl px-3 py-2 text-xs outline-none text-foreground font-semibold"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl text-xs hover:bg-primary/95 shadow-md shadow-primary/25 cursor-pointer transition-all"
                >
                  Confirm & Log Payment Receipt
                </button>
              </form>
            </div>
          </div>
        );
      })()}

      {/* APPROVED PROPOSALS SELECTOR MODAL DIALOG */}
      {showConvertMenu && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden font-sans flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-border flex justify-between items-center bg-secondary/15">
              <div className="flex flex-col gap-0.5">
                <h3 className="font-heading font-semibold text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>Select Approved Proposal to Convert</span>
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Choose an approved quotation below to automatically expand its shutter items into a GST Tax Invoice.
                </p>
              </div>
              <button
                onClick={() => setShowConvertMenu(false)}
                className="text-muted-foreground hover:text-foreground text-xs font-semibold px-2 py-1 bg-secondary rounded"
              >
                Close
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-3 flex-1">
              {unconvertedQuotes.length === 0 ? (
                <div className="text-center py-12 flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-muted-foreground">
                    <FileText className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">No Unconverted Approved Proposals</p>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    All approved proposals have already been converted into invoices, or you need to approve a draft quote first.
                  </p>
                </div>
              ) : (
                unconvertedQuotes.map((q) => {
                  const isAlreadyConverted = invoices.some((inv: any) => inv.quotationId === q.id);

                  return (
                    <div
                      key={q.id}
                      className="border border-border/80 hover:border-emerald-500/50 bg-secondary/20 hover:bg-secondary/40 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all group shadow-sm"
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-foreground font-mono text-sm">{q.quoteNumber}</span>
                          <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                            APPROVED
                          </span>
                          {isAlreadyConverted && (
                            <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-sky-500/15 text-sky-700 dark:text-sky-400 border border-sky-500/30">
                              INVOICE CREATED
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-semibold text-foreground">{q.customer?.name || "Client"}</span>
                        {q.customer?.companyName && (
                          <span className="text-[10px] text-muted-foreground">Company: {q.customer.companyName}</span>
                        )}
                        <span className="text-[10px] text-muted-foreground font-mono">
                          Site: {q.customer?.billingAddress || "N/A"}
                        </span>
                      </div>

                      <div className="flex sm:flex-col items-end justify-between w-full sm:w-auto border-t sm:border-t-0 pt-2 sm:pt-0 border-border/60 gap-2">
                        <span className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
                          ₹{q.totalAmount.toLocaleString("en-IN")}
                        </span>
                        <button
                          onClick={() => handleConvert(q.id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer transition-all shrink-0"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          <span>{isAlreadyConverted ? "Re-Expand BOM Invoice →" : "Convert & Expand BOM →"}</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* EDIT & CONVERT QUOTATION TO EXPANDED BOM GST INVOICE MODAL */}
      {showConvertModal && quoteToConvert && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-5xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col my-8 font-sans">
            <div className="p-6 border-b border-border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-secondary/15">
              <div className="flex flex-col gap-0.5">
                <h3 className="font-heading font-semibold text-sm flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-emerald-400" />
                  <span>Convert Proposal to Traditional GST Invoice</span>
                </h3>
                <span className="text-[10px] font-mono text-muted-foreground uppercase">
                  Source Proposal: <strong className="text-foreground">{quoteToConvert.quoteNumber}</strong> (v{quoteToConvert.version})
                </span>
              </div>

              {/* Conversion Step Pills */}
              <div className="flex items-center gap-2 text-[10px] font-mono">
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  <span>1. Client Info</span>
                </span>
                <span className="text-muted-foreground">→</span>
                <span className="bg-primary/20 text-primary border border-primary/30 px-2.5 py-1 rounded-full font-bold">
                  2. Auto BOM Expansion
                </span>
                <span className="text-muted-foreground">→</span>
                <span className="bg-secondary text-muted-foreground px-2.5 py-1 rounded-full border border-border/80">
                  3. Tax Review
                </span>
              </div>

              <button 
                onClick={() => { setShowConvertModal(false); setQuoteToConvert(null); }} 
                className="text-muted-foreground hover:text-foreground text-xs font-semibold px-2 py-1 bg-secondary rounded"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={submitConversion} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* Customer summary */}
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

              {/* AUTOMATIC EXPANDED MATERIAL ITEMS TABLE */}
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-border/40 pb-2">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-bold">
                      Expanded Bill of Materials (BOM) Invoice Line Items ({convertMaterialItems.length})
                    </span>
                    <p className="text-[10px] text-muted-foreground">Every rolling shutter from proposal is automatically expanded into individual material lines.</p>
                  </div>
                  <button
                    type="button"
                    onClick={addMaterialItemRow}
                    className="text-[10px] bg-secondary hover:bg-secondary/80 border border-border text-foreground font-bold px-2 py-1 rounded transition-all flex items-center gap-1 shrink-0"
                  >
                    <Plus className="w-3 h-3 text-primary" />
                    <span>Add Material Item</span>
                  </button>
                </div>

                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-secondary/30 border-b border-border font-mono text-[10px] uppercase text-muted-foreground">
                        <th className="p-2 text-center w-10">Sl No</th>
                        <th className="p-2">Description of Goods</th>
                        <th className="p-2 text-center w-24">HSN Code</th>
                        <th className="p-2 text-right w-20">Quantity</th>
                        <th className="p-2 text-center w-16">Unit</th>
                        <th className="p-2 text-right w-24">Rate (₹)</th>
                        <th className="p-2 text-right w-24">Amount (₹)</th>
                        <th className="p-2 text-center w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60 font-sans">
                      {convertMaterialItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-secondary/10">
                          <td className="p-2 text-center font-mono font-bold">{idx + 1}</td>
                          <td className="p-2">
                            <input
                              type="text"
                              required
                              value={item.description}
                              onChange={(e) => updateMaterialItemRow(idx, "description", e.target.value)}
                              className="w-full bg-secondary/30 border border-border rounded px-2 py-1 text-xs outline-none text-foreground font-semibold"
                            />
                          </td>
                          <td className="p-2 font-mono">
                            <input
                              type="text"
                              required
                              value={item.hsnCode}
                              onChange={(e) => updateMaterialItemRow(idx, "hsnCode", e.target.value)}
                              className="w-full bg-secondary/30 border border-border rounded px-1.5 py-1 text-xs text-center outline-none text-foreground font-mono"
                            />
                          </td>
                          <td className="p-2 text-right font-mono">
                            <input
                              type="number"
                              step="any"
                              required
                              value={item.quantity}
                              onChange={(e) => updateMaterialItemRow(idx, "quantity", e.target.value)}
                              className="w-full bg-secondary/30 border border-border rounded px-1.5 py-1 text-xs text-right outline-none text-foreground font-bold"
                            />
                          </td>
                          <td className="p-2 text-center font-mono">
                            <input
                              type="text"
                              required
                              value={item.unit}
                              onChange={(e) => updateMaterialItemRow(idx, "unit", e.target.value)}
                              className="w-full bg-secondary/30 border border-border rounded px-1 py-1 text-xs text-center outline-none text-foreground font-bold"
                            />
                          </td>
                          <td className="p-2 text-right font-mono">
                            <input
                              type="number"
                              required
                              value={item.rate}
                              onChange={(e) => updateMaterialItemRow(idx, "rate", e.target.value)}
                              className="w-full bg-secondary/30 border border-border rounded px-1.5 py-1 text-xs text-right outline-none text-foreground font-bold text-emerald-400"
                            />
                          </td>
                          <td className="p-2 text-right font-mono font-bold text-foreground">
                            ₹{item.amount.toLocaleString("en-IN")}
                          </td>
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => removeMaterialItemRow(idx)}
                              className="text-destructive hover:bg-destructive/10 p-1 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Taxation & Settings */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-border/40 pt-4 font-sans">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">GST Percentage</label>
                  <select
                    value={convertGstRate}
                    onChange={(e) => setConvertGstRate(e.target.value)}
                    className="w-full bg-secondary/40 border border-border rounded-xl px-3 py-2 text-xs outline-none text-foreground font-mono font-semibold"
                  >
                    <option value="0" className="bg-card">0% GST</option>
                    <option value="5" className="bg-card">5% GST</option>
                    <option value="12" className="bg-card">12% GST</option>
                    <option value="18" className="bg-card font-bold">18% GST (Standard)</option>
                    <option value="28" className="bg-card">28% GST</option>
                  </select>
                </div>

                <div className="space-y-1 font-mono">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Discount Deducted (₹)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={convertDiscount}
                    onChange={(e) => setConvertDiscount(e.target.value)}
                    className="w-full bg-secondary/40 border border-border rounded-xl px-3 py-2 text-xs outline-none text-foreground font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Payment Due Date</label>
                  <input
                    type="date"
                    required
                    value={convertPaymentDue}
                    onChange={(e) => setConvertPaymentDue(e.target.value)}
                    className="w-full bg-secondary/40 border border-border rounded-xl px-3 py-2 text-xs outline-none text-foreground font-mono font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1 font-sans">
                <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Invoice Terms & Conditions</label>
                <textarea
                  rows={3}
                  value={convertTerms}
                  onChange={(e) => setConvertTerms(e.target.value)}
                  className="w-full bg-secondary/40 border border-border rounded-xl p-3 text-xs outline-none text-foreground resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl text-xs hover:bg-primary/95 shadow-md shadow-primary/25 cursor-pointer font-sans"
              >
                Approve & Generate Traditional GST Invoice
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
