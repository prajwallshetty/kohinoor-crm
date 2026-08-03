"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  FileText, Plus, Search, Trash2, Printer, ArrowLeft, RefreshCw,
  MessageSquare, Mail, Receipt, X, Sparkles, Check, UserPlus, Sliders,
  BookOpen, Building2, Wrench, Eye
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { PageSkeleton } from "@/components/ui/loaders";
import QRCode from "qrcode";
import { generateAndSharePDF } from "@/lib/share-pdf";
import { generateQuotation, type QuotationTemplate } from "@/lib/rule-engine";
import { SearchableSelect, type SelectOption } from "@/components/ui/searchable-select";

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

const BOOK_NUMBER_OPTIONS: SelectOption[] = [
  { value: "Book 1", label: "Book 1" },
  { value: "Book 2", label: "Book 2" },
  { value: "Book 3", label: "Book 3" },
];

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
  const [printType, setPrintType] = useState<"normal" | "bold_gaps" | "spring_handle">("normal");
  const [printItems, setPrintItems] = useState<any[]>([]);
  const [qrCodeUrl, setQrCodeUrl] = useState("");

  // Create Flow State
  const [showAddQuote, setShowAddQuote] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [formCustId, setFormCustId] = useState("");

  // New Customer Fields
  const [newCustName, setNewCustName] = useState("");
  const [newCustCompanyName, setNewCustCompanyName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustBilling, setNewCustBilling] = useState("");

  // Workflow Fields
  const [bookNumber, setBookNumber] = useState("Book 1");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [quotationDate, setQuotationDate] = useState(() => new Date().toISOString().slice(0, 10));

  // Dimensions
  const [specWidth, setSpecWidth] = useState("120");
  const [specHeight, setSpecHeight] = useState("84");
  const [specQty, setSpecQty] = useState("1");

  // Material Configuration Dropdowns State (17 Master Data fields)
  const [specSheetMaterial, setSpecSheetMaterial] = useState("");
  const [specThickness, setSpecThickness] = useState("");
  const [specProfile, setSpecProfile] = useState("");
  const [specBottomPlate, setSpecBottomPlate] = useState("");
  const [specPipe, setSpecPipe] = useState("");
  const [specGuideChannel, setSpecGuideChannel] = useState("");
  const [specSpring1, setSpecSpring1] = useState("");
  const [specSpring2, setSpecSpring2] = useState("");
  const [specSpring3, setSpecSpring3] = useState("");
  const [specBracket, setSpecBracket] = useState("");
  const [specWheel, setSpecWheel] = useState("");
  const [specKabadi, setSpecKabadi] = useState("");
  const [specHandle, setSpecHandle] = useState("");
  const [specLockSet, setSpecLockSet] = useState("");
  const [specFittings, setSpecFittings] = useState("");
  const [specMotor, setSpecMotor] = useState("");
  const [specTopCover, setSpecTopCover] = useState("");

  // Financials & Terms
  const [formDiscount, setFormDiscount] = useState("0");
  const [formGstOff, setFormGstOff] = useState(true);
  const [formGstRate, setFormGstRate] = useState("18");
  const [formStatus, setFormStatus] = useState<"DRAFT" | "SENT" | "APPROVED" | "REJECTED">("DRAFT");
  const [formTerms, setFormTerms] = useState("");

  // Generated Items & Results
  const [generated, setGenerated] = useState(false);
  const [genLines, setGenLines] = useState<GenLine[]>([]);
  const [genWarnings, setGenWarnings] = useState<string[]>([]);
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
        setFormTerms(bData.quotationTerms || "1. Validity: 30 Days.\n2. Payment: 50% advance, balance on delivery.\n3. Goods once sold will not be taken back.");
      }
    } catch (e) {}
    if (showLoading) setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedQuote) {
      setPrintItems(selectedQuote.items || []);
    } else {
      setPrintItems([]);
    }
  }, [selectedQuote]);

  const handleRemovePrintItem = (itemToRemove: any) => {
    setPrintItems((prev) => prev.filter((item) => item !== itemToRemove));
  };

  // Helper to extract dropdown options from Master Data
  const getMasterOptions = (categoryNames: string[]): SelectOption[] => {
    const categoriesLower = categoryNames.map((c) => c.toLowerCase());
    const items = masterItems.filter(
      (item) => !item.isDisabled && categoriesLower.includes((item.category || "").trim().toLowerCase())
    );
    const uniqueMap = new Map<string, SelectOption>();
    items.forEach((item) => {
      if (!uniqueMap.has(item.name)) {
        uniqueMap.set(item.name, {
          value: item.name,
          label: item.name,
          sublabel: item.rate > 0 ? `₹${item.rate}/${item.unit || "Pcs"}` : undefined,
        });
      }
    });
    return Array.from(uniqueMap.values());
  };

  // Master Data options for all 17 configuration fields
  const sheetOptions = useMemo(() => getMasterOptions(["Material Types", "Material", "Sheet Material"]), [masterItems]);
  const thicknessOptions = useMemo(() => getMasterOptions(["Thickness"]), [masterItems]);
  const profileOptions = useMemo(() => getMasterOptions(["Profiles", "Profile"]), [masterItems]);
  const bottomPlateOptions = useMemo(() => getMasterOptions(["Bottom Plate", "BP"]), [masterItems]);
  const pipeOptions = useMemo(() => getMasterOptions(["Pipes", "Pipe", "Motor Pipe"]), [masterItems]);
  const guideOptions = useMemo(() => getMasterOptions(["Guide Channel", "Guides", "Guide"]), [masterItems]);
  const springOptions = useMemo(() => getMasterOptions(["Spring 1", "Spring 2", "Spring 3", "Springs", "Spring"]), [masterItems]);
  const spring3Options = useMemo(() => [{ value: "None", label: "None" }, ...springOptions], [springOptions]);
  const bracketOptions = useMemo(() => getMasterOptions(["Brackets", "Bracket", "BR", "Patti Bracket"]), [masterItems]);
  const wheelOptions = useMemo(() => getMasterOptions(["Wheels", "Wheel"]), [masterItems]);
  const kabadiOptions = useMemo(() => getMasterOptions(["Kabadi"]), [masterItems]);
  const handleOptions = useMemo(() => getMasterOptions(["Handles", "Handle"]), [masterItems]);
  const lockOptions = useMemo(() => getMasterOptions(["Lock Set", "Locks", "Lock"]), [masterItems]);
  const fittingsOptions = useMemo(() => getMasterOptions(["Fittings"]), [masterItems]);
  const motorOptions = useMemo(() => [{ value: "None", label: "None" }, ...getMasterOptions(["Motor", "Motor Brands", "Motor Models"])], [masterItems]);
  const topCoverOptions = useMemo(() => getMasterOptions(["Top Caps", "Top Cap", "Top Cover"]), [masterItems]);

  const activeTemplates = templates.filter((t) => t.active !== false);

  // Set default selections when template or master options load
  useEffect(() => {
    if (!selectedTemplateId && activeTemplates.length > 0) {
      setSelectedTemplateId(activeTemplates[0].id);
    }
  }, [activeTemplates, selectedTemplateId]);

  useEffect(() => {
    if (sheetOptions.length > 0 && !specSheetMaterial) setSpecSheetMaterial(sheetOptions[0].value);
    if (thicknessOptions.length > 0 && !specThickness) setSpecThickness(thicknessOptions[0].value);
    if (profileOptions.length > 0 && !specProfile) setSpecProfile(profileOptions[0].value);
    if (bottomPlateOptions.length > 0 && !specBottomPlate) setSpecBottomPlate(bottomPlateOptions[0].value);
    if (pipeOptions.length > 0 && !specPipe) setSpecPipe(pipeOptions[0].value);
    if (guideOptions.length > 0 && !specGuideChannel) setSpecGuideChannel(guideOptions[0].value);
    if (springOptions.length > 0 && !specSpring1) setSpecSpring1(springOptions[0].value);
    if (springOptions.length > 1 && !specSpring2) setSpecSpring2(springOptions[1].value || springOptions[0].value);
    if (!specSpring3) setSpecSpring3("None");
    if (bracketOptions.length > 0 && !specBracket) setSpecBracket(bracketOptions[0].value);
    if (wheelOptions.length > 0 && !specWheel) setSpecWheel(wheelOptions[0].value);
    if (kabadiOptions.length > 0 && !specKabadi) setSpecKabadi(kabadiOptions[0].value);
    if (handleOptions.length > 0 && !specHandle) setSpecHandle(handleOptions[0].value);
    if (lockOptions.length > 0 && !specLockSet) setSpecLockSet(lockOptions[0].value);
    if (fittingsOptions.length > 0 && !specFittings) setSpecFittings(fittingsOptions[0].value);
    if (!specMotor) setSpecMotor("None");
    if (topCoverOptions.length > 0 && !specTopCover) setSpecTopCover(topCoverOptions[0].value);
  }, [
    sheetOptions, thicknessOptions, profileOptions, bottomPlateOptions, pipeOptions,
    guideOptions, springOptions, bracketOptions, wheelOptions, kabadiOptions,
    handleOptions, lockOptions, fittingsOptions, topCoverOptions
  ]);

  const resetCreateForm = () => {
    setGenerated(false);
    setGenLines([]);
    setGenWarnings([]);
    setFormCustId("");
    setIsNewCustomer(false);
    setNewCustName("");
    setNewCustCompanyName("");
    setNewCustPhone("");
    setNewCustBilling("");
    setFormDiscount("0");
    setFormGstOff(true);
    setBookNumber("Book 1");
    if (activeTemplates.length > 0) setSelectedTemplateId(activeTemplates[0].id);
    setQuotationDate(new Date().toISOString().slice(0, 10));
  };

  const openCreate = () => {
    resetCreateForm();
    setShowAddQuote(true);
  };

  // Generate Quotation from Master Data & Engine Rules
  const handleGenerate = () => {
    const tpl = templates.find((t) => t.id === selectedTemplateId);
    const templateName = tpl ? tpl.name : "Normal Shutter";

    const width = parseFloat(specWidth) || 0;
    const height = parseFloat(specHeight) || 0;
    const qty = parseInt(specQty) || 1;

    let lines: GenLine[] = [];

    if (tpl && tpl.rules && tpl.rules.length > 0) {
      const result = generateQuotation(
        tpl,
        {
          width,
          height,
          quantity: qty,
          material: specSheetMaterial,
          thickness: specThickness,
          profile: specProfile,
          pipeSize: specPipe,
          springType: specSpring1,
          motorType: specMotor,
        },
        masterItems
      );
      lines = result.lines.map((l) => ({
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
      }));
      setGenWarnings(result.warnings);
    } else {
      // Direct Material Configuration line generation if template rules are generic/empty
      const areaSft = Math.round((width * height) / 144 * 100) / 100;
      const findRate = (catNames: string[], varName: string) => {
        const catLower = catNames.map(c => c.toLowerCase());
        const match = masterItems.find(
          (m) => !m.isDisabled && catLower.includes((m.category || "").toLowerCase()) && (m.name || "").toLowerCase() === varName.toLowerCase()
        );
        return match ? match.rate : 0;
      };

      const sheetRate = findRate(["Material Types", "Material"], specSheetMaterial) || 85;
      const pipeRate = findRate(["Pipes", "Pipe"], specPipe) || 90;
      const guideRate = findRate(["Guide Channel", "Guides"], specGuideChannel) || 80;
      const spring1Rate = findRate(["Spring 1", "Springs"], specSpring1) || 186;
      const spring2Rate = findRate(["Spring 2", "Springs"], specSpring2) || 150;
      const bracketRate = findRate(["Brackets", "Bracket"], specBracket) || 450;
      const wheelRate = findRate(["Wheels", "Wheel"], specWheel) || 240;
      const lockRate = findRate(["Lock Set", "Locks"], specLockSet) || 260;
      const handleRate = findRate(["Handles", "Handle"], specHandle) || 50;
      const fittingsRate = findRate(["Fittings"], specFittings) || 1000;
      const topCoverRate = findRate(["Top Caps", "Top Cover"], specTopCover) || 100;
      const motorRate = specMotor !== "None" ? findRate(["Motor"], specMotor) || 12000 : 0;

      lines = [
        {
          ruleId: "m-sheet",
          productName: `${templateName} GI Sheet Slats`,
          materialCategory: "Material Types",
          variant: specSheetMaterial,
          quantity: areaSft,
          unit: "Sft",
          unitPrice: sheetRate,
          lineTotal: Math.round(areaSft * sheetRate),
          description: `${width}" × ${height}" ${specSheetMaterial} (${specThickness}-${specProfile})`,
          formula: "(W * H) / 144",
          formulaResult: areaSft,
          editable: true,
        },
        {
          ruleId: "m-pipe",
          productName: "Pipe",
          materialCategory: "Pipes",
          variant: specPipe,
          quantity: Math.round(((width + 10) / 12) * 10) / 10,
          unit: "Ft",
          unitPrice: pipeRate,
          lineTotal: Math.round(((width + 10) / 12) * pipeRate),
          description: `Heavy Duty Pipe (${specPipe})`,
          formula: "(W + 10) / 12",
          formulaResult: Math.round((width + 10) / 12),
          editable: true,
        },
        {
          ruleId: "m-guide",
          productName: "Guide Channel",
          materialCategory: "Guide Channel",
          variant: specGuideChannel,
          quantity: Math.round(((height * 2) / 12) * 10) / 10,
          unit: "Ft",
          unitPrice: guideRate,
          lineTotal: Math.round(((height * 2) / 12) * guideRate),
          description: `Side Guide Channel (${specGuideChannel}) - 2 PCS`,
          formula: "(H * 2) / 12",
          formulaResult: Math.round((height * 2) / 12),
          editable: true,
        },
        {
          ruleId: "m-spring1",
          productName: "Spring 1",
          materialCategory: "Springs",
          variant: specSpring1,
          quantity: 2,
          unit: "Pcs",
          unitPrice: spring1Rate,
          lineTotal: 2 * spring1Rate,
          description: `Primary Tension Spring (${specSpring1})`,
          formula: "2",
          formulaResult: 2,
          editable: true,
        },
      ];

      if (specSpring2 && specSpring2 !== "None") {
        lines.push({
          ruleId: "m-spring2",
          productName: "Spring 2",
          materialCategory: "Springs",
          variant: specSpring2,
          quantity: 1,
          unit: "Pcs",
          unitPrice: spring2Rate,
          lineTotal: spring2Rate,
          description: `Secondary Tension Spring (${specSpring2})`,
          formula: "1",
          formulaResult: 1,
          editable: true,
        });
      }

      lines.push(
        {
          ruleId: "m-bracket",
          productName: "Bracket",
          materialCategory: "Brackets",
          variant: specBracket,
          quantity: 2,
          unit: "Pcs",
          unitPrice: bracketRate,
          lineTotal: 2 * bracketRate,
          description: `Mounting Brackets (${specBracket})`,
          formula: "2",
          formulaResult: 2,
          editable: true,
        },
        {
          ruleId: "m-wheel",
          productName: "Wheel",
          materialCategory: "Wheels",
          variant: specWheel,
          quantity: 3,
          unit: "Pcs",
          unitPrice: wheelRate,
          lineTotal: 3 * wheelRate,
          description: `Pulley Wheel (${specWheel})`,
          formula: "3",
          formulaResult: 3,
          editable: true,
        },
        {
          ruleId: "m-lock",
          productName: "Lock Set",
          materialCategory: "Lock Set",
          variant: specLockSet,
          quantity: 1,
          unit: "Set",
          unitPrice: lockRate,
          lineTotal: lockRate,
          description: `Central Shutter Lock (${specLockSet})`,
          formula: "1",
          formulaResult: 1,
          editable: true,
        },
        {
          ruleId: "m-handle",
          productName: "Handle",
          materialCategory: "Handles",
          variant: specHandle,
          quantity: 2,
          unit: "Pcs",
          unitPrice: handleRate,
          lineTotal: 2 * handleRate,
          description: `Pull Handles (${specHandle})`,
          formula: "2",
          formulaResult: 2,
          editable: true,
        },
        {
          ruleId: "m-fittings",
          productName: "Fittings & Accessories",
          materialCategory: "Fittings",
          variant: specFittings,
          quantity: 1,
          unit: "Set",
          unitPrice: fittingsRate,
          lineTotal: fittingsRate,
          description: `Fittings & Fasteners (${specFittings})`,
          formula: "1",
          formulaResult: 1,
          editable: true,
        },
        {
          ruleId: "m-topcover",
          productName: "Top Cover",
          materialCategory: "Top Caps",
          variant: specTopCover,
          quantity: 1,
          unit: "Pcs",
          unitPrice: topCoverRate,
          lineTotal: topCoverRate,
          description: `Hood / Top Cover (${specTopCover})`,
          formula: "1",
          formulaResult: 1,
          editable: true,
        }
      );

      if (specMotor && specMotor !== "None") {
        lines.push({
          ruleId: "m-motor",
          productName: "Motor Drive Unit",
          materialCategory: "Motor",
          variant: specMotor,
          quantity: 1,
          unit: "Set",
          unitPrice: motorRate,
          lineTotal: motorRate,
          description: `Electric Motor Drive (${specMotor})`,
          formula: "1",
          formulaResult: 1,
          editable: true,
        });
      }
    }

    setGenLines(lines);
    setGenerated(true);
    triggerToast("Quotation generated successfully!");
  };

  // Live Auto-generate preview on input change
  useEffect(() => {
    if (showAddQuote) {
      handleGenerate();
    }
  }, [
    showAddQuote, selectedTemplateId, specWidth, specHeight, specQty,
    specSheetMaterial, specThickness, specProfile, specBottomPlate, specPipe,
    specGuideChannel, specSpring1, specSpring2, specSpring3, specBracket,
    specWheel, specKabadi, specHandle, specLockSet, specFittings, specMotor, specTopCover
  ]);

  // Financial Calculations
  const subtotal = genLines.reduce((s, l) => s + l.lineTotal, 0);
  const discVal = parseFloat(formDiscount) || 0;
  const taxable = Math.max(0, subtotal - discVal);
  const gstRateVal = formGstOff ? 0 : parseFloat(formGstRate) || 18;
  const gstAmt = (taxable * gstRateVal) / 100;
  const grandTotal = Math.round(taxable + gstAmt);
  const roundOff = parseFloat((grandTotal - (taxable + gstAmt)).toFixed(2));

  // Customer options for searchable select
  const customerOptions: SelectOption[] = customers.map((c) => ({
    value: c.id,
    label: c.name,
    sublabel: `${c.phone}${c.companyName ? ` • ${c.companyName}` : ""}`,
  }));

  const templateOptions: SelectOption[] = [
    { value: templates.find((t) => t.name === "Normal Shutter")?.id || "normal", label: "Normal Shutter" },
    { value: templates.find((t) => t.name === "Gear Shutter")?.id || "gear", label: "Gear Shutter" },
    { value: templates.find((t) => t.name === "Motorized Shutter")?.id || "motorized", label: "Motorized Shutter" },
    { value: templates.find((t) => t.name === "Custom Shutter")?.id || "custom", label: "Custom Shutter" },
  ];

  // Save Quotation Handler
  const handleSaveQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!isNewCustomer && !formCustId) {
      alert("Please select a customer.");
      return;
    }
    if (isNewCustomer && (!newCustName || !newCustPhone || !newCustBilling)) {
      alert("Customer Name, Phone and Billing Address are required.");
      return;
    }

    setIsSubmitting(true);
    try {
      let activeCustId = formCustId;

      if (isNewCustomer) {
        const cRes = await fetch("/api/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newCustName,
            companyName: newCustCompanyName || undefined,
            phone: newCustPhone,
            billingAddress: newCustBilling,
            type: newCustCompanyName ? "COMPANY" : "INDIVIDUAL",
          }),
        });
        if (cRes.ok) {
          const newCust = await cRes.json();
          activeCustId = newCust.id;
        } else {
          alert("Failed to create customer record.");
          setIsSubmitting(false);
          return;
        }
      }

      const tpl = templates.find((t) => t.id === selectedTemplateId);
      const payload = {
        customerId: activeCustId,
        quotationDate,
        bookNumber,
        status: formStatus,
        discount: discVal,
        gstRate: gstRateVal,
        gstAmount: gstAmt,
        totalAmount: grandTotal,
        terms: formTerms,
        templateId: tpl?.id || null,
        templateName: tpl?.name || "Normal Shutter",
        items: genLines.map((l) => ({
          productName: l.productName,
          materialCategory: l.materialCategory,
          material: specSheetMaterial,
          thickness: specThickness,
          profile: specProfile,
          width: parseFloat(specWidth) || 0,
          height: parseFloat(specHeight) || 0,
          shutterName: l.variant,
          quantity: l.quantity,
          unit: l.unit,
          unitPrice: l.unitPrice,
          lineTotal: l.lineTotal,
        })),
      };

      const res = await fetch("/api/quotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const saved = await res.json();
        triggerToast(`Quotation ${saved.quoteNumber} saved successfully!`);
        setShowAddQuote(false);
        fetchData(false);
        setSelectedQuote(saved);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to save quotation");
      }
    } catch (e) {
      alert("Error saving quotation.");
    }
    setIsSubmitting(false);
  };

  const handlePrintQuotation = () => {
    document.body.classList.add("print-half-a4");
    window.print();
    setTimeout(() => {
      document.body.classList.remove("print-half-a4");
    }, 1000);
  };

  const activeCustomerObj = customers.find((c) => c.id === formCustId);
  const displayCustomerName = isNewCustomer
    ? newCustName || "Client Name"
    : activeCustomerObj?.name || "Select Customer";

  const displayedItems = React.useMemo(() => {
    if (!printItems) return [];

    if (printType === "spring_handle") {
      return printItems.filter((item: any) => {
        const cat = (item.materialCategory || "").toLowerCase();
        const prod = (item.productName || "").toLowerCase();
        const rule = (item.ruleId || "").toLowerCase();

        const isSpring = cat.includes("spring") || prod.includes("spring") || rule.includes("spring");
        const isBracket = cat.includes("bracket") || prod.includes("bracket") || rule.includes("bracket");
        const isWheel = cat.includes("wheel") || prod.includes("wheel") || rule.includes("wheel");
        const isLock = cat.includes("lock") || prod.includes("lock") || rule.includes("lock");
        const isHandle = cat.includes("handle") || prod.includes("handle") || rule.includes("handle");

        return isSpring || isBracket || isWheel || isLock || isHandle;
      });
    }

    return printItems;
  }, [printItems, printType]);

  const groupedFormattedItems = React.useMemo(() => {
    if (!printItems || printType !== "bold_gaps") return null;

    const isBold = (item: any) => {
      const cat = (item.materialCategory || "").toLowerCase();
      const prod = (item.productName || "").toLowerCase();
      const rule = (item.ruleId || "").toLowerCase();
      
      return cat.includes("material") || cat.includes("pipe") || cat.includes("guide") ||
             prod.includes("slat") || prod.includes("sheet") || prod.includes("pipe") || prod.includes("guide") ||
             rule.includes("sheet") || rule.includes("pipe") || rule.includes("guide");
    };

    const isEnd = (item: any) => {
      const cat = (item.materialCategory || "").toLowerCase();
      const prod = (item.productName || "").toLowerCase();
      const rule = (item.ruleId || "").toLowerCase();
      
      return cat.includes("handle") || cat.includes("top cap") || cat.includes("cover") ||
             prod.includes("handle") || prod.includes("top cover") ||
             rule.includes("handle") || rule.includes("topcover");
    };

    const boldItems = printItems.filter(isBold);
    const endItems = printItems.filter(isEnd);
    const middleItems = printItems.filter((item: any) => !isBold(item) && !isEnd(item));

    return { boldItems, middleItems, endItems };
  }, [printItems, printType]);

  const printedSubtotal = React.useMemo(() => {
    return displayedItems.reduce((s, i) => s + (i.lineTotal || 0), 0);
  }, [displayedItems]);

  const printedGstAmount = React.useMemo(() => {
    if (!selectedQuote) return 0;
    const rate = selectedQuote.gstRate || 0;
    return Math.round(printedSubtotal * (rate / 100));
  }, [selectedQuote, printedSubtotal]);

  const printedTotalAmount = React.useMemo(() => {
    if (!selectedQuote) return 0;
    const discount = selectedQuote.discount || 0;
    const base = Math.max(0, printedSubtotal - discount);
    return Math.round(base + printedGstAmount);
  }, [selectedQuote, printedSubtotal, printedGstAmount]);

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 border border-slate-700 animate-fade-in">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/60 pb-4 print-hidden print:!hidden">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            <span>Quotation Manager</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Fast 1-minute quotation generator powered 100% by Master Data & Print Templates
          </p>
        </div>

        {!showAddQuote && !selectedQuote && (
          <button
            onClick={openCreate}
            className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold text-xs py-2 px-4 rounded-xl flex items-center gap-2 shadow-lg shadow-primary/25 cursor-pointer transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Quotation</span>
          </button>
        )}
      </div>

      {/* CREATE QUOTATION MODE: Streamlined 2-Column ERP Form */}
      {showAddQuote ? (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-card/60 border border-border/80 p-3.5 rounded-xl print-hidden print:!hidden">
            <button
              onClick={() => setShowAddQuote(false)}
              className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Quotations Ledger</span>
            </button>
            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
              <BookOpen className="w-3.5 h-3.5 text-primary" />
              <span>{bookNumber}</span> • <span>{quotationDate}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT COLUMN: Fast ERP Form (Fits on one screen) */}
            <form onSubmit={handleSaveQuotation} className="lg:col-span-6 space-y-4 bg-card/80 border border-border/80 p-4 sm:p-5 rounded-xl shadow-lg backdrop-blur-md print-hidden print:!hidden">
              
              {/* STEP 1: Customer Selection */}
              <div className="space-y-2 border-b border-border/60 pb-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <UserPlus className="w-3.5 h-3.5 text-primary" />
                    <span>1. Customer</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsNewCustomer(!isNewCustomer)}
                    className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                  >
                    {isNewCustomer ? "Select Existing Customer" : "+ Add New Customer"}
                  </button>
                </div>

                {isNewCustomer ? (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <input
                      type="text"
                      placeholder="Customer Name *"
                      value={newCustName}
                      onChange={(e) => setNewCustName(e.target.value)}
                      required
                      className="px-2.5 py-1.5 bg-card border border-border/80 rounded-lg text-xs outline-none focus:border-primary"
                    />
                    <input
                      type="text"
                      placeholder="Phone *"
                      value={newCustPhone}
                      onChange={(e) => setNewCustPhone(e.target.value)}
                      required
                      className="px-2.5 py-1.5 bg-card border border-border/80 rounded-lg text-xs outline-none focus:border-primary"
                    />
                    <input
                      type="text"
                      placeholder="Company Name"
                      value={newCustCompanyName}
                      onChange={(e) => setNewCustCompanyName(e.target.value)}
                      className="px-2.5 py-1.5 bg-card border border-border/80 rounded-lg text-xs outline-none focus:border-primary"
                    />
                    <input
                      type="text"
                      placeholder="Billing Address *"
                      value={newCustBilling}
                      onChange={(e) => setNewCustBilling(e.target.value)}
                      required
                      className="px-2.5 py-1.5 bg-card border border-border/80 rounded-lg text-xs outline-none focus:border-primary"
                    />
                  </div>
                ) : (
                  <SearchableSelect
                    options={customerOptions}
                    value={formCustId}
                    onChange={setFormCustId}
                    placeholder="Search Customer by Name / Phone..."
                  />
                )}
              </div>

              {/* STEP 2 & 3: Book Number, Template & Dimensions Header */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border-b border-border/60 pb-3 text-xs">
                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Book Number</label>
                  <SearchableSelect
                    options={BOOK_NUMBER_OPTIONS}
                    value={bookNumber}
                    onChange={setBookNumber}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Template</label>
                  <SearchableSelect
                    options={templateOptions}
                    value={selectedTemplateId}
                    onChange={setSelectedTemplateId}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Width (in)</label>
                  <input
                    type="number"
                    value={specWidth}
                    onChange={(e) => setSpecWidth(e.target.value)}
                    className="w-full h-9 px-2.5 bg-card border border-border/80 rounded-lg text-xs font-bold outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Height (in)</label>
                  <input
                    type="number"
                    value={specHeight}
                    onChange={(e) => setSpecHeight(e.target.value)}
                    className="w-full h-9 px-2.5 bg-card border border-border/80 rounded-lg text-xs font-bold outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* STEP 4: Material Configuration - Clean Two-Column Layout of Searchable Dropdowns */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-primary" />
                    <span>Material Configuration (From Master Data)</span>
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">100% Dynamic</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-secondary/20 p-3 rounded-xl border border-border/60">
                  <SearchableSelect label="Sheet Material" options={sheetOptions} value={specSheetMaterial} onChange={setSpecSheetMaterial} />
                  <SearchableSelect label="Thickness" options={thicknessOptions} value={specThickness} onChange={setSpecThickness} />
                  <SearchableSelect label="Profile" options={profileOptions} value={specProfile} onChange={setSpecProfile} />
                  <SearchableSelect label="Bottom Plate" options={bottomPlateOptions} value={specBottomPlate} onChange={setSpecBottomPlate} />
                  <SearchableSelect label="Pipe" options={pipeOptions} value={specPipe} onChange={setSpecPipe} />
                  <SearchableSelect label="Guide Channel" options={guideOptions} value={specGuideChannel} onChange={setSpecGuideChannel} />
                  <SearchableSelect label="Spring 1" options={springOptions} value={specSpring1} onChange={setSpecSpring1} />
                  <SearchableSelect label="Spring 2" options={springOptions} value={specSpring2} onChange={setSpecSpring2} />
                  <SearchableSelect label="Spring 3" options={spring3Options} value={specSpring3} onChange={setSpecSpring3} />
                  <SearchableSelect label="Bracket" options={bracketOptions} value={specBracket} onChange={setSpecBracket} />
                  <SearchableSelect label="Wheel" options={wheelOptions} value={specWheel} onChange={setSpecWheel} />
                  <SearchableSelect label="Kabadi" options={kabadiOptions} value={specKabadi} onChange={setSpecKabadi} />
                  <SearchableSelect label="Handle" options={handleOptions} value={specHandle} onChange={setSpecHandle} />
                  <SearchableSelect label="Lock Set" options={lockOptions} value={specLockSet} onChange={setSpecLockSet} />
                  <SearchableSelect label="Fittings" options={fittingsOptions} value={specFittings} onChange={setSpecFittings} />
                  <SearchableSelect label="Motor" options={motorOptions} value={specMotor} onChange={setSpecMotor} />
                  <SearchableSelect label="Top Cover" options={topCoverOptions} value={specTopCover} onChange={setSpecTopCover} className="col-span-2 sm:col-span-1" />
                </div>
              </div>

              {/* Financial Discounts & Sticky Actions */}
              <div className="pt-2 border-t border-border/60 flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Discount (₹)</label>
                    <input
                      type="number"
                      value={formDiscount}
                      onChange={(e) => setFormDiscount(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-card border border-border/80 rounded-lg text-xs font-semibold outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Tax Mode</label>
                    <button
                      type="button"
                      onClick={() => setFormGstOff(!formGstOff)}
                      className={`w-full py-1.5 px-3 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                        formGstOff ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400" : "bg-primary/15 border-primary/30 text-primary"
                      }`}
                    >
                      {formGstOff ? "Zero Tax (Inclusive)" : "GST +18%"}
                    </button>
                  </div>
                </div>

                <div className="sticky bottom-0 bg-card pt-2 pb-1 border-t border-border/40 flex items-center justify-between gap-3">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground uppercase font-mono">Grand Total</span>
                    <span className="text-base font-black text-foreground font-mono">₹{grandTotal.toLocaleString("en-IN")}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleGenerate}
                      className="bg-secondary hover:bg-secondary/80 text-foreground font-bold text-xs py-2 px-3 rounded-xl border border-border cursor-pointer transition-all flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-primary" />
                      <span>Re-Generate</span>
                    </button>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2 px-4 rounded-xl shadow-lg shadow-emerald-600/25 cursor-pointer transition-all flex items-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      <span>Save Quotation</span>
                    </button>
                  </div>
                </div>
              </div>
            </form>

            {/* RIGHT COLUMN: Live Quotation Preview (Half A4 / A5 Print Style) */}
            <div className="lg:col-span-6 space-y-4">
              <div className="flex justify-between items-center px-1 print-hidden print:!hidden">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-emerald-400" />
                  <span>Live Quotation Preview</span>
                </span>

                <button
                  onClick={handlePrintQuotation}
                  className="bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-bold py-1 px-3 rounded-lg flex items-center gap-1.5 shadow cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Half A4 (A5)</span>
                </button>
              </div>

              {/* Exact Company Printed Quotation Format */}
              <div className="quotation-a5-print bg-white text-slate-900 p-6 rounded-xl shadow-2xl border border-slate-300 font-mono text-[11px] leading-tight">
                {/* Header */}
                <div className="border-b-2 border-slate-900 pb-3 mb-3 text-center">
                  <h2 className="text-base font-black tracking-tight text-slate-950 uppercase">
                    {branding?.companyName || "KOHINOOR ROLLING SHUTTERS"}
                  </h2>
                  <p className="text-[10px] text-slate-700">Manufacturers of All Types of Rolling Shutters & Accessories</p>
                  <p className="text-[9px] text-slate-600">Plot 42, GIDC Industrial Estate, Thane, Maharashtra | GST: {branding?.gstNumber || "27AAACK5912K1Z9"}</p>
                </div>

                {/* Document Title */}
                <div className="flex justify-between items-center border-b border-slate-300 pb-2 mb-3">
                  <span className="text-sm font-black tracking-widest text-slate-900 uppercase">QUOTATION</span>
                  <span className="text-[10px] font-bold text-slate-700">{bookNumber}</span>
                </div>

                {/* Customer Details */}
                <div className="grid grid-cols-2 gap-2 border border-slate-300 p-2 rounded mb-3 text-[10px]">
                  <div>
                    <span className="text-[8px] uppercase text-slate-500 font-bold block">CUSTOMER</span>
                    <p className="font-bold text-slate-950">{displayCustomerName}</p>
                    <p className="text-slate-700">{isNewCustomer ? newCustBilling : activeCustomerObj?.billingAddress || "Billing Address"}</p>
                    <p className="text-slate-700">Ph: {isNewCustomer ? newCustPhone : activeCustomerObj?.phone || "--"}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[8px] uppercase text-slate-500 font-bold block">DETAILS</span>
                    <p className="text-slate-800">Date: {quotationDate}</p>
                    <p className="text-slate-800">Template: {templates.find(t => t.id === selectedTemplateId)?.name || "Normal Shutter"}</p>
                    <p className="text-slate-800">Size: {specWidth}" × {specHeight}" ({specQty} PCS)</p>
                  </div>
                </div>

                {/* Itemized Material Table */}
                <table className="w-full text-left border-collapse mb-3">
                  <thead>
                    <tr className="border-y border-slate-900 text-[9px] font-bold uppercase">
                      <th className="py-1">No</th>
                      <th className="py-1">Description</th>
                      <th className="py-1 text-center">Qty</th>
                      <th className="py-1 text-right">Rate</th>
                      <th className="py-1 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {genLines.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-slate-400 italic">
                          Selecting template & variants auto-generates quote...
                        </td>
                      </tr>
                    ) : (
                      genLines.map((line, idx) => (
                        <tr key={idx} className="text-[10px]">
                          <td className="py-1 text-slate-500">{idx + 1}</td>
                          <td className="py-1">
                            <span className="font-bold text-slate-950 block">{line.productName}</span>
                            <span className="text-[9px] text-slate-600 block">{line.description}</span>
                          </td>
                          <td className="py-1 text-center text-slate-800">{line.quantity} {line.unit}</td>
                          <td className="py-1 text-right text-slate-800">₹{line.unitPrice}</td>
                          <td className="py-1 text-right font-bold text-slate-950">₹{line.lineTotal.toLocaleString("en-IN")}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>

                {/* Totals Section */}
                <div className="flex justify-end border-t border-slate-900 pt-2 mb-3">
                  <div className="w-48 text-[10px] space-y-1 text-right">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Subtotal:</span>
                      <span className="font-bold">₹{subtotal.toLocaleString("en-IN")}</span>
                    </div>
                    {discVal > 0 && (
                      <div className="flex justify-between text-rose-600">
                        <span>Discount:</span>
                        <span>-₹{discVal.toLocaleString("en-IN")}</span>
                      </div>
                    )}
                    {gstAmt > 0 && (
                      <div className="flex justify-between">
                        <span>GST ({gstRateVal}%):</span>
                        <span>₹{gstAmt.toLocaleString("en-IN")}</span>
                      </div>
                    )}
                    {Math.abs(roundOff) > 0 && (
                      <div className="flex justify-between text-slate-500 text-[9px]">
                        <span>Round Off:</span>
                        <span>{roundOff >= 0 ? `+₹${roundOff}` : `-₹${Math.abs(roundOff)}`}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-slate-900 pt-1 font-black text-xs text-slate-950">
                      <span>Total:</span>
                      <span>₹{grandTotal.toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="grid grid-cols-2 gap-2 border-t border-slate-300 pt-2 text-[8px] text-slate-600">
                  <div>
                    <span className="font-bold uppercase block mb-0.5">Terms</span>
                    <p className="whitespace-pre-line leading-tight">{formTerms}</p>
                  </div>
                  <div className="flex flex-col justify-end items-end text-right">
                    <p className="font-bold text-slate-950 uppercase text-[9px]">For KOHINOOR ROLLING SHUTTERS</p>
                    <div className="w-28 border-b border-slate-400 mt-6 pt-1 text-[8px] text-slate-500 text-center">
                      Authorised Signatory
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : selectedQuote ? (
        /* SAVED QUOTATION VIEW & PRINT (HALF A4 A5) */
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-card/60 border border-border/80 p-5 rounded-2xl print-hidden print:!hidden gap-4">
            <button
              onClick={() => setSelectedQuote(null)}
              className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-5 h-5 text-primary" />
              <span>Back to List</span>
            </button>

            {/* Print Type Selector */}
            <div className="flex bg-secondary/60 p-1.5 border border-border/80 rounded-2xl text-sm font-sans">
              <button
                onClick={() => setPrintType("normal")}
                className={`px-5 py-2.5 rounded-xl transition-all font-black text-xs uppercase tracking-wider ${
                  printType === "normal"
                    ? "bg-primary text-primary-foreground shadow-md animate-in fade-in duration-100"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Normal
              </button>
              <button
                onClick={() => setPrintType("bold_gaps")}
                className={`px-5 py-2.5 rounded-xl transition-all font-black text-xs uppercase tracking-wider ${
                  printType === "bold_gaps"
                    ? "bg-primary text-primary-foreground shadow-md animate-in fade-in duration-100"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Bold & Gaps
              </button>
              <button
                onClick={() => setPrintType("spring_handle")}
                className={`px-5 py-2.5 rounded-xl transition-all font-black text-xs uppercase tracking-wider ${
                  printType === "spring_handle"
                    ? "bg-primary text-primary-foreground shadow-md animate-in fade-in duration-100"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Spring to Handle
              </button>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handlePrintQuotation}
                className="bg-primary text-primary-foreground hover:bg-primary/95 text-sm font-black py-2.5 px-5 rounded-xl flex items-center gap-2 shadow-lg cursor-pointer uppercase tracking-wider"
              >
                <Printer className="w-5 h-5" />
                <span>Print Quotation</span>
              </button>
            </div>
          </div>

          <div className="quotation-a5-print bg-white text-slate-900 p-8 rounded-xl shadow-2xl border border-slate-300 max-w-2xl mx-auto w-full font-mono text-[11px]">
            {/* Saved Quote Header */}
            <div className="border-b-2 border-slate-900 pb-3 mb-3 text-center">
              <h2 className="text-base font-black tracking-tight text-slate-950 uppercase">
                {branding?.companyName || "KOHINOOR ROLLING SHUTTERS"}
              </h2>
              <p className="text-[10px] text-slate-700">Manufacturers of All Types of Rolling Shutters & Accessories</p>
              <p className="text-[9px] text-slate-600">Plot 42, GIDC Industrial Estate, Thane, Maharashtra | GST: {branding?.gstNumber || "27AAACK5912K1Z9"}</p>
            </div>

            <div className="flex justify-between items-center border-b border-slate-300 pb-2 mb-3">
              <span className="text-sm font-black tracking-widest text-slate-900 uppercase">QUOTATION</span>
              <span className="text-[10px] font-bold text-slate-700">No: {selectedQuote.quoteNumber}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 border border-slate-300 p-2 rounded mb-3 text-[10px]">
              <div>
                <span className="text-[8px] uppercase text-slate-500 font-bold block">CUSTOMER</span>
                <p className="font-bold text-slate-950">{selectedQuote.customer?.name}</p>
                <p className="text-slate-700">{selectedQuote.customer?.billingAddress}</p>
                <p className="text-slate-700">Ph: {selectedQuote.customer?.phone}</p>
              </div>
              <div className="text-right">
                <span className="text-[8px] uppercase text-slate-500 font-bold block">DETAILS</span>
                <p className="text-slate-800">Date: {new Date(selectedQuote.quotationDate || selectedQuote.createdAt).toLocaleDateString("en-IN")}</p>
                <p className="text-slate-800">Book No: {selectedQuote.bookNumber || "Book 1"}</p>
                <p className="text-slate-800">Template: {selectedQuote.templateName || "Normal Shutter"}</p>
              </div>
            </div>

            <table className="w-full text-left border-collapse mb-3">
              <thead>
                <tr className="border-y border-slate-900 text-[9px] font-bold uppercase">
                  <th className="py-1">No</th>
                  <th className="py-1">Description</th>
                  <th className="py-1 text-center">Qty</th>
                  <th className="py-1 text-right">Rate</th>
                  <th className="py-1 text-right">Amount</th>
                  <th className="py-1 text-center print-hidden print:!hidden w-10">Act</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {printType === "bold_gaps" ? (
                  <>
                    {/* Bold Group */}
                    {groupedFormattedItems?.boldItems.map((item: any, idx: number) => (
                      <tr key={`bold-${idx}`} className="text-[10px] font-black text-slate-950">
                        <td className="py-1 text-slate-500 font-bold">{idx + 1}</td>
                        <td className="py-1">
                          <span className="font-extrabold text-slate-950 block">{item.productName}</span>
                          <span className="text-[9px] text-slate-900 font-bold block">{item.shutterName || item.material}</span>
                        </td>
                        <td className="py-1 text-center font-bold">{item.quantity} {item.unit || "PCS"}</td>
                        <td className="py-1 text-right font-bold">₹{item.unitPrice}</td>
                        <td className="py-1 text-right font-black">₹{item.lineTotal.toLocaleString("en-IN")}</td>
                        <td className="py-1 text-center print-hidden print:!hidden">
                          <button
                            onClick={() => handleRemovePrintItem(item)}
                            className="text-rose-600 hover:text-rose-800 font-black text-xs px-1 cursor-pointer"
                            title="Remove from printout"
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))}
                    
                    {/* Gap 1 */}
                    <tr className="h-4 border-none"><td colSpan={6} className="py-1 border-none"></td></tr>

                    {/* Middle Group */}
                    {groupedFormattedItems?.middleItems.map((item: any, idx: number) => {
                      const startIdx = (groupedFormattedItems?.boldItems.length || 0) + idx + 1;
                      return (
                        <tr key={`mid-${idx}`} className="text-[10px]">
                          <td className="py-1 text-slate-500">{startIdx}</td>
                          <td className="py-1">
                            <span className="font-bold text-slate-950 block">{item.productName}</span>
                            <span className="text-[9px] text-slate-600 block">{item.shutterName || item.material}</span>
                          </td>
                          <td className="py-1 text-center text-slate-800">{item.quantity} {item.unit || "PCS"}</td>
                          <td className="py-1 text-right text-slate-800">₹{item.unitPrice}</td>
                          <td className="py-1 text-right font-bold text-slate-955">₹{item.lineTotal.toLocaleString("en-IN")}</td>
                          <td className="py-1 text-center print-hidden print:!hidden">
                            <button
                              onClick={() => handleRemovePrintItem(item)}
                              className="text-rose-600 hover:text-rose-800 font-black text-xs px-1 cursor-pointer"
                              title="Remove from printout"
                            >
                              ×
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    
                    {/* Gap 2 */}
                    <tr className="h-4 border-none"><td colSpan={6} className="py-1 border-none"></td></tr>

                    {/* End Group */}
                    {groupedFormattedItems?.endItems.map((item: any, idx: number) => {
                      const startIdx = (groupedFormattedItems?.boldItems.length || 0) + (groupedFormattedItems?.middleItems.length || 0) + idx + 1;
                      return (
                        <tr key={`end-${idx}`} className="text-[10px]">
                          <td className="py-1 text-slate-500">{startIdx}</td>
                          <td className="py-1">
                            <span className="font-bold text-slate-955 block">{item.productName}</span>
                            <span className="text-[9px] text-slate-600 block">{item.shutterName || item.material}</span>
                          </td>
                          <td className="py-1 text-center text-slate-800">{item.quantity} {item.unit || "PCS"}</td>
                          <td className="py-1 text-right text-slate-800">₹{item.unitPrice}</td>
                          <td className="py-1 text-right font-bold text-slate-955">₹{item.lineTotal.toLocaleString("en-IN")}</td>
                          <td className="py-1 text-center print-hidden print:!hidden">
                            <button
                              onClick={() => handleRemovePrintItem(item)}
                              className="text-rose-600 hover:text-rose-800 font-black text-xs px-1 cursor-pointer"
                              title="Remove from printout"
                            >
                              ×
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </>
                ) : (
                  displayedItems.map((item: any, idx: number) => (
                    <tr key={idx} className="text-[10px]">
                      <td className="py-1 text-slate-500">{idx + 1}</td>
                      <td className="py-1">
                        <span className="font-bold text-slate-955 block">{item.productName}</span>
                        <span className="text-[9px] text-slate-600 block">{item.shutterName || item.material}</span>
                      </td>
                      <td className="py-1 text-center text-slate-800">{item.quantity} {item.unit || "PCS"}</td>
                      <td className="py-1 text-right text-slate-800">₹{item.unitPrice}</td>
                      <td className="py-1 text-right font-bold text-slate-955">₹{item.lineTotal.toLocaleString("en-IN")}</td>
                      <td className="py-1 text-center print-hidden print:!hidden">
                        <button
                          onClick={() => handleRemovePrintItem(item)}
                          className="text-rose-600 hover:text-rose-800 font-black text-xs px-1 cursor-pointer"
                          title="Remove from printout"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))
                )}

                {/* Add Custom Item Row - Screen Only */}
                <tr className="print-hidden print:!hidden bg-slate-50 text-[10px]">
                  <td className="py-2 text-slate-400 text-center font-bold">+</td>
                  <td className="py-2">
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        placeholder="Custom Item Name..."
                        id="custom-item-name"
                        className="border border-slate-300 rounded-lg px-2 py-1 text-[10px] w-full max-w-[170px] outline-none focus:border-slate-500 bg-white font-mono text-slate-800"
                      />
                      <input
                        type="text"
                        placeholder="Details..."
                        id="custom-item-mat"
                        className="border border-slate-300 rounded-lg px-2 py-1 text-[9px] w-full max-w-[90px] outline-none focus:border-slate-500 bg-white font-mono text-slate-800"
                      />
                    </div>
                  </td>
                  <td className="py-2 text-center">
                    <div className="flex items-center gap-1 justify-center">
                      <input
                        type="number"
                        placeholder="Qty"
                        id="custom-item-qty"
                        defaultValue="1"
                        className="border border-slate-300 rounded-lg px-1.5 py-1 text-[10px] w-12 text-center outline-none focus:border-slate-500 bg-white font-mono text-slate-800"
                      />
                      <select
                        id="custom-item-unit"
                        defaultValue="Pcs"
                        className="border border-slate-300 rounded-lg px-1.5 py-1 text-[10px] outline-none focus:border-slate-500 bg-white font-mono text-slate-800"
                      >
                        <option value="Pcs">Pcs</option>
                        <option value="Sft">Sft</option>
                        <option value="Ft">Ft</option>
                        <option value="Set">Set</option>
                      </select>
                    </div>
                  </td>
                  <td className="py-2 text-right">
                    <input
                      type="number"
                      placeholder="Rate"
                      id="custom-item-rate"
                      defaultValue="0"
                      className="border border-slate-300 rounded-lg px-2 py-1 text-[10px] w-16 text-right outline-none focus:border-slate-500 bg-white font-mono text-slate-800"
                    />
                  </td>
                  <td className="py-2 text-right text-slate-400 font-bold">—</td>
                  <td className="py-2 text-center">
                    <button
                      onClick={() => {
                        const nameEl = document.getElementById("custom-item-name") as HTMLInputElement;
                        const matEl = document.getElementById("custom-item-mat") as HTMLInputElement;
                        const qtyEl = document.getElementById("custom-item-qty") as HTMLInputElement;
                        const unitEl = document.getElementById("custom-item-unit") as HTMLSelectElement;
                        const rateEl = document.getElementById("custom-item-rate") as HTMLInputElement;
                        
                        if (!nameEl || !nameEl.value.trim()) {
                          alert("Please enter a product name");
                          return;
                        }
                        
                        const name = nameEl.value.trim();
                        const mat = matEl ? matEl.value.trim() : "";
                        const qty = parseFloat(qtyEl.value) || 1;
                        const unit = unitEl.value;
                        const rate = parseFloat(rateEl.value) || 0;
                        const amount = Math.round(qty * rate);
                        
                        const newItem = {
                          ruleId: "custom-" + Date.now(),
                          productName: name,
                          materialCategory: "Custom",
                          variant: mat,
                          quantity: qty,
                          unit: unit,
                          unitPrice: rate,
                          lineTotal: amount,
                          description: `${name} ${mat ? `(${mat})` : ""}`,
                        };
                        
                        setPrintItems((prev) => [...prev, newItem]);
                        
                        // Reset inputs
                        nameEl.value = "";
                        if (matEl) matEl.value = "";
                        qtyEl.value = "1";
                        rateEl.value = "0";
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] px-2.5 py-1.5 rounded-lg transition-all cursor-pointer uppercase tracking-wider"
                    >
                      Add
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="flex justify-end border-t border-slate-900 pt-2 mb-3">
              <div className="w-48 text-[10px] space-y-1 text-right">
                <div className="flex justify-between">
                  <span className="text-slate-600">Subtotal:</span>
                  <span className="font-bold">₹{printedSubtotal.toLocaleString("en-IN")}</span>
                </div>
                {selectedQuote.discount > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Discount:</span>
                    <span>-₹{selectedQuote.discount.toLocaleString("en-IN")}</span>
                  </div>
                )}
                {printedGstAmount > 0 && (
                  <div className="flex justify-between">
                    <span>GST ({selectedQuote.gstRate}%):</span>
                    <span>₹{printedGstAmount.toLocaleString("en-IN")}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-slate-900 pt-1 font-black text-xs text-slate-955">
                  <span>Total:</span>
                  <span>₹{printedTotalAmount.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 border-t border-slate-300 pt-2 text-[8px] text-slate-600">
              <div>
                <span className="font-bold uppercase block mb-0.5">Terms</span>
                <p className="whitespace-pre-line leading-tight">{selectedQuote.terms || branding?.quotationTerms}</p>
              </div>
              <div className="flex flex-col justify-end items-end text-right">
                <p className="font-bold text-slate-950 uppercase text-[9px]">For KOHINOOR ROLLING SHUTTERS</p>
                <div className="w-28 border-b border-slate-400 mt-6 pt-1 text-[8px] text-slate-500 text-center">
                  Authorised Signatory
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* QUOTATION LEDGER LIST VIEW */
        <div className="border border-border/80 rounded-xl bg-card/30 overflow-hidden">
          <div className="p-4 border-b border-border/60 flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search quotations by quote #, customer or book..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-card border border-border/80 rounded-xl text-xs outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-secondary/20 text-[10px] font-mono uppercase tracking-wider text-muted-foreground border-b border-border/60">
                  <th className="p-4">Quote No.</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Book</th>
                  <th className="p-4">Template</th>
                  <th className="p-4 text-right">Total Amount</th>
                  <th className="p-4">Date</th>
                  <th className="p-4 text-right pr-6">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center p-8 text-muted-foreground">
                      Loading quotations ledger...
                    </td>
                  </tr>
                ) : quotations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center p-8 text-muted-foreground">
                      No quotations found. Click "New Quotation" to create one.
                    </td>
                  </tr>
                ) : (
                  quotations
                    .filter(
                      (q) =>
                        q.quoteNumber.toLowerCase().includes(search.toLowerCase()) ||
                        q.customer?.name.toLowerCase().includes(search.toLowerCase()) ||
                        (q.bookNumber && q.bookNumber.toLowerCase().includes(search.toLowerCase()))
                    )
                    .map((q) => (
                      <tr key={q.id} className="hover:bg-secondary/25 transition-colors">
                        <td className="p-4 font-bold font-mono text-foreground">{q.quoteNumber}</td>
                        <td className="p-4 font-semibold text-foreground">{q.customer?.name}</td>
                        <td className="p-4 font-mono text-muted-foreground">{q.bookNumber || "Book 1"}</td>
                        <td className="p-4 text-muted-foreground">{q.templateName || "Normal Shutter"}</td>
                        <td className="p-4 text-right font-bold text-foreground font-mono">
                          ₹{q.totalAmount.toLocaleString("en-IN")}
                        </td>
                        <td className="p-4 text-muted-foreground font-mono">
                          {new Date(q.quotationDate || q.createdAt).toLocaleDateString("en-IN")}
                        </td>
                        <td className="p-4 text-right pr-6">
                          <button
                            onClick={() => setSelectedQuote(q)}
                            className="bg-secondary hover:bg-secondary/80 border border-border text-foreground font-semibold px-3 py-1 rounded-lg text-xs transition-all cursor-pointer"
                          >
                            View & Print
                          </button>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
