"use client";

import React, { useEffect, useState } from "react";
import { Plus, Search, Trash2, ShieldAlert, Check, RefreshCw } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";

type LeadStatus = "NEW" | "CONTACTED" | "SITE_VISIT" | "MEASUREMENT" | "QUOTATION" | "NEGOTIATION" | "WON" | "LOST";

interface Customer {
  id: string;
  name: string;
}

interface Lead {
  id: string;
  title: string;
  customerId: string;
  status: LeadStatus;
  value: number;
  notes: string;
  customer?: Customer;
}

const columns: { label: string; value: LeadStatus; color: string }[] = [
  { label: "New", value: "NEW", color: "border-t-sky-500 bg-sky-500/5 text-sky-400" },
  { label: "Contacted", value: "CONTACTED", color: "border-t-indigo-500 bg-indigo-500/5 text-indigo-400" },
  { label: "Site Visit", value: "SITE_VISIT", color: "border-t-purple-500 bg-purple-500/5 text-purple-400" },
  { label: "Measurement", value: "MEASUREMENT", color: "border-t-pink-500 bg-pink-500/5 text-pink-400" },
  { label: "Quotation", value: "QUOTATION", color: "border-t-amber-500 bg-amber-500/5 text-amber-400" },
  { label: "Negotiation", value: "NEGOTIATION", color: "border-t-orange-500 bg-orange-500/5 text-orange-400" },
  { label: "Won", value: "WON", color: "border-t-emerald-500 bg-emerald-500/5 text-emerald-400" },
  { label: "Lost", value: "LOST", color: "border-t-rose-500 bg-rose-500/5 text-rose-400" }
];

export default function LeadsPage() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Add Lead Modal State
  const [showAddLead, setShowAddLead] = useState(false);
  const [leadTitle, setLeadTitle] = useState("");
  const [leadCustomer, setLeadCustomer] = useState("");
  const [leadValue, setLeadValue] = useState("");
  const [leadNotes, setLeadNotes] = useState("");

  const [notification, setNotification] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const leadsRes = await fetch("/api/leads");
      const customersRes = await fetch("/api/customers");
      
      if (leadsRes.ok && customersRes.ok) {
        setLeads(await leadsRes.json());
        setCustomers(await customersRes.json());
      }
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // HTML5 Drag handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: LeadStatus) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (!id) return;

    // Optimistic UI update
    const originalLeads = [...leads];
    setLeads((prev) => 
      prev.map((l) => (l.id === id ? { ...l, status: targetStatus } : l))
    );

    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: targetStatus })
      });

      if (!res.ok) {
        // Rollback
        setLeads(originalLeads);
      } else {
        setNotification("Lead status updated!");
        setTimeout(() => setNotification(""), 2000);
      }
    } catch (e) {
      setLeads(originalLeads);
    }
  };

  const handleAddLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadTitle || !leadCustomer || !leadValue) {
      alert("Please fill in Title, Customer, and Estimated Value.");
      return;
    }

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: leadTitle,
          customerId: leadCustomer,
          value: parseFloat(leadValue),
          notes: leadNotes,
          status: "NEW"
        })
      });

      if (res.ok) {
        setNotification("New lead pipeline created!");
        setTimeout(() => setNotification(""), 3000);
        setLeadTitle("");
        setLeadCustomer("");
        setLeadValue("");
        setLeadNotes("");
        setShowAddLead(false);
        fetchData();
      }
    } catch (e) {}
  };

  const handleDeleteLead = async (id: string) => {
    if (!confirm("Are you sure you want to remove this lead from the pipeline?")) return;

    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: "DELETE"
      });

      if (res.ok) {
        setNotification("Lead deleted.");
        setTimeout(() => setNotification(""), 2000);
        fetchData();
      }
    } catch (e) {}
  };

  // Filter leads based on query
  const filteredLeads = leads.filter(l => 
    l.title.toLowerCase().includes(search.toLowerCase()) ||
    (l.customer && l.customer.name.toLowerCase().includes(search.toLowerCase()))
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

      {/* Header controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card/45 border border-border/80 p-4 rounded-xl">
        <div className="relative flex-grow max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search leads by title or customer name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-secondary/40 border border-border/80 rounded-lg py-2 pl-10 pr-4 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/60 transition-all duration-150"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="p-2 bg-secondary/60 hover:bg-secondary border border-border/80 text-muted-foreground hover:text-foreground rounded-lg transition-all"
            title="Refresh Pipeline"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => setShowAddLead(true)}
            className="bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-semibold py-2 px-4 rounded-lg flex items-center gap-2 shadow-lg shadow-primary/25 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Sales Lead</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 gap-2">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-muted-foreground">Syncing pipeline status...</span>
        </div>
      ) : (
        /* Kanban Board columns */
        <div className="flex gap-4 overflow-x-auto pb-4 max-h-[calc(100vh-230px)] select-none">
          {columns.map((col) => {
            const colLeads = filteredLeads.filter(l => l.status === col.value);
            const colTotalValue = colLeads.reduce((sum, l) => sum + l.value, 0);

            return (
              <div
                key={col.value}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.value)}
                className="w-72 shrink-0 flex flex-col gap-4 border border-border/60 rounded-xl p-3 bg-card/20 min-h-[calc(100vh-260px)]"
              >
                {/* Column header */}
                <div className={`border-t-2 rounded-md p-3 flex flex-col gap-1 border-x border-b border-border/40 shadow-sm ${col.color}`}>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold font-heading">{col.label}</span>
                    <span className="text-[10px] font-mono bg-background/50 px-2 py-0.5 rounded-full font-bold">
                      {colLeads.length}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono opacity-80 leading-none">
                    ₹{colTotalValue.toLocaleString("en-IN")}
                  </span>
                </div>

                {/* Column Body Cards */}
                <div className="flex-1 flex flex-col gap-3 overflow-y-auto px-1">
                  {colLeads.map((lead) => (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, lead.id)}
                      className="bg-card hover:bg-card/90 border border-border/80 p-4 rounded-lg shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing transition-all duration-150 flex flex-col gap-3 group"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                          {lead.title}
                        </span>
                        
                        <button
                          onClick={() => handleDeleteLead(lead.id)}
                          className="text-muted-foreground/40 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-secondary"
                          title="Delete Lead"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex flex-col gap-0.5 border-t border-border/20 pt-2 text-[10px]">
                        <span className="text-muted-foreground font-medium">
                          {lead.customer?.name || "Unassociated Client"}
                        </span>
                        <span className="text-foreground font-mono font-bold">
                          ₹{lead.value.toLocaleString("en-IN")}
                        </span>
                      </div>

                      {lead.notes && (
                        <p className="text-[10px] text-muted-foreground line-clamp-2 italic leading-relaxed bg-secondary/20 p-2 rounded border border-border/20">
                          {lead.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Lead Modal */}
      {showAddLead && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-border flex justify-between items-center bg-secondary/10">
              <h3 className="font-heading font-semibold text-sm">Create Sales Lead</h3>
              <button onClick={() => setShowAddLead(false)} className="text-muted-foreground hover:text-foreground text-xs font-semibold">
                Cancel
              </button>
            </div>
            
            <form onSubmit={handleAddLeadSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Select Customer Profile</label>
                <select
                  required
                  value={leadCustomer}
                  onChange={(e) => setLeadCustomer(e.target.value)}
                  className="w-full bg-secondary/40 border border-border rounded-md px-3 py-2 text-xs outline-none text-foreground"
                >
                  <option value="" className="bg-card">Choose Client...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id} className="bg-card">{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Lead Project Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 4x Motorised Industrial Shutters"
                  value={leadTitle}
                  onChange={(e) => setLeadTitle(e.target.value)}
                  className="w-full bg-secondary/40 border border-border rounded-md px-3 py-1.5 text-xs outline-none text-foreground"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">Estimated Valuation (₹)</label>
                <input
                  type="number"
                  required
                  placeholder="320000"
                  value={leadValue}
                  onChange={(e) => setLeadValue(e.target.value)}
                  className="w-full bg-secondary/40 border border-border rounded-md px-3 py-1.5 text-xs outline-none text-foreground font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Initial Discovery Notes</label>
                <textarea
                  rows={3}
                  placeholder="Describe rolling shutter dimensions, requirements, electrical layout, or customer requests."
                  value={leadNotes}
                  onChange={(e) => setLeadNotes(e.target.value)}
                  className="w-full bg-secondary/40 border border-border rounded-md px-3 py-1.5 text-xs outline-none text-foreground resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-primary text-primary-foreground font-semibold py-2 rounded-md text-xs hover:bg-primary/95 shadow-md shadow-primary/25 cursor-pointer"
              >
                Insert into Pipeline
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
