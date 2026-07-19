"use client";

import React, { useEffect, useState } from "react";
import { 
  Database, Plus, Search, Trash2, Edit, Check, X, ToggleLeft, ToggleRight, Loader2
} from "lucide-react";

interface MasterItem {
  id: string;
  category: string;
  name: string;
  rate: number;
  unit: string;
  isDisabled: boolean;
  createdAt: string;
}

const CATEGORIES = [
  "Material Categories",
  "Material Types",
  "Thickness",
  "Profiles",
  "Springs",
  "Brackets",
  "Wheels",
  "Pipes",
  "Guides",
  "Kabadi",
  "Top Caps",
  "Handles",
  "Locks",
  "Fittings"
];

export default function MasterDataPage() {
  const [items, setItems] = useState<MasterItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("Material Categories");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Add Item Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRate, setNewRate] = useState("0");
  const [newUnit, setNewUnit] = useState("Pcs");

  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editRate, setEditRate] = useState("0");
  const [editUnit, setEditUnit] = useState("Pcs");

  // Notification state
  const [notification, setNotification] = useState("");

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/master-data");
      if (res.ok) {
        setItems(await res.json());
      }
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const triggerNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(""), 3000);
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      alert("Specification name is required.");
      return;
    }

    try {
      const res = await fetch("/api/master-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: selectedCategory,
          name: newName,
          rate: parseFloat(newRate) || 0,
          unit: newUnit,
          isDisabled: false
        })
      });

      if (res.ok) {
        triggerNotification("Master item added successfully!");
        setNewName("");
        setNewRate("0");
        setNewUnit("Pcs");
        setShowAddModal(false);
        fetchItems();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to create master item");
      }
    } catch (e) {}
  };

  const handleToggleStatus = async (item: MasterItem) => {
    try {
      const res = await fetch(`/api/master-data/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDisabled: !item.isDisabled })
      });

      if (res.ok) {
        triggerNotification(`Item ${item.isDisabled ? "enabled" : "disabled"} successfully!`);
        fetchItems();
      }
    } catch (e) {}
  };

  const handleStartEdit = (item: MasterItem) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditRate(item.rate.toString());
    setEditUnit(item.unit);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editName.trim()) {
      alert("Name cannot be empty");
      return;
    }
    try {
      const res = await fetch(`/api/master-data/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          rate: parseFloat(editRate) || 0,
          unit: editUnit
        })
      });

      if (res.ok) {
        triggerNotification("Master item updated!");
        setEditingId(null);
        fetchItems();
      }
    } catch (e) {}
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm("Are you sure you want to delete this master item?")) return;
    try {
      const res = await fetch(`/api/master-data/${id}`, {
        method: "DELETE"
      });

      if (res.ok) {
        triggerNotification("Master item deleted.");
        fetchItems();
      }
    } catch (e) {}
  };

  const filteredItems = items.filter(item => 
    item.category === selectedCategory &&
    item.name.toLowerCase().includes(search.toLowerCase())
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

      {/* Header Description */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card/40 border border-border/80 p-5 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center border text-muted-foreground shadow-sm">
            <Database className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-bold font-heading text-foreground">ERP Master Data Control</h2>
            <p className="text-xs text-muted-foreground">Manage materials, thickness gauges, springs, locks, and accessories rates.</p>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-semibold py-2 px-4 rounded-lg flex items-center gap-2 shadow-lg shadow-primary/25 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Master Item</span>
        </button>
      </div>

      {/* Main Grid: Category List Left, Table Right */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left Side: Categories selector */}
        <div className="lg:col-span-1 border border-border/80 rounded-xl bg-card/30 overflow-hidden flex flex-col max-h-[calc(100vh-250px)]">
          <div className="p-4 border-b border-border/60 bg-secondary/15">
            <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-bold">
              Master Categories
            </h3>
          </div>
          <div className="overflow-y-auto flex-1 divide-y divide-border/40 max-h-[500px]">
            {CATEGORIES.map((cat) => (
              <div
                key={cat}
                onClick={() => {
                  setSelectedCategory(cat);
                  setEditingId(null);
                  setSearch("");
                }}
                className={`p-3.5 cursor-pointer text-xs font-medium transition-all duration-150 flex justify-between items-center ${
                  selectedCategory === cat
                    ? "bg-primary/5 border-l-2 border-primary text-primary font-bold"
                    : "hover:bg-secondary/40 text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>{cat}</span>
                <span className="text-[10px] font-mono bg-secondary px-1.5 py-0.5 rounded text-muted-foreground">
                  {items.filter(i => i.category === cat).length}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Data CRUD Table */}
        <div className="lg:col-span-3 border border-border/80 rounded-xl bg-card/45 backdrop-blur-md p-6 flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/60 pb-4">
            <h2 className="text-sm font-bold font-heading text-foreground uppercase tracking-wider">
              {selectedCategory} Items ({filteredItems.length})
            </h2>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder={`Search ${selectedCategory.toLowerCase()}...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-secondary/40 border border-border/85 rounded-lg py-1.5 pl-9 pr-4 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/60 transition-all duration-150"
              />
            </div>
          </div>

          <div className="border border-border/80 rounded-lg overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-secondary/25 text-[9px] font-mono uppercase tracking-wider text-muted-foreground border-b border-border/60">
                  <th className="p-3">Specification / Name</th>
                  <th className="p-3 w-32">Rate (₹)</th>
                  <th className="p-3 w-28">Unit</th>
                  <th className="p-3 w-24 text-center">Status</th>
                  <th className="p-3 w-28 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-center p-8 text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        <span>Loading master database...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center p-8 text-muted-foreground">
                      No records found in this category. Click "Add Master Item" to register.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const isEditing = editingId === item.id;
                    return (
                      <tr key={item.id} className={`hover:bg-secondary/15 transition-all ${item.isDisabled ? "opacity-60 bg-secondary/5" : ""}`}>
                        <td className="p-3">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="bg-secondary/60 border border-border rounded px-2 py-1 w-full text-xs text-foreground font-semibold"
                            />
                          ) : (
                            <span className="font-semibold text-foreground">{item.name}</span>
                          )}
                        </td>
                        <td className="p-3 font-mono">
                          {isEditing ? (
                            <input
                              type="number"
                              value={editRate}
                              onChange={(e) => setEditRate(e.target.value)}
                              className="bg-secondary/60 border border-border rounded px-2 py-1 w-24 text-xs text-foreground font-mono"
                            />
                          ) : (
                            <span className="font-bold text-foreground">₹{item.rate.toLocaleString("en-IN")}</span>
                          )}
                        </td>
                        <td className="p-3 font-mono">
                          {isEditing ? (
                            <select
                              value={editUnit}
                              onChange={(e) => setEditUnit(e.target.value)}
                              className="bg-secondary/60 border border-border rounded px-1.5 py-1 text-xs text-foreground w-20"
                            >
                              <option value="Pcs">Pcs</option>
                              <option value="Sft">Sft</option>
                              <option value="Rft">Rft</option>
                              <option value="Kg">Kg</option>
                              <option value="Feet">Feet</option>
                            </select>
                          ) : (
                            <span className="text-muted-foreground bg-secondary/70 border border-border/50 px-1.5 py-0.5 rounded text-[10px]">
                              {item.unit}
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleToggleStatus(item)}
                            className="inline-flex cursor-pointer transition-colors"
                            title={item.isDisabled ? "Click to Enable" : "Click to Disable"}
                          >
                            {item.isDisabled ? (
                              <div className="flex items-center gap-1.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded text-[9px] font-bold">
                                <span>Disabled</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[9px] font-bold">
                                <span>Active</span>
                              </div>
                            )}
                          </button>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => handleSaveEdit(item.id)}
                                  className="text-emerald-400 hover:bg-emerald-500/10 p-1 border rounded"
                                  title="Save Changes"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="text-rose-400 hover:bg-rose-500/10 p-1 border rounded"
                                  title="Cancel"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleStartEdit(item)}
                                  className="text-sky-400 hover:bg-sky-500/10 p-1 border border-transparent hover:border-border rounded"
                                  title="Edit Rate / Unit"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="text-rose-400 hover:bg-rose-500/10 p-1 border border-transparent hover:border-border rounded"
                                  title="Delete Item"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
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
      </div>

      {/* Add Master Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-border flex justify-between items-center bg-secondary/15">
              <h3 className="font-heading font-semibold text-sm">Add New {selectedCategory} Item</h3>
              <button 
                onClick={() => setShowAddModal(false)} 
                className="text-muted-foreground hover:text-foreground text-xs font-semibold"
              >
                Cancel
              </button>
            </div>
            
            <form onSubmit={handleAddItem} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">Category</label>
                <input
                  type="text"
                  disabled
                  value={selectedCategory}
                  className="w-full bg-secondary/40 border border-border rounded-md px-3 py-1.5 text-xs text-muted-foreground font-medium disabled:opacity-70"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">Specification Name / Gauge / Size</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 21G, SPR 5G, GI Flat"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-secondary/40 border border-border rounded-md px-3 py-1.5 text-xs outline-none text-foreground font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">Default Rate (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={newRate}
                    onChange={(e) => setNewRate(e.target.value)}
                    className="w-full bg-secondary/40 border border-border rounded-md px-3 py-1.5 text-xs outline-none text-foreground font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">Default Unit</label>
                  <select
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    className="w-full bg-secondary/40 border border-border rounded-md px-2.5 py-1.5 text-xs outline-none text-foreground"
                  >
                    <option value="Pcs">Pcs (Per piece)</option>
                    <option value="Sft">Sft (Square Feet)</option>
                    <option value="Rft">Rft (Running Feet)</option>
                    <option value="Kg">Kg (Kilograms)</option>
                    <option value="Feet">Feet</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-primary text-primary-foreground font-semibold py-2.5 rounded-lg text-xs hover:bg-primary/95 shadow-md shadow-primary/25 cursor-pointer mt-2"
              >
                Add Master Specification
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
