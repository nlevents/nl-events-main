import { exportFullCatalogData, importFullCatalogData } from "./catalogStore";
import { queueCloudSync } from "./cloudStore";
// Admin data layer.
//
// Clients, invoices, and settings are cached in this browser's localStorage
// for instant reads, and every write is also pushed to Supabase via
// queueCloudSync() (see cloudStore.js) so other devices/browsers pick it up
// too. localStorage is just the cache — if it's ever cleared, the data is
// still safe in the cloud as long as Supabase is configured. Use
// exportAllData() for a portable offline backup regardless.

const KEYS = {
  clients: "nle-admin-clients",
  invoices: "nle-admin-invoices",
  settings: "nle-admin-settings",
};

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed == null ? fallback : parsed;
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    queueCloudSync(key, value);
    return true;
  } catch {
    return false;
  }
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

const DEFAULT_SETTINGS = {
  businessName: "Next Level Events",
  address: "Kanke Road, Beside Chef's Chaupati, Jhigra Toli, Gandhi Nagar, Ranchi, Jharkhand 834002",
  phone: "+91 7903 133 317",
  email: "nextlevel.events25@gmail.com",
  gstin: "",
  upiId: "",
  bankDetails: "",
  invoicePrefix: "NLE",
  defaultTaxRate: 0,
  nextInvoiceSeq: 1,
  nextQuotationSeq: 1,
  invoiceNotes: "Thank you for choosing Next Level Events.",
  defaultTerms: "Payment terms and event conditions will be confirmed in writing before the event.",
  logoUrl: "/assets/images/landing/nle-logo.png",
};

// ---------- Settings ----------

export function getSettings() {
  return { ...DEFAULT_SETTINGS, ...readJSON(KEYS.settings, {}) };
}

export function saveSettings(patch) {
  const next = { ...getSettings(), ...patch };
  writeJSON(KEYS.settings, next);
  return next;
}

// ---------- Clients ----------

export function getClients() {
  return readJSON(KEYS.clients, []);
}

export function getClient(id) {
  return getClients().find((c) => c.id === id) || null;
}

export function saveClient(client) {
  const clients = getClients();
  const now = new Date().toISOString();
  if (client.id) {
    const idx = clients.findIndex((c) => c.id === client.id);
    if (idx === -1) return null;
    clients[idx] = { ...clients[idx], ...client, updatedAt: now };
    writeJSON(KEYS.clients, clients);
    return clients[idx];
  }
  const record = { ...client, id: uid(), createdAt: now, updatedAt: now };
  clients.push(record);
  writeJSON(KEYS.clients, clients);
  return record;
}

export function deleteClient(id) {
  writeJSON(KEYS.clients, getClients().filter((c) => c.id !== id));
}

// ---------- Invoices ----------

export function getInvoices() {
  const invoices = readJSON(KEYS.invoices, []);
  // Backward compatibility: older records used dueDate. The product now
  // uses eventDate for both quotations and invoices.
  return invoices.map((inv) => ({
    ...inv,
    eventDate: inv.eventDate || inv.dueDate || "",
    eventTime: inv.eventTime || "",
    subject: inv.subject || "",
    terms: inv.terms ?? "",
    payments: Array.isArray(inv.payments) ? inv.payments : [],
    writeOff: inv.writeOff || null,
  }));
}

export function getInvoice(id) {
  return getInvoices().find((inv) => inv.id === id) || null;
}

export function computeTotals(items, discount, taxRate) {
  const subtotal = (items || []).reduce((sum, it) => sum + (Number(it.qty) || 0) * (Number(it.rate) || 0), 0);
  const discounted = Math.max(0, subtotal - (Number(discount) || 0));
  const taxAmount = discounted * ((Number(taxRate) || 0) / 100);
  const total = discounted + taxAmount;
  return { subtotal, taxAmount, total };
}

// Generates the next sequential invoice number (e.g. "NLE-2026-0007") and
// persists the incremented counter, so numbers never repeat even across
// deleted invoices.
export function nextInvoiceNumber() {
  const settings = getSettings();
  const year = new Date().getFullYear();
  const seq = settings.nextInvoiceSeq || 1;
  saveSettings({ nextInvoiceSeq: seq + 1 });
  return settings.invoicePrefix + "-" + year + "-" + String(seq).padStart(4, "0");
}

export function nextQuotationNumber() {
  const settings = getSettings();
  const year = new Date().getFullYear();
  const seq = settings.nextQuotationSeq || 1;
  saveSettings({ nextQuotationSeq: seq + 1 });
  return "QUO-" + year + "-" + String(seq).padStart(4, "0");
}

export function saveInvoice(invoice) {
  const invoices = getInvoices();
  const now = new Date().toISOString();
  const { subtotal, taxAmount, total } = computeTotals(invoice.items, invoice.discount, invoice.taxRate);
  const withTotals = {
    ...invoice,
    subtotal,
    taxAmount,
    total,
    eventDate: invoice.eventDate || invoice.dueDate || "",
    eventTime: invoice.eventTime || "",
    subject: invoice.subject || "",
    terms: invoice.terms ?? getSettings().defaultTerms ?? "",
    payments: Array.isArray(invoice.payments) ? invoice.payments : [],
    writeOff: invoice.writeOff || null,
  };
  delete withTotals.dueDate;

  if (invoice.id) {
    const idx = invoices.findIndex((inv) => inv.id === invoice.id);
    if (idx === -1) return null;
    invoices[idx] = { ...invoices[idx], ...withTotals, updatedAt: now };
    writeJSON(KEYS.invoices, invoices);
    return invoices[idx];
  }

  const record = {
    ...withTotals,
    id: uid(),
    number: invoice.number || (invoice.documentType === "quotation" ? nextQuotationNumber() : nextInvoiceNumber()),
    createdAt: now,
    updatedAt: now,
  };
  invoices.push(record);
  writeJSON(KEYS.invoices, invoices);
  return record;
}

export function getInvoiceBalance(invoice) {
  if (!invoice) return 0;
  const paid = (invoice.payments || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const writtenOff = Number(invoice.writeOff?.amount) || 0;
  return Math.max(0, (Number(invoice.total) || 0) - paid - writtenOff);
}

export function recordInvoicePayment(id, payment) {
  const invoices = getInvoices();
  const idx = invoices.findIndex((inv) => inv.id === id);
  if (idx === -1) throw new Error("Invoice not found.");
  const invoice = invoices[idx];
  const balance = getInvoiceBalance(invoice);
  const amount = Number(payment?.amount);
  if (!(amount > 0)) throw new Error("Enter a payment amount greater than zero.");
  if (amount > balance + 0.01) throw new Error("Payment cannot be greater than the remaining balance.");
  const nextPayments = [...(invoice.payments || []), {
    id: uid(),
    amount,
    paymentDate: payment.paymentDate || new Date().toISOString().slice(0, 10),
    method: String(payment.method || "Bank transfer"),
    reference: String(payment.reference || ""),
    notes: String(payment.notes || ""),
    createdAt: new Date().toISOString(),
  }];
  const nextBalance = Math.max(0, balance - amount);
  invoices[idx] = {
    ...invoice,
    payments: nextPayments,
    status: nextBalance <= 0.01 ? "paid" : "partially_paid",
    updatedAt: new Date().toISOString(),
  };
  writeJSON(KEYS.invoices, invoices);
  return invoices[idx];
}

export function writeOffInvoice(id, amount, reason) {
  const invoices = getInvoices();
  const idx = invoices.findIndex((inv) => inv.id === id);
  if (idx === -1) throw new Error("Invoice not found.");
  const invoice = invoices[idx];
  const balance = getInvoiceBalance(invoice);
  const value = amount == null ? balance : Number(amount);
  if (!(value > 0)) throw new Error("Write-off amount must be greater than zero.");
  if (value > balance + 0.01) throw new Error("Write-off cannot exceed the remaining balance.");
  if (!String(reason || "").trim()) throw new Error("A write-off reason is required.");
  invoices[idx] = {
    ...invoice,
    writeOff: { amount: value, reason: String(reason).trim(), date: new Date().toISOString().slice(0, 10) },
    status: "written_off",
    updatedAt: new Date().toISOString(),
  };
  writeJSON(KEYS.invoices, invoices);
  return invoices[idx];
}

export function deleteInvoice(id) {
  writeJSON(KEYS.invoices, getInvoices().filter((inv) => inv.id !== id));
}

export function setInvoiceStatus(id, status) {
  const invoices = getInvoices();
  const idx = invoices.findIndex((inv) => inv.id === id);
  if (idx === -1) return null;
  invoices[idx] = { ...invoices[idx], status, updatedAt: new Date().toISOString() };
  writeJSON(KEYS.invoices, invoices);
  return invoices[idx];
}

// ---------- Dashboard stats ----------

export function getStats() {
  const invoices = getInvoices();
  const clients = getClients();
  const paid = invoices.filter((i) => i.status === "paid");
  const outstanding = invoices.filter((i) => ["sent", "overdue", "partially_paid"].includes(i.status));
  const thisMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"
  const revenueThisMonth = paid
    .filter((i) => (i.issueDate || "").slice(0, 7) === thisMonth)
    .reduce((s, i) => s + (i.total || 0), 0);
  return {
    totalClients: clients.length,
    totalInvoices: invoices.length,
    totalRevenue: paid.reduce((s, i) => s + (i.total || 0), 0),
    revenueThisMonth,
    outstandingAmount: outstanding.reduce((s, i) => s + (i.total || 0), 0),
    outstandingCount: outstanding.length,
    recentInvoices: [...invoices].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")).slice(0, 5),
  };
}

// ---------- Backup / restore ----------

export function exportAllData() {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      clients: getClients(),
      invoices: getInvoices(),
      settings: getSettings(),
      catalog: JSON.parse(exportFullCatalogData()),
    },
    null,
    2
  );
}

// Merges by id (imported records win on conflict) rather than wiping
// existing data, so importing a partial/older backup can't accidentally
// erase newer records.
export function importAllData(jsonText) {
  const data = JSON.parse(jsonText);
  if (!data || typeof data !== "object") throw new Error("Invalid backup file.");

  if (Array.isArray(data.clients)) {
    const existing = getClients();
    const byId = new Map(existing.map((c) => [c.id, c]));
    data.clients.forEach((c) => { if (c && c.id) byId.set(c.id, c); });
    writeJSON(KEYS.clients, [...byId.values()]);
  }
  if (Array.isArray(data.invoices)) {
    const existing = getInvoices();
    const byId = new Map(existing.map((i) => [i.id, i]));
    data.invoices.forEach((i) => { if (i && i.id) byId.set(i.id, i); });
    writeJSON(KEYS.invoices, [...byId.values()]);
  }
  if (data.settings && typeof data.settings === "object") {
    saveSettings(data.settings);
  }
  if (data.catalog && typeof data.catalog === "object") {
    importFullCatalogData(JSON.stringify(data.catalog));
  }
  return true;
}
