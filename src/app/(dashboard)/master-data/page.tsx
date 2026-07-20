"use client";

import React, { useEffect, useState } from "react";
import { 
  Database, Plus, Search, Trash2, Edit, Check, X, ToggleLeft, ToggleRight, Loader2,
  Package, Sliders, Layers, Info, Filter, ArrowUpRight, Sparkles
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

const DEFAULT_CATEGORIES = [
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
  "Fittings",
  "Motor Brands",
  "Motor Models"
];

export default function MasterDataPage() {
  const [items, setItems] = useState<MasterItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("Material Categories");
  const [categorySearch, setCategorySearch] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Add Item Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalCategory, setModalCategory] = useState("Material Categories");
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

  // Dynamically collect all unique categories from items database
  const allCategories = Array.from(
    new Set([
      ...DEFAULT_CATEGORIES,
      ...items.map((i) => i.category)
    ])
  ).sort((a, b) => {
    if (a === "Material Categories") return -1;
    if (b === "Material Categories") return 1;
    if (a.startsWith("Fields:") && !b.startsWith("Fields:")) return 1;
    if (!a.startsWith("Fields:") && b.startsWith("Fields:")) return -1;
    return a.localeCompare(b);
  });

  const filteredCategories = allCategories.filter((cat) =>
    cat.toLowerCase().includes(categorySearch.toLowerCase())
  );

  const triggerNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(""), 3000);
  };

  const handleOpenAddModal = (cat?: string) => {
    setModalCategory(cat || selectedCategory);
    setNewName("");
    setNewRate("0");
    setNewUnit("Pcs");
    setShowAddModal(true);
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
          category: modalCategory,
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
        if (selectedCategory !== modalCategory) {
          setSelectedCategory(modalCategory);
        }
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

  const filteredItems = items.filter(
    (item) =>
      item.category === selectedCategory &&
      item.name.toLowerCase().includes(search.toLowerCase())
  );

  // Statistics calculation
  const totalCategoriesCount = allCategories.length;
  const activeItemsCount = items.filter((i) => !i.isDisabled).length;
  const totalSchemasCount = allCategories.filter((c) => c.startsWith("Fields:")).length;

  const isSchemaCategory = selectedCategory.startsWith("Fields:");

  return (
    <div className="flex flex-col gap-6 h-full relative">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-4 right-4 bg-primary text-primary-foreground text-xs px-4 py-3 rounded-xl shadow-2xl z-50 flex items-center gap-2 border border-primary/20 animate-in slide-in-from-bottom-4 duration-200">
          <Check className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold">{notification}</span>
        </div>
      )}

      {/* Header Banner & Action */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-card/80 via-card/50 to-secondary/30 border border-border/80 p-6 rounded-2xl shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 text-primary shadow-sm shrink-0">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold font-heading text-foreground flex items-center gap-2">
              <span>ERP Master Data Control</span>
              <span className="text-[10px] font-mono uppercase bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                Admin Console
              </span>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage product categories, variant pricing, rates, units, and dynamic quotation form schemas.
            </p>
          </div>
        </div>

        <button
          onClick={() => handleOpenAddModal(selectedCategory)}
          className="bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-bold py-2.5 px-5 rounded-xl flex items-center gap-2 shadow-lg shadow-primary/25 cursor-pointer shrink-0 transition-all hover:scale-[1.01]"
        >
          <Plus className="w-4 h-4" />
          <span>Add Master Item</span>
        </button>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card/40 border border-border/80 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-bold">
              Total Categories
            </span>
            <div className="text-xl font-black font-mono text-foreground mt-0.5">
              {totalCategoriesCount} <span className="text-xs text-muted-foreground font-sans font-normal">Categories</span>
            </div>
          </div>
          <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl">
            <Package className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-card/40 border border-border/80 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-bold">
              Active Items & Variants
            </span>
            <div className="text-xl font-black font-mono text-emerald-400 mt-0.5">
              {activeItemsCount} <span className="text-xs text-muted-foreground font-sans font-normal">Active</span>
            </div>
          </div>
          <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-card/40 border border-border/80 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-bold">
              Dynamic Form Schemas
            </span>
            <div className="text-xl font-black font-mono text-purple-400 mt-0.5">
              {totalSchemasCount} <span className="text-xs text-muted-foreground font-sans font-normal">Schemas</span>
            </div>
          </div>
          <div className="p-2.5 bg-purple-500/10 text-purple-400 rounded-xl">
            <Sliders className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Grid: Category Selector Left, Table Right */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* Left Side: Categories sidebar */}
        <div className="lg:col-span-1 border border-border/80 rounded-2xl bg-card/40 overflow-hidden flex flex-col max-h-[calc(100vh-290px)]">
          <div className="p-4 border-b border-border/60 bg-secondary/20 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-primary" />
                <span>Categories Catalog</span>
              </h3>
              <span className="text-[10px] font-mono bg-secondary px-2 py-0.5 rounded text-muted-foreground font-bold">
                {allCategories.length}
              </span>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Filter categories..."
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                className="w-full bg-secondary/40 border border-border/80 rounded-xl py-1.5 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/60 transition-all"
              />
            </div>
          </div>

          <div className="overflow-y-auto flex-1 divide-y divide-border/30 max-h-[520px]">
            {filteredCategories.map((cat) => {
              const count = items.filter((i) => i.category === cat).length;
              const isSelected = selectedCategory === cat;
              const isSchema = cat.startsWith("Fields:");

              return (
                <div
                  key={cat}
                  onClick={() => {
                    setSelectedCategory(cat);
                    setEditingId(null);
                    setSearch("");
                  }}
                  className={`p-3.5 cursor-pointer text-xs transition-all duration-150 flex justify-between items-center group ${
                    isSelected
                      ? "bg-primary/10 border-l-4 border-primary text-foreground font-bold"
                      : "hover:bg-secondary/40 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    {isSchema ? (
                      <Sliders className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-purple-400" : "text-purple-400/60"}`} />
                    ) : cat === "Material Categories" ? (
                      <Package className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-primary" : "text-primary/60"}`} />
                    ) : (
                      <Layers className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-sky-400" : "text-slate-400/60"}`} />
                    )}
                    <span className="truncate">{cat}</span>
                  </div>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full shrink-0 ${
                      isSelected
                        ? "bg-primary text-primary-foreground font-bold"
                        : "bg-secondary text-muted-foreground group-hover:bg-secondary/80"
                    }`}
                  >
                    {count}
                  </span>
                </div>
              );
            })}

            {filteredCategories.length === 0 && (
              <div className="p-6 text-center text-xs text-muted-foreground font-medium">
                No categories match "{categorySearch}"
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Data CRUD Table */}
        <div className="lg:col-span-3 border border-border/80 rounded-2xl bg-card/40 backdrop-blur-md p-6 flex flex-col gap-5">
          
          {/* Header Info Banner */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/60 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold font-heading text-foreground tracking-tight">
                  {selectedCategory}
                </h2>
                <span className="text-xs font-mono font-bold bg-secondary px-2.5 py-0.5 rounded-md border text-foreground">
                  {filteredItems.length} items
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isSchemaCategory ? (
                  <span className="text-purple-400 font-medium">
                    Schema definition fields for category configurator (format: <code className="bg-secondary px-1 py-0.5 rounded text-[10px] text-foreground font-mono">FieldLabel|fieldType|sourceCategory</code>)
                  </span>
                ) : selectedCategory === "Material Categories" ? (
                  <span>Master product categories loaded into the quotation category drawer.</span>
                ) : (
                  <span>Option values loaded into quotation variant dropdowns and pickers.</span>
                )}
              </p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-60">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder={`Search ${selectedCategory.toLowerCase()}...`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-secondary/40 border border-border/85 rounded-xl py-2 pl-9 pr-4 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-all"
                />
              </div>

              <button
                type="button"
                onClick={() => handleOpenAddModal(selectedCategory)}
                className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shrink-0 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="border border-border/80 rounded-xl overflow-hidden bg-card/60">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-secondary/30 text-[9px] font-mono uppercase tracking-wider text-muted-foreground border-b border-border/60">
                  <th className="p-3.5">
                    {isSchemaCategory ? "Field Schema Specification (Label|type|source)" : "Specification Name / Variant"}
                  </th>
                  <th className="p-3.5 w-32 font-mono">Default Rate (₹)</th>
                  <th className="p-3.5 w-28 font-mono">Default Unit</th>
                  <th className="p-3.5 w-24 text-center">Status</th>
                  <th className="p-3.5 w-28 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-center p-12 text-muted-foreground">
                      <div className="flex items-center justify-center gap-2 font-medium">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        <span>Loading master database records...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center p-12 text-muted-foreground">
                      <div className="space-y-2">
                        <p className="font-medium">No records found in "{selectedCategory}".</p>
                        <button
                          onClick={() => handleOpenAddModal(selectedCategory)}
                          className="text-primary hover:underline text-xs font-bold cursor-pointer"
                        >
                          + Add first item to {selectedCategory}
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const isEditing = editingId === item.id;
                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-secondary/15 transition-all ${
                          item.isDisabled ? "opacity-60 bg-secondary/5" : ""
                        }`}
                      >
                        {/* Name / Spec Column */}
                        <td className="p-3.5">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="bg-secondary/60 border border-border rounded-lg px-3 py-1.5 w-full text-xs text-foreground font-semibold outline-none focus:border-primary"
                            />
                          ) : (
                            <div className="space-y-0.5">
                              <span className="font-bold text-foreground block">{item.name}</span>
                              {isSchemaCategory && (
                                <span className="text-[10px] text-muted-foreground font-mono block">
                                  Parsed: {item.name.split("|").join(" • ")}
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Rate Column */}
                        <td className="p-3.5 font-mono">
                          {isEditing ? (
                            <input
                              type="number"
                              step="any"
                              value={editRate}
                              onChange={(e) => setEditRate(e.target.value)}
                              className="bg-secondary/60 border border-border rounded-lg px-2.5 py-1.5 w-28 text-xs text-foreground font-mono font-bold outline-none focus:border-primary"
                            />
                          ) : (
                            <span className="font-bold text-foreground">
                              ₹{item.rate.toLocaleString("en-IN")}
                            </span>
                          )}
                        </td>

                        {/* Unit Column */}
                        <td className="p-3.5 font-mono">
                          {isEditing ? (
                            <select
                              value={editUnit}
                              onChange={(e) => setEditUnit(e.target.value)}
                              className="bg-secondary/60 border border-border rounded-lg px-2 py-1.5 text-xs text-foreground font-semibold w-24 outline-none cursor-pointer"
                            >
                              <option value="Pcs">Pcs</option>
                              <option value="FT">FT</option>
                              <option value="Sft">Sft</option>
                              <option value="Rft">Rft</option>
                              <option value="Kg">Kg</option>
                              <option value="Set">Set</option>
                              <option value="PCS">PCS</option>
                            </select>
                          ) : (
                            <span className="text-muted-foreground bg-secondary/80 border border-border/60 px-2 py-0.5 rounded text-[10px] font-bold">
                              {item.unit.toUpperCase()}
                            </span>
                          )}
                        </td>

                        {/* Status Column */}
                        <td className="p-3.5 text-center">
                          <button
                            onClick={() => handleToggleStatus(item)}
                            className="inline-flex cursor-pointer transition-transform hover:scale-105"
                            title={item.isDisabled ? "Click to Enable" : "Click to Disable"}
                          >
                            {item.isDisabled ? (
                              <div className="flex items-center gap-1.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider">
                                <span>Disabled</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider">
                                <span>Active</span>
                              </div>
                            )}
                          </button>
                        </td>

                        {/* Actions Column */}
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => handleSaveEdit(item.id)}
                                  className="text-emerald-400 hover:bg-emerald-500/10 p-1.5 rounded-lg border border-transparent hover:border-emerald-500/20 transition-colors cursor-pointer"
                                  title="Save Changes"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="text-rose-400 hover:bg-rose-500/10 p-1.5 rounded-lg border border-transparent hover:border-rose-500/20 transition-colors cursor-pointer"
                                  title="Cancel"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleStartEdit(item)}
                                  className="text-sky-400 hover:bg-sky-500/10 p-1.5 rounded-lg border border-transparent hover:border-sky-500/20 transition-colors cursor-pointer"
                                  title="Edit Item"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="text-rose-400 hover:bg-rose-500/10 p-1.5 rounded-lg border border-transparent hover:border-rose-500/20 transition-colors cursor-pointer"
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
          <div className="w-full max-w-md bg-card border border-border/90 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto animate-in zoom-in-95 duration-200">
            
            <div className="p-5 border-b border-border flex justify-between items-center bg-secondary/20">
              <div>
                <h3 className="font-heading font-bold text-sm text-foreground">
                  Add Item to Master Data
                </h3>
                <p className="text-[10px] text-muted-foreground">Define master specifications, default rates, and units</p>
              </div>

              <button
                onClick={() => setShowAddModal(false)}
                className="text-muted-foreground hover:text-foreground p-1 hover:bg-secondary rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddItem} className="p-6 space-y-4">
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-bold">
                  Target Category
                </label>
                <select
                  value={modalCategory}
                  onChange={(e) => setModalCategory(e.target.value)}
                  className="w-full bg-secondary/35 border border-border rounded-xl px-3.5 py-2 text-xs text-foreground font-bold outline-none focus:border-primary cursor-pointer"
                >
                  {allCategories.map((cat) => (
                    <option key={cat} value={cat} className="bg-card text-foreground font-semibold">
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-bold">
                  {modalCategory.startsWith("Fields:") ? "Field Definition (Label|type|sourceCat)" : "Specification Name / Variant Name"}
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    modalCategory.startsWith("Fields:")
                      ? "e.g. Material|dropdown|Material Types"
                      : "e.g. 21G, SPR 5G, GI Flat, 1¼ Pipe"
                  }
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-secondary/35 border border-border hover:border-primary/40 rounded-xl px-3.5 py-2 text-xs outline-none text-foreground font-semibold focus:border-primary focus:bg-background transition-all"
                />
                {modalCategory.startsWith("Fields:") && (
                  <span className="text-[10px] text-purple-400 block font-mono">
                    Supported field types: dropdown, radio, number, currency, unit, text, textarea, boolean, search_select, autocomplete.
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-bold">
                    Default Rate (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={newRate}
                    onChange={(e) => setNewRate(e.target.value)}
                    className="w-full bg-secondary/35 border border-border rounded-xl px-3.5 py-2 text-xs outline-none text-foreground font-mono font-bold focus:border-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-bold">
                    Default Unit
                  </label>
                  <select
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    className="w-full bg-secondary/35 border border-border rounded-xl px-3.5 py-2 text-xs outline-none text-foreground font-bold focus:border-primary cursor-pointer"
                  >
                    <option value="Pcs">Pcs (Piece)</option>
                    <option value="FT">FT (Feet)</option>
                    <option value="Sft">Sft (Square Feet)</option>
                    <option value="Rft">Rft (Running Feet)</option>
                    <option value="Kg">Kg (Kilogram)</option>
                    <option value="Set">Set</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl text-xs hover:bg-primary/95 shadow-lg shadow-primary/20 transition-all cursor-pointer hover:scale-[1.01]"
                >
                  Add Master Specification
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
