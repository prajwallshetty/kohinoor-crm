"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  LayoutTemplate, Plus, Trash2, Check, X, Loader2, ChevronUp, ChevronDown,
  Save, FlaskConical, AlertTriangle, Copy, Power
} from "lucide-react";
import {
  generateQuotation,
  getCategoryVariants,
  normalizeVarName,
  SUPPORTED_VARIABLES,
  SUPPORTED_FUNCTIONS,
  CONDITION_OPERATORS,
  type QuotationTemplate,
  type TemplateRule,
  type RuleCondition,
} from "@/lib/rule-engine";

interface MasterItem {
  id: string;
  category: string;
  name: string;
  rate: number;
  unit: string;
  isDisabled: boolean;
}

const emptyRule = (order: number): TemplateRule => ({
  id: `r-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
  label: "",
  materialCategory: "",
  defaultVariant: "",
  formula: "1",
  descriptionFormat: "",
  unit: "Pcs",
  exportVar: "",
  resultVar: "",
  displayOrder: order,
  editable: true,
  includeWhen: null,
  conditions: [],
});

export default function QuotationTemplatesPage() {
  const [templates, setTemplates] = useState<QuotationTemplate[]>([]);
  const [masterItems, setMasterItems] = useState<MasterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState("");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<QuotationTemplate | null>(null);

  // Live test panel state
  const [testSpec, setTestSpec] = useState({
    width: "122", height: "36", material: "GI", thickness: "21G", profile: "Semi", quantity: "1",
  });

  const triggerNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(""), 3000);
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [tRes, mRes] = await Promise.all([
        fetch("/api/quotation-templates"),
        fetch("/api/master-data"),
      ]);
      const tData = tRes.ok ? await tRes.json() : [];
      const mData = mRes.ok ? await mRes.json() : [];
      setTemplates(tData);
      setMasterItems(mData);
      if (tData.length && !selectedId) {
        setSelectedId(tData[0].id);
        setDraft(structuredClone(tData[0]));
      }
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Distinct pricing categories from Master Data (exclude label list + Fields schemas)
  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    masterItems.forEach((mi) => {
      const c = (mi.category || "").trim();
      if (!c || c === "Material Categories" || c.startsWith("Fields:")) return;
      set.add(c);
    });
    return Array.from(set).sort();
  }, [masterItems]);

  const variantOptions = (category: string) =>
    getCategoryVariants(masterItems as any, category).map((v) => v.name);

  // Fields available to conditions/formulas: base spec vars, exported variant vars,
  // plus every rule's computed-quantity variable (its resultVar and normalized label).
  const conditionFields = useMemo(() => {
    const fields = new Set<string>(SUPPORTED_VARIABLES);
    (draft?.rules || []).forEach((r) => {
      if (r.exportVar && r.exportVar.trim()) fields.add(r.exportVar.trim());
      if (r.resultVar && r.resultVar.trim()) fields.add(r.resultVar.trim());
      const lv = normalizeVarName(r.label);
      if (lv) fields.add(lv);
    });
    return Array.from(fields);
  }, [draft]);

  const selectTemplate = (t: QuotationTemplate) => {
    setSelectedId(t.id);
    setDraft(structuredClone(t));
  };

  const handleCreateTemplate = async () => {
    const name = prompt("New template name (e.g. Gear Shutter):");
    if (!name || !name.trim()) return;
    try {
      const res = await fetch("/api/quotation-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: "",
          active: true,
          displayOrder: templates.length + 1,
          rules: [],
        }),
      });
      if (res.ok) {
        const created = await res.json();
        triggerNotification("Template created!");
        await fetchAll();
        setSelectedId(created.id);
        setDraft(structuredClone(created));
      }
    } catch (e) {}
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm("Delete this template? Saved quotations keep their pinned snapshot.")) return;
    try {
      const res = await fetch(`/api/quotation-templates/${id}`, { method: "DELETE" });
      if (res.ok) {
        triggerNotification("Template deleted.");
        setSelectedId(null);
        setDraft(null);
        fetchAll();
      }
    } catch (e) {}
  };

  const handleSaveTemplate = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/quotation-templates/${draft.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name,
          description: draft.description,
          active: draft.active,
          displayOrder: draft.displayOrder,
          rules: draft.rules,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        triggerNotification(`Template saved (v${updated.version}).`);
        setTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        setDraft(structuredClone(updated));
      } else {
        const err = await res.json();
        alert(err.error || "Failed to save template");
      }
    } catch (e) {}
    setSaving(false);
  };

  // -------- Rule mutations (operate on local draft) --------
  const patchTemplate = (patch: Partial<QuotationTemplate>) =>
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));

  const patchRule = (idx: number, patch: Partial<TemplateRule>) =>
    setDraft((prev) => {
      if (!prev) return prev;
      const rules = [...prev.rules];
      rules[idx] = { ...rules[idx], ...patch };
      return { ...prev, rules };
    });

  const addRule = () =>
    setDraft((prev) => {
      if (!prev) return prev;
      return { ...prev, rules: [...prev.rules, emptyRule(prev.rules.length + 1)] };
    });

  const deleteRule = (idx: number) =>
    setDraft((prev) => {
      if (!prev) return prev;
      return { ...prev, rules: prev.rules.filter((_, i) => i !== idx) };
    });

  const duplicateRule = (idx: number) =>
    setDraft((prev) => {
      if (!prev) return prev;
      const clone = { ...structuredClone(prev.rules[idx]), id: `r-${Date.now()}-${Math.floor(Math.random() * 1000)}` };
      const rules = [...prev.rules];
      rules.splice(idx + 1, 0, clone);
      return { ...prev, rules: rules.map((r, i) => ({ ...r, displayOrder: i + 1 })) };
    });

  const moveRule = (idx: number, dir: -1 | 1) =>
    setDraft((prev) => {
      if (!prev) return prev;
      const rules = [...prev.rules];
      const target = idx + dir;
      if (target < 0 || target >= rules.length) return prev;
      [rules[idx], rules[target]] = [rules[target], rules[idx]];
      return { ...prev, rules: rules.map((r, i) => ({ ...r, displayOrder: i + 1 })) };
    });

  // -------- Condition mutations --------
  const addCondition = (ruleIdx: number) =>
    patchRule(ruleIdx, {
      conditions: [
        ...(draft?.rules[ruleIdx].conditions || []),
        { field: "height", operator: ">", value: "", setVariant: "", setQuantity: "" },
      ],
    });

  const patchCondition = (ruleIdx: number, condIdx: number, patch: Partial<RuleCondition>) => {
    const conds = [...(draft?.rules[ruleIdx].conditions || [])];
    conds[condIdx] = { ...conds[condIdx], ...patch };
    patchRule(ruleIdx, { conditions: conds });
  };

  const deleteCondition = (ruleIdx: number, condIdx: number) => {
    const conds = (draft?.rules[ruleIdx].conditions || []).filter((_, i) => i !== condIdx);
    patchRule(ruleIdx, { conditions: conds });
  };

  const toggleIncludeWhen = (ruleIdx: number) => {
    const rule = draft?.rules[ruleIdx];
    if (!rule) return;
    patchRule(ruleIdx, {
      includeWhen: rule.includeWhen ? null : { field: "height", operator: ">", value: "" },
    });
  };

  // -------- Live test --------
  const testResult = useMemo(() => {
    if (!draft) return null;
    return generateQuotation(
      draft,
      {
        width: parseFloat(testSpec.width) || 0,
        height: parseFloat(testSpec.height) || 0,
        quantity: parseInt(testSpec.quantity) || 1,
        material: testSpec.material,
        thickness: testSpec.thickness,
        profile: testSpec.profile,
      },
      masterItems as any
    );
  }, [draft, testSpec, masterItems]);

  const testTotal = testResult?.lines.reduce((s, l) => s + l.amount, 0) || 0;

  const inputCls =
    "w-full bg-secondary/40 border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground font-semibold outline-none focus:border-primary";
  const labelCls = "text-[9px] font-mono uppercase tracking-wider text-muted-foreground font-bold";

  return (
    <div className="flex flex-col gap-6 h-full relative">
      {notification && (
        <div className="fixed bottom-4 right-4 bg-primary text-primary-foreground text-xs px-4 py-3 rounded-xl shadow-2xl z-50 flex items-center gap-2 border border-primary/20 animate-in slide-in-from-bottom-4 duration-200">
          <Check className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold">{notification}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-card/80 via-card/50 to-secondary/30 border border-border/80 p-6 rounded-2xl shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 text-primary shadow-sm shrink-0">
            <LayoutTemplate className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold font-heading text-foreground flex items-center gap-2">
              <span>Quotation Templates</span>
              <span className="text-[10px] font-mono uppercase bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                Rule Engine
              </span>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              One template per shutter type. Each rule references a Master Data category with an admin-written formula,
              description format and visual conditions.
            </p>
          </div>
        </div>

        <button
          onClick={handleCreateTemplate}
          className="bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-bold py-2.5 px-5 rounded-xl flex items-center gap-2 shadow-lg shadow-primary/25 cursor-pointer shrink-0 transition-all hover:scale-[1.01]"
        >
          <Plus className="w-4 h-4" />
          <span>New Template</span>
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-16 text-muted-foreground gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span className="text-sm font-medium">Loading templates...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Left: template list */}
          <div className="lg:col-span-1 border border-border/80 rounded-2xl bg-card/40 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-border/60 bg-secondary/20 flex justify-between items-center">
              <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-bold">Shutter Types</h3>
              <span className="text-[10px] font-mono bg-secondary px-2 py-0.5 rounded text-muted-foreground font-bold">
                {templates.length}
              </span>
            </div>
            <div className="divide-y divide-border/30">
              {templates.map((t) => {
                const isSelected = selectedId === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => selectTemplate(t)}
                    className={`p-3.5 cursor-pointer text-xs transition-all flex justify-between items-center group ${
                      isSelected
                        ? "bg-primary/10 border-l-4 border-primary text-foreground font-bold"
                        : "hover:bg-secondary/40 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <div className="flex flex-col gap-0.5 truncate pr-2">
                      <span className="truncate flex items-center gap-1.5">
                        {!t.active && <Power className="w-3 h-3 text-rose-400" />}
                        {t.name}
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {(t.rules?.length || 0)} rules · v{t.version || 1}
                      </span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(t.id); }}
                      className="opacity-0 group-hover:opacity-100 text-rose-400 hover:bg-rose-500/10 p-1 rounded transition-all shrink-0"
                      title="Delete template"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
              {templates.length === 0 && (
                <div className="p-6 text-center text-xs text-muted-foreground">No templates yet.</div>
              )}
            </div>
          </div>

          {/* Right: editor */}
          <div className="lg:col-span-3 flex flex-col gap-6">
            {!draft ? (
              <div className="border border-border/80 rounded-2xl bg-card/40 p-16 text-center text-muted-foreground text-sm">
                Select a template to edit its rules, or create a new one.
              </div>
            ) : (
              <>
                {/* Template meta */}
                <div className="border border-border/80 rounded-2xl bg-card/40 p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2 space-y-1">
                          <label className={labelCls}>Template Name</label>
                          <input
                            value={draft.name}
                            onChange={(e) => patchTemplate({ name: e.target.value })}
                            className={inputCls}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className={labelCls}>Display Order</label>
                          <input
                            type="number"
                            value={draft.displayOrder ?? 0}
                            onChange={(e) => patchTemplate({ displayOrder: parseInt(e.target.value) || 0 })}
                            className={inputCls}
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className={labelCls}>Description</label>
                        <input
                          value={draft.description || ""}
                          onChange={(e) => patchTemplate({ description: e.target.value })}
                          className={inputCls}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/50 pt-3">
                    <button
                      onClick={() => patchTemplate({ active: !draft.active })}
                      className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                        draft.active
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          : "bg-secondary text-muted-foreground border-border"
                      }`}
                    >
                      <Power className="w-3.5 h-3.5" />
                      {draft.active ? "Active" : "Inactive"}
                    </button>

                    <button
                      onClick={handleSaveTemplate}
                      disabled={saving}
                      className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold px-5 py-2 rounded-lg text-xs flex items-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer transition-all"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      <span>{saving ? "Saving..." : "Save Template"}</span>
                    </button>
                  </div>
                </div>

                {/* Rules */}
                <div className="border border-border/80 rounded-2xl bg-card/40 p-5 space-y-4">
                  <div className="flex justify-between items-center border-b border-border/50 pb-3">
                    <h3 className="text-sm font-bold font-heading text-foreground">
                      Rules <span className="text-xs font-mono text-muted-foreground">({draft.rules.length})</span>
                    </h3>
                    <button
                      onClick={addRule}
                      className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Rule
                    </button>
                  </div>

                  {draft.rules.length === 0 && (
                    <div className="text-center text-xs text-muted-foreground py-8">
                      No rules yet. Add rules — each becomes one line in the generated quotation.
                    </div>
                  )}

                  {draft.rules.map((rule, idx) => {
                    const variants = variantOptions(rule.materialCategory);
                    const dlId = `variants-${rule.id}`;
                    return (
                      <div key={rule.id} className="border border-border/70 rounded-xl bg-secondary/10 p-4 space-y-3">
                        {/* Row header */}
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono bg-secondary px-2 py-0.5 rounded text-muted-foreground font-bold shrink-0">
                            #{idx + 1}
                          </span>
                          <input
                            placeholder="Rule label (e.g. Spring)"
                            value={rule.label}
                            onChange={(e) => patchRule(idx, { label: e.target.value })}
                            className="flex-1 bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground font-bold outline-none focus:border-primary"
                          />
                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={() => moveRule(idx, -1)} className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground" title="Move up">
                              <ChevronUp className="w-4 h-4" />
                            </button>
                            <button onClick={() => moveRule(idx, 1)} className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground" title="Move down">
                              <ChevronDown className="w-4 h-4" />
                            </button>
                            <button onClick={() => duplicateRule(idx)} className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground" title="Duplicate">
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => deleteRule(idx)} className="p-1 hover:bg-rose-500/10 rounded text-rose-400" title="Delete rule">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Fields grid */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                          <div className="space-y-1">
                            <label className={labelCls}>Material Category</label>
                            <select
                              value={rule.materialCategory}
                              onChange={(e) => patchRule(idx, { materialCategory: e.target.value })}
                              className={inputCls + " cursor-pointer"}
                            >
                              <option value="">— none (manual rate) —</option>
                              {categoryOptions.map((c) => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className={labelCls}>Default Variant</label>
                            <input
                              list={dlId}
                              placeholder="variant or {material}"
                              value={rule.defaultVariant}
                              onChange={(e) => patchRule(idx, { defaultVariant: e.target.value })}
                              className={inputCls}
                            />
                            <datalist id={dlId}>
                              {variants.map((v) => <option key={v} value={v} />)}
                            </datalist>
                          </div>

                          <div className="space-y-1">
                            <label className={labelCls}>Unit</label>
                            <input
                              value={rule.unit || ""}
                              onChange={(e) => patchRule(idx, { unit: e.target.value })}
                              className={inputCls}
                            />
                          </div>

                          <div className="space-y-1">
                            <label className={labelCls}>Export Variant As</label>
                            <input
                              placeholder="e.g. pipeSize"
                              value={rule.exportVar || ""}
                              onChange={(e) => patchRule(idx, { exportVar: e.target.value })}
                              className={inputCls}
                            />
                          </div>

                          <div className="space-y-1">
                            <label className={labelCls}>Store Result As</label>
                            <input
                              placeholder="e.g. pipeLength"
                              value={rule.resultVar || ""}
                              onChange={(e) => patchRule(idx, { resultVar: e.target.value })}
                              className={inputCls}
                            />
                          </div>

                          <div className="space-y-1 md:col-span-2">
                            <label className={labelCls}>Formula (quantity)</label>
                            <input
                              placeholder="(height / 2.9) + 1"
                              value={rule.formula}
                              onChange={(e) => patchRule(idx, { formula: e.target.value })}
                              className={inputCls + " font-mono"}
                            />
                          </div>

                          <div className="space-y-1 md:col-span-2">
                            <label className={labelCls}>Description Format</label>
                            <input
                              placeholder="{width} × {height} {material} ({thickness}-{profile})"
                              value={rule.descriptionFormat}
                              onChange={(e) => patchRule(idx, { descriptionFormat: e.target.value })}
                              className={inputCls + " font-mono"}
                            />
                          </div>
                        </div>

                        {/* includeWhen */}
                        <div className="flex flex-wrap items-center gap-2 border-t border-border/40 pt-3">
                          <button
                            onClick={() => toggleIncludeWhen(idx)}
                            className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                              rule.includeWhen ? "bg-amber-500/10 text-amber-400 border-amber-500/30" : "bg-secondary text-muted-foreground border-border"
                            }`}
                          >
                            {rule.includeWhen ? "Only include when ↓" : "+ Conditional include"}
                          </button>
                          {rule.includeWhen && (
                            <div className="flex items-center gap-1.5">
                              <select
                                value={rule.includeWhen.field}
                                onChange={(e) => patchRule(idx, { includeWhen: { ...rule.includeWhen!, field: e.target.value } })}
                                className="bg-background border border-border rounded px-2 py-1 text-[11px] font-semibold outline-none cursor-pointer"
                              >
                                {conditionFields.map((f) => <option key={f} value={f}>{f}</option>)}
                              </select>
                              <select
                                value={rule.includeWhen.operator}
                                onChange={(e) => patchRule(idx, { includeWhen: { ...rule.includeWhen!, operator: e.target.value as any } })}
                                className="bg-background border border-border rounded px-2 py-1 text-[11px] font-mono outline-none cursor-pointer"
                              >
                                {CONDITION_OPERATORS.map((o) => <option key={o} value={o}>{o}</option>)}
                              </select>
                              <input
                                value={rule.includeWhen.value}
                                onChange={(e) => patchRule(idx, { includeWhen: { ...rule.includeWhen!, value: e.target.value } })}
                                placeholder="value"
                                className="w-20 bg-background border border-border rounded px-2 py-1 text-[11px] font-mono outline-none"
                              />
                            </div>
                          )}
                        </div>

                        {/* conditions */}
                        <div className="space-y-2 border-t border-border/40 pt-3">
                          <div className="flex justify-between items-center">
                            <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground font-bold">
                              Conditions (first match overrides variant / qty)
                            </span>
                            <button
                              onClick={() => addCondition(idx)}
                              className="text-[10px] font-bold text-primary hover:underline cursor-pointer flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" /> Add condition
                            </button>
                          </div>
                          {(rule.conditions || []).map((cond, cIdx) => (
                            <div key={cIdx} className="flex flex-wrap items-center gap-1.5 bg-background/60 border border-border/60 rounded-lg p-2">
                              <span className="text-[10px] font-mono text-muted-foreground">IF</span>
                              <select
                                value={cond.field}
                                onChange={(e) => patchCondition(idx, cIdx, { field: e.target.value })}
                                className="bg-secondary/40 border border-border rounded px-2 py-1 text-[11px] font-semibold outline-none cursor-pointer"
                              >
                                {conditionFields.map((f) => <option key={f} value={f}>{f}</option>)}
                              </select>
                              <select
                                value={cond.operator}
                                onChange={(e) => patchCondition(idx, cIdx, { operator: e.target.value as any })}
                                className="bg-secondary/40 border border-border rounded px-2 py-1 text-[11px] font-mono outline-none cursor-pointer"
                              >
                                {CONDITION_OPERATORS.map((o) => <option key={o} value={o}>{o}</option>)}
                              </select>
                              <input
                                value={cond.value}
                                onChange={(e) => patchCondition(idx, cIdx, { value: e.target.value })}
                                placeholder="value"
                                className="w-16 bg-secondary/40 border border-border rounded px-2 py-1 text-[11px] font-mono outline-none"
                              />
                              <span className="text-[10px] font-mono text-muted-foreground">→ variant</span>
                              <input
                                list={dlId}
                                value={cond.setVariant || ""}
                                onChange={(e) => patchCondition(idx, cIdx, { setVariant: e.target.value })}
                                placeholder="(keep)"
                                className="w-24 bg-secondary/40 border border-border rounded px-2 py-1 text-[11px] font-semibold outline-none"
                              />
                              <span className="text-[10px] font-mono text-muted-foreground">qty</span>
                              <input
                                value={cond.setQuantity || ""}
                                onChange={(e) => patchCondition(idx, cIdx, { setQuantity: e.target.value })}
                                placeholder="(formula)"
                                className="w-20 bg-secondary/40 border border-border rounded px-2 py-1 text-[11px] font-mono outline-none"
                              />
                              <button onClick={() => deleteCondition(idx, cIdx)} className="p-1 hover:bg-rose-500/10 rounded text-rose-400 ml-auto">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {/* Formula help */}
                  <div className="text-[10px] text-muted-foreground font-mono border-t border-border/40 pt-3 leading-relaxed">
                    <strong className="text-foreground">Variables:</strong> {SUPPORTED_VARIABLES.join(", ")}
                    <br />
                    <strong className="text-foreground">Functions:</strong> {SUPPORTED_FUNCTIONS.join(", ")}
                    <br />
                    <strong className="text-foreground">Description tokens:</strong> any variable plus {"{variant} {qty} {rate} {amount} {unit}"}
                    <br />
                    <strong className="text-foreground">Dependent rules:</strong> a later rule can reference an earlier rule&apos;s computed quantity by its label (e.g. <code>spring</code>, <code>wheel</code>) or its &quot;Store Result As&quot; name (e.g. <code>pipeLength</code>). Rules run top-to-bottom.
                  </div>
                </div>

                {/* Live test panel */}
                <div className="border border-primary/30 rounded-2xl bg-primary/5 p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-border/50 pb-3">
                    <FlaskConical className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-bold font-heading text-foreground">Live Test</h3>
                    <span className="text-[10px] text-muted-foreground">Run this template against a sample spec (not saved)</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                    {([
                      ["width", "Width"], ["height", "Height"], ["material", "Material"],
                      ["thickness", "Thickness"], ["profile", "Profile"], ["quantity", "Qty"],
                    ] as const).map(([key, label]) => (
                      <div key={key} className="space-y-1">
                        <label className={labelCls}>{label}</label>
                        <input
                          value={(testSpec as any)[key]}
                          onChange={(e) => setTestSpec((p) => ({ ...p, [key]: e.target.value }))}
                          className={inputCls + " font-mono"}
                        />
                      </div>
                    ))}
                  </div>

                  {testResult && testResult.warnings.length > 0 && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 space-y-1">
                      {testResult.warnings.map((w, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-[11px] text-amber-400">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>{w}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="border border-border/70 rounded-xl overflow-hidden bg-card/60">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-secondary/30 text-[9px] font-mono uppercase tracking-wider text-muted-foreground border-b border-border/60">
                          <th className="p-2.5">Line / Description</th>
                          <th className="p-2.5 w-20 text-center">Qty</th>
                          <th className="p-2.5 w-16 text-center">Unit</th>
                          <th className="p-2.5 w-24 text-right">Rate</th>
                          <th className="p-2.5 w-28 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {testResult?.lines.length === 0 ? (
                          <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No lines generated for this spec.</td></tr>
                        ) : testResult?.lines.map((line, i) => (
                          <tr key={i} className="hover:bg-secondary/15">
                            <td className="p-2.5">
                              <div className="font-bold text-foreground">{line.label}</div>
                              <div className="text-[11px] text-muted-foreground">{line.description}</div>
                            </td>
                            <td className="p-2.5 text-center font-mono font-bold">{line.quantity}</td>
                            <td className="p-2.5 text-center font-mono text-muted-foreground">{line.unit}</td>
                            <td className="p-2.5 text-right font-mono">₹{line.rate.toLocaleString("en-IN")}</td>
                            <td className="p-2.5 text-right font-mono font-bold">₹{line.amount.toLocaleString("en-IN")}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-border/60 bg-secondary/20">
                          <td colSpan={4} className="p-2.5 text-right font-bold text-foreground">Estimated Total</td>
                          <td className="p-2.5 text-right font-mono font-black text-foreground">₹{Math.round(testTotal).toLocaleString("en-IN")}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
