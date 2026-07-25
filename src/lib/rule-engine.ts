/**
 * Rolling Shutter Quotation Rule Engine
 * ------------------------------------------------------------------
 * A reusable, dependency-free estimation engine. Given a Quotation
 * Template (a set of ordered Rules) and a shutter specification, it
 * executes every rule, evaluates the admin-written formulas, applies
 * visual conditions, fetches rates from Master Data and produces a
 * complete, editable list of material line items.
 *
 * Nothing shutter/brand specific is hardcoded here — every recipe
 * lives in Templates + Rules + Master Data. Gear, Motorized and
 * Industrial templates reuse this exact engine.
 *
 * This module is isomorphic (runs on server and client) and NEVER
 * uses eval()/Function(); formulas are parsed by a small hand-written
 * recursive-descent parser with a whitelisted grammar.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ConditionOperator = ">" | "<" | ">=" | "<=" | "==" | "!=";

export interface RuleCondition {
  field: string;              // variable name, e.g. "height" or "pipeSize"
  operator: ConditionOperator;
  value: string;              // compared numerically when both sides are numeric
  setVariant?: string;        // override the resolved variant when condition matches
  setQuantity?: string;       // override the resolved quantity (number as string)
}

export interface IncludeCondition {
  field: string;
  operator: ConditionOperator;
  value: string;
}

export interface TemplateRule {
  id: string;
  label: string;              // display label, e.g. "GI Sheet", "Spring", "Pipe"
  materialCategory: string;   // Master Data category the variant/rate is drawn from
  defaultVariant: string;     // default option name from that category
  formula: string;            // admin-written quantity formula, e.g. "(height/2.9)+1"
  descriptionFormat: string;  // e.g. "{width} × {height} {material} ({thickness}-{profile})"
  unit?: string;              // optional unit override (else taken from Master Data)
  exportVar?: string;         // optional variable name to expose the resolved VARIANT (string)
  resultVar?: string;         // optional variable name to expose the computed QUANTITY (number)
  displayOrder: number;
  editable?: boolean;         // whether the salesperson may edit the generated line
  includeWhen?: IncludeCondition | null; // line only appears when this is true
  conditions?: RuleCondition[];          // first matching condition overrides variant/qty
}

export interface QuotationTemplate {
  id: string;
  name: string;
  description?: string;
  active?: boolean;
  displayOrder?: number;
  version?: number;
  rules: TemplateRule[];
}

export interface ShutterSpec {
  width: number;
  height: number;
  quantity: number;
  material?: string;
  thickness?: string;
  profile?: string;
  // Optional extra spec variables the engine also exposes to formulas.
  pipeSize?: string;
  springType?: string;
  motorType?: string;
  [key: string]: number | string | undefined;
}

export interface MasterItemLike {
  category: string;
  name: string;
  rate: number;
  unit?: string;
  isDisabled?: boolean;
}

export interface GeneratedLine {
  ruleId: string | null;
  label: string;
  materialCategory: string | null;
  variant: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
  description: string;
  formula: string;
  formulaResult: number;
  editable: boolean;
}

export interface GenerationResult {
  lines: GeneratedLine[];
  formulaResults: Record<string, number>; // keyed by ruleId
  exports: Record<string, string | number>; // exported variables: variants (string) + quantities (number)
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Supported formula vocabulary (for UI hints / validation)
// ---------------------------------------------------------------------------

export const SUPPORTED_VARIABLES = [
  "width",
  "height",
  "area",
  "quantity",
  "material",
  "thickness",
  "profile",
  "pipeSize",
  "springType",
  "motorType",
];

export const SUPPORTED_FUNCTIONS = ["ROUND", "FLOOR", "CEIL", "MIN", "MAX", "IF"];

export const CONDITION_OPERATORS: ConditionOperator[] = [">", "<", ">=", "<=", "==", "!="];

// ---------------------------------------------------------------------------
// Formula parser (recursive descent, no eval)
// ---------------------------------------------------------------------------
//
// Grammar (lowest to highest precedence):
//   expr        := comparison
//   comparison  := additive ( ( ">" | "<" | ">=" | "<=" | "==" | "!=" ) additive )?
//   additive    := multiplicative ( ( "+" | "-" ) multiplicative )*
//   multiplicative := unary ( ( "*" | "/" | "%" ) unary )*
//   unary       := ( "-" | "+" ) unary | primary
//   primary     := number | ident | ident "(" args ")" | "(" expr ")"
//   args        := expr ( "," expr )*
//
// Comparisons evaluate to 1 (true) or 0 (false) so they can be nested inside IF().

type Token =
  | { t: "num"; v: number }
  | { t: "ident"; v: string }
  | { t: "op"; v: string }
  | { t: "lparen" }
  | { t: "rparen" }
  | { t: "comma" };

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const src = input;
  while (i < src.length) {
    const c = src[i];
    if (c === " " || c === "\t" || c === "\n" || c === "\r") {
      i++;
      continue;
    }
    if (c >= "0" && c <= "9") {
      let num = "";
      while (i < src.length && ((src[i] >= "0" && src[i] <= "9") || src[i] === ".")) {
        num += src[i];
        i++;
      }
      tokens.push({ t: "num", v: parseFloat(num) });
      continue;
    }
    if ((c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || c === "_") {
      let id = "";
      while (
        i < src.length &&
        ((src[i] >= "a" && src[i] <= "z") ||
          (src[i] >= "A" && src[i] <= "Z") ||
          (src[i] >= "0" && src[i] <= "9") ||
          src[i] === "_")
      ) {
        id += src[i];
        i++;
      }
      tokens.push({ t: "ident", v: id });
      continue;
    }
    // Two-character operators
    const two = src.slice(i, i + 2);
    if (two === ">=" || two === "<=" || two === "==" || two === "!=") {
      tokens.push({ t: "op", v: two });
      i += 2;
      continue;
    }
    if ("+-*/%".includes(c) || c === ">" || c === "<") {
      tokens.push({ t: "op", v: c });
      i++;
      continue;
    }
    if (c === "(") {
      tokens.push({ t: "lparen" });
      i++;
      continue;
    }
    if (c === ")") {
      tokens.push({ t: "rparen" });
      i++;
      continue;
    }
    if (c === ",") {
      tokens.push({ t: "comma" });
      i++;
      continue;
    }
    throw new Error(`Unexpected character "${c}" in formula`);
  }
  return tokens;
}

function coerceNumber(v: unknown): number {
  if (typeof v === "number") return isFinite(v) ? v : 0;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (typeof v === "string") {
    const n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

class FormulaParser {
  private tokens: Token[];
  private pos = 0;
  private scope: Record<string, unknown>;

  constructor(tokens: Token[], scope: Record<string, unknown>) {
    this.tokens = tokens;
    this.scope = scope;
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }
  private next(): Token | undefined {
    return this.tokens[this.pos++];
  }

  parse(): number {
    const value = this.parseComparison();
    if (this.pos < this.tokens.length) {
      throw new Error("Unexpected trailing tokens in formula");
    }
    return value;
  }

  private parseComparison(): number {
    let left = this.parseAdditive();
    const tk = this.peek();
    if (tk && tk.t === "op" && [">", "<", ">=", "<=", "==", "!="].includes(tk.v)) {
      this.next();
      const right = this.parseAdditive();
      switch (tk.v) {
        case ">":
          return left > right ? 1 : 0;
        case "<":
          return left < right ? 1 : 0;
        case ">=":
          return left >= right ? 1 : 0;
        case "<=":
          return left <= right ? 1 : 0;
        case "==":
          return left === right ? 1 : 0;
        case "!=":
          return left !== right ? 1 : 0;
      }
    }
    return left;
  }

  private parseAdditive(): number {
    let left = this.parseMultiplicative();
    while (true) {
      const tk = this.peek();
      if (tk && tk.t === "op" && (tk.v === "+" || tk.v === "-")) {
        this.next();
        const right = this.parseMultiplicative();
        left = tk.v === "+" ? left + right : left - right;
      } else break;
    }
    return left;
  }

  private parseMultiplicative(): number {
    let left = this.parseUnary();
    while (true) {
      const tk = this.peek();
      if (tk && tk.t === "op" && (tk.v === "*" || tk.v === "/" || tk.v === "%")) {
        this.next();
        const right = this.parseUnary();
        if (tk.v === "*") left = left * right;
        else if (tk.v === "/") left = right === 0 ? 0 : left / right;
        else left = right === 0 ? 0 : left % right;
      } else break;
    }
    return left;
  }

  private parseUnary(): number {
    const tk = this.peek();
    if (tk && tk.t === "op" && (tk.v === "-" || tk.v === "+")) {
      this.next();
      const val = this.parseUnary();
      return tk.v === "-" ? -val : val;
    }
    return this.parsePrimary();
  }

  private parsePrimary(): number {
    const tk = this.next();
    if (!tk) throw new Error("Unexpected end of formula");

    if (tk.t === "num") return tk.v;

    if (tk.t === "lparen") {
      const val = this.parseComparison();
      const close = this.next();
      if (!close || close.t !== "rparen") throw new Error("Missing closing parenthesis");
      return val;
    }

    if (tk.t === "ident") {
      // Function call?
      const after = this.peek();
      if (after && after.t === "lparen") {
        this.next(); // consume "("
        const args: number[] = [];
        if (this.peek() && this.peek()!.t !== "rparen") {
          args.push(this.parseComparison());
          while (this.peek() && this.peek()!.t === "comma") {
            this.next();
            args.push(this.parseComparison());
          }
        }
        const close = this.next();
        if (!close || close.t !== "rparen") throw new Error("Missing closing parenthesis in function call");
        return this.callFunction(tk.v, args);
      }
      // Variable reference
      return coerceNumber(this.scope[tk.v]);
    }

    throw new Error("Unexpected token in formula");
  }

  private callFunction(name: string, args: number[]): number {
    switch (name.toUpperCase()) {
      case "ROUND":
        return args.length >= 2
          ? Number(args[0].toFixed(Math.max(0, Math.floor(args[1]))))
          : Math.round(args[0] ?? 0);
      case "FLOOR":
        return Math.floor(args[0] ?? 0);
      case "CEIL":
        return Math.ceil(args[0] ?? 0);
      case "MIN":
        return args.length ? Math.min(...args) : 0;
      case "MAX":
        return args.length ? Math.max(...args) : 0;
      case "IF":
        // IF(condition, thenValue, elseValue)
        return (args[0] ?? 0) !== 0 ? args[1] ?? 0 : args[2] ?? 0;
      default:
        throw new Error(`Unknown function "${name}"`);
    }
  }
}

/**
 * Safely evaluate an admin-written formula. Never throws — on error it
 * returns 0 and a human-readable message so the caller can surface a warning.
 */
export function evalFormula(
  expr: string,
  scope: Record<string, unknown>
): { value: number; error?: string } {
  const trimmed = (expr ?? "").toString().trim();
  if (!trimmed) return { value: 0 };
  try {
    const tokens = tokenize(trimmed);
    const parser = new FormulaParser(tokens, scope);
    const value = parser.parse();
    return { value: isFinite(value) ? value : 0 };
  } catch (e: any) {
    return { value: 0, error: e?.message || "Invalid formula" };
  }
}

// ---------------------------------------------------------------------------
// Condition evaluation
// ---------------------------------------------------------------------------

export function evalCondition(
  cond: { field: string; operator: ConditionOperator; value: string },
  scope: Record<string, unknown>
): boolean {
  const left = scope[cond.field];
  const rightRaw = cond.value;

  // Only compare numerically when BOTH sides are complete numbers. This prevents
  // fraction-style variant names (e.g. `1½"` and `1¼"`) from being mistaken for
  // numeric 1 via a leading-digit parseFloat, which would make them falsely equal.
  const numRe = /^-?\d+(\.\d+)?$/;
  const leftStrRaw = typeof left === "number" ? String(left) : String(left ?? "").trim();
  const rightStrRaw = String(rightRaw ?? "").trim();
  const bothNumeric = numRe.test(leftStrRaw) && numRe.test(rightStrRaw);
  const leftNum = parseFloat(leftStrRaw);
  const rightNum = parseFloat(rightStrRaw);

  if (bothNumeric) {
    switch (cond.operator) {
      case ">":
        return leftNum > rightNum;
      case "<":
        return leftNum < rightNum;
      case ">=":
        return leftNum >= rightNum;
      case "<=":
        return leftNum <= rightNum;
      case "==":
        return leftNum === rightNum;
      case "!=":
        return leftNum !== rightNum;
    }
  }

  // String comparison fallback
  const leftStr = String(left ?? "").trim().toLowerCase();
  const rightStr = String(rightRaw ?? "").trim().toLowerCase();
  switch (cond.operator) {
    case "==":
      return leftStr === rightStr;
    case "!=":
      return leftStr !== rightStr;
    case ">":
      return leftStr > rightStr;
    case "<":
      return leftStr < rightStr;
    case ">=":
      return leftStr >= rightStr;
    case "<=":
      return leftStr <= rightStr;
    default:
      return false;
  }
}

// ---------------------------------------------------------------------------
// Description formatting
// ---------------------------------------------------------------------------

/**
 * Replace {token} placeholders using values from the scope. Numeric values
 * are rendered without spurious trailing zeros. Unknown tokens become "".
 */
export function formatDescription(
  template: string,
  scope: Record<string, unknown>
): string {
  if (!template) return "";
  return template.replace(/\{\s*([a-zA-Z0-9_]+)\s*\}/g, (_m, token) => {
    const val = scope[token];
    if (val === undefined || val === null) return "";
    if (typeof val === "number") return formatNumber(val);
    return String(val);
  });
}

function formatNumber(n: number): string {
  if (!isFinite(n)) return "0";
  // Keep up to 2 decimals but drop trailing zeros (122.75 -> "122.75", 100 -> "100")
  return parseFloat(n.toFixed(2)).toString();
}

/**
 * Normalize a rule label into a formula variable name so later rules can
 * reference a rule's computed quantity by its label, e.g. "Spring" -> "spring",
 * "Guide Channel" -> "guidechannel". This is what lets Gear Shutter's Wheel rule
 * use `spring + 2`, Ring use `wheel + 2`, and Kabadi use `wheel * 3`.
 */
export function normalizeVarName(label: string): string {
  return (label || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

// ---------------------------------------------------------------------------
// Master Data helpers
// ---------------------------------------------------------------------------

function findMasterRate(
  masterItems: MasterItemLike[],
  category: string,
  variant: string
): MasterItemLike | undefined {
  if (!category || !variant) return undefined;
  const cat = category.trim().toLowerCase();
  const name = variant.trim().toLowerCase();
  return masterItems.find(
    (mi) =>
      !mi.isDisabled &&
      (mi.category || "").trim().toLowerCase() === cat &&
      (mi.name || "").trim().toLowerCase() === name
  );
}

/** Options available for a rule's material category (for variant dropdowns). */
export function getCategoryVariants(
  masterItems: MasterItemLike[],
  category: string
): MasterItemLike[] {
  if (!category) return [];
  const cat = category.trim().toLowerCase();
  return masterItems.filter(
    (mi) => !mi.isDisabled && (mi.category || "").trim().toLowerCase() === cat
  );
}

// ---------------------------------------------------------------------------
// Main generator
// ---------------------------------------------------------------------------

export function generateQuotation(
  template: QuotationTemplate,
  spec: ShutterSpec,
  masterItems: MasterItemLike[]
): GenerationResult {
  const lines: GeneratedLine[] = [];
  const formulaResults: Record<string, number> = {};
  const exports: Record<string, string | number> = {};
  const warnings: string[] = [];

  const width = coerceNumber(spec.width);
  const height = coerceNumber(spec.height);
  const quantity = coerceNumber(spec.quantity) || 1;
  const area = width * height;

  // Base spec variables always available to formulas / conditions / descriptions.
  const baseScope: Record<string, unknown> = {
    width,
    height,
    area,
    quantity,
    material: spec.material ?? "",
    thickness: spec.thickness ?? "",
    profile: spec.profile ?? "",
    pipeSize: spec.pipeSize ?? "",
    springType: spec.springType ?? "",
    motorType: spec.motorType ?? "",
  };

  const rules = [...(template.rules || [])].sort(
    (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)
  );

  for (const rule of rules) {
    // Scope for THIS rule = base spec + everything exported by earlier rules.
    const scope: Record<string, unknown> = { ...baseScope, ...exports };

    // 1. Conditional inclusion — skip the whole line when includeWhen is false.
    if (rule.includeWhen && rule.includeWhen.field) {
      if (!evalCondition(rule.includeWhen, scope)) {
        continue;
      }
    }

    // 2. Resolve variant + optional quantity override from the first matching condition.
    //    defaultVariant/setVariant may reference spec tokens, e.g. "{material}".
    let variant = formatDescription(rule.defaultVariant || "", scope) || rule.defaultVariant || "";
    let quantityOverride: number | null = null;
    for (const cond of rule.conditions || []) {
      if (!cond.field) continue;
      if (evalCondition(cond, scope)) {
        if (cond.setVariant) variant = formatDescription(cond.setVariant, scope) || cond.setVariant;
        if (cond.setQuantity !== undefined && cond.setQuantity !== "") {
          const qo = evalFormula(cond.setQuantity, scope);
          quantityOverride = qo.value;
          if (qo.error) warnings.push(`Rule "${rule.label}" condition qty: ${qo.error}`);
        }
        break; // first match wins
      }
    }

    // Make the resolved variant available for description tokens BEFORE computing qty.
    scope.variant = variant;

    // 3. Evaluate the quantity formula.
    let qty: number;
    if (quantityOverride !== null) {
      qty = quantityOverride;
    } else {
      const res = evalFormula(rule.formula, scope);
      if (res.error) warnings.push(`Rule "${rule.label}" formula: ${res.error}`);
      qty = res.value;
    }
    formulaResults[rule.id] = qty;

    // Expose this rule's computed QUANTITY to later rules (and its own description):
    //   - under a normalized version of its label (e.g. "Spring" -> spring)
    //   - under an explicit resultVar if provided (e.g. Pipe -> "pipeLength")
    // This is what enables dependent formulas like Wheel = spring + 2,
    // Ring = wheel + 2 and Kabadi = wheel * 3.
    const labelVar = normalizeVarName(rule.label);
    if (labelVar) exports[labelVar] = qty;
    if (rule.resultVar && rule.resultVar.trim()) {
      exports[rule.resultVar.trim()] = qty;
    }

    // Skip zero / negative quantity lines (handles conditional auto-add with IF()).
    if (!(qty > 0)) {
      // Still export the variant so dependent rules can read it if configured.
      if (rule.exportVar) exports[rule.exportVar] = variant;
      continue;
    }

    // 4. Look up rate + unit from Master Data.
    const master = findMasterRate(masterItems, rule.materialCategory, variant);
    const rate = master ? master.rate : 0;
    const unit = rule.unit && rule.unit.trim() ? rule.unit : master?.unit || "Pcs";
    if (!master && rule.materialCategory) {
      warnings.push(
        `No Master Data rate for "${variant}" in "${rule.materialCategory}" (rule "${rule.label}")`
      );
    }

    const amount = Math.round(qty * rate * 100) / 100;

    // 5. Build description from the template using a rich token scope.
    const descScope: Record<string, unknown> = {
      ...scope,
      variant,
      qty,
      quantity: qty,
      rate,
      amount,
      unit,
    };
    // Make this rule's own quantity/variant available under its token names so a
    // rule's description can reference e.g. {pipeLength} (resultVar) or {pipeSize}
    // (exportVar) or {wheelSize} — without depending on later rules.
    if (labelVar) descScope[labelVar] = qty;
    if (rule.resultVar && rule.resultVar.trim()) descScope[rule.resultVar.trim()] = qty;
    if (rule.exportVar) descScope[rule.exportVar] = variant;
    const description = formatDescription(rule.descriptionFormat, descScope);

    // 6. Export the resolved variant for later rules (e.g. Pipe -> pipeSize -> Wheel).
    if (rule.exportVar) exports[rule.exportVar] = variant;

    lines.push({
      ruleId: rule.id,
      label: rule.label,
      materialCategory: rule.materialCategory || null,
      variant,
      quantity: qty,
      unit,
      rate,
      amount,
      description: description || `${rule.label} ${variant}`.trim(),
      formula: rule.formula,
      formulaResult: qty,
      editable: rule.editable !== false,
    });
  }

  return { lines, formulaResults, exports, warnings };
}
