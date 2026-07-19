import fs from "fs";
import path from "path";
import { prisma } from "./db";

// Types matching Prisma models
export type CustomerType = "COMPANY" | "INDIVIDUAL";
export type LeadStatus = "NEW" | "CONTACTED" | "SITE_VISIT" | "MEASUREMENT" | "QUOTATION" | "NEGOTIATION" | "WON" | "LOST";
export type QuoteStatus = "DRAFT" | "SENT" | "APPROVED" | "REJECTED";
export type InvoiceStatus = "PENDING" | "PARTIAL" | "PAID";
export type PaymentType = "ADVANCE" | "PARTIAL" | "FULL" | "REMAINING";
export type PaymentMethod = "UPI" | "CASH" | "BANK" | "CHEQUE";
export type JobStatus = "PENDING" | "WORKING" | "COMPLETED";
export type InventoryCategory = "SLATS" | "GUIDE_RAILS" | "MOTORS" | "REMOTE" | "ACCESSORIES";
export type WarrantyStatus = "ACTIVE" | "EXPIRED";

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

const MOCK_DB_FILE = path.join(process.cwd(), "prisma", "mock-db.json");

// Define structure of the mock database
interface MockDataSchema {
  users: any[];
  customers: any[];
  sites: any[];
  leads: any[];
  measurements: any[];
  quotations: any[];
  quotationItems: any[];
  invoices: any[];
  payments: any[];
  installationJobs: any[];
  inventoryItems: any[];
  warranties: any[];
  auditLogs: any[];
  companyBranding: any;
  storageQuota: any;
  masterItems?: any[];
}

// Initial seed data for the mock database
const initialMockData: MockDataSchema = {
  users: [
    { id: "u-1", email: "owner@kohinoor.com", name: "Administrator", avatarUrl: "" }
  ],
  customers: [
    { id: "c-1", name: "Metro Retailers Ltd", type: "COMPANY", email: "procurement@metro.com", phone: "+91 98765 43210", gstNumber: "27AAACM1234F1Z5", billingAddress: "405, Corporate Hub, Bandra West, Mumbai, MH", shippingAddress: "Warehouse A, Thane, MH" },
    { id: "c-2", name: "Anil Sharma", type: "INDIVIDUAL", email: "anil.sharma@gmail.com", phone: "+91 91234 56789", gstNumber: "", billingAddress: "Flat 102, Shanti Niwas, Andheri East, Mumbai, MH", shippingAddress: "" }
  ],
  sites: [
    { id: "s-1", customerId: "c-1", address: "Plot 42, GIDC Industrial Estate, Thane, MH", contactPerson: "Mr. Ramesh (Manager)", contactPhone: "+91 99999 88888", notes: "Requires heavy duty industrial shutter. High clearance." },
    { id: "s-2", customerId: "c-2", address: "Flat 102, Shanti Niwas, Andheri East, Mumbai, MH", contactPerson: "Anil Sharma", contactPhone: "+91 91234 56789", notes: "Residential garage shutter installation." }
  ],
  leads: [
    { id: "l-1", title: "Industrial Shutter - 4 Nos", customerId: "c-1", status: "SITE_VISIT", value: 320000.0, notes: "Site inspection scheduled. Needs motor-driven rolling shutters.", createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString() },
    { id: "l-2", title: "Residential Garage Shutter", customerId: "c-2", status: "QUOTATION", value: 75000.0, notes: "Measurement taken. Quotation sent to customer for approval.", createdAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString() },
    { id: "l-3", title: "Showroom Security Shutter", customerId: "c-1", status: "NEW", value: 120000.0, notes: "Received inbound query for retail mall outlet.", createdAt: new Date().toISOString() }
  ],
  measurements: [
    { id: "m-1", leadId: "l-1", width: 4500, height: 3800, shutterType: "Galvanized Steel Slat (1.2mm)", motor: "Somfy 120Nm Motorised", color: "Slate Grey", photos: "/uploads/shutter1.jpg", drawing: "", notes: "Requires side guides reinforcement due to wind load." },
    { id: "m-2", leadId: "l-2", width: 2800, height: 2400, shutterType: "Polycarbonate Transparent Slat", motor: "Generic 40Nm Motorised", color: "Clear / Natural", photos: "", drawing: "", notes: "Standard single phase connection nearby." }
  ],
  quotations: [
    { id: "q-1", quoteNumber: "QT-2026-0001", customerId: "c-1", leadId: "l-1", status: "DRAFT", discount: 5.0, gstRate: 18.0, gstAmount: 54720.0, totalAmount: 358720.0, terms: "50% advance, balance on installation. 2 years warranty on motor.", version: 1, createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString() },
    { id: "q-2", quoteNumber: "QT-2026-0002", customerId: "c-2", leadId: "l-2", status: "APPROVED", discount: 0.0, gstRate: 18.0, gstAmount: 13500.0, totalAmount: 88500.0, terms: "100% advance. 1 year warranty.", version: 2, parentQuoteId: "q-2-v1", createdAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString() }
  ],
  quotationItems: [
    { id: "qi-1", quotationId: "q-1", productName: "Galvanized Steel Rolling Shutter (4500x3800)", quantity: 4, unitPrice: 70000.0, lineTotal: 280000.0 },
    { id: "qi-2", quotationId: "q-1", productName: "Somfy Shutter Motor 120Nm", quantity: 4, unitPrice: 12000.0, lineTotal: 48000.0 },
    { id: "qi-3", quotationId: "q-2", productName: "Polycarbonate Clear Rolling Shutter (2800x2400)", quantity: 1, unitPrice: 65000.0, lineTotal: 65000.0 },
    { id: "qi-4", quotationId: "q-2", productName: "Generic Shutter Motor 40Nm", quantity: 1, unitPrice: 10000.0, lineTotal: 10000.0 }
  ],
  invoices: [
    { id: "i-1", invoiceNumber: "INV-2026-0001", quotationId: "q-2", customerId: "c-2", status: "PARTIAL", amountPaid: 40000.0, totalAmount: 88500.0, discount: 0.0, gstRate: 18.0, gstAmount: 13500.0, paymentDue: new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString(), terms: "Thank you for your business.", createdAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString() }
  ],
  payments: [
    { id: "p-1", invoiceId: "i-1", amount: 40000.0, paymentType: "ADVANCE", paymentMethod: "UPI", transactionRef: "UPI9827341203", createdAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString() }
  ],
  installationJobs: [
    { id: "j-1", quotationId: "q-2", invoiceId: "i-1", technicianName: "Mahesh Singh", status: "PENDING", scheduledDate: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString(), photos: "", signatureUrl: "", notes: "Bring extra guide brackets. Site access after 10 AM.", createdAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString() }
  ],
  inventoryItems: [
    { id: "inv-1", category: "SLATS", name: "Galvanized Steel Slat (1.2mm, Silver)", sku: "SLT-GS-1.2-SV", stockQty: 120, minStockQty: 30, unitPrice: 450.0 },
    { id: "inv-2", category: "SLATS", name: "Polycarbonate Transparent Slat", sku: "SLT-PC-CLR-01", stockQty: 15, minStockQty: 25, unitPrice: 1200.0 }, // Trigger warning!
    { id: "inv-3", category: "MOTORS", name: "Somfy motor 120Nm 230V", sku: "MTR-SMF-120NM", stockQty: 8, minStockQty: 3, unitPrice: 9500.0 },
    { id: "inv-4", category: "MOTORS", name: "Generic motor 40Nm 230V", sku: "MTR-GEN-40NM", stockQty: 2, minStockQty: 5, unitPrice: 6200.0 }, // Trigger warning!
    { id: "inv-5", category: "REMOTE", name: "Somfy Telis 4 Channel Remote", sku: "RMT-SMF-T04", stockQty: 24, minStockQty: 10, unitPrice: 1800.0 },
    { id: "inv-6", category: "GUIDE_RAILS", name: "Heavy Duty Shutter Guide Channel (U-Shape)", sku: "GD-HD-U100", stockQty: 40, minStockQty: 15, unitPrice: 1100.0 }
  ],
  warranties: [
    { id: "w-1", customerId: "c-2", invoiceId: "i-1", shutterSerial: "SH-PC-2026-9812", warrantyPeriodMonths: 24, expiryDate: new Date(Date.now() + 24 * 30 * 24 * 3600 * 1000).toISOString(), status: "ACTIVE", serviceHistoryJson: "[]", createdAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString() }
  ],
  auditLogs: [
    { id: "al-1", userId: "u-1", userEmail: "owner@kohinoor.com", action: "LOGIN", details: "User logged in from browser.", timestamp: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString() },
    { id: "al-2", userId: "u-1", userEmail: "owner@kohinoor.com", action: "QUOTATION_CREATE", details: "Created quotation QT-2026-0001", timestamp: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString() }
  ],
  companyBranding: {
    id: "cb-1",
    companyName: "Kohinoor Shutter Industries",
    logoUrl: "/logo-placeholder.png",
    gstNumber: "27AAACK5912K1Z9",
    bankName: "State Bank of India",
    bankAccountNo: "38927103829",
    bankIfsc: "SBIN0004561",
    invoiceTerms: "1. Goods once sold will not be taken back.\n2. Interest @ 18% will be charged if payment is not made within due date.\n3. Warranty claims must represent valid manufacturing defects.",
    quotationTerms: "1. Price quoted is valid for 30 days.\n2. 50% advance along with order. Balance on delivery.\n3. Civil work / electrical wiring must be provided by client."
  },
  storageQuota: {
    id: "sq-1",
    totalQuotaBytes: 10 * 1024 * 1024 * 1024, // 10 GB
    usedBytes: 1.45 * 1024 * 1024 * 1024 // 1.45 GB
  }
};

// Check if database connection works, otherwise run mock file read/write
let isDbConnected = false;

async function checkDatabaseConnection() {
  try {
    // Attempt a quick query
    await prisma.$queryRaw`SELECT 1`;
    isDbConnected = true;
  } catch (e) {
    isDbConnected = false;
  }
}

// In Next.js, check connection on start
checkDatabaseConnection();

// Read Mock DB
function readMockDb(): MockDataSchema {
  try {
    if (!fs.existsSync(MOCK_DB_FILE)) {
      // Create schema dir if it doesn't exist
      const dir = path.dirname(MOCK_DB_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(MOCK_DB_FILE, JSON.stringify(initialMockData, null, 2));
      return initialMockData;
    }
    const content = fs.readFileSync(MOCK_DB_FILE, "utf-8");
    return JSON.parse(content);
  } catch (e) {
    return initialMockData;
  }
}

// Write Mock DB
function writeMockDb(data: MockDataSchema) {
  try {
    fs.writeFileSync(MOCK_DB_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Failed to write mock db file", e);
  }
}

// Global service class providing stateful CRUD API
export const DataService = {
  // Check Mode
  isDemoMode: () => !isDbConnected,

  // AUDIT LOGS
  async logAction(userId: string | null, email: string | null, action: string, details: string) {
    const timestamp = new Date();
    if (isDbConnected) {
      try {
        await prisma.auditLog.create({
          data: { userId, userEmail: email, action, details, timestamp }
        });
        return;
      } catch (e) {
        // Fall through
      }
    }
    const db = readMockDb();
    db.auditLogs.unshift({
      id: `al-${Date.now()}`,
      userId,
      userEmail: email,
      action,
      details,
      timestamp: timestamp.toISOString()
    });
    writeMockDb(db);
  },

  async getAuditLogs() {
    if (isDbConnected) {
      try {
        return await prisma.auditLog.findMany({ orderBy: { timestamp: "desc" }, take: 100 });
      } catch (e) {}
    }
    return readMockDb().auditLogs;
  },

  // USERS
  async getUsers() {
    if (isDbConnected) {
      try {
        return await prisma.user.findMany();
      } catch (e) {}
    }
    return readMockDb().users;
  },

  async findUserByEmail(email: string) {
    if (isDbConnected) {
      try {
        return await prisma.user.findUnique({ where: { email } });
      } catch (e) {}
    }
    const db = readMockDb();
    return db.users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  },

  // CUSTOMERS
  async getCustomers() {
    if (isDbConnected) {
      try {
        return await prisma.customer.findMany({
          include: { 
            sites: true, 
            leads: true, 
            quotations: { include: { items: true } }, 
            invoices: { include: { payments: true } } 
          }
        });
      } catch (e) {}
    }
    const db = readMockDb();
    return db.customers.map(c => ({
      ...c,
      sites: db.sites.filter(s => s.customerId === c.id),
      leads: db.leads.filter(l => l.customerId === c.id),
      quotations: db.quotations.filter(q => q.customerId === c.id).map(q => ({
        ...q,
        items: db.quotationItems.filter(qi => qi.quotationId === q.id)
      })),
      invoices: db.invoices.filter(i => i.customerId === c.id).map(i => ({
        ...i,
        payments: db.payments.filter(p => p.invoiceId === i.id)
      }))
    }));
  },

  async addCustomer(customer: any) {
    const id = `c-${Date.now()}`;
    const newCust = { 
      id, 
      name: customer.name,
      companyName: customer.companyName || null,
      type: customer.type || "INDIVIDUAL",
      email: customer.email || null,
      phone: customer.phone,
      whatsapp: customer.whatsapp || null,
      gstNumber: customer.gstNumber || null,
      billingAddress: customer.billingAddress,
      shippingAddress: customer.shippingAddress || null,
      notes: customer.notes || null,
      createdAt: new Date().toISOString(), 
      updatedAt: new Date().toISOString() 
    };
    
    if (isDbConnected) {
      try {
        return await prisma.customer.create({ data: newCust });
      } catch (e) {}
    }
    
    const db = readMockDb();
    db.customers.push(newCust);
    writeMockDb(db);
    this.logAction("u-1", "owner@kohinoor.com", "CUSTOMER_CREATE", `Created customer: ${customer.name}`);
    return newCust;
  },

  async updateCustomer(id: string, updates: any) {
    if (isDbConnected) {
      try {
        return await prisma.customer.update({ where: { id }, data: updates });
      } catch (e) {}
    }
    const db = readMockDb();
    const idx = db.customers.findIndex(c => c.id === id);
    if (idx !== -1) {
      db.customers[idx] = { ...db.customers[idx], ...updates, updatedAt: new Date().toISOString() };
      writeMockDb(db);
      this.logAction("u-1", "owner@kohinoor.com", "CUSTOMER_UPDATE", `Updated customer ID: ${id}`);
      return db.customers[idx];
    }
    return null;
  },

  // SITES
  async addSite(customerId: string, siteData: any) {
    const id = `s-${Date.now()}`;
    const newSite = { id, customerId, ...siteData, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    if (isDbConnected) {
      try {
        return await prisma.site.create({ data: { customerId, ...siteData } });
      } catch (e) {}
    }
    const db = readMockDb();
    db.sites.push(newSite);
    writeMockDb(db);
    this.logAction("u-1", "owner@kohinoor.com", "SITE_CREATE", `Added installation site for customer ID: ${customerId}`);
    return newSite;
  },

  // LEADS
  async getLeads() {
    if (isDbConnected) {
      try {
        return await prisma.lead.findMany({
          include: { customer: true, measurements: true }
        });
      } catch (e) {}
    }
    const db = readMockDb();
    return db.leads.map(l => ({
      ...l,
      customer: db.customers.find(c => c.id === l.customerId),
      measurements: db.measurements.filter(m => m.leadId === l.id)
    }));
  },

  async addLead(lead: any) {
    const id = `l-${Date.now()}`;
    const newLead = { id, ...lead, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    if (isDbConnected) {
      try {
        return await prisma.lead.create({ data: lead });
      } catch (e) {}
    }
    const db = readMockDb();
    db.leads.push(newLead);
    writeMockDb(db);
    this.logAction("u-1", "owner@kohinoor.com", "LEAD_CREATE", `Created new Lead: ${lead.title}`);
    return newLead;
  },

  async updateLeadStatus(id: string, status: LeadStatus) {
    if (isDbConnected) {
      try {
        return await prisma.lead.update({ where: { id }, data: { status } });
      } catch (e) {}
    }
    const db = readMockDb();
    const idx = db.leads.findIndex(l => l.id === id);
    if (idx !== -1) {
      db.leads[idx].status = status;
      db.leads[idx].updatedAt = new Date().toISOString();
      writeMockDb(db);
      this.logAction("u-1", "owner@kohinoor.com", "LEAD_STATUS", `Moved Lead ${id} to ${status}`);
      return db.leads[idx];
    }
    return null;
  },

  async deleteLead(id: string) {
    if (isDbConnected) {
      try {
        await prisma.lead.delete({ where: { id } });
        return true;
      } catch (e) {}
    }
    const db = readMockDb();
    db.leads = db.leads.filter(l => l.id !== id);
    writeMockDb(db);
    this.logAction("u-1", "owner@kohinoor.com", "LEAD_DELETE", `Deleted Lead ID: ${id}`);
    return true;
  },

  // MEASUREMENTS
  async getMeasurements() {
    if (isDbConnected) {
      try {
        return await prisma.measurement.findMany({ include: { lead: true } });
      } catch (e) {}
    }
    const db = readMockDb();
    return db.measurements.map(m => ({
      ...m,
      lead: db.leads.find(l => l.id === m.leadId)
    }));
  },

  async addMeasurement(measurement: any) {
    const id = `m-${Date.now()}`;
    const newMeas = { id, ...measurement, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    if (isDbConnected) {
      try {
        return await prisma.measurement.create({ data: measurement });
      } catch (e) {}
    }
    const db = readMockDb();
    db.measurements.push(newMeas);
    writeMockDb(db);
    this.logAction("u-1", "owner@kohinoor.com", "MEASUREMENT_CREATE", `Added specifications for lead ID: ${measurement.leadId}`);
    return newMeas;
  },

  // QUOTATIONS
  async getQuotations() {
    if (isDbConnected) {
      try {
        return await prisma.quotation.findMany({
          include: { customer: true, items: true, lead: true }
        });
      } catch (e) {}
    }
    const db = readMockDb();
    return db.quotations.map(q => ({
      ...q,
      customer: db.customers.find(c => c.id === q.customerId),
      items: db.quotationItems.filter(qi => qi.quotationId === q.id),
      lead: db.leads.find(l => l.id === q.leadId)
    }));
  },

  async addQuotation(quotation: any, items: any[]) {
    const id = `q-${Date.now()}`;
    const newQuote = {
      id,
      quoteNumber: quotation.quoteNumber || `QT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      customerId: quotation.customerId,
      leadId: quotation.leadId || null,
      status: quotation.status || "DRAFT",
      discount: parseFloat(quotation.discount || 0),
      gstRate: parseFloat(quotation.gstRate || 0.0),
      gstAmount: parseFloat(quotation.gstAmount || 0),
      totalAmount: parseFloat(quotation.totalAmount || 0),
      terms: quotation.terms || "",
      version: parseInt(quotation.version || 1),
      parentQuoteId: quotation.parentQuoteId || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (isDbConnected) {
      try {
        return await prisma.quotation.create({
          data: {
            ...newQuote,
            items: { 
              create: items.map(item => ({
                productName: item.productName,
                materialCategory: item.materialCategory || null,
                material: item.material || null,
                thickness: item.thickness || null,
                profile: item.profile || null,
                length: item.length !== undefined && item.length !== null ? parseFloat(item.length) : null,
                width: item.width !== undefined && item.width !== null ? parseFloat(item.width) : null,
                quantity: parseInt(item.quantity || 1),
                unitPrice: parseFloat(item.unitPrice || 0),
                lineTotal: parseFloat(item.lineTotal || 0)
              }))
            }
          },
          include: { items: true }
        });
      } catch (e) {}
    }

    const db = readMockDb();
    db.quotations.push(newQuote);
    
    // Add items
    const addedItems = items.map((item, idx) => {
      const qitem = {
        id: `qi-${Date.now()}-${idx}`,
        quotationId: id,
        productName: item.productName,
        materialCategory: item.materialCategory || null,
        material: item.material || null,
        thickness: item.thickness || null,
        profile: item.profile || null,
        length: item.length !== undefined && item.length !== null ? parseFloat(item.length) : null,
        width: item.width !== undefined && item.width !== null ? parseFloat(item.width) : null,
        quantity: parseInt(item.quantity || 1),
        unitPrice: parseFloat(item.unitPrice || 0),
        lineTotal: parseFloat(item.lineTotal || 0)
      };
      db.quotationItems.push(qitem);
      return qitem;
    });

    writeMockDb(db);
    this.logAction("u-1", "owner@kohinoor.com", "QUOTATION_CREATE", `Created quotation number: ${newQuote.quoteNumber}`);
    return { ...newQuote, items: addedItems };
  },

  async updateQuotationStatus(id: string, status: QuoteStatus) {
    if (isDbConnected) {
      try {
        const quote = await prisma.quotation.update({
          where: { id },
          data: { status }
        });
        
        return quote;
      } catch (e) {}
    }

    const db = readMockDb();
    const idx = db.quotations.findIndex(q => q.id === id);
    if (idx !== -1) {
      db.quotations[idx].status = status;
      db.quotations[idx].updatedAt = new Date().toISOString();
      writeMockDb(db);
      this.logAction("u-1", "owner@kohinoor.com", "QUOTATION_STATUS", `Quotation ${id} set to ${status}`);
      
      return db.quotations[idx];
    }
    return null;
  },

  async duplicateQuotation(id: string) {
    const db = readMockDb();
    const sourceQuote = db.quotations.find(q => q.id === id);
    if (!sourceQuote) return null;

    const sourceItems = db.quotationItems.filter(qi => qi.quotationId === id);
    const newQuoteNum = `QT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)} (Copy)`;

    const duplicated = {
      ...sourceQuote,
      id: `q-${Date.now()}`,
      quoteNumber: newQuoteNum,
      status: "DRAFT",
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return this.addQuotation(duplicated, sourceItems);
  },

  async createRevision(id: string) {
    if (isDbConnected) {
      try {
        const sourceQuote = await prisma.quotation.findUnique({
          where: { id },
          include: { items: true }
        });
        if (!sourceQuote) return null;

        const parentId = sourceQuote.parentQuoteId || sourceQuote.id;
        const totalRevisions = await prisma.quotation.count({
          where: { OR: [{ id: parentId }, { parentQuoteId: parentId }] }
        });

        const baseNum = sourceQuote.quoteNumber.split("-R")[0];
        const newQuoteNum = `${baseNum}-R${totalRevisions}`;

        const newQuote = await prisma.quotation.create({
          data: {
            quoteNumber: newQuoteNum,
            customerId: sourceQuote.customerId,
            leadId: sourceQuote.leadId,
            status: "DRAFT",
            discount: sourceQuote.discount,
            gstRate: sourceQuote.gstRate,
            gstAmount: sourceQuote.gstAmount,
            totalAmount: sourceQuote.totalAmount,
            terms: sourceQuote.terms,
            version: sourceQuote.version + 1,
            parentQuoteId: parentId,
            items: {
              create: sourceQuote.items.map(item => ({
                productName: item.productName,
                materialCategory: item.materialCategory,
                material: item.material,
                thickness: item.thickness,
                profile: item.profile,
                length: item.length,
                width: item.width,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                lineTotal: item.lineTotal
              }))
            }
          },
          include: { items: true }
        });

        await this.logAction("u-1", "owner@kohinoor.com", "QUOTATION_REVISION", `Created revision ${newQuoteNum} for ${baseNum}`);
        return newQuote;
      } catch (e) {
        console.error("DB Revision failed", e);
      }
    }

    const db = readMockDb();
    const sourceQuote = db.quotations.find(q => q.id === id);
    if (!sourceQuote) return null;

    const parentId = sourceQuote.parentQuoteId || sourceQuote.id;
    const siblingQuotes = db.quotations.filter(q => q.id === parentId || q.parentQuoteId === parentId);
    const totalRevisions = siblingQuotes.length;

    const baseNum = sourceQuote.quoteNumber.split("-R")[0];
    const newQuoteNum = `${baseNum}-R${totalRevisions}`;

    const newQuote = {
      id: `q-${Date.now()}`,
      quoteNumber: newQuoteNum,
      customerId: sourceQuote.customerId,
      leadId: sourceQuote.leadId || null,
      status: "DRAFT",
      discount: sourceQuote.discount,
      gstRate: sourceQuote.gstRate,
      gstAmount: sourceQuote.gstAmount,
      totalAmount: sourceQuote.totalAmount,
      terms: sourceQuote.terms,
      version: sourceQuote.version + 1,
      parentQuoteId: parentId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.quotations.push(newQuote);

    const sourceItems = db.quotationItems.filter(qi => qi.quotationId === id);
    const addedItems = sourceItems.map((item, idx) => {
      const qitem = {
        id: `qi-${Date.now()}-${idx}`,
        quotationId: newQuote.id,
        productName: item.productName,
        materialCategory: item.materialCategory || null,
        material: item.material || null,
        thickness: item.thickness || null,
        profile: item.profile || null,
        length: item.length || null,
        width: item.width || null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal
      };
      db.quotationItems.push(qitem);
      return qitem;
    });

    writeMockDb(db);
    this.logAction("u-1", "owner@kohinoor.com", "QUOTATION_REVISION", `Created revision ${newQuoteNum} for ${baseNum}`);
    return { ...newQuote, items: addedItems };
  },

  // INVOICES
  async getInvoices() {
    if (isDbConnected) {
      try {
        return await prisma.invoice.findMany({
          include: { customer: true, payments: true, quotation: { include: { items: true } } }
        });
      } catch (e) {}
    }
    const db = readMockDb();
    return db.invoices.map(i => ({
      ...i,
      customer: db.customers.find(c => c.id === i.customerId),
      payments: db.payments.filter(p => p.invoiceId === i.id),
      quotation: (() => {
        const q = db.quotations.find(q => q.id === i.quotationId);
        if (q) {
          return {
            ...q,
            items: db.quotationItems.filter(qi => qi.quotationId === q.id)
          };
        }
        return null;
      })()
    }));
  },

  async convertQuotationToInvoice(
    quotationId: string,
    items?: any[],
    discount?: number,
    gstRate?: number,
    paymentDue?: string,
    terms?: string
  ) {
    if (isDbConnected) {
      try {
        // Check if already converted
        const existing = await prisma.invoice.findFirst({ 
          where: { quotationId },
          include: { customer: true, payments: true, quotation: { include: { items: true } } }
        });
        if (existing) return existing;

        const quote = await prisma.quotation.findUnique({
          where: { id: quotationId },
          include: { items: true }
        });
        if (!quote) throw new Error("Quotation not found");

        let subtotal = 0;
        
        // Update/create items inside Quotation
        if (items) {
          // Delete old items
          await prisma.quotationItem.deleteMany({
            where: { quotationId }
          });
          
          // Add new items
          for (const item of items) {
            const hasDims = item.length && item.width;
            const isSft = item.unit === "Sft" || item.unit === "Sqft";
            const lineTotal = hasDims && isSft
              ? Number(item.length) * Number(item.width) * Number(item.quantity) * Number(item.unitPrice)
              : Number(item.quantity) * Number(item.unitPrice);
            
            subtotal += lineTotal;
            
            await prisma.quotationItem.create({
              data: {
                quotationId,
                productName: item.productName,
                materialCategory: item.materialCategory || null,
                material: item.material || null,
                thickness: item.thickness || null,
                profile: item.profile || null,
                length: item.length ? parseFloat(item.length) : null,
                width: item.width ? parseFloat(item.width) : null,
                quantity: parseInt(item.quantity) || 1,
                unitPrice: parseFloat(item.unitPrice) || 0,
                lineTotal
              }
            });
          }
        } else {
          subtotal = quote.items.reduce((sum, i) => sum + i.lineTotal, 0);
        }

        const finalDiscount = typeof discount === "number" ? discount : quote.discount;
        const finalGstRate = typeof gstRate === "number" ? gstRate : 18.0; 
        
        const taxableAmount = subtotal - finalDiscount;
        const finalGstAmount = taxableAmount * (finalGstRate / 100);
        const invoiceTotal = taxableAmount + finalGstAmount;

        // Also update quotation itself (GST is always 0 on quotation)
        await prisma.quotation.update({
          where: { id: quotationId },
          data: {
            discount: finalDiscount,
            gstRate: 0,
            gstAmount: 0,
            totalAmount: taxableAmount
          }
        });

        const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
        const invoice = await prisma.invoice.create({
          data: {
            invoiceNumber,
            quotationId,
            customerId: quote.customerId,
            totalAmount: invoiceTotal,
            discount: finalDiscount,
            gstRate: finalGstRate,
            gstAmount: finalGstAmount,
            terms: terms || quote.terms || "",
            paymentDue: paymentDue ? new Date(paymentDue) : new Date(Date.now() + 15 * 24 * 3600 * 1000),
            status: "PENDING"
          },
          include: { customer: true, payments: true, quotation: { include: { items: true } } }
        });

        this.logAction("u-1", "owner@kohinoor.com", "CONVERT_QUOTE_INVOICE", `Converted Quote ${quote.quoteNumber} to Invoice ${invoiceNumber}`);
        return invoice;
      } catch (e) {
        console.error("DB error in convertQuotationToInvoice:", e);
      }
    }

    const db = readMockDb();
    // Check if already converted
    const existing = db.invoices.find(i => i.quotationId === quotationId);
    if (existing) {
      return {
        ...existing,
        customer: db.customers.find(c => c.id === existing.customerId),
        payments: db.payments.filter(p => p.invoiceId === existing.id),
        quotation: (() => {
          const q = db.quotations.find(q => q.id === existing.quotationId);
          if (q) {
            return {
              ...q,
              items: db.quotationItems.filter(qi => qi.quotationId === q.id)
            };
          }
          return null;
        })()
      };
    }

    const quoteIdx = db.quotations.findIndex(q => q.id === quotationId);
    if (quoteIdx === -1) return null;
    const quote = db.quotations[quoteIdx];

    const updatedItems = items || db.quotationItems.filter(qi => qi.quotationId === quotationId);
    let subtotal = 0;

    if (items) {
      // Remove old items
      db.quotationItems = db.quotationItems.filter(qi => qi.quotationId !== quotationId);
      
      // Add new items
      items.forEach((item, idx) => {
        const hasDims = item.length && item.width;
        const isSft = item.unit === "Sft" || item.unit === "Sqft";
        const lineTotal = hasDims && isSft
          ? Number(item.length) * Number(item.width) * Number(item.quantity) * Number(item.unitPrice)
          : Number(item.quantity) * Number(item.unitPrice);
        
        subtotal += lineTotal;
        db.quotationItems.push({
          id: `qi-${Date.now()}-${idx}`,
          quotationId,
          productName: item.productName,
          materialCategory: item.materialCategory || null,
          material: item.material || null,
          thickness: item.thickness || null,
          profile: item.profile || null,
          length: item.length ? parseFloat(item.length) : null,
          width: item.width ? parseFloat(item.width) : null,
          quantity: parseInt(item.quantity) || 1,
          unitPrice: parseFloat(item.unitPrice) || 0,
          lineTotal
        });
      });
    } else {
      subtotal = updatedItems.reduce((sum: number, i: any) => sum + i.lineTotal, 0);
    }

    const finalDiscount = typeof discount === "number" ? discount : quote.discount;
    const finalGstRate = typeof gstRate === "number" ? gstRate : 18.0;
    const taxableAmount = subtotal - finalDiscount;
    const finalGstAmount = taxableAmount * (finalGstRate / 100);
    const invoiceTotal = taxableAmount + finalGstAmount;

    // Update Quotation (GST is always 0 on quotation)
    db.quotations[quoteIdx] = {
      ...quote,
      discount: finalDiscount,
      gstRate: 0,
      gstAmount: 0,
      totalAmount: taxableAmount
    };

    const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const invoice = {
      id: `i-${Date.now()}`,
      invoiceNumber,
      quotationId,
      customerId: quote.customerId,
      status: "PENDING" as any,
      amountPaid: 0.0,
      totalAmount: invoiceTotal,
      discount: finalDiscount,
      gstRate: finalGstRate,
      gstAmount: finalGstAmount,
      paymentDue: paymentDue ? new Date(paymentDue).toISOString() : new Date(Date.now() + 15 * 24 * 3600 * 1000).toISOString(),
      terms: terms || quote.terms || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.invoices.push(invoice);
    writeMockDb(db);
    this.logAction("u-1", "owner@kohinoor.com", "CONVERT_QUOTE_INVOICE", `Converted Quote ${quote.quoteNumber} to Invoice ${invoiceNumber}`);

    return {
      ...invoice,
      customer: db.customers.find(c => c.id === invoice.customerId),
      payments: [],
      quotation: {
        ...db.quotations[quoteIdx],
        items: db.quotationItems.filter(qi => qi.quotationId === quotationId)
      }
    };
  },

  // PAYMENTS
  async getPayments() {
    if (isDbConnected) {
      try {
        return await prisma.payment.findMany({ include: { invoice: true } });
      } catch (e) {}
    }
    const db = readMockDb();
    return db.payments.map(p => ({
      ...p,
      invoice: db.invoices.find(i => i.id === p.invoiceId)
    }));
  },

  async addPayment(paymentData: any) {
    const id = `p-${Date.now()}`;
    const amount = parseFloat(paymentData.amount);
    const newPayment = {
      id,
      invoiceId: paymentData.invoiceId,
      amount,
      paymentType: paymentData.paymentType || "REMAINING",
      paymentMethod: paymentData.paymentMethod || "UPI",
      transactionRef: paymentData.transactionRef || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (isDbConnected) {
      try {
        const payment = await prisma.payment.create({ data: newPayment });
        
        // Update Invoice status
        const invoice = await prisma.invoice.findUnique({
          where: { id: paymentData.invoiceId },
          include: { payments: true }
        });
        if (invoice) {
          const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0) + amount;
          let status: InvoiceStatus = "PARTIAL";
          if (totalPaid >= invoice.totalAmount) {
            status = "PAID";
          }
          await prisma.invoice.update({
            where: { id: invoice.id },
            data: { amountPaid: totalPaid, status }
          });
        }
        return payment;
      } catch (e) {}
    }

    const db = readMockDb();
    db.payments.push(newPayment);

    // Update invoice in mock
    const invIdx = db.invoices.findIndex(i => i.id === paymentData.invoiceId);
    if (invIdx !== -1) {
      const inv = db.invoices[invIdx];
      const newPaidAmount = inv.amountPaid + amount;
      inv.amountPaid = newPaidAmount;
      if (newPaidAmount >= inv.totalAmount) {
        inv.status = "PAID";
      } else {
        inv.status = "PARTIAL";
      }
      db.invoices[invIdx] = inv;
    }

    writeMockDb(db);
    this.logAction("u-1", "owner@kohinoor.com", "PAYMENT_RECORD", `Logged payment of ₹${amount} for Invoice ${paymentData.invoiceId}`);
    return newPayment;
  },



  // STORAGE MANAGEMENT
  async getStorageQuota() {
    if (isDbConnected) {
      try {
        let sq = await prisma.storageQuota.findFirst();
        if (!sq) {
          sq = await prisma.storageQuota.create({
            data: {
              totalQuotaBytes: 10 * 1024 * 1024 * 1024, // 10 GB
              usedBytes: 1.45 * 1024 * 1024 * 1024 // 1.45 GB
            }
          });
        }
        if (sq) return sq;
      } catch (e) {}
    }
    return readMockDb().storageQuota;
  },

  async uploadFileSimulation(sizeBytes: number) {
    const quota = await this.getStorageQuota();
    const total = Number(quota.totalQuotaBytes);
    const used = Number(quota.usedBytes);

    if (used + sizeBytes > total) {
      return { success: false, error: "Storage Full" };
    }

    const newUsed = used + sizeBytes;
    if (isDbConnected) {
      try {
        const sq = await prisma.storageQuota.findFirst();
        if (sq) {
          const updated = await prisma.storageQuota.update({
            where: { id: sq.id },
            data: { usedBytes: newUsed }
          });
          return { success: true, quota: updated };
        }
      } catch (e) {}
    }

    const db = readMockDb();
    db.storageQuota.usedBytes = newUsed;
    writeMockDb(db);
    return { success: true, quota: db.storageQuota };
  },

  async upgradeStorageQuota(bytesToAdd: number) {
    const quota = await this.getStorageQuota();
    const newTotal = Number(quota.totalQuotaBytes) + bytesToAdd;

    if (isDbConnected) {
      try {
        const sq = await prisma.storageQuota.findFirst();
        if (sq) {
          const updated = await prisma.storageQuota.update({
            where: { id: sq.id },
            data: { totalQuotaBytes: newTotal }
          });
          return updated;
        }
      } catch (e) {}
    }

    const db = readMockDb();
    db.storageQuota.totalQuotaBytes = newTotal;
    writeMockDb(db);
    this.logAction("u-1", "owner@kohinoor.com", "STORAGE_UPGRADE", `Upgraded storage limit by ${(bytesToAdd / (1024*1024*1024)).toFixed(0)} GB`);
    return db.storageQuota;
  },

  // COMPANY BRANDING
  async getCompanyBranding() {
    if (isDbConnected) {
      try {
        let cb = await prisma.companyBranding.findFirst();
        if (!cb) {
          cb = await prisma.companyBranding.create({
            data: {
              companyName: "Kohinoor Shutter Industries",
              logoUrl: "/logo-placeholder.png",
              gstNumber: "27AAACK5912K1Z9",
              bankName: "State Bank of India",
              bankAccountNo: "38927103829",
              bankIfsc: "SBIN0004561",
              invoiceTerms: "1. Goods once sold will not be taken back.\n2. Interest @ 18% will be charged if payment is not made within due date.\n3. Warranty claims must represent valid manufacturing defects.",
              quotationTerms: "1. Price quoted is valid for 30 days.\n2. 50% advance along with order. Balance on delivery.\n3. Civil work / electrical wiring must be provided by client."
            }
          });
        }
        if (cb) return cb;
      } catch (e) {}
    }
    return readMockDb().companyBranding;
  },

  async updateCompanyBranding(updates: any) {
    if (isDbConnected) {
      try {
        const cb = await prisma.companyBranding.findFirst();
        if (cb) {
          return await prisma.companyBranding.update({
            where: { id: cb.id },
            data: updates
          });
        } else {
          return await prisma.companyBranding.create({ data: updates });
        }
      } catch (e) {}
    }

    const db = readMockDb();
    db.companyBranding = { ...db.companyBranding, ...updates, updatedAt: new Date().toISOString() };
    writeMockDb(db);
    this.logAction("u-1", "owner@kohinoor.com", "BRANDING_UPDATE", "Updated company branding settings.");
    return db.companyBranding;
  },

  // QUOTATION DELETE
  async deleteQuotation(id: string) {
    if (isDbConnected) {
      try {
        const invoiceCount = await prisma.invoice.count({ where: { quotationId: id } });
        if (invoiceCount > 0) {
          throw new Error("Quotation cannot be deleted after invoice creation.");
        }
        await prisma.quotation.delete({ where: { id } });
        return true;
      } catch (e: any) {
        throw new Error(e.message || "Failed to delete quotation");
      }
    }
    const db = readMockDb();
    const invoiceExists = db.invoices.some(i => i.quotationId === id);
    if (invoiceExists) {
      throw new Error("Quotation cannot be deleted after invoice creation.");
    }
    db.quotations = db.quotations.filter(q => q.id !== id);
    db.quotationItems = db.quotationItems.filter(qi => qi.quotationId !== id);
    writeMockDb(db);
    return true;
  },

  // MASTER ITEMS
  async getMasterItems() {
    if (isDbConnected) {
      try {
        const count = await prisma.masterItem.count();
        if (count === 0) {
          await prisma.masterItem.createMany({ data: seedMasterItems });
        }
        return await prisma.masterItem.findMany({ orderBy: { category: "asc" } });
      } catch (e) {}
    }
    const db = readMockDb();
    if (!db.masterItems) {
      db.masterItems = [...seedMasterItems.map((item, idx) => ({ id: `mi-${idx}`, ...item, isDisabled: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }))];
      writeMockDb(db);
    }
    return db.masterItems;
  },

  async addMasterItem(item: any) {
    if (isDbConnected) {
      try {
        return await prisma.masterItem.create({
          data: {
            category: item.category,
            name: item.name,
            rate: parseFloat(item.rate || 0),
            unit: item.unit || "Pcs",
            isDisabled: item.isDisabled || false
          }
        });
      } catch (e) {}
    }
    const db = readMockDb();
    if (!db.masterItems) db.masterItems = [];
    const newItem = {
      id: `mi-${Date.now()}`,
      category: item.category,
      name: item.name,
      rate: parseFloat(item.rate || 0),
      unit: item.unit || "Pcs",
      isDisabled: item.isDisabled || false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.masterItems.push(newItem);
    writeMockDb(db);
    return newItem;
  },

  async updateMasterItem(id: string, updates: any) {
    if (isDbConnected) {
      try {
        const cleanUpdates: any = {};
        if (updates.name !== undefined) cleanUpdates.name = updates.name;
        if (updates.category !== undefined) cleanUpdates.category = updates.category;
        if (updates.rate !== undefined) cleanUpdates.rate = parseFloat(updates.rate);
        if (updates.unit !== undefined) cleanUpdates.unit = updates.unit;
        if (updates.isDisabled !== undefined) cleanUpdates.isDisabled = updates.isDisabled;
        return await prisma.masterItem.update({
          where: { id },
          data: cleanUpdates
        });
      } catch (e) {}
    }
    const db = readMockDb();
    if (!db.masterItems) db.masterItems = [];
    const idx = db.masterItems.findIndex(mi => mi.id === id);
    if (idx !== -1) {
      const updated = {
        ...db.masterItems[idx],
        ...updates,
        rate: updates.rate !== undefined ? parseFloat(updates.rate) : db.masterItems[idx].rate,
        isDisabled: updates.isDisabled !== undefined ? updates.isDisabled : db.masterItems[idx].isDisabled,
        updatedAt: new Date().toISOString()
      };
      db.masterItems[idx] = updated;
      writeMockDb(db);
      return updated;
    }
    return null;
  },

  async deleteMasterItem(id: string) {
    if (isDbConnected) {
      try {
        await prisma.masterItem.delete({ where: { id } });
        return true;
      } catch (e) {}
    }
    const db = readMockDb();
    if (!db.masterItems) db.masterItems = [];
    db.masterItems = db.masterItems.filter(mi => mi.id !== id);
    writeMockDb(db);
    return true;
  }
};

const seedMasterItems = [
  // 1. Material Categories
  { category: "Material Categories", name: "GI Sheet", rate: 0.0, unit: "Pcs" },
  { category: "Material Categories", name: "Pipes", rate: 0.0, unit: "Pcs" },
  { category: "Material Categories", name: "Springs", rate: 0.0, unit: "Pcs" },
  { category: "Material Categories", name: "Brackets", rate: 0.0, unit: "Pcs" },
  { category: "Material Categories", name: "Wheels", rate: 0.0, unit: "Pcs" },
  { category: "Material Categories", name: "Guides", rate: 0.0, unit: "Pcs" },
  { category: "Material Categories", name: "Kabadi", rate: 0.0, unit: "Pcs" },
  { category: "Material Categories", name: "Top Caps", rate: 0.0, unit: "Pcs" },
  { category: "Material Categories", name: "Handles", rate: 0.0, unit: "Pcs" },
  { category: "Material Categories", name: "Locks", rate: 0.0, unit: "Pcs" },
  { category: "Material Categories", name: "Fittings", rate: 0.0, unit: "Pcs" },

  // 2. Material Types
  { category: "Material Types", name: "GI", rate: 85.0, unit: "Sft" },
  { category: "Material Types", name: "ZN", rate: 95.0, unit: "Sft" },
  { category: "Material Types", name: "PPGI", rate: 110.0, unit: "Sft" },

  // 3. Thickness
  { category: "Thickness", name: "18G", rate: 0.0, unit: "Pcs" },
  { category: "Thickness", name: "20G", rate: 0.0, unit: "Pcs" },
  { category: "Thickness", name: "21G", rate: 0.0, unit: "Pcs" },
  { category: "Thickness", name: "22G", rate: 0.0, unit: "Pcs" },
  { category: "Thickness", name: "24G", rate: 0.0, unit: "Pcs" },

  // 4. Profiles
  { category: "Profiles", name: "Flat", rate: 0.0, unit: "Pcs" },
  { category: "Profiles", name: "Semi", rate: 0.0, unit: "Pcs" },
  { category: "Profiles", name: "Half Round", rate: 0.0, unit: "Pcs" },
  { category: "Profiles", name: "Round", rate: 0.0, unit: "Pcs" },

  // 5. Springs
  { category: "Springs", name: "SPR 4G", rate: 1200.0, unit: "Pcs" },
  { category: "Springs", name: "SPR 5G", rate: 1500.0, unit: "Pcs" },
  { category: "Springs", name: "SPR 6G", rate: 1800.0, unit: "Pcs" },
  { category: "Springs", name: "SPR 7G", rate: 2200.0, unit: "Pcs" },
  { category: "Springs", name: "SPR 8G", rate: 2600.0, unit: "Pcs" },

  // 6. Brackets
  { category: "Brackets", name: "13/16", rate: 350.0, unit: "Pcs" },
  { category: "Brackets", name: "12MS", rate: 450.0, unit: "Pcs" },
  { category: "Brackets", name: "16MS", rate: 600.0, unit: "Pcs" },
  { category: "Brackets", name: "Heavy", rate: 800.0, unit: "Pcs" },

  // 7. Wheels
  { category: "Wheels", name: "8\"", rate: 250.0, unit: "Pcs" },
  { category: "Wheels", name: "1¼\"", rate: 150.0, unit: "Pcs" },
  { category: "Wheels", name: "1½\"", rate: 180.0, unit: "Pcs" },
  { category: "Wheels", name: "2\"", rate: 220.0, unit: "Pcs" },

  // 8. Pipes
  { category: "Pipes", name: "1\"", rate: 120.0, unit: "Rft" },
  { category: "Pipes", name: "1¼\"", rate: 160.0, unit: "Rft" },
  { category: "Pipes", name: "1½\"", rate: 200.0, unit: "Rft" },
  { category: "Pipes", name: "2\"", rate: 260.0, unit: "Rft" },
  { category: "Pipes", name: "2½\"", rate: 320.0, unit: "Rft" },
  { category: "Pipes", name: "3\"", rate: 400.0, unit: "Rft" },

  // 9. Guides
  { category: "Guides", name: "GC", rate: 180.0, unit: "Rft" },
  { category: "Guides", name: "standard", rate: 150.0, unit: "Rft" },
  { category: "Guides", name: "heavy", rate: 220.0, unit: "Rft" },

  // 10. Kabadi
  { category: "Kabadi", name: "GI Flat", rate: 90.0, unit: "Kg" },

  // 11. Top Caps
  { category: "Top Caps", name: "3\"", rate: 80.0, unit: "Pcs" },
  { category: "Top Caps", name: "4\"", rate: 100.0, unit: "Pcs" },
  { category: "Top Caps", name: "5\"", rate: 130.0, unit: "Pcs" },
  { category: "Top Caps", name: "6\"", rate: 160.0, unit: "Pcs" },

  // 12. Handles
  { category: "Handles", name: "MS", rate: 50.0, unit: "Pcs" },
  { category: "Handles", name: "SS", rate: 120.0, unit: "Pcs" },
  { category: "Handles", name: "Heavy", rate: 180.0, unit: "Pcs" },

  // 13. Locks
  { category: "Locks", name: "Standard", rate: 250.0, unit: "Pcs" },
  { category: "Locks", name: "Heavy", rate: 450.0, unit: "Pcs" },
  { category: "Locks", name: "SS", rate: 600.0, unit: "Pcs" },

  // 14. Fittings
  { category: "Fittings", name: "Basic", rate: 1000.0, unit: "Pcs" },
  { category: "Fittings", name: "Premium", rate: 2500.0, unit: "Pcs" },
  { category: "Fittings", name: "Heavy", rate: 4000.0, unit: "Pcs" }
];
