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
  
  // Table Items State (Rolling Shutter Configurations)
  const [formItems, setFormItems] = useState<any[]>([
    {
      shutterName: "Main Entrance Shutter",
      width: 10,
      height: 8,
      material: "GI",
      thickness: "21G",
      profile: "Flat",
      color: "Grey",
      operationType: "Manual",
      motorType: "",
      quantity: 1,
      unitPrice: 18000,
      lineTotal: 18000,
      bomItems: []
    }
  ]);

  // BOM Configurator states
  const [bomShutterIndex, setBomShutterIndex] = useState<number | null>(null);
  const [showBomConfigModal, setShowBomConfigModal] = useState(false);
  const [editingBomItems, setEditingBomItems] = useState<any[]>([]);

  // Smart Autofill state (not used for generic rows anymore)
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

  // Autocalculate the standard BOM items from Shutter specs
  const calculateDefaultBOM = (shutter: any, itemsList: any[]) => {
    const width = parseFloat(shutter.width || 0);
    const height = parseFloat(shutter.height || 0);
    const area = width * height;
    
    const findRate = (catName: string, nameSearch?: string) => {
      const list = itemsList.filter(mi => mi.category === catName && !mi.isDisabled);
      if (nameSearch) {
        const match = list.find(mi => mi.name.toLowerCase().includes(nameSearch.toLowerCase()));
        if (match) return { rate: match.rate, spec: match.name, unit: match.unit };
      }
      const first = list[0];
      return first ? { rate: first.rate, spec: first.name, unit: first.unit } : { rate: 0, spec: "", unit: "Pcs" };
    };

    const pgiSheet = findRate("GI Sheet", shutter.material);
    const pKabadi = findRate("Kabadi");
    const pPipe = findRate("Pipe");
    const pSpring = findRate("Springs");
    const pBracket = findRate("Brackets");
    const pWheel = findRate("Wheels");
    const pGuide = findRate("Guides");
    const pTopCap = findRate("Top Cap");
    const pLock = findRate("Lock Set");
    const pHandle = findRate("Handle");
    const pFitting = findRate("Fittings");

    const bom = [
      {
        materialName: "GI Sheet",
        specification: pgiSheet.spec || `${shutter.material || "GI"} ${shutter.thickness || "21G"} ${shutter.profile || "Flat"}`,
        quantity: area,
        unit: pgiSheet.unit || "Sft",
        rate: pgiSheet.rate || 95,
        totalPrice: area * (pgiSheet.rate || 95)
      },
      {
        materialName: "Kabadi",
        specification: pKabadi.spec || "Standard Flat",
        quantity: width,
        unit: pKabadi.unit || "Rft",
        rate: pKabadi.rate || 120,
        totalPrice: width * (pKabadi.rate || 120)
      },
      {
        materialName: "Pipe",
        specification: pPipe.spec || "Heavy Pipe",
        quantity: width,
        unit: pPipe.unit || "Rft",
        rate: pPipe.rate || 220,
        totalPrice: width * (pPipe.rate || 220)
      },
      {
        materialName: "Spring",
        specification: pSpring.spec || "Heavy 5G",
        quantity: Math.ceil(width / 3),
        unit: pSpring.unit || "Pcs",
        rate: pSpring.rate || 350,
        totalPrice: Math.ceil(width / 3) * (pSpring.rate || 350)
      },
      {
        materialName: "Bracket",
        specification: pBracket.spec || "13/16 Bracket",
        quantity: 2,
        unit: pBracket.unit || "Pcs",
        rate: pBracket.rate || 450,
        totalPrice: 2 * (pBracket.rate || 450)
      },
      {
        materialName: "Wheel",
        specification: pWheel.spec || "Standard Wheel",
        quantity: 2,
        unit: pWheel.unit || "Pcs",
        rate: pWheel.rate || 150,
        totalPrice: 2 * (pWheel.rate || 150)
      },
      {
        materialName: "Guide",
        specification: pGuide.spec || "Pair Guide",
        quantity: height * 2,
        unit: pGuide.unit || "Rft",
        rate: pGuide.rate || 110,
        totalPrice: (height * 2) * (pGuide.rate || 110)
      },
      {
        materialName: "Top Cap",
        specification: pTopCap.spec || "Top Cover",
        quantity: 1,
        unit: pTopCap.unit || "Pcs",
        rate: pTopCap.rate || 250,
        totalPrice: 1 * (pTopCap.rate || 250)
      },
      {
        materialName: "Lock Set",
        specification: pLock.spec || "Standard Lock",
        quantity: 1,
        unit: pLock.unit || "Pcs",
        rate: pLock.rate || 350,
        totalPrice: 1 * (pLock.rate || 350)
      },
      {
        materialName: "Handle",
        specification: pHandle.spec || "Basic Pull",
        quantity: 2,
        unit: pHandle.unit || "Pcs",
        rate: pHandle.rate || 80,
        totalPrice: 2 * (pHandle.rate || 80)
      },
      {
        materialName: "Fittings",
        specification: pFitting.spec || "Fitting Kit",
        quantity: 1,
        unit: pFitting.unit || "Pcs",
        rate: pFitting.rate || 150,
        totalPrice: 1 * (pFitting.rate || 150)
      }
    ];

    if (shutter.operationType === "Motorized") {
      const pMotor = findRate("Motors", shutter.motorType);
      bom.push({
        materialName: "Motor",
        specification: pMotor.spec || shutter.motorType || "Standard Motor",
        quantity: 1,
        unit: pMotor.unit || "Pcs",
        rate: pMotor.rate || 12000,
        totalPrice: 1 * (pMotor.rate || 12000)
      });
    }

    return bom;
  };

  const addItemRow = () => {
    const defaultShutter = {
      shutterName: `Shutter ${formItems.length + 1}`,
      width: 10,
      height: 8,
      material: "GI",
      thickness: "21G",
      profile: "Flat",
      color: "Grey",
      operationType: "Manual",
      motorType: "",
      quantity: 1,
      unitPrice: 18000,
      lineTotal: 18000,
      bomItems: [] as any[]
    };
    
    defaultShutter.bomItems = calculateDefaultBOM(defaultShutter, masterItems);
    setFormItems((prev) => [...prev, defaultShutter]);
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
      
      // Auto calculate default BOM when specifications or sizes change
      if (["width", "height", "material", "thickness", "profile", "operationType", "motorType"].includes(field)) {
        item.bomItems = calculateDefaultBOM(item, masterItems);
      }

      updated[index] = item;
      return updated;
    });
  };

  const removeItemRow = (index: number) => {
    if (formItems.length === 1) return;
    setFormItems((prev) => prev.filter((_, i) => i !== index));
  };

  const openBOMConfigurator = (idx: number) => {
    setBomShutterIndex(idx);
    const shutter = formItems[idx];
    const items = shutter.bomItems && shutter.bomItems.length > 0
      ? shutter.bomItems
      : calculateDefaultBOM(shutter, masterItems);
    setEditingBomItems(JSON.parse(JSON.stringify(items)));
    setShowBomConfigModal(true);
  };

  const saveBOMConfiguration = () => {
    if (bomShutterIndex === null) return;
    setFormItems((prev) => {
      const updated = [...prev];
      updated[bomShutterIndex].bomItems = editingBomItems;
      return updated;
    });
    setShowBomConfigModal(false);
    setBomShutterIndex(null);
    triggerToast("Internal Bill of Materials (BOM) saved for this shutter!");
  };

  const updateBomItemField = (idx: number, field: string, value: any) => {
    setEditingBomItems((prev) => {
      const updated = [...prev];
      const bom = { ...updated[idx] };
      if (field === "specification") {
        bom.specification = value;
      } else if (field === "quantity") {
        bom.quantity = parseFloat(value) || 0;
      } else if (field === "unit") {
        bom.unit = value;
      } else if (field === "rate") {
        bom.rate = parseFloat(value) || 0;
      }
      bom.totalPrice = bom.quantity * bom.rate;
      updated[idx] = bom;
      return updated;
    });
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
                {selectedQuote.items?.map((item: any, idx) => {
                  return (
                    <tr key={idx}>
                      <td className="py-3 text-slate-500 font-mono">{idx + 1}</td>
                      <td className="py-3 font-medium text-slate-800 font-sans">
                        <div className="font-bold text-slate-900">{item.shutterName || `Rolling Shutter ${idx + 1}`}</div>
                        <div className="text-[10px] text-slate-500 font-sans font-medium mt-0.5">
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
                    <span>Add Shutter</span>
                  </button>
                </div>

                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                  {formItems.map((item, idx) => (
                    <div key={idx} className="flex flex-wrap items-end gap-3 border border-border/40 p-3.5 rounded-lg bg-card/10 hover:border-border transition-all select-none font-sans text-xs">
                      {/* Shutter Name */}
                      <div className="flex-1 min-w-[150px] space-y-1">
                        <label className="text-[9px] font-mono text-muted-foreground uppercase">Shutter Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Warehouse entrance"
                          value={item.shutterName || ""}
                          onChange={(e) => updateItemRow(idx, "shutterName", e.target.value)}
                          className="w-full bg-secondary/40 border border-border rounded-md px-2 py-1 text-xs outline-none text-foreground font-semibold"
                        />
                      </div>

                      {/* Dimensions: Width & Height */}
                      <div className="w-16 space-y-1 font-mono">
                        <label className="text-[9px] font-mono text-muted-foreground uppercase">Width (Ft)</label>
                        <input
                          type="number"
                          required
                          placeholder="W"
                          value={item.width || ""}
                          onChange={(e) => updateItemRow(idx, "width", e.target.value)}
                          className="w-full bg-secondary/40 border border-border rounded-md px-2 py-1 text-xs outline-none text-foreground text-center"
                        />
                      </div>

                      <div className="w-16 space-y-1 font-mono">
                        <label className="text-[9px] font-mono text-muted-foreground uppercase">Height (Ft)</label>
                        <input
                          type="number"
                          required
                          placeholder="H"
                          value={item.height || ""}
                          onChange={(e) => updateItemRow(idx, "height", e.target.value)}
                          className="w-full bg-secondary/40 border border-border rounded-md px-2 py-1 text-xs outline-none text-foreground text-center"
                        />
                      </div>

                      {/* Material (GI / ZN / PPGI) */}
                      <div className="w-20 space-y-1">
                        <label className="text-[9px] font-mono text-muted-foreground uppercase">Material</label>
                        <select
                          value={item.material || "GI"}
                          onChange={(e) => updateItemRow(idx, "material", e.target.value)}
                          className="w-full bg-secondary/40 border border-border rounded-md px-2 py-1 text-xs outline-none text-foreground font-semibold"
                        >
                          <option value="GI" className="bg-card">GI</option>
                          <option value="ZN" className="bg-card">ZN</option>
                          <option value="PPGI" className="bg-card">PPGI</option>
                        </select>
                      </div>

                      {/* Thickness Gauge */}
                      <div className="w-20 space-y-1 font-mono">
                        <label className="text-[9px] font-mono text-muted-foreground uppercase">Gauge</label>
                        <select
                          value={item.thickness || "21G"}
                          onChange={(e) => updateItemRow(idx, "thickness", e.target.value)}
                          className="w-full bg-secondary/40 border border-border rounded-md px-2 py-1 text-xs outline-none text-foreground font-semibold font-mono"
                        >
                          {thicknessList.map((mi) => (
                            <option key={mi.id} value={mi.name} className="bg-card">{mi.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Profile (Flat / Semi / Half Round / Round) */}
                      <div className="w-24 space-y-1">
                        <label className="text-[9px] font-mono text-muted-foreground uppercase">Profile</label>
                        <select
                          value={item.profile || "Flat"}
                          onChange={(e) => updateItemRow(idx, "profile", e.target.value)}
                          className="w-full bg-secondary/40 border border-border rounded-md px-2 py-1 text-xs outline-none text-foreground font-semibold"
                        >
                          <option value="Flat" className="bg-card">Flat</option>
                          <option value="Semi" className="bg-card">Semi</option>
                          <option value="Half Round" className="bg-card">Half Round</option>
                          <option value="Round" className="bg-card">Round</option>
                        </select>
                      </div>

                      {/* Color */}
                      <div className="w-20 space-y-1">
                        <label className="text-[9px] font-mono text-muted-foreground uppercase">Color</label>
                        <input
                          type="text"
                          value={item.color || ""}
                          onChange={(e) => updateItemRow(idx, "color", e.target.value)}
                          className="w-full bg-secondary/40 border border-border rounded-md px-2 py-1 text-xs outline-none text-foreground font-semibold"
                        />
                      </div>

                      {/* Operation Type (Manual / Motorized) */}
                      <div className="w-24 space-y-1">
                        <label className="text-[9px] font-mono text-muted-foreground uppercase">Operation</label>
                        <select
                          value={item.operationType || "Manual"}
                          onChange={(e) => updateItemRow(idx, "operationType", e.target.value)}
                          className="w-full bg-secondary/40 border border-border rounded-md px-2 py-1 text-xs outline-none text-foreground font-semibold"
                        >
                          <option value="Manual" className="bg-card">Manual</option>
                          <option value="Motorized" className="bg-card">Motorized</option>
                        </select>
                      </div>

                      {/* Motor Type */}
                      <div className="w-28 space-y-1">
                        <label className="text-[9px] font-mono text-muted-foreground uppercase">Motor Type</label>
                        <select
                          disabled={item.operationType !== "Motorized"}
                          value={item.motorType || ""}
                          onChange={(e) => updateItemRow(idx, "motorType", e.target.value)}
                          className="w-full bg-secondary/40 border border-border rounded-md px-2 py-1 text-xs outline-none text-foreground disabled:opacity-30 font-semibold"
                        >
                          <option value="">No Motor</option>
                          {masterItems
                            .filter(mi => mi.category === "Motors" && !mi.isDisabled)
                            .map((mi) => (
                              <option key={mi.id} value={mi.name} className="bg-card">{mi.name}</option>
                            ))}
                        </select>
                      </div>

                      {/* Qty */}
                      <div className="w-16 space-y-1 font-mono">
                        <label className="text-[9px] font-mono text-muted-foreground uppercase font-bold">Qty</label>
                        <input
                          type="number"
                          required
                          value={item.quantity || "1"}
                          onChange={(e) => updateItemRow(idx, "quantity", e.target.value)}
                          className="w-full bg-secondary/40 border border-border rounded-md px-2 py-1 text-xs outline-none text-foreground text-center font-bold"
                        />
                      </div>

                      {/* Rate */}
                      <div className="w-24 space-y-1 font-mono">
                        <label className="text-[9px] font-mono text-muted-foreground uppercase font-bold">Rate (₹)</label>
                        <input
                          type="number"
                          required
                          value={item.unitPrice || "0"}
                          onChange={(e) => updateItemRow(idx, "unitPrice", e.target.value)}
                          className="w-full bg-secondary/40 border border-border rounded-md px-2 py-1 text-xs outline-none text-foreground text-right font-bold text-emerald-400"
                        />
                      </div>

                      {/* Total price */}
                      <div className="w-24 text-right font-bold text-foreground font-mono leading-none pb-2 text-xs">
                        ₹{(item.lineTotal || 0).toLocaleString("en-IN")}
                      </div>

                      {/* Configure Materials (BOM) Trigger */}
                      <button
                        type="button"
                        onClick={() => openBOMConfigurator(idx)}
                        className="text-[10px] bg-secondary hover:bg-secondary/80 border border-border/80 text-foreground font-bold px-2.5 py-1.5 rounded transition-all shrink-0 mb-0.5 uppercase tracking-wider font-mono hover:text-primary hover:border-primary"
                      >
                        BOM
                      </button>

                      {/* Remove Button */}
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
      {/* Bill of Materials (BOM) Configurator Dialog */}
      {showBomConfigModal && bomShutterIndex !== null && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-4xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-border flex justify-between items-center bg-secondary/15">
              <div>
                <h3 className="font-heading font-semibold text-sm">Configure Bill of Materials (BOM)</h3>
                <p className="text-[10px] text-muted-foreground font-mono uppercase mt-0.5">
                  Internal manufacturing list for Shutter: {formItems[bomShutterIndex]?.shutterName}
                </p>
              </div>
              <button 
                onClick={() => { setShowBomConfigModal(false); setBomShutterIndex(null); }} 
                className="text-muted-foreground hover:text-foreground text-xs font-semibold"
              >
                Cancel
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 font-sans text-xs">
              <div className="bg-secondary/10 p-3.5 rounded-lg border border-border/50 grid grid-cols-2 md:grid-cols-4 gap-4 font-mono text-[10px]">
                <div>
                  <span className="text-muted-foreground block uppercase">Size</span>
                  <span className="font-bold text-foreground">{formItems[bomShutterIndex]?.width}Ft x {formItems[bomShutterIndex]?.height}Ft</span>
                </div>
                <div>
                  <span className="text-muted-foreground block uppercase">Material Spec</span>
                  <span className="font-bold text-foreground">{formItems[bomShutterIndex]?.material} ({formItems[bomShutterIndex]?.thickness})</span>
                </div>
                <div>
                  <span className="text-muted-foreground block uppercase">Profile</span>
                  <span className="font-bold text-foreground">{formItems[bomShutterIndex]?.profile}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block uppercase">Operation</span>
                  <span className="font-bold text-foreground">{formItems[bomShutterIndex]?.operationType} {formItems[bomShutterIndex]?.motorType && `(${formItems[bomShutterIndex]?.motorType})`}</span>
                </div>
              </div>

              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-secondary/30 border-b border-border font-mono text-[10px] uppercase text-muted-foreground">
                      <th className="p-2.5">Material Name</th>
                      <th className="p-2.5">Specification</th>
                      <th className="p-2.5 text-center w-24">Qty</th>
                      <th className="p-2.5 text-center w-16">Unit</th>
                      <th className="p-2.5 text-right w-24">Rate (₹)</th>
                      <th className="p-2.5 text-right w-28">Total Price (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {editingBomItems.map((bom, bIdx) => (
                      <tr key={bIdx} className="hover:bg-secondary/10">
                        <td className="p-2.5 font-bold text-foreground">{bom.materialName}</td>
                        <td className="p-2.5">
                          <input
                            type="text"
                            value={bom.specification || ""}
                            onChange={(e) => updateBomItemField(bIdx, "specification", e.target.value)}
                            className="w-full bg-secondary/20 border border-border/80 rounded px-2 py-0.5 text-xs outline-none text-foreground font-semibold"
                          />
                        </td>
                        <td className="p-2.5 text-center font-mono">
                          <input
                            type="number"
                            step="any"
                            value={bom.quantity || ""}
                            onChange={(e) => updateBomItemField(bIdx, "quantity", e.target.value)}
                            className="w-20 bg-secondary/20 border border-border/80 rounded px-1.5 py-0.5 text-xs text-center outline-none text-foreground font-bold"
                          />
                        </td>
                        <td className="p-2.5 text-center font-mono">
                          <input
                            type="text"
                            value={bom.unit || ""}
                            onChange={(e) => updateBomItemField(bIdx, "unit", e.target.value)}
                            className="w-12 bg-secondary/20 border border-border/80 rounded px-1 py-0.5 text-xs text-center outline-none text-foreground font-semibold"
                          />
                        </td>
                        <td className="p-2.5 text-right font-mono">
                          <input
                            type="number"
                            value={bom.rate || ""}
                            onChange={(e) => updateBomItemField(bIdx, "rate", e.target.value)}
                            className="w-20 bg-secondary/20 border border-border/80 rounded px-1.5 py-0.5 text-xs text-right outline-none text-foreground font-bold text-emerald-400"
                          />
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-foreground">
                          ₹{(bom.totalPrice || 0).toLocaleString("en-IN")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center bg-secondary/5 border border-border/40 p-3 rounded-lg font-mono">
                <span className="font-bold text-[10px] uppercase text-muted-foreground">Estimated Manufacturing Cost:</span>
                <span className="font-black text-foreground text-sm">
                  ₹{editingBomItems.reduce((sum, bom) => sum + (bom.totalPrice || 0), 0).toLocaleString("en-IN")}
                </span>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowBomConfigModal(false); setBomShutterIndex(null); }}
                  className="bg-secondary hover:bg-secondary/80 border border-border text-foreground font-bold px-4 py-2 rounded-lg text-xs"
                >
                  Discard overrides
                </button>
                <button
                  type="button"
                  onClick={saveBOMConfiguration}
                  className="bg-primary text-primary-foreground hover:bg-primary/95 font-bold px-5 py-2 rounded-lg text-xs shadow-md shadow-primary/20"
                >
                  Save Internal BOM
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
