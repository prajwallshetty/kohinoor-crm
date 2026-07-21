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
  bomItems?: any[];
}

// Initial seed data for the mock database
const initialMockData: MockDataSchema = {
  users: [
    { id: "u-1", email: "owner@kohinoor.com", name: "Administrator", avatarUrl: "" }
  ],
  customers: [],
  sites: [],
  leads: [],
  measurements: [],
  quotations: [],
  quotationItems: [],
  invoices: [],
  payments: [],
  installationJobs: [],
  inventoryItems: [],
  warranties: [],
  auditLogs: [],
  companyBranding: {
    id: "cb-1",
    companyName: "Kohinoor Rolling Shutters",
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
    usedBytes: 0
  }
};

// Check if database connection works, otherwise run mock file read/write
let isDbConnectedPromise: Promise<boolean> | null = null;
let isDbConnected = false;

async function ensureDbConnection(): Promise<boolean> {
  if (isDbConnectedPromise) return isDbConnectedPromise;
  isDbConnectedPromise = (async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      isDbConnected = true;
      return true;
    } catch (e: any) {
      console.warn("DB Connection check failed, defaulting to mock DB:", e?.message || e);
      isDbConnected = false;
      return false;
    }
  })();
  return isDbConnectedPromise;
}

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
    await ensureDbConnection();
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
    await ensureDbConnection();
    if (isDbConnected) {
      try {
        return await prisma.auditLog.findMany({ orderBy: { timestamp: "desc" }, take: 100 });
      } catch (e) {}
    }
    return readMockDb().auditLogs;
  },

  // USERS
  async getUsers() {
    await ensureDbConnection();
    if (isDbConnected) {
      try {
        return await prisma.user.findMany();
      } catch (e) {}
    }
    return readMockDb().users;
  },

  async findUserByEmail(email: string) {
    await ensureDbConnection();
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
    await ensureDbConnection();
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
    return (db.customers || []).map(c => ({
      ...c,
      sites: (db.sites || []).filter(s => s.customerId === c.id),
      leads: (db.leads || []).filter(l => l.customerId === c.id),
      quotations: (db.quotations || []).filter(q => q.customerId === c.id).map(q => ({
        ...q,
        items: (db.quotationItems || []).filter(qi => qi.quotationId === q.id)
      })),
      invoices: (db.invoices || []).filter(i => i.customerId === c.id).map(i => ({
        ...i,
        payments: (db.payments || []).filter(p => p.invoiceId === i.id)
      }))
    }));
  },

  async addCustomer(customer: any) {
    await ensureDbConnection();
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
    await ensureDbConnection();
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

  async deleteCustomer(id: string) {
    await ensureDbConnection();
    if (isDbConnected) {
      try {
        await prisma.customer.delete({ where: { id } });
        return true;
      } catch (e) {}
    }
    const db = readMockDb();
    db.customers = db.customers.filter(c => c.id !== id);
    writeMockDb(db);
    this.logAction("u-1", "owner@kohinoor.com", "CUSTOMER_DELETE", `Deleted customer ID: ${id}`);
    return true;
  },

  // SITES
  async addSite(customerId: string, siteData: any) {
    await ensureDbConnection();
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
    await ensureDbConnection();
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
    await ensureDbConnection();
    if (isDbConnected) {
      try {
        return await prisma.quotation.findMany({
          include: { 
            customer: true, 
            items: { include: { bomItems: true } }, 
            lead: true 
          }
        });
      } catch (e) {}
    }
    const db = readMockDb();
    return db.quotations.map(q => ({
      ...q,
      customer: db.customers.find(c => c.id === q.customerId),
      items: db.quotationItems.filter(qi => qi.quotationId === q.id).map(qi => ({
        ...qi,
        bomItems: db.bomItems ? db.bomItems.filter((bom: any) => bom.shutterId === qi.id) : []
      })),
      lead: db.leads.find(l => l.id === q.leadId)
    }));
  },

  async getQuotationById(id: string) {
    await ensureDbConnection();
    if (isDbConnected) {
      try {
        return await prisma.quotation.findUnique({
          where: { id },
          include: { 
            customer: true, 
            items: { include: { bomItems: true } }, 
            lead: true 
          }
        });
      } catch (e) {}
    }
    const db = readMockDb();
    const q = db.quotations.find(q => q.id === id);
    if (!q) return null;
    return {
      ...q,
      customer: db.customers.find(c => c.id === q.customerId),
      items: db.quotationItems.filter(qi => qi.quotationId === q.id).map(qi => ({
        ...qi,
        bomItems: db.bomItems ? db.bomItems.filter((bom: any) => bom.shutterId === qi.id) : []
      })),
      lead: db.leads.find(l => l.id === q.leadId)
    };
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
                productName: item.productName || item.shutterName || "Rolling Shutter",
                materialCategory: item.materialCategory || null,
                material: item.material || null,
                thickness: item.thickness || null,
                profile: item.profile || null,
                length: item.length !== undefined && item.length !== null ? parseFloat(item.length) : null,
                width: item.width !== undefined && item.width !== null ? parseFloat(item.width) : null,
                quantity: parseInt(item.quantity || 1),
                unitPrice: parseFloat(item.unitPrice || 0),
                lineTotal: parseFloat(item.lineTotal || 0),
                shutterName: item.shutterName || null,
                height: item.height !== undefined && item.height !== null ? parseFloat(item.height) : null,
                color: item.color || null,
                operationType: item.operationType || null,
                motorType: item.motorType || null,
                categoryId: item.categoryId || null,
                configJson: item.configJson || (item.config ? JSON.stringify(item.config) : null),
                unit: item.unit || null,
                bomItems: {
                  create: (item.bomItems || []).map((bom: any) => ({
                    materialName: bom.materialName,
                    specification: bom.specification || null,
                    quantity: parseFloat(bom.quantity || 0),
                    unit: bom.unit || "Pcs",
                    rate: parseFloat(bom.rate || 0),
                    totalPrice: parseFloat(bom.totalPrice || 0)
                  }))
                }
              }))
            }
          },
          include: { 
            items: { include: { bomItems: true } }
          }
        });
      } catch (e) {
        console.error("DB addQuotation failed", e);
      }
    }

    const db = readMockDb();
    db.quotations.push(newQuote);
    
    // Add items
    const addedItems = items.map((item, idx) => {
      const shutterId = `qi-${Date.now()}-${idx}`;
      const qitem = {
        id: shutterId,
        quotationId: id,
        productName: item.productName || item.shutterName || "Rolling Shutter",
        materialCategory: item.materialCategory || null,
        material: item.material || null,
        thickness: item.thickness || null,
        profile: item.profile || null,
        length: item.length !== undefined && item.length !== null ? parseFloat(item.length) : null,
        width: item.width !== undefined && item.width !== null ? parseFloat(item.width) : null,
        quantity: parseInt(item.quantity || 1),
        unitPrice: parseFloat(item.unitPrice || 0),
        lineTotal: parseFloat(item.lineTotal || 0),
        shutterName: item.shutterName || null,
        height: item.height !== undefined && item.height !== null ? parseFloat(item.height) : null,
        color: item.color || null,
        operationType: item.operationType || null,
        motorType: item.motorType || null,
        categoryId: item.categoryId || null,
        configJson: item.configJson || (item.config ? JSON.stringify(item.config) : null),
        unit: item.unit || null,
        bomItems: [] as any[]
      };

      const itemBom = (item.bomItems || []).map((bom: any, bIdx: number) => {
        const newBom = {
          id: `bom-${Date.now()}-${idx}-${bIdx}`,
          shutterId,
          materialName: bom.materialName,
          specification: bom.specification || null,
          quantity: parseFloat(bom.quantity || 0),
          unit: bom.unit || "Pcs",
          rate: parseFloat(bom.rate || 0),
          totalPrice: parseFloat(bom.totalPrice || 0)
        };
        if (!db.bomItems) db.bomItems = [];
        db.bomItems.push(newBom);
        return newBom;
      });

      qitem.bomItems = itemBom;
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
          include: { items: { include: { bomItems: true } } }
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
                lineTotal: item.lineTotal,
                shutterName: item.shutterName,
                height: item.height,
                color: item.color,
                operationType: item.operationType,
                motorType: item.motorType,
                categoryId: item.categoryId,
                configJson: item.configJson,
                unit: item.unit,
                bomItems: {
                  create: item.bomItems.map(bom => ({
                    materialName: bom.materialName,
                    specification: bom.specification,
                    quantity: bom.quantity,
                    unit: bom.unit,
                    rate: bom.rate,
                    totalPrice: bom.totalPrice
                  }))
                }
              }))
            }
          },
          include: { 
            items: { include: { bomItems: true } }
          }
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
      const shutterId = `qi-${Date.now()}-${idx}`;
      const qitem = {
        id: shutterId,
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
        lineTotal: item.lineTotal,
        shutterName: item.shutterName || null,
        height: item.height || null,
        color: item.color || null,
        operationType: item.operationType || null,
        motorType: item.motorType || null,
        categoryId: item.categoryId || null,
        configJson: item.configJson || null,
        unit: item.unit || null,
        bomItems: [] as any[]
      };

      const sourceBoms = db.bomItems ? db.bomItems.filter((bom: any) => bom.shutterId === item.id) : [];
      const itemBom = sourceBoms.map((bom: any, bIdx: number) => {
        const newBom = {
          id: `bom-${Date.now()}-${idx}-${bIdx}`,
          shutterId,
          materialName: bom.materialName,
          specification: bom.specification || null,
          quantity: bom.quantity,
          unit: bom.unit || "Pcs",
          rate: bom.rate,
          totalPrice: bom.totalPrice
        };
        if (!db.bomItems) db.bomItems = [];
        db.bomItems.push(newBom);
        return newBom;
      });

      qitem.bomItems = itemBom;
      db.quotationItems.push(qitem);
      return qitem;
    });

    writeMockDb(db);
    this.logAction("u-1", "owner@kohinoor.com", "QUOTATION_REVISION", `Created revision ${newQuoteNum} for ${baseNum}`);
    return { ...newQuote, items: addedItems };
  },

  // INVOICES
  async getInvoices() {
    await ensureDbConnection();
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
    terms?: string,
    materialItems?: any[]
  ) {
    if (isDbConnected) {
      try {
        // Check if already converted
        const existing = await prisma.invoice.findFirst({ 
          where: { quotationId },
          include: { customer: true, payments: true, quotation: { include: { items: { include: { bomItems: true } } } } }
        });
        if (existing) return existing;

        const quote = await prisma.quotation.findUnique({
          where: { id: quotationId },
          include: { items: { include: { bomItems: true } } }
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
            const lineTotal = Number(item.quantity) * Number(item.unitPrice);
            subtotal += lineTotal;
            
            await prisma.quotationItem.create({
              data: {
                quotationId,
                productName: item.productName || item.shutterName || "Rolling Shutter",
                materialCategory: item.materialCategory || null,
                material: item.material || null,
                thickness: item.thickness || null,
                profile: item.profile || null,
                length: item.length !== undefined && item.length !== null ? parseFloat(item.length) : null,
                width: item.width !== undefined && item.width !== null ? parseFloat(item.width) : null,
                quantity: parseInt(item.quantity) || 1,
                unitPrice: parseFloat(item.unitPrice) || 0,
                lineTotal,
                shutterName: item.shutterName || null,
                height: item.height !== undefined && item.height !== null ? parseFloat(item.height) : null,
                color: item.color || null,
                operationType: item.operationType || null,
                motorType: item.motorType || null,
                categoryId: item.categoryId || null,
                configJson: item.configJson || (item.config ? JSON.stringify(item.config) : null),
                unit: item.unit || null,
                bomItems: {
                  create: (item.bomItems || []).map((bom: any) => ({
                    materialName: bom.materialName,
                    specification: bom.specification || null,
                    quantity: parseFloat(bom.quantity || 0),
                    unit: bom.unit || "Pcs",
                    rate: parseFloat(bom.rate || 0),
                    totalPrice: parseFloat(bom.totalPrice || 0)
                  }))
                }
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
          include: { customer: true, payments: true, quotation: { include: { items: { include: { bomItems: true } } } } }
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
              items: db.quotationItems.filter(qi => qi.quotationId === q.id).map(qi => ({
                ...qi,
                bomItems: db.bomItems ? db.bomItems.filter((bom: any) => bom.shutterId === qi.id) : []
              }))
            };
          }
          return null;
        })()
      };
    }

    const quoteIdx = db.quotations.findIndex(q => q.id === quotationId);
    if (quoteIdx === -1) return null;
    const quote = db.quotations[quoteIdx];

    let subtotal = 0;

    if (items) {
      // Find old shutter IDs for this quotation
      const oldShutterIds = db.quotationItems.filter(qi => qi.quotationId === quotationId).map(qi => qi.id);
      // Remove old items
      db.quotationItems = db.quotationItems.filter(qi => qi.quotationId !== quotationId);
      // Remove old BOM items
      db.bomItems = db.bomItems ? db.bomItems.filter((bom: any) => !oldShutterIds.includes(bom.shutterId)) : [];
      
      // Add new items
      items.forEach((item, idx) => {
        const shutterId = `qi-${Date.now()}-${idx}`;
        const lineTotal = Number(item.quantity) * Number(item.unitPrice);
        subtotal += lineTotal;

        const qitem = {
          id: shutterId,
          quotationId,
          productName: item.productName || item.shutterName || "Rolling Shutter",
          materialCategory: item.materialCategory || null,
          material: item.material || null,
          thickness: item.thickness || null,
          profile: item.profile || null,
          length: item.length !== undefined && item.length !== null ? parseFloat(item.length) : null,
          width: item.width !== undefined && item.width !== null ? parseFloat(item.width) : null,
          quantity: parseInt(item.quantity) || 1,
          unitPrice: parseFloat(item.unitPrice) || 0,
          lineTotal,
          shutterName: item.shutterName || null,
          height: item.height !== undefined && item.height !== null ? parseFloat(item.height) : null,
          color: item.color || null,
          operationType: item.operationType || null,
          motorType: item.motorType || null,
          categoryId: item.categoryId || null,
          configJson: item.configJson || (item.config ? JSON.stringify(item.config) : null),
          unit: item.unit || null,
          bomItems: [] as any[]
        };

        const itemBom = (item.bomItems || []).map((bom: any, bIdx: number) => {
          const newBom = {
            id: `bom-${Date.now()}-${idx}-${bIdx}`,
            shutterId,
            materialName: bom.materialName,
            specification: bom.specification || null,
            quantity: parseFloat(bom.quantity || 0),
            unit: bom.unit || "Pcs",
            rate: parseFloat(bom.rate || 0),
            totalPrice: parseFloat(bom.totalPrice || 0)
          };
          if (!db.bomItems) db.bomItems = [];
          db.bomItems.push(newBom);
          return newBom;
        });

        qitem.bomItems = itemBom;
        db.quotationItems.push(qitem);
      });
    } else {
      const sourceItems = db.quotationItems.filter(qi => qi.quotationId === quotationId);
      subtotal = sourceItems.reduce((sum: number, i: any) => sum + i.lineTotal, 0);
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
      materialItems: materialItems || [],
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
        items: db.quotationItems.filter(qi => qi.quotationId === quotationId).map(qi => ({
          ...qi,
          bomItems: db.bomItems ? db.bomItems.filter((bom: any) => bom.shutterId === qi.id) : []
        }))
      }
    };
  },

  // PAYMENTS
  async getPayments() {
    await ensureDbConnection();
    if (isDbConnected) {
      try {
        return await prisma.payment.findMany({ 
          include: { 
            invoice: { 
              include: { customer: true } 
            } 
          },
          orderBy: { createdAt: "desc" }
        });
      } catch (e) {}
    }
    const db = readMockDb();
    return db.payments.map(p => ({
      ...p,
      invoice: (() => {
        const inv = db.invoices.find(i => i.id === p.invoiceId);
        if (inv) {
          return {
            ...inv,
            customer: db.customers.find(c => c.id === inv.customerId)
          };
        }
        return null;
      })()
    }));
  },

  async addPayment(paymentData: any) {
    await ensureDbConnection();
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
          const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
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
    await ensureDbConnection();
    if (isDbConnected) {
      try {
        let cb = await prisma.companyBranding.findFirst();
        if (!cb) {
          cb = await prisma.companyBranding.create({
            data: {
              companyName: "Kohinoor Rolling Shutters",
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
    await ensureDbConnection();
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
  { category: "Material Categories", name: "Pipe", rate: 0.0, unit: "Pcs" },
  { category: "Material Categories", name: "Pipes", rate: 0.0, unit: "Pcs" },
  { category: "Material Categories", name: "Spring", rate: 0.0, unit: "Pcs" },
  { category: "Material Categories", name: "Springs", rate: 0.0, unit: "Pcs" },
  { category: "Material Categories", name: "Bracket", rate: 0.0, unit: "Pcs" },
  { category: "Material Categories", name: "Brackets", rate: 0.0, unit: "Pcs" },
  { category: "Material Categories", name: "Wheel", rate: 0.0, unit: "Pcs" },
  { category: "Material Categories", name: "Wheels", rate: 0.0, unit: "Pcs" },
  { category: "Material Categories", name: "Guide", rate: 0.0, unit: "Pcs" },
  { category: "Material Categories", name: "Guides", rate: 0.0, unit: "Pcs" },
  { category: "Material Categories", name: "Kabadi", rate: 0.0, unit: "Pcs" },
  { category: "Material Categories", name: "Top Cap", rate: 0.0, unit: "Pcs" },
  { category: "Material Categories", name: "Top Caps", rate: 0.0, unit: "Pcs" },
  { category: "Material Categories", name: "Handle", rate: 0.0, unit: "Pcs" },
  { category: "Material Categories", name: "Handles", rate: 0.0, unit: "Pcs" },
  { category: "Material Categories", name: "Lock", rate: 0.0, unit: "Pcs" },
  { category: "Material Categories", name: "Locks", rate: 0.0, unit: "Pcs" },
  { category: "Material Categories", name: "Motor", rate: 0.0, unit: "Pcs" },
  { category: "Material Categories", name: "Fittings", rate: 0.0, unit: "Pcs" },

  // 2. Material Types
  { category: "Material Types", name: "GI", rate: 85.0, unit: "Sft" },
  { category: "Material Types", name: "ZN", rate: 95.0, unit: "Sft" },
  { category: "Material Types", name: "PPGI", rate: 110.0, unit: "Sft" },

  // 3. Thickness
  { category: "Thickness", name: "18G", rate: 18.5, unit: "Pcs" },
  { category: "Thickness", name: "20G", rate: 16.8, unit: "Pcs" },
  { category: "Thickness", name: "21G", rate: 15.3, unit: "Pcs" },
  { category: "Thickness", name: "22G", rate: 14.0, unit: "Pcs" },
  { category: "Thickness", name: "24G", rate: 12.5, unit: "Pcs" },

  // 4. Profiles
  { category: "Profiles", name: "Flat", rate: 0.0, unit: "Pcs" },
  { category: "Profiles", name: "Semi", rate: 0.0, unit: "Pcs" },
  { category: "Profiles", name: "Half Round", rate: 0.0, unit: "Pcs" },
  { category: "Profiles", name: "Round", rate: 0.0, unit: "Pcs" },

  // 5. Springs
  { category: "Springs", name: "SPR 4G", rate: 150.0, unit: "PCS" },
  { category: "Springs", name: "SPR 5G", rate: 186.0, unit: "PCS" },
  { category: "Springs", name: "SPR 6G", rate: 220.0, unit: "PCS" },
  { category: "Springs", name: "SPR 7G", rate: 260.0, unit: "PCS" },

  // 6. Brackets
  { category: "Brackets", name: "13/16", rate: 350.0, unit: "PCS" },
  { category: "Brackets", name: "12MS", rate: 450.0, unit: "PCS" },
  { category: "Brackets", name: "16MS", rate: 600.0, unit: "PCS" },
  { category: "Brackets", name: "Heavy", rate: 800.0, unit: "PCS" },

  // 7. Wheels
  { category: "Wheels", name: "8\"", rate: 250.0, unit: "PCS" },
  { category: "Wheels", name: "1¼\"", rate: 150.0, unit: "PCS" },
  { category: "Wheels", name: "1½\"", rate: 180.0, unit: "PCS" },
  { category: "Wheels", name: "2\"", rate: 220.0, unit: "PCS" },

  // 8. Pipes
  { category: "Pipes", name: "1\"", rate: 52.0, unit: "FT" },
  { category: "Pipes", name: "1¼\"", rate: 68.0, unit: "FT" },
  { category: "Pipes", name: "1¼ Pipe", rate: 68.0, unit: "FT" },
  { category: "Pipes", name: "1½\"", rate: 90.0, unit: "FT" },
  { category: "Pipes", name: "2\"", rate: 120.0, unit: "FT" },
  { category: "Pipes", name: "2½\"", rate: 160.0, unit: "FT" },
  { category: "Pipes", name: "3\"", rate: 210.0, unit: "FT" },

  // 9. Guides
  { category: "Guides", name: "GC", rate: 80.0, unit: "FT" },
  { category: "Guides", name: "standard", rate: 150.0, unit: "FT" },
  { category: "Guides", name: "heavy", rate: 220.0, unit: "FT" },

  // 10. Kabadi
  { category: "Kabadi", name: "GI Flat", rate: 90.0, unit: "Kg" },

  // 11. Top Caps
  { category: "Top Caps", name: "3\"", rate: 80.0, unit: "PCS" },
  { category: "Top Caps", name: "4\"", rate: 100.0, unit: "PCS" },
  { category: "Top Caps", name: "5\"", rate: 130.0, unit: "PCS" },
  { category: "Top Caps", name: "6\"", rate: 160.0, unit: "PCS" },

  // 12. Handles
  { category: "Handles", name: "MS", rate: 50.0, unit: "PCS" },
  { category: "Handles", name: "SS", rate: 120.0, unit: "PCS" },
  { category: "Handles", name: "Heavy", rate: 180.0, unit: "PCS" },

  // 13. Locks
  { category: "Locks", name: "Standard", rate: 250.0, unit: "PCS" },
  { category: "Locks", name: "Heavy Lock", rate: 450.0, unit: "PCS" },
  { category: "Locks", name: "SS Lock", rate: 600.0, unit: "PCS" },
  { category: "Locks", name: "SS", rate: 600.0, unit: "PCS" },

  // 14. Fittings
  { category: "Fittings", name: "Basic", rate: 1000.0, unit: "PCS" },
  { category: "Fittings", name: "Premium", rate: 2500.0, unit: "PCS" },
  { category: "Fittings", name: "Heavy", rate: 4000.0, unit: "PCS" },

  // 15. Motor Options
  { category: "Motor Brands", name: "Somfy", rate: 12000.0, unit: "PCS" },
  { category: "Motor Brands", name: "Generic 40Nm", rate: 6500.0, unit: "PCS" },
  { category: "Motor Brands", name: "Crompton", rate: 9500.0, unit: "PCS" },
  { category: "Motor Models", name: "Roll Up 40Nm", rate: 0.0, unit: "PCS" },
  { category: "Motor Models", name: "Roll Up 50Nm", rate: 0.0, unit: "PCS" },
  { category: "Motor Models", name: "Heavy Duty 100Nm", rate: 0.0, unit: "PCS" },

  // 16. Color Finish Options
  { category: "Color", name: "Raw Galvanized", rate: 0.0, unit: "PCS" },
  { category: "Color", name: "Off-White Powder Coat", rate: 15.0, unit: "Sft" },
  { category: "Color", name: "Dark Blue Powder Coat", rate: 18.0, unit: "Sft" },
  { category: "Color", name: "Custom RAL Powder Coat", rate: 25.0, unit: "Sft" },

  // 16. Dynamic Category Fields Definitions (Loaded directly by Quotation Engine)
  { category: "Fields: GI Sheet", name: "Material|dropdown|Material Types", rate: 0.0, unit: "Pcs" },
  { category: "Fields: GI Sheet", name: "Thickness|dropdown|Thickness", rate: 0.0, unit: "Pcs" },
  { category: "Fields: GI Sheet", name: "Profile|dropdown|Profiles", rate: 0.0, unit: "Pcs" },
  { category: "Fields: GI Sheet", name: "Length|number", rate: 0.0, unit: "Pcs" },
  { category: "Fields: GI Sheet", name: "Rate|currency", rate: 0.0, unit: "Pcs" },

  { category: "Fields: Pipe", name: "Pipe Size|search_select|Pipes", rate: 0.0, unit: "Pcs" },
  { category: "Fields: Pipe", name: "Length|number", rate: 0.0, unit: "Pcs" },
  { category: "Fields: Pipe", name: "Rate|currency", rate: 0.0, unit: "Pcs" },

  { category: "Fields: Pipes", name: "Pipe Size|search_select|Pipes", rate: 0.0, unit: "Pcs" },
  { category: "Fields: Pipes", name: "Length|number", rate: 0.0, unit: "Pcs" },
  { category: "Fields: Pipes", name: "Rate|currency", rate: 0.0, unit: "Pcs" },

  { category: "Fields: Spring", name: "Spring Type|radio|Springs", rate: 0.0, unit: "Pcs" },
  { category: "Fields: Spring", name: "Quantity|number", rate: 0.0, unit: "Pcs" },
  { category: "Fields: Spring", name: "Rate|currency", rate: 0.0, unit: "Pcs" },

  { category: "Fields: Springs", name: "Spring Type|radio|Springs", rate: 0.0, unit: "Pcs" },
  { category: "Fields: Springs", name: "Quantity|number", rate: 0.0, unit: "Pcs" },
  { category: "Fields: Springs", name: "Rate|currency", rate: 0.0, unit: "Pcs" },

  { category: "Fields: Guide", name: "Guide Type|dropdown|Guides", rate: 0.0, unit: "Pcs" },
  { category: "Fields: Guide", name: "Length|number", rate: 0.0, unit: "Pcs" },
  { category: "Fields: Guide", name: "Rate|currency", rate: 0.0, unit: "Pcs" },

  { category: "Fields: Guides", name: "Guide Type|dropdown|Guides", rate: 0.0, unit: "Pcs" },
  { category: "Fields: Guides", name: "Length|number", rate: 0.0, unit: "Pcs" },
  { category: "Fields: Guides", name: "Rate|currency", rate: 0.0, unit: "Pcs" },

  { category: "Fields: Wheel", name: "Wheel Size|dropdown|Wheels", rate: 0.0, unit: "Pcs" },
  { category: "Fields: Wheel", name: "Quantity|number", rate: 0.0, unit: "Pcs" },
  { category: "Fields: Wheel", name: "Rate|currency", rate: 0.0, unit: "Pcs" },

  { category: "Fields: Wheels", name: "Wheel Size|dropdown|Wheels", rate: 0.0, unit: "Pcs" },
  { category: "Fields: Wheels", name: "Quantity|number", rate: 0.0, unit: "Pcs" },
  { category: "Fields: Wheels", name: "Rate|currency", rate: 0.0, unit: "Pcs" },

  { category: "Fields: Motor", name: "Brand|dropdown|Motor Brands", rate: 0.0, unit: "Pcs" },
  { category: "Fields: Motor", name: "Model|autocomplete|Motor Models", rate: 0.0, unit: "Pcs" },
  { category: "Fields: Motor", name: "HP|text", rate: 0.0, unit: "Pcs" },
  { category: "Fields: Motor", name: "Price|currency", rate: 0.0, unit: "Pcs" },
  { category: "Fields: Motor", name: "Warranty|text", rate: 0.0, unit: "Pcs" },

  { category: "Fields: Bracket", name: "Bracket Type|dropdown|Brackets", rate: 0.0, unit: "Pcs" },
  { category: "Fields: Bracket", name: "Quantity|number", rate: 0.0, unit: "Pcs" },
  { category: "Fields: Bracket", name: "Rate|currency", rate: 0.0, unit: "Pcs" },

  { category: "Fields: Brackets", name: "Bracket Type|dropdown|Brackets", rate: 0.0, unit: "Pcs" },
  { category: "Fields: Brackets", name: "Quantity|number", rate: 0.0, unit: "Pcs" },
  { category: "Fields: Brackets", name: "Rate|currency", rate: 0.0, unit: "Pcs" },

  { category: "Fields: Kabadi", name: "Kabadi Type|dropdown|Kabadi", rate: 0.0, unit: "Pcs" },
  { category: "Fields: Kabadi", name: "Quantity|number", rate: 0.0, unit: "Pcs" },
  { category: "Fields: Kabadi", name: "Rate|currency", rate: 0.0, unit: "Pcs" },

  { category: "Fields: Top Cap", name: "Top Cap Size|dropdown|Top Caps", rate: 0.0, unit: "Pcs" },
  { category: "Fields: Top Cap", name: "Quantity|number", rate: 0.0, unit: "Pcs" },
  { category: "Fields: Top Cap", name: "Rate|currency", rate: 0.0, unit: "Pcs" },

  { category: "Fields: Top Caps", name: "Top Cap Size|dropdown|Top Caps", rate: 0.0, unit: "Pcs" },
  { category: "Fields: Top Caps", name: "Quantity|number", rate: 0.0, unit: "Pcs" },
  { category: "Fields: Top Caps", name: "Rate|currency", rate: 0.0, unit: "Pcs" },

  { category: "Fields: Handle", name: "Handle Type|dropdown|Handles", rate: 0.0, unit: "Pcs" },
  { category: "Fields: Handle", name: "Quantity|number", rate: 0.0, unit: "Pcs" },
  { category: "Fields: Handle", name: "Rate|currency", rate: 0.0, unit: "Pcs" },

  { category: "Fields: Handles", name: "Handle Type|dropdown|Handles", rate: 0.0, unit: "Pcs" },
  { category: "Fields: Handles", name: "Quantity|number", rate: 0.0, unit: "Pcs" },
  { category: "Fields: Handles", name: "Rate|currency", rate: 0.0, unit: "Pcs" },

  { category: "Fields: Lock", name: "Lock Type|dropdown|Locks", rate: 0.0, unit: "Pcs" },
  { category: "Fields: Lock", name: "Quantity|number", rate: 0.0, unit: "Pcs" },
  { category: "Fields: Lock", name: "Rate|currency", rate: 0.0, unit: "Pcs" },

  { category: "Fields: Locks", name: "Lock Type|dropdown|Locks", rate: 0.0, unit: "Pcs" },
  { category: "Fields: Locks", name: "Quantity|number", rate: 0.0, unit: "Pcs" },
  { category: "Fields: Locks", name: "Rate|currency", rate: 0.0, unit: "Pcs" },

  { category: "Fields: Fittings", name: "Fittings Type|dropdown|Fittings", rate: 0.0, unit: "Pcs" },
  { category: "Fields: Fittings", name: "Quantity|number", rate: 0.0, unit: "Pcs" },
  { category: "Fields: Fittings", name: "Rate|currency", rate: 0.0, unit: "Pcs" }
];

