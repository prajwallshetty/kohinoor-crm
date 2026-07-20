"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { 
  FileText, Plus, Search, Trash2, CheckCircle2, Copy, Send, 
  Printer, ArrowLeft, RefreshCw, MessageSquare, Mail, Check, UserPlus, FileCheck, User,
  ChevronRight, ChevronLeft, Layers, Maximize2, Calculator, CheckCircle, X, Zap, Receipt, Edit, Settings
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { PageSkeleton } from "@/components/ui/loaders";
import QRCode from "qrcode";
import confetti from "canvas-confetti";

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
  configJson: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  lineTotal: number;
  // Fallbacks for backwards compatibility
  material?: string | null;
  thickness?: string | null;
  profile?: string | null;
  length?: number | null;
  width?: number | null;
  height?: number | null;
  color?: string | null;
  operationType?: string | null;
  motorType?: string | null;
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
  customer?: Customer;
  items: QuoteItem[];
}

const normalizeFieldType = (typeStr: string = "") => {
  const t = typeStr.trim().toLowerCase().replace(/[\s_]+/g, "");
  if (t === "text") return "text";
  if (t === "textarea") return "textarea";
  if (t === "number" || t === "qty" || t === "quantity") return "number";
  if (t === "dropdown" || t === "select") return "dropdown";
  if (t === "radio") return "radio";
  if (t === "checkbox") return "checkbox";
  if (t === "date") return "date";
  if (t === "color") return "color";
  if (t === "unit") return "unit";
  if (t === "currency" || t === "price" || t === "rate") return "currency";
  if (t === "boolean" || t === "toggle") return "boolean";
  if (t === "searchselect" || t === "search_select") return "search_select";
  if (t === "autocomplete" || t === "auto_complete") return "autocomplete";
  return "text";
};

const getCategoryFields = (catName: string, allMasterItems: any[]) => {
  if (!catName) return [];

  const rawCat = catName.trim().toLowerCase();
  const singularCat = rawCat.endsWith("s") ? rawCat.slice(0, -1) : rawCat;
  const pluralCat = rawCat.endsWith("s") ? rawCat : `${rawCat}s`;

  // Look up matching Fields: category items in Master Data
  const dbFields = allMasterItems.filter((item) => {
    if (item.isDisabled) return false;
    const catLower = (item.category || "").trim().toLowerCase();
    return (
      catLower === `fields: ${rawCat}` ||
      catLower === `fields: ${singularCat}` ||
      catLower === `fields: ${pluralCat}`
    );
  });

  if (dbFields.length > 0) {
    return dbFields.map((item) => item.name);
  }

  // Generic non-domain fallback for brand new categories created by admin without custom fields configured yet
  return [
    "Item Name|text",
    "Quantity|number",
    "Unit|unit",
    "Rate|currency"
  ];
};

function SearchSelect({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (val: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = options.filter(opt =>
    opt.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full bg-secondary/35 border border-border hover:border-primary/45 rounded-xl px-3.5 py-2.5 text-xs text-foreground font-semibold outline-none flex justify-between items-center transition-all text-left"
      >
        <span>{value || `Select ${label}...`}</span>
        <ChevronRight className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${open ? "rotate-90" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-xl z-50 p-2 max-h-56 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-150">
          <input
            type="text"
            placeholder="Search options..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-secondary/50 border border-border rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-primary mb-2 text-foreground font-medium"
          />
          <div className="space-y-1">
            {filtered.length === 0 ? (
              <div className="p-2 text-xs text-muted-foreground text-center">No options found</div>
            ) : (
              filtered.map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    onChange(opt);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    value === opt ? "bg-primary text-primary-foreground font-bold" : "hover:bg-secondary text-foreground"
                  }`}
                >
                  {opt}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
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
  const [formTerms, setFormTerms] = useState("");

  // Single-Page Rolling Shutter Configurator State
  const [shutterName, setShutterName] = useState("Main Entrance Rolling Shutter");
  const [shutterWidth, setShutterWidth] = useState("10.0");
  const [shutterHeight, setShutterHeight] = useState("10.0");
  const [shutterQty, setShutterQty] = useState("1");
  const [shutterNotes, setShutterNotes] = useState("");

  // Section 2: Construction Materials State (Master Data Dropdowns)
  const [giMaterial, setGiMaterial] = useState("GI");
  const [giThickness, setGiThickness] = useState("21G");
  const [giProfile, setGiProfile] = useState("Corrugated");
  const [motorVariant, setMotorVariant] = useState("Somfy 300kg");
  const [pipeVariant, setPipeVariant] = useState('1¼" Heavy Pipe');
  const [springVariant, setSpringVariant] = useState("SPR 5G Heavy Spring");
  const [guideVariant, setGuideVariant] = useState('2" Heavy Guide');
  const [bracketVariant, setBracketVariant] = useState("13/16 Heavy Bracket");
  const [wheelVariant, setWheelVariant] = useState('1¼" Nylon Wheel');
  const [kabadiVariant, setKabadiVariant] = useState("Heavy Flat Kabadi");
  const [topCapVariant, setTopCapVariant] = useState("Steel Top Cap");
  const [handleVariant, setHandleVariant] = useState("Heavy SS Handle");
  const [lockVariant, setLockVariant] = useState("SS Central Lock");
  const [fittingsVariant, setFittingsVariant] = useState("Standard Fitting Set");
  const [colorVariant, setColorVariant] = useState("Galvanized Silver");

  // Helper to fetch options dynamically from Master Data
  const getOptions = (catName: string) => {
    const rawCat = catName.trim().toLowerCase();
    const items = masterItems.filter((item) => {
      if (item.isDisabled) return false;
      const c = (item.category || "").trim().toLowerCase();
      return c === rawCat || c === `${rawCat}s` || c === rawCat.replace(/s$/, "");
    });
    if (items.length > 0) return items.map((i) => i.name);
    // Fallback options
    if (catName === "GI Sheet" || catName === "Material Types") return ["GI", "ZN", "PPGI"];
    if (catName === "Thickness") return ["18G", "20G", "21G", "22G"];
    if (catName === "Profile") return ["Flat", "Corrugated", "Perforated"];
    if (catName === "Motor") return ["Somfy 300kg", "Generic 40Nm", "Crompton 500kg"];
    if (catName === "Pipe") return ['1"', '1¼"', '1½"'];
    if (catName === "Spring") return ["SPR 5G", "SPR 6G"];
    if (catName === "Guide") return ['1½"', '2"', '2½"'];
    if (catName === "Brackets") return ["13/16", "15/16"];
    if (catName === "Wheels") return ['1¼"', '1½"'];
    if (catName === "Kabadi") return ["Standard Flat", "Heavy Flat"];
    if (catName === "Top Caps") return ["Steel Top Cap", "Standard Cap"];
    if (catName === "Handles") return ["Heavy Handle", "SS Handle"];
    if (catName === "Locks") return ["SS Lock", "Brass Lock"];
    if (catName === "Fittings") return ["Standard Fittings Set", "Heavy Fittings Set"];
    if (catName === "Color") return ["Galvanized Silver", "RAL 9003 White", "RAL 7016 Anthracite Grey"];
    return ["Standard Variant"];
  };

  // Live Shutter Pricing Computations
  const widthVal = parseFloat(shutterWidth) || 0;
  const heightVal = parseFloat(shutterHeight) || 0;
  const qtyVal = parseInt(shutterQty, 10) || 1;
  const areaSqFt = widthVal * heightVal;

  // Compute base rate per Sq.Ft dynamically from Master Data selections
  const getMasterRate = (catName: string, selectedName: string) => {
    const matched = masterItems.find(
      (item) => item.category?.toLowerCase() === catName.toLowerCase() && item.name === selectedName
    );
    return matched ? matched.rate : 0;
  };

  const giRate = getMasterRate("GI Sheet", giThickness) || 16.5;
  const motorRate = getMasterRate("Motor Options", motorVariant) || (motorVariant !== "None" ? 6500 : 0);
  const pipeRate = getMasterRate("Pipe", pipeVariant) || 68;
  const springRate = getMasterRate("Spring", springVariant) || 186;
  const lockRate = getMasterRate("Locks", lockVariant) || 600;

  // Rate estimation per Sq.Ft
  const ratePerSqFt = Math.max(120, Math.round(giRate * 8 + (motorRate / Math.max(areaSqFt, 1)) + (pipeRate * 0.6) + (springRate * 0.4)));
  const shutterSubtotal = Math.round(areaSqFt * ratePerSqFt * qtyVal);

  const discVal = parseFloat(formDiscount) || 0;
  const shutterNetSubtotal = Math.max(0, shutterSubtotal - discVal);
  const gstRateVal = formGstOff ? 0 : parseFloat(formGstRate) || 18;
  const gstAmt = (shutterNetSubtotal * gstRateVal) / 100;
  const shutterNetGrandTotal = Math.round(shutterNetSubtotal + gstAmt);
  
  // Dynamic Form / Shopping Cart State
  const [formItems, setFormItems] = useState<QuoteItem[]>([]);
  const [cartModalOpen, setCartModalOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [currentEditingItemIdx, setCurrentEditingItemIdx] = useState<number | null>(null);
  const [dynamicFormValues, setDynamicFormValues] = useState<Record<string, any>>({});
  
  const [notification, setNotification] = useState("");

  const triggerToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(""), 3500);
  };

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

  // Read active categories from masterItems
  const activeCategories = masterItems.filter(
    (item) => item.category === "Material Categories" && !item.isDisabled
  );

  // Dynamic Form Field Change Handler
  const handleFieldChange = (label: string, value: any, rawType: string, srcCat?: string) => {
    const fieldType = normalizeFieldType(rawType);
    setDynamicFormValues((prev) => {
      const updated = { ...prev, [label]: value };

      // Auto-pricing & unit lookup from Master Data
      if (["dropdown", "radio", "search_select", "autocomplete"].includes(fieldType) && srcCat) {
        const matchedItem = masterItems.find(
          (mi) => mi.category === srcCat && mi.name === value && !mi.isDisabled
        );
        if (matchedItem) {
          const categoryFields = getCategoryFields(selectedCategory || "", masterItems);

          if (matchedItem.rate > 0) {
            const rateField = categoryFields.find((fStr) => {
              const [fLabel, fRawType] = fStr.split("|");
              const fType = normalizeFieldType(fRawType);
              return ["rate", "price", "unitprice"].includes(fLabel.toLowerCase()) || fType === "currency";
            });
            if (rateField) {
              const [rLabel] = rateField.split("|");
              updated[rLabel] = matchedItem.rate;
            }
          }

          if (matchedItem.unit) {
            const unitField = categoryFields.find((fStr) => {
              const [fLabel, fRawType] = fStr.split("|");
              const fType = normalizeFieldType(fRawType);
              return fLabel.toLowerCase() === "unit" || fType === "unit";
            });
            if (unitField) {
              const [uLabel] = unitField.split("|");
              updated[uLabel] = matchedItem.unit.toUpperCase();
            }
          }
        }
      }

      return updated;
    });
  };

  // Open dynamic form for creating new item
  const handleOpenAddItem = () => {
    setSelectedCategory(null);
    setCategorySearch("");
    setCurrentEditingItemIdx(null);
    setDynamicFormValues({});
    setCartModalOpen(true);
  };

  // Open dynamic form for editing item
  const handleOpenEditItem = (idx: number) => {
    const item = formItems[idx];
    if (!item) return;
    setSelectedCategory(item.productName);
    setCurrentEditingItemIdx(idx);
    setDynamicFormValues(JSON.parse(item.configJson || "{}"));
    setCartModalOpen(true);
  };

  // Duplicate cart item
  const handleDuplicateItem = (idx: number) => {
    const item = formItems[idx];
    if (!item) return;
    const duplicated = {
      ...item,
      configJson: item.configJson
    };
    setFormItems((prev) => [...prev, duplicated]);
    triggerToast("Item duplicated in cart!");
  };

  // Delete cart item
  const handleDeleteItem = (idx: number) => {
    setFormItems((prev) => prev.filter((_, i) => i !== idx));
    triggerToast("Item removed from cart.");
  };

  // Save cart item
  const handleSaveItem = () => {
    if (!selectedCategory) return;

    const fieldsStr = getCategoryFields(selectedCategory, masterItems);
    const selectionVals: string[] = [];
    let detectedQty = 1;
    let detectedUnit = "PCS";
    let detectedRate = 0.0;

    const categoryItem = masterItems.find(
      (mi) => mi.category === "Material Categories" && mi.name === selectedCategory
    );
    const categoryId = categoryItem ? categoryItem.id : null;

    fieldsStr.forEach((fStr) => {
      const [label, rawType, srcCat] = fStr.split("|");
      const type = normalizeFieldType(rawType);
      const val = dynamicFormValues[label];

      if (["dropdown", "radio", "search_select", "autocomplete"].includes(type)) {
        if (val) selectionVals.push(val);
      }

      if (["quantity", "qty", "length", "len", "size"].includes(label.toLowerCase())) {
        const num = parseFloat(val);
        if (!isNaN(num) && num > 0) detectedQty = num;
      }

      if (["rate", "price", "unitprice"].includes(label.toLowerCase()) || type === "currency") {
        const num = parseFloat(val);
        if (!isNaN(num)) detectedRate = num;
      }

      if (["unit"].includes(label.toLowerCase()) || type === "unit") {
        if (val) detectedUnit = val.toString().toUpperCase();
      }
    });

    // Lookup unit from default variant if not defined in inputs
    if (detectedUnit === "PCS" || !detectedUnit) {
      for (const val of selectionVals) {
        const found = masterItems.find((mi) => mi.name === val);
        if (found && found.unit) {
          detectedUnit = found.unit.toUpperCase();
          break;
        }
      }
    }

    const lineTotal = Math.round(detectedQty * detectedRate);

    const newItem: QuoteItem = {
      productName: selectedCategory,
      categoryId,
      configJson: JSON.stringify(dynamicFormValues),
      quantity: detectedQty,
      unit: detectedUnit,
      unitPrice: detectedRate,
      lineTotal,
      shutterName: selectedCategory,
      material: dynamicFormValues["Material"] || dynamicFormValues["material"] || null,
      thickness: dynamicFormValues["Thickness"] || dynamicFormValues["thickness"] || null,
      profile: dynamicFormValues["Profile"] || dynamicFormValues["profile"] || null,
      length: dynamicFormValues["Length"] || dynamicFormValues["length"] ? parseFloat(dynamicFormValues["Length"] || dynamicFormValues["length"]) : null,
      width: dynamicFormValues["Width"] || dynamicFormValues["width"] ? parseFloat(dynamicFormValues["Width"] || dynamicFormValues["width"]) : null,
      height: dynamicFormValues["Height"] || dynamicFormValues["height"] ? parseFloat(dynamicFormValues["Height"] || dynamicFormValues["height"]) : null,
      color: dynamicFormValues["Color"] || dynamicFormValues["color"] || null,
      operationType: dynamicFormValues["Operation Drive Mode"] || dynamicFormValues["Operation"] || null,
      motorType: dynamicFormValues["Motor Model"] || dynamicFormValues["Motor"] || null
    };

    if (currentEditingItemIdx !== null) {
      setFormItems((prev) => {
        const updated = [...prev];
        updated[currentEditingItemIdx] = newItem;
        return updated;
      });
      triggerToast("Quotation item updated!");
    } else {
      setFormItems((prev) => [...prev, newItem]);
      triggerToast("Item added to cart!");
    }

    setCartModalOpen(false);
  };

  // Submit single-page Rolling Shutter Configurator quotation
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

      // Build single complete rolling shutter item from the 2-section form
      const configObj = {
        shutterName,
        shutterWidth: widthVal,
        shutterHeight: heightVal,
        shutterQty: qtyVal,
        shutterNotes,
        giMaterial,
        giThickness,
        giProfile,
        motorVariant,
        pipeVariant,
        springVariant,
        guideVariant,
        bracketVariant,
        wheelVariant,
        kabadiVariant,
        topCapVariant,
        handleVariant,
        lockVariant,
        fittingsVariant,
        colorVariant
      };

      const shutterItem: QuoteItem = {
        productName: shutterName || "Rolling Shutter",
        configJson: JSON.stringify(configObj),
        quantity: areaSqFt * qtyVal,
        unit: "SQFT",
        unitPrice: ratePerSqFt,
        lineTotal: shutterSubtotal,
        shutterName: shutterName || "Rolling Shutter",
        material: giMaterial,
        thickness: giThickness,
        profile: giProfile,
        width: widthVal,
        height: heightVal,
        color: colorVariant,
        motorType: motorVariant
      };

      const finalItems = formItems.length > 0 ? formItems : [shutterItem];

      const res = await fetch("/api/quotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quotation: {
            customerId,
            discount: discVal,
            gstRate: gstRateVal,
            gstAmount: gstAmt,
            totalAmount: shutterNetGrandTotal,
            terms: formTerms,
            status: formStatus
          },
          items: finalItems
        })
      });

      if (res.ok) {
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 }
        });
        triggerToast("Rolling Shutter Quotation created successfully!");
        
        // Reset state
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
        setFormItems([]);
        setShowAddQuote(false);
        fetchData();
      }
    } catch (e) {}
  };

  const handleUpdateStatus = async (id: string, newStatus: any) => {
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
        fetchData(false);
      } else {
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

  const shareWhatsApp = (q: Quotation) => {
    const text = encodeURIComponent(
      `Hello! Please find the quotation ${q.quoteNumber} from Kohinoor Rolling Shutters.\nTotal: ₹${q.totalAmount.toLocaleString("en-IN")}\nAddress: ${q.customer?.billingAddress}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  };

  const shareEmail = (q: Quotation) => {
    const subject = encodeURIComponent(`Quotation ${q.quoteNumber} - Kohinoor Rolling Shutters`);
    const body = encodeURIComponent(`Dear Customer,\n\nPlease find attached quotation details.\nQuotation Number: ${q.quoteNumber}\nTotal Amount: ₹${q.totalAmount.toLocaleString("en-IN")}\n\nWarm regards,\nKohinoor Rolling Shutters`);
    window.open(`mailto:${q.customer?.email || ""}?subject=${subject}&body=${body}`, "_blank");
  };

  // Helper to extract clean summary dynamically from configJson or columns
  const getVariantSummary = (item: any) => {
    if (item.configJson) {
      try {
        const config = JSON.parse(item.configJson);
        const categoryFields = getCategoryFields(item.productName, masterItems);
        const summaryParts: string[] = [];

        categoryFields.forEach((fStr) => {
          const [label, rawType] = fStr.split("|");
          const type = normalizeFieldType(rawType);
          const val = config[label];

          if (
            val !== undefined &&
            val !== null &&
            val !== "" &&
            !["quantity", "qty", "rate", "price", "unitprice", "unit"].includes(label.toLowerCase()) &&
            type !== "currency"
          ) {
            if (Array.isArray(val)) {
              if (val.length > 0) summaryParts.push(val.join(", "));
            } else if (typeof val === "boolean") {
              if (val) summaryParts.push(label);
            } else {
              summaryParts.push(val.toString());
            }
          }
        });

        if (summaryParts.length > 0) {
          return summaryParts.join(" • ");
        }
      } catch (e) {}
    }

    const fallbacks = [];
    if (item.material) fallbacks.push(item.material);
    if (item.thickness) fallbacks.push(item.thickness);
    if (item.profile) fallbacks.push(item.profile);
    return fallbacks.join(" • ") || "Standard Variant";
  };

  // Totals calculations for the active new/edit wizard form
  const netSubtotal = formItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const netDiscount = parseFloat(formDiscount) || 0;
  const netTaxable = Math.max(0, netSubtotal - netDiscount);
  const netGstRate = formGstOff ? 0.0 : parseFloat(formGstRate) || 0.0;
  const netGstAmount = netTaxable * (netGstRate / 100);
  const netGrandTotal = Math.round(netTaxable + netGstAmount);
  const netRoundOff = parseFloat((netGrandTotal - (netTaxable + netGstAmount)).toFixed(2));

  const filteredQuotes = quotations.filter(
    (q) =>
      q.quoteNumber.toLowerCase().includes(search.toLowerCase()) ||
      (q.customer && q.customer.name.toLowerCase().includes(search.toLowerCase())) ||
      (q.customer && q.customer.phone.includes(search))
  );

  const selectedCustomerObj = customers.find((c) => c.id === formCustId);

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

      {/* Ledger Page View */}
      {!selectedQuote ? (
        <>
          {/* Header Action Controls */}
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
              onClick={() => {
                setFormItems([]);
                setWizardStep(1);
                setShowAddQuote(true);
              }}
              className="bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-bold py-2.5 px-5 rounded-lg flex items-center gap-2 shadow-lg shadow-primary/25 cursor-pointer transition-all hover:scale-[1.01]"
            >
              <Plus className="w-4 h-4" />
              <span>+ Draft New Quotation</span>
            </button>
          </div>

          {/* Ledger Table */}
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
                    <th className="p-4 text-right">Grand Total</th>
                    <th className="p-4">Stage</th>
                    <th className="p-4 text-right pr-6">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-xs">
                  {filteredQuotes.length === 0 ? (
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
                            {q.customer?.companyName || "Individual Client"}
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
        /* DETAIL DRAWER / PRINT PREVIEW */
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
                  Date: {new Date(selectedQuote.createdAt).toLocaleDateString("en-IN")}
                </span>
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

            {/* Shopping Cart Printable Table */}
            <table className="w-full text-left border-collapse my-8 text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] font-mono uppercase text-slate-400">
                  <th className="pb-2">S.No</th>
                  <th className="pb-2">Product Category</th>
                  <th className="pb-2">Variant Summary</th>
                  <th className="pb-2 text-center">Quantity</th>
                  <th className="pb-2 text-center">Unit</th>
                  <th className="pb-2 text-right">Unit Rate (₹)</th>
                  <th className="pb-2 text-right">Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {selectedQuote.items?.map((item: any, idx) => (
                  <tr key={idx}>
                    <td className="py-3 text-slate-500 font-mono">{idx + 1}</td>
                    <td className="py-3 font-medium text-slate-800">
                      <div className="font-bold text-slate-900">{item.productName}</div>
                    </td>
                    <td className="py-3 text-slate-600 font-medium">
                      {getVariantSummary(item)}
                    </td>
                    <td className="py-3 text-center text-slate-700 font-bold">{item.quantity}</td>
                    <td className="py-3 text-center text-slate-500 font-mono">{item.unit || "PCS"}</td>
                    <td className="py-3 text-right text-slate-700">₹{item.unitPrice.toLocaleString("en-IN")}</td>
                    <td className="py-3 text-right font-semibold text-slate-800">₹{item.lineTotal.toLocaleString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals Breakdown */}
            <div className="flex justify-end pt-6 border-t border-slate-200">
              <div className="w-full sm:w-72 flex flex-col gap-2 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal</span>
                  <span>₹{selectedQuote.items?.reduce((sum, i) => sum + i.lineTotal, 0).toLocaleString("en-IN")}</span>
                </div>
                {selectedQuote.discount > 0 && (
                  <div className="flex justify-between text-rose-500 font-medium">
                    <span>Discount Deduction</span>
                    <span>- ₹{selectedQuote.discount.toLocaleString("en-IN")}</span>
                  </div>
                )}
                {selectedQuote.gstAmount > 0 && (
                  <>
                    <div className="flex justify-between text-slate-500">
                      <span>GST Amount ({selectedQuote.gstRate}%)</span>
                      <span>₹{selectedQuote.gstAmount.toLocaleString("en-IN")}</span>
                    </div>
                  </>
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
          </div>
        </div>
      )}

      {/* SINGLE-PAGE ROLLING SHUTTER CONFIGURATOR MODAL */}
      {showAddQuote && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="w-full max-w-4xl bg-card border border-border/90 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto">
            
            {/* Header */}
            <div className="bg-secondary/30 border-b border-border px-6 py-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 text-primary rounded-xl">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base text-foreground">
                    Rolling Shutter Product Configurator
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Configure single rolling shutter dimensions, materials, and auto-loaded Master Data variants
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

            {/* Form Body */}
            <form onSubmit={handleCreateQuotation} className="flex-grow overflow-y-auto p-6 space-y-6">
              
              {/* Customer Registry & Stage Selection */}
              <div className="bg-secondary/15 border border-border/70 p-4 rounded-xl space-y-3">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <h4 className="font-bold text-xs text-foreground flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-primary" />
                      <span>Customer & Proposal Stage</span>
                    </h4>
                  </div>

                  <div className="flex bg-background border border-border p-1 rounded-xl text-xs">
                    <button
                      type="button"
                      onClick={() => setIsNewCustomer(false)}
                      className={`px-3 py-1 font-bold rounded-lg transition-all cursor-pointer ${!isNewCustomer ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      Existing Customer
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsNewCustomer(true)}
                      className={`px-3 py-1 font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${isNewCustomer ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      <UserPlus className="w-3 h-3" />
                      <span>New Customer</span>
                    </button>
                  </div>
                </div>

                {!isNewCustomer ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div className="md:col-span-2 space-y-1">
                      <label className="font-semibold text-foreground">Select Customer Profile *</label>
                      <select
                        required={!isNewCustomer}
                        value={formCustId}
                        onChange={(e) => setFormCustId(e.target.value)}
                        className="w-full bg-secondary/40 border border-border rounded-xl px-3.5 py-2 text-xs outline-none text-foreground font-semibold focus:border-primary cursor-pointer"
                      >
                        <option value="" className="bg-card text-foreground">Choose customer profile...</option>
                        {customers.map((c) => (
                          <option key={c.id} value={c.id} className="bg-card text-foreground font-medium">
                            {c.name} {c.companyName ? `(${c.companyName})` : ""} - {c.phone}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-foreground">Quotation Stage</label>
                      <select
                        value={formStatus}
                        onChange={(e) => setFormStatus(e.target.value as any)}
                        className="w-full bg-secondary/40 border border-border rounded-xl px-3.5 py-2 text-xs outline-none text-foreground font-semibold focus:border-primary cursor-pointer"
                      >
                        <option value="DRAFT" className="bg-card">Draft Proposal</option>
                        <option value="SENT" className="bg-card text-amber-400 font-bold">Sent to Client</option>
                        <option value="APPROVED" className="bg-card text-emerald-400 font-bold">Approved</option>
                        <option value="REJECTED" className="bg-card text-rose-400 font-bold">Rejected</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-secondary/20 p-3.5 rounded-xl border border-border/50 text-xs">
                    <div className="space-y-1">
                      <label className="font-semibold text-foreground">Customer Full Name *</label>
                      <input
                        type="text"
                        required={isNewCustomer}
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
                    <div className="space-y-1 font-mono">
                      <label className="font-semibold text-foreground font-sans">Phone Number *</label>
                      <input
                        type="text"
                        required={isNewCustomer}
                        placeholder="+91 9876543210"
                        value={newCustPhone}
                        onChange={(e) => setNewCustPhone(e.target.value)}
                        className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs outline-none focus:border-primary text-foreground"
                      />
                    </div>
                    <div className="space-y-1 md:col-span-3">
                      <label className="font-semibold text-foreground">Billing Location Address *</label>
                      <input
                        type="text"
                        required={isNewCustomer}
                        placeholder="Building / site location address"
                        value={newCustBilling}
                        onChange={(e) => setNewCustBilling(e.target.value)}
                        className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs outline-none focus:border-primary text-foreground font-medium"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 1: Basic Shutter Details */}
              <div className="border border-border/80 p-5 rounded-2xl bg-card space-y-4">
                <div className="flex justify-between items-center border-b border-border/50 pb-2">
                  <h4 className="font-bold text-xs text-foreground uppercase tracking-wider flex items-center gap-2">
                    <span className="bg-primary/10 text-primary px-2 py-0.5 rounded font-mono text-[10px] font-bold">
                      SECTION 1
                    </span>
                    <span>Basic Shutter Details</span>
                  </h4>
                  <span className="text-[10px] font-mono text-muted-foreground font-bold">
                    Area: <strong className="text-foreground">{areaSqFt.toFixed(2)} Sq.Ft</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="font-semibold text-foreground">Shutter Name / Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Main Shop Rolling Shutter"
                      value={shutterName}
                      onChange={(e) => setShutterName(e.target.value)}
                      className="w-full bg-secondary/35 border border-border rounded-xl px-3.5 py-2 text-xs text-foreground font-bold outline-none focus:border-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Width (Feet) *</label>
                    <input
                      type="number"
                      step="any"
                      min="0.1"
                      required
                      placeholder="10.0"
                      value={shutterWidth}
                      onChange={(e) => setShutterWidth(e.target.value)}
                      className="w-full bg-secondary/35 border border-border rounded-xl px-3.5 py-2 text-xs text-foreground font-bold font-mono outline-none focus:border-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Height (Feet) *</label>
                    <input
                      type="number"
                      step="any"
                      min="0.1"
                      required
                      placeholder="10.0"
                      value={shutterHeight}
                      onChange={(e) => setShutterHeight(e.target.value)}
                      className="w-full bg-secondary/35 border border-border rounded-xl px-3.5 py-2 text-xs text-foreground font-bold font-mono outline-none focus:border-primary"
                    />
                  </div>

                  <div className="sm:col-span-1 space-y-1">
                    <label className="font-semibold text-foreground">Quantity (Nos) *</label>
                    <input
                      type="number"
                      min="1"
                      required
                      placeholder="1"
                      value={shutterQty}
                      onChange={(e) => setShutterQty(e.target.value)}
                      className="w-full bg-secondary/35 border border-border rounded-xl px-3.5 py-2 text-xs text-foreground font-bold font-mono outline-none focus:border-primary"
                    />
                  </div>

                  <div className="sm:col-span-3 space-y-1">
                    <label className="font-semibold text-foreground">Notes / Fabrication Instructions</label>
                    <input
                      type="text"
                      placeholder="e.g. Side guide anchorage, motor box cover included..."
                      value={shutterNotes}
                      onChange={(e) => setShutterNotes(e.target.value)}
                      className="w-full bg-secondary/35 border border-border rounded-xl px-3.5 py-2 text-xs text-foreground outline-none focus:border-primary"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: Construction Materials */}
              <div className="border border-border/80 p-5 rounded-2xl bg-card space-y-4">
                <div className="flex justify-between items-center border-b border-border/50 pb-2">
                  <h4 className="font-bold text-xs text-foreground uppercase tracking-wider flex items-center gap-2">
                    <span className="bg-primary/10 text-primary px-2 py-0.5 rounded font-mono text-[10px] font-bold">
                      SECTION 2
                    </span>
                    <span>Construction Materials (Loaded from Master Data)</span>
                  </h4>
                  <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Auto-Loaded Master Rates
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  
                  {/* GI Sheet Material */}
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground flex justify-between">
                      <span>GI Sheet Material</span>
                      <span className="text-[9px] text-muted-foreground font-mono font-medium">Material Types</span>
                    </label>
                    <select
                      value={giMaterial}
                      onChange={(e) => setGiMaterial(e.target.value)}
                      className="w-full bg-secondary/35 border border-border rounded-xl px-3.5 py-2 text-xs text-foreground font-bold outline-none focus:border-primary cursor-pointer"
                    >
                      {getOptions("Material Types").map((opt) => (
                        <option key={opt} value={opt} className="bg-card text-foreground">{opt}</option>
                      ))}
                    </select>
                  </div>

                  {/* GI Sheet Thickness */}
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground flex justify-between">
                      <span>GI Sheet Thickness</span>
                      <span className="text-[9px] text-muted-foreground font-mono font-medium">Thickness</span>
                    </label>
                    <select
                      value={giThickness}
                      onChange={(e) => setGiThickness(e.target.value)}
                      className="w-full bg-secondary/35 border border-border rounded-xl px-3.5 py-2 text-xs text-foreground font-bold outline-none focus:border-primary cursor-pointer"
                    >
                      {getOptions("Thickness").map((opt) => (
                        <option key={opt} value={opt} className="bg-card text-foreground">{opt}</option>
                      ))}
                    </select>
                  </div>

                  {/* GI Sheet Profile */}
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground flex justify-between">
                      <span>GI Sheet Profile</span>
                      <span className="text-[9px] text-muted-foreground font-mono font-medium">Profiles</span>
                    </label>
                    <select
                      value={giProfile}
                      onChange={(e) => setGiProfile(e.target.value)}
                      className="w-full bg-secondary/35 border border-border rounded-xl px-3.5 py-2 text-xs text-foreground font-bold outline-none focus:border-primary cursor-pointer"
                    >
                      {getOptions("Profiles").map((opt) => (
                        <option key={opt} value={opt} className="bg-card text-foreground">{opt}</option>
                      ))}
                    </select>
                  </div>

                  {/* Motor */}
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground flex justify-between">
                      <span>Motor Variant</span>
                      <span className="text-[9px] text-muted-foreground font-mono font-medium">Motor Options</span>
                    </label>
                    <select
                      value={motorVariant}
                      onChange={(e) => setMotorVariant(e.target.value)}
                      className="w-full bg-secondary/35 border border-border rounded-xl px-3.5 py-2 text-xs text-foreground font-bold outline-none focus:border-primary cursor-pointer"
                    >
                      {getOptions("Motor Brands").map((opt) => (
                        <option key={opt} value={opt} className="bg-card text-foreground">{opt}</option>
                      ))}
                    </select>
                  </div>

                  {/* Pipe */}
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground flex justify-between">
                      <span>Pipe Variant</span>
                      <span className="text-[9px] text-muted-foreground font-mono font-medium">Pipes</span>
                    </label>
                    <select
                      value={pipeVariant}
                      onChange={(e) => setPipeVariant(e.target.value)}
                      className="w-full bg-secondary/35 border border-border rounded-xl px-3.5 py-2 text-xs text-foreground font-bold outline-none focus:border-primary cursor-pointer"
                    >
                      {getOptions("Pipes").map((opt) => (
                        <option key={opt} value={opt} className="bg-card text-foreground">{opt}</option>
                      ))}
                    </select>
                  </div>

                  {/* Spring */}
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground flex justify-between">
                      <span>Spring Variant</span>
                      <span className="text-[9px] text-muted-foreground font-mono font-medium">Springs</span>
                    </label>
                    <select
                      value={springVariant}
                      onChange={(e) => setSpringVariant(e.target.value)}
                      className="w-full bg-secondary/35 border border-border rounded-xl px-3.5 py-2 text-xs text-foreground font-bold outline-none focus:border-primary cursor-pointer"
                    >
                      {getOptions("Springs").map((opt) => (
                        <option key={opt} value={opt} className="bg-card text-foreground">{opt}</option>
                      ))}
                    </select>
                  </div>

                  {/* Guide */}
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground flex justify-between">
                      <span>Guide Variant</span>
                      <span className="text-[9px] text-muted-foreground font-mono font-medium">Guides</span>
                    </label>
                    <select
                      value={guideVariant}
                      onChange={(e) => setGuideVariant(e.target.value)}
                      className="w-full bg-secondary/35 border border-border rounded-xl px-3.5 py-2 text-xs text-foreground font-bold outline-none focus:border-primary cursor-pointer"
                    >
                      {getOptions("Guides").map((opt) => (
                        <option key={opt} value={opt} className="bg-card text-foreground">{opt}</option>
                      ))}
                    </select>
                  </div>

                  {/* Bracket */}
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground flex justify-between">
                      <span>Bracket Variant</span>
                      <span className="text-[9px] text-muted-foreground font-mono font-medium">Brackets</span>
                    </label>
                    <select
                      value={bracketVariant}
                      onChange={(e) => setBracketVariant(e.target.value)}
                      className="w-full bg-secondary/35 border border-border rounded-xl px-3.5 py-2 text-xs text-foreground font-bold outline-none focus:border-primary cursor-pointer"
                    >
                      {getOptions("Brackets").map((opt) => (
                        <option key={opt} value={opt} className="bg-card text-foreground">{opt}</option>
                      ))}
                    </select>
                  </div>

                  {/* Wheel */}
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground flex justify-between">
                      <span>Wheel Variant</span>
                      <span className="text-[9px] text-muted-foreground font-mono font-medium">Wheels</span>
                    </label>
                    <select
                      value={wheelVariant}
                      onChange={(e) => setWheelVariant(e.target.value)}
                      className="w-full bg-secondary/35 border border-border rounded-xl px-3.5 py-2 text-xs text-foreground font-bold outline-none focus:border-primary cursor-pointer"
                    >
                      {getOptions("Wheels").map((opt) => (
                        <option key={opt} value={opt} className="bg-card text-foreground">{opt}</option>
                      ))}
                    </select>
                  </div>

                  {/* Kabadi */}
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground flex justify-between">
                      <span>Kabadi Variant</span>
                      <span className="text-[9px] text-muted-foreground font-mono font-medium">Kabadi</span>
                    </label>
                    <select
                      value={kabadiVariant}
                      onChange={(e) => setKabadiVariant(e.target.value)}
                      className="w-full bg-secondary/35 border border-border rounded-xl px-3.5 py-2 text-xs text-foreground font-bold outline-none focus:border-primary cursor-pointer"
                    >
                      {getOptions("Kabadi").map((opt) => (
                        <option key={opt} value={opt} className="bg-card text-foreground">{opt}</option>
                      ))}
                    </select>
                  </div>

                  {/* Top Cap */}
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground flex justify-between">
                      <span>Top Cap Variant</span>
                      <span className="text-[9px] text-muted-foreground font-mono font-medium">Top Caps</span>
                    </label>
                    <select
                      value={topCapVariant}
                      onChange={(e) => setTopCapVariant(e.target.value)}
                      className="w-full bg-secondary/35 border border-border rounded-xl px-3.5 py-2 text-xs text-foreground font-bold outline-none focus:border-primary cursor-pointer"
                    >
                      {getOptions("Top Caps").map((opt) => (
                        <option key={opt} value={opt} className="bg-card text-foreground">{opt}</option>
                      ))}
                    </select>
                  </div>

                  {/* Handle */}
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground flex justify-between">
                      <span>Handle Variant</span>
                      <span className="text-[9px] text-muted-foreground font-mono font-medium">Handles</span>
                    </label>
                    <select
                      value={handleVariant}
                      onChange={(e) => setHandleVariant(e.target.value)}
                      className="w-full bg-secondary/35 border border-border rounded-xl px-3.5 py-2 text-xs text-foreground font-bold outline-none focus:border-primary cursor-pointer"
                    >
                      {getOptions("Handles").map((opt) => (
                        <option key={opt} value={opt} className="bg-card text-foreground">{opt}</option>
                      ))}
                    </select>
                  </div>

                  {/* Lock Set */}
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground flex justify-between">
                      <span>Lock Variant</span>
                      <span className="text-[9px] text-muted-foreground font-mono font-medium">Locks</span>
                    </label>
                    <select
                      value={lockVariant}
                      onChange={(e) => setLockVariant(e.target.value)}
                      className="w-full bg-secondary/35 border border-border rounded-xl px-3.5 py-2 text-xs text-foreground font-bold outline-none focus:border-primary cursor-pointer"
                    >
                      {getOptions("Locks").map((opt) => (
                        <option key={opt} value={opt} className="bg-card text-foreground">{opt}</option>
                      ))}
                    </select>
                  </div>

                  {/* Fittings */}
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground flex justify-between">
                      <span>Fittings Variant</span>
                      <span className="text-[9px] text-muted-foreground font-mono font-medium">Fittings</span>
                    </label>
                    <select
                      value={fittingsVariant}
                      onChange={(e) => setFittingsVariant(e.target.value)}
                      className="w-full bg-secondary/35 border border-border rounded-xl px-3.5 py-2 text-xs text-foreground font-bold outline-none focus:border-primary cursor-pointer"
                    >
                      {getOptions("Fittings").map((opt) => (
                        <option key={opt} value={opt} className="bg-card text-foreground">{opt}</option>
                      ))}
                    </select>
                  </div>

                  {/* Color */}
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground flex justify-between">
                      <span>Color Variant</span>
                      <span className="text-[9px] text-muted-foreground font-mono font-medium">Color Finish</span>
                    </label>
                    <select
                      value={colorVariant}
                      onChange={(e) => setColorVariant(e.target.value)}
                      className="w-full bg-secondary/35 border border-border rounded-xl px-3.5 py-2 text-xs text-foreground font-bold outline-none focus:border-primary cursor-pointer"
                    >
                      {getOptions("Color").map((opt) => (
                        <option key={opt} value={opt} className="bg-card text-foreground">{opt}</option>
                      ))}
                    </select>
                  </div>

                </div>
              </div>

              {/* Financial Totals Bar at Bottom */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border border-border/80 p-5 rounded-2xl bg-secondary/15 items-center">
                
                {/* Discount & GST Controls */}
                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">Deduction Discount (₹)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0.00"
                      value={formDiscount}
                      onChange={(e) => setFormDiscount(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl px-3.5 py-2 text-xs outline-none text-foreground font-bold font-mono focus:border-primary text-right"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">GST Tax Toggle</label>
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
                        <option value="5">5% GST</option>
                        <option value="12">12% GST</option>
                        <option value="18">18% GST</option>
                        <option value="28">28% GST</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Live Calculated Stats Box */}
                <div className="bg-card border border-border p-4 rounded-xl space-y-2 font-mono">
                  <div className="flex justify-between items-center text-xs text-slate-400 font-sans font-medium">
                    <span>Total Area:</span>
                    <strong className="text-foreground font-mono">{areaSqFt.toFixed(2)} Sq.Ft</strong>
                  </div>

                  <div className="flex justify-between items-center text-xs text-slate-400 font-sans font-medium">
                    <span>Rate per Sq.Ft:</span>
                    <strong className="text-primary font-mono font-bold">₹{ratePerSqFt.toLocaleString("en-IN")} / Sq.Ft</strong>
                  </div>

                  <div className="flex justify-between items-center text-xs text-slate-400 font-sans font-medium">
                    <span>Shutter Subtotal:</span>
                    <strong className="text-foreground font-mono">₹{shutterNetSubtotal.toLocaleString("en-IN")}</strong>
                  </div>

                  <div className="pt-2 border-t border-border/60 flex justify-between items-baseline font-sans">
                    <span className="text-xs font-bold text-foreground uppercase tracking-wider">Grand Total</span>
                    <span className="text-2xl font-black text-foreground font-mono tracking-tight">
                      ₹{shutterNetGrandTotal.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

              </div>

              {/* Actions Footer */}
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
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-8 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/20 cursor-pointer hover:scale-[1.01] transition-all"
                >
                  <Check className="w-4 h-4" />
                  <span>Save & Generate Shutter Quotation</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* VIEW QUOTATION DETAILS DRAWER & PDF PREVIEW */}
      {selectedQuote && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-[70] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="w-full max-w-4xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto">
            
            {/* Header Toolbar */}
            <div className="p-4 border-b border-border flex justify-between items-center bg-secondary/20">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedQuote(null)}
                  className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h3 className="font-heading font-bold text-sm text-foreground flex items-center gap-2">
                    <span>Quotation {selectedQuote.quoteNumber}</span>
                    <span className="text-[10px] font-mono font-bold bg-primary/10 text-primary px-2 py-0.5 rounded">
                      v{selectedQuote.version}
                    </span>
                  </h3>
                  <p className="text-[10px] text-muted-foreground">Created: {new Date(selectedQuote.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="bg-secondary hover:bg-secondary/80 text-foreground font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 border cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print PDF</span>
                </button>
                <button
                  onClick={() => setSelectedQuote(null)}
                  className="p-1.5 hover:bg-secondary text-muted-foreground hover:text-foreground rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable PDF Template Body */}
            <div className="p-8 overflow-y-auto bg-white text-slate-900 space-y-6 font-sans">
              
              {/* Branding Header */}
              <div className="flex justify-between items-start border-b border-slate-200 pb-6">
                <div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight">
                    {branding?.companyName || "Kohinoor Rolling Shutters"}
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">Specialists in Industrial & Commercial Rolling Shutters</p>
                  {branding?.gstNumber && (
                    <p className="text-xs text-slate-500 font-mono mt-0.5">GSTIN: {branding.gstNumber}</p>
                  )}
                </div>

                <div className="text-right">
                  <span className="text-sm font-bold uppercase tracking-wider text-slate-400 block font-mono">
                    QUOTATION PROPOSAL
                  </span>
                  <span className="text-lg font-black text-slate-900 font-mono block">
                    {selectedQuote.quoteNumber}
                  </span>
                  <span className="text-xs text-slate-500 block font-mono mt-1">
                    Date: {new Date(selectedQuote.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Customer Details & Site Location */}
              <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl text-xs border border-slate-200/80">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block mb-1">
                    CUSTOMER BILLING TO
                  </span>
                  <div className="font-bold text-slate-900 text-sm">{selectedQuote.customer?.name || "N/A"}</div>
                  {selectedQuote.customer?.companyName && (
                    <div className="font-semibold text-slate-700">{selectedQuote.customer.companyName}</div>
                  )}
                  <div className="text-slate-600 mt-1 leading-relaxed">{selectedQuote.customer?.billingAddress}</div>
                  <div className="text-slate-600 font-mono mt-1">Phone: {selectedQuote.customer?.phone}</div>
                </div>

                <div className="text-right flex flex-col items-end justify-between">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block mb-1">
                      PROPOSAL STAGE
                    </span>
                    <span className="inline-block bg-slate-900 text-white font-mono font-bold px-2.5 py-0.5 rounded text-xs uppercase">
                      {selectedQuote.status}
                    </span>
                  </div>

                  {qrCodeUrl && (
                    <div className="flex flex-col items-end gap-1 pt-2">
                      <img src={qrCodeUrl} alt="UPI Payment QR" className="w-16 h-16 border rounded" />
                      <span className="text-[9px] text-slate-400 font-mono">Scan for Advance Payment</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Configuration Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 font-mono uppercase text-[9px] tracking-wider border-b border-slate-200">
                      <th className="p-3 w-12 text-center">S.No</th>
                      <th className="p-3">Shutter Description & Material Specification</th>
                      <th className="p-3 w-28 text-center font-mono">Quantity</th>
                      <th className="p-3 w-28 text-right font-mono">Rate/Sq.Ft (₹)</th>
                      <th className="p-3 w-32 text-right font-mono">Total Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800">
                    {selectedQuote.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="p-3 text-center font-mono text-slate-400">{idx + 1}</td>
                        <td className="p-3">
                          <div className="font-bold text-slate-900 text-sm">{item.productName}</div>
                          <div className="text-xs text-slate-600 mt-1 font-medium leading-relaxed">
                            {getVariantSummary(item)}
                          </div>
                        </td>
                        <td className="p-3 text-center font-bold font-mono">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="p-3 text-right font-mono font-bold">
                          ₹{item.unitPrice.toLocaleString("en-IN")}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900">
                          ₹{item.lineTotal.toLocaleString("en-IN")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals Summary */}
              <div className="flex justify-between items-start gap-6 pt-4 border-t border-slate-200">
                <div className="w-2/3 space-y-2 text-xs text-slate-600">
                  <span className="font-bold text-slate-900 uppercase font-mono tracking-wider block text-[10px]">
                    Terms & Conditions
                  </span>
                  <p className="whitespace-pre-line leading-relaxed text-[11px] bg-slate-50 p-3 rounded-lg border">
                    {selectedQuote.terms || branding?.quotationTerms}
                  </p>
                </div>

                <div className="w-1/3 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 font-mono text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal</span>
                    <span className="font-bold text-slate-900">₹{(selectedQuote.totalAmount - selectedQuote.gstAmount + selectedQuote.discount).toLocaleString("en-IN")}</span>
                  </div>

                  {selectedQuote.discount > 0 && (
                    <div className="flex justify-between text-rose-600">
                      <span>Discount</span>
                      <span>- ₹{selectedQuote.discount.toLocaleString("en-IN")}</span>
                    </div>
                  )}

                  {selectedQuote.gstAmount > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>GST Tax ({selectedQuote.gstRate}%)</span>
                      <span>₹{Math.round(selectedQuote.gstAmount).toLocaleString("en-IN")}</span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-300 flex justify-between items-baseline font-sans">
                    <span className="font-bold text-slate-900 uppercase text-xs">Estimated Grand Total</span>
                    <span className="text-xl font-black text-slate-900 font-mono">
                      ₹{selectedQuote.totalAmount.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Signatures Footer */}
              <div className="pt-8 border-t border-slate-200 flex justify-between items-end text-xs text-slate-500">
                <div>
                  <p>Accepted & Confirmed by Client Signature</p>
                  <div className="h-10 border-b border-dashed border-slate-300 w-48 mt-2"></div>
                </div>

                <div className="text-right">
                  <p className="font-bold text-slate-900">{branding?.companyName || "Kohinoor Rolling Shutters"}</p>
                  <p className="text-[10px] text-slate-400 mt-6">Authorized Signatory Signature</p>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
