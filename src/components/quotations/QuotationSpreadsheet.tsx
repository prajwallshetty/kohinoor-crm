import React, { useState, useEffect, useRef } from "react";
import { Trash2, Copy, ArrowUp, ArrowDown, Plus } from "lucide-react";

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

  width?: number;
  height?: number;
  material?: string;
  thickness?: string;
  profile?: string;
  pipeSize?: string;
  springType?: string;
  wheelSize?: string;
  bracketVariant?: string;
  guideChannelVariant?: string;
  kabadiSize?: string;
  topCoverSize?: string;
  handleQty?: number;
  lockQty?: number;
  fittingsQty?: number;
  notes?: string;
}

interface MasterItem {
  id: string;
  name: string;
  category: string;
  rate: number;
  isDisabled?: boolean;
}

interface QuotationSpreadsheetProps {
  items: GenLine[];
  onChange: (items: GenLine[]) => void;
  masterItems: MasterItem[];
  onManualEdit?: () => void;
}

// Columns definition
const COLUMNS = [
  { key: "description", label: "Description", type: "text" },
  { key: "width", label: "Width", type: "number" },
  { key: "height", label: "Height", type: "number" },
  { key: "material", label: "Material", type: "select", category: ["Material Types", "Material"], defaultOptions: ["GI", "ZN", "MS", "PPGI"] },
  { key: "thickness", label: "Thickness", type: "select", category: ["Thickness"], defaultOptions: ["18G", "20G", "21G", "22G"] },
  { key: "profile", label: "Profile", type: "select", category: ["Profile"], defaultOptions: ["Flat", "Semi", "Round"] },
  { key: "pipeSize", label: "Pipe Size", type: "select", category: ["Pipes", "Pipe"], defaultOptions: ["1¼\"", "1½\"", "4\"", "5\"", "6\"", "8\""] },
  { key: "springType", label: "Spring", type: "select", category: ["Springs", "Spring"], defaultOptions: ["SPR 0G", "SPR 2G", "SPR 3G", "SPR 4G", "SPR 5G"] },
  { key: "wheelSize", label: "Wheel", type: "select", category: ["Wheels", "Wheel"], defaultOptions: ["7\"", "8\""] },
  { key: "bracketVariant", label: "Bracket", type: "select", category: ["Brackets", "Bracket"], defaultOptions: ["Standard", "Heavy"] },
  { key: "guideChannelVariant", label: "Guide Ch.", type: "select", category: ["Guide Channel", "Guides"], defaultOptions: ["Standard", "Deep"] },
  { key: "kabadiSize", label: "Kabadi", type: "select", category: ["Kabadi"], defaultOptions: ["9\"", "12\""] },
  { key: "topCoverSize", label: "Top Cover", type: "select", category: ["Top Caps", "Top Cover"], defaultOptions: ["Standard"] },
  { key: "handleQty", label: "Handles", type: "number" },
  { key: "lockQty", label: "Locks", type: "number" },
  { key: "fittingsQty", label: "Fittings", type: "number" },
  { key: "unit", label: "Unit", type: "text" },
  { key: "quantity", label: "Qty", type: "number" },
  { key: "unitPrice", label: "Rate", type: "number" },
  { key: "lineTotal", label: "Amount", type: "readonly" },
  { key: "notes", label: "Notes", type: "text" },
];

export const QuotationSpreadsheet: React.FC<QuotationSpreadsheetProps> = ({
  items,
  onChange,
  masterItems,
  onManualEdit,
}) => {
  const [editingCell, setEditingCell] = useState<{ rowIndex: number; colKey: string } | null>(null);
  const [tempVal, setTempVal] = useState<string>("");
  const [filterText, setFilterText] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the input when cell changes to editing mode
  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  const notifyManualEdit = () => {
    if (onManualEdit) onManualEdit();
  };

  // Helper to fetch options dynamically from masterItems
  const getOptionsForColumn = (col: typeof COLUMNS[0]) => {
    if (col.type !== "select") return [];
    const fromMaster = masterItems
      .filter((m) => !m.isDisabled && col.category?.some((c) => (m.category || "").toLowerCase() === c.toLowerCase()))
      .map((m) => m.name);

    if (fromMaster.length > 0) {
      // Remove duplicates
      return Array.from(new Set(fromMaster));
    }
    return col.defaultOptions || [];
  };

  // Keyboard navigation & save
  const saveCell = (rowIndex: number, colKey: string, val: string) => {
    notifyManualEdit();
    const updated = [...items];
    const item = { ...updated[rowIndex] };

    // Format value based on field type
    const col = COLUMNS.find((c) => c.key === colKey);
    if (!col) return;

    if (col.type === "number") {
      const parsedVal = val === "" ? 0 : parseFloat(val);
      (item as any)[colKey] = isNaN(parsedVal) ? 0 : parsedVal;
    } else {
      (item as any)[colKey] = val;
    }

    // Auto recalculate amount
    if (colKey === "quantity" || colKey === "unitPrice") {
      const qty = item.quantity || 0;
      const rate = item.unitPrice || 0;
      item.lineTotal = Math.round(qty * rate);
    }

    updated[rowIndex] = item;
    onChange(updated);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, rowIndex: number, colKey: string) => {
    const colIndex = COLUMNS.findIndex((c) => c.key === colKey);

    if (e.key === "Enter") {
      e.preventDefault();
      saveCell(rowIndex, colKey, tempVal);
      // Move to same column next row
      if (rowIndex < items.length - 1) {
        setEditingCell({ rowIndex: rowIndex + 1, colKey });
        const nextVal = (items[rowIndex + 1] as any)[colKey];
        setTempVal(nextVal !== undefined && nextVal !== null ? String(nextVal) : "");
        setFilterText(nextVal !== undefined && nextVal !== null ? String(nextVal) : "");
      } else {
        setEditingCell(null);
      }
    } else if (e.key === "Tab") {
      e.preventDefault();
      saveCell(rowIndex, colKey, tempVal);
      // Move to next column
      if (colIndex < COLUMNS.length - 1) {
        const nextCol = COLUMNS[colIndex + 1];
        if (nextCol.type === "readonly") {
          // skip readonly Amount
          if (colIndex + 2 < COLUMNS.length) {
            const afterReadonly = COLUMNS[colIndex + 2];
            setEditingCell({ rowIndex, colKey: afterReadonly.key });
            const nextVal = (items[rowIndex] as any)[afterReadonly.key];
            setTempVal(nextVal !== undefined && nextVal !== null ? String(nextVal) : "");
            setFilterText(nextVal !== undefined && nextVal !== null ? String(nextVal) : "");
          } else {
            setEditingCell(null);
          }
        } else {
          setEditingCell({ rowIndex, colKey: nextCol.key });
          const nextVal = (items[rowIndex] as any)[nextCol.key];
          setTempVal(nextVal !== undefined && nextVal !== null ? String(nextVal) : "");
          setFilterText(nextVal !== undefined && nextVal !== null ? String(nextVal) : "");
        }
      } else if (rowIndex < items.length - 1) {
        // Wrap to first column of next row
        setEditingCell({ rowIndex: rowIndex + 1, colKey: COLUMNS[0].key });
        const nextVal = (items[rowIndex + 1] as any)[COLUMNS[0].key];
        setTempVal(nextVal !== undefined && nextVal !== null ? String(nextVal) : "");
        setFilterText(nextVal !== undefined && nextVal !== null ? String(nextVal) : "");
      } else {
        setEditingCell(null);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setEditingCell(null);
    }
  };

  // Row operations
  const duplicateRow = (idx: number) => {
    notifyManualEdit();
    const updated = [...items];
    const dup = { ...updated[idx], ruleId: "dup-" + Date.now() };
    updated.splice(idx + 1, 0, dup);
    onChange(updated);
  };

  const deleteRow = (idx: number) => {
    notifyManualEdit();
    const updated = items.filter((_, i) => i !== idx);
    onChange(updated);
  };

  const moveRow = (idx: number, direction: "up" | "down") => {
    notifyManualEdit();
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= items.length) return;

    const updated = [...items];
    const temp = updated[idx];
    updated[idx] = updated[targetIdx];
    updated[targetIdx] = temp;
    onChange(updated);
  };

  const insertRowBelow = (idx: number) => {
    notifyManualEdit();
    const updated = [...items];
    const blankRow: GenLine = {
      ruleId: "manual-" + Date.now(),
      productName: "Custom Item",
      materialCategory: "Custom",
      variant: "",
      quantity: 1,
      unit: "Pcs",
      unitPrice: 0,
      lineTotal: 0,
      description: "Custom Item Description",
      formula: "",
      formulaResult: 0,
      editable: true,
      notes: "",
    };
    updated.splice(idx + 1, 0, blankRow);
    onChange(updated);
  };

  const addNewRow = () => {
    notifyManualEdit();
    const blankRow: GenLine = {
      ruleId: "manual-" + Date.now(),
      productName: "Custom Item",
      materialCategory: "Custom",
      variant: "",
      quantity: 1,
      unit: "Pcs",
      unitPrice: 0,
      lineTotal: 0,
      description: "Custom Item Description",
      formula: "",
      formulaResult: 0,
      editable: true,
      notes: "",
    };
    onChange([...items, blankRow]);
  };

  return (
    <div className="space-y-3 font-sans print-hidden">
      <div className="flex justify-between items-center bg-secondary/20 p-2.5 rounded-xl border border-border/60">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <span>Edit Quotation Items (Spreadsheet Mode)</span>
        </span>
        <button
          type="button"
          onClick={addNewRow}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] uppercase tracking-wider py-1.5 px-3 rounded-lg flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Custom Item</span>
        </button>
      </div>

      <div className="overflow-x-auto border border-border rounded-xl shadow-md max-h-[400px] overflow-y-auto bg-card">
        <table className="w-full text-[11px] font-mono border-collapse min-w-[2000px]">
          <thead className="bg-secondary/40 text-muted-foreground uppercase sticky top-0 z-10 select-none border-b border-border/80">
            <tr>
              <th className="px-2 py-2 text-center w-10 border-r border-border/80">#</th>
              {COLUMNS.map((col) => (
                <th key={col.key} className={`px-3 py-2 text-left border-r border-border/80 ${col.key === "lineTotal" ? "w-28 text-right bg-secondary/20" : ""}`}>
                  {col.label}
                </th>
              ))}
              <th className="px-3 py-2 text-center w-40 sticky right-0 bg-card/95 backdrop-blur-sm shadow-[rgba(-1,0,0,0.1)_-4px_0px_4px]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {items.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length + 2} className="text-center py-8 text-muted-foreground italic bg-secondary/5 font-sans">
                  No items generated. Fill in specifications on the left, or add a custom item to begin.
                </td>
              </tr>
            ) : (
              items.map((row, rIdx) => (
                <tr key={row.ruleId || rIdx} className="hover:bg-secondary/5 transition-colors">
                  <td className="px-2 py-1.5 text-center text-muted-foreground border-r border-border/40 select-none bg-secondary/10">
                    {rIdx + 1}
                  </td>
                  {COLUMNS.map((col) => {
                    const value = (row as any)[col.key];
                    const isEditing = editingCell?.rowIndex === rIdx && editingCell?.colKey === col.key;

                    return (
                      <td
                        key={col.key}
                        onClick={() => {
                          if (col.type === "readonly") return;
                          setEditingCell({ rowIndex: rIdx, colKey: col.key });
                          setTempVal(value !== undefined && value !== null ? String(value) : "");
                          setFilterText(value !== undefined && value !== null ? String(value) : "");
                        }}
                        className={`px-2 py-1.5 border-r border-border/40 cursor-pointer max-w-[200px] truncate group relative select-none ${
                          col.type === "readonly"
                            ? "bg-secondary/15 text-right font-bold text-foreground cursor-default"
                            : isEditing
                            ? "bg-primary/5 p-0"
                            : "hover:bg-primary/5 hover:text-foreground"
                        }`}
                      >
                        {isEditing ? (
                          <div className="relative w-full h-full">
                            {col.type === "select" ? (
                              <div className="relative w-full">
                                <input
                                  ref={inputRef}
                                  type="text"
                                  className="w-full h-full px-2 py-1 bg-transparent text-[11px] font-mono outline-none border-none focus:ring-0"
                                  value={tempVal}
                                  onChange={(e) => {
                                    setTempVal(e.target.value);
                                    setFilterText(e.target.value);
                                  }}
                                  onKeyDown={(e) => handleKeyDown(e, rIdx, col.key)}
                                  onBlur={() => {
                                    // Save after small timeout to allow clicking options
                                    setTimeout(() => {
                                      saveCell(rIdx, col.key, tempVal);
                                      setEditingCell(null);
                                    }, 180);
                                  }}
                                />
                                {/* Custom Searchable Autocomplete Options */}
                                {filterText !== undefined && (
                                  <div className="absolute left-0 right-0 mt-1 max-h-32 overflow-y-auto bg-card border border-border shadow-lg rounded-md z-20 font-mono text-[11px]">
                                    {getOptionsForColumn(col)
                                      .filter((opt) => opt.toLowerCase().includes(filterText.toLowerCase()))
                                      .map((opt) => (
                                        <div
                                          key={opt}
                                          onMouseDown={() => {
                                            setTempVal(opt);
                                            saveCell(rIdx, col.key, opt);
                                            setEditingCell(null);
                                          }}
                                          className="px-2 py-1 hover:bg-primary/10 cursor-pointer text-foreground"
                                        >
                                          {opt}
                                        </div>
                                      ))}
                                    {getOptionsForColumn(col).filter((opt) =>
                                      opt.toLowerCase().includes(filterText.toLowerCase())
                                    ).length === 0 && (
                                      <div
                                        onMouseDown={() => {
                                          saveCell(rIdx, col.key, tempVal);
                                          setEditingCell(null);
                                        }}
                                        className="px-2 py-1 text-muted-foreground italic cursor-pointer"
                                      >
                                        Use Custom: "{tempVal}"
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <input
                                  ref={inputRef}
                                  type={col.type === "number" ? "number" : "text"}
                                  step="any"
                                  className="w-full h-full px-2 py-1 bg-transparent text-[11px] font-mono border-none outline-none focus:ring-0"
                                  value={tempVal}
                                  onChange={(e) => setTempVal(e.target.value)}
                                  onKeyDown={(e) => handleKeyDown(e, rIdx, col.key)}
                                  onBlur={() => {
                                    saveCell(rIdx, col.key, tempVal);
                                    setEditingCell(null);
                                  }}
                              />
                            )}
                          </div>
                        ) : col.key === "lineTotal" ? (
                          <span>₹{value?.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        ) : (
                          <span className={value === undefined || value === "" ? "text-muted-foreground/30 italic" : "text-foreground"}>
                            {value !== undefined && value !== "" ? String(value) : "—"}
                          </span>
                        )}
                      </td>
                    );
                  })}
                  {/* Actions Column */}
                  <td className="px-1.5 py-1 text-center w-40 sticky right-0 bg-card/95 backdrop-blur-sm border-l border-border/40 shadow-[rgba(-1,0,0,0.1)_-4px_0px_4px] select-none">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => moveRow(rIdx, "up")}
                        disabled={rIdx === 0}
                        title="Move Up"
                        className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveRow(rIdx, "down")}
                        disabled={rIdx === items.length - 1}
                        title="Move Down"
                        className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => duplicateRow(rIdx)}
                        title="Duplicate Item"
                        className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => insertRowBelow(rIdx)}
                        title="Insert Row Below"
                        className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteRow(rIdx)}
                        title="Delete Item"
                        className="p-1 hover:bg-rose-500/10 hover:text-rose-600 rounded text-muted-foreground cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
