// lib/detectors.ts — pure functions, no I/O

export type Severity = "critical" | "high" | "medium" | "low";

export type Category =
  | "email"
  | "phone"
  | "aadhaar"
  | "pan"
  | "upi_id"
  | "card"
  | "api_key"
  | "ip_address"
  | "password"
  | "custom_term";

export interface RawMatch {
  start: number;
  end: number;
  category: Category;
  severity: Severity;
  value: string;
}

// ─── Verhoeff checksum ────────────────────────────────────────────────────────

const D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];

const P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

const INV = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9];

export function verhoeffValidate(numStr: string): boolean {
  const digits = numStr.replace(/\s/g, "").split("").reverse().map(Number);
  if (digits.some(isNaN)) return false;
  let c = 0;
  for (let i = 0; i < digits.length; i++) {
    c = D[c][P[i % 8][digits[i]]];
  }
  return c === 0;
}

export function verhoeffGenerateCheckDigit(numStr: string): string {
  const digits = numStr.replace(/\s/g, "").split("").reverse().map(Number);
  if (digits.some(isNaN)) return "";
  let c = 0;
  for (let i = 0; i < digits.length; i++) {
    c = D[c][P[(i + 1) % 8][digits[i]]];
  }
  return String(INV[c]);
}

// ─── Luhn checksum ────────────────────────────────────────────────────────────

export function luhnValidate(numStr: string): boolean {
  const digits = numStr.replace(/[\s\-]/g, "").split("").map(Number);
  if (digits.some(isNaN) || digits.length < 13) return false;
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits[i];
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

// ─── Individual detectors ─────────────────────────────────────────────────────

function findAll(
  text: string,
  re: RegExp,
  category: Category,
  severity: Severity,
  validate?: (val: string) => boolean
): RawMatch[] {
  const results: RawMatch[] = [];
  // ensure global flag
  const g = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
  let m: RegExpExecArray | null;
  while ((m = g.exec(text)) !== null) {
    const value = m[0];
    if (validate && !validate(value)) continue;
    results.push({ start: m.index, end: m.index + value.length, category, severity, value });
  }
  return results;
}

function detectEmail(text: string): RawMatch[] {
  // email before upi_id so we can exclude later
  return findAll(text, /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g, "email", "medium");
}

function detectPhone(text: string): RawMatch[] {
  // Indian 10-digit (starting 6-9) with optional +91/0 prefix + spaces/dashes
  // Generic international: +<country><digits>
  return findAll(
    text,
    /(?<!\d)(?:\+91[\s\-]?|0)?[6-9]\d{9}(?!\d)|(?<!\d)\+\d{1,3}[\s\-]?\(?\d{1,4}\)?[\s\-]?\d{1,4}[\s\-]?\d{1,9}(?!\d)/g,
    "phone",
    "medium"
  );
}

function detectAadhaar(text: string): RawMatch[] {
  return findAll(
    text,
    /(?<!\d)[2-9]\d{3}[\s\-]?\d{4}[\s\-]?\d{4}(?!\d)/g,
    "aadhaar",
    "critical",
    (v) => {
      const digits = v.replace(/[\s\-]/g, "");
      return digits.length === 12 && verhoeffValidate(digits);
    }
  );
}

function detectPan(text: string): RawMatch[] {
  return findAll(text, /(?<![A-Z])[A-Z]{5}[0-9]{4}[A-Z](?![A-Z])/g, "pan", "high");
}

function detectUpi(text: string): RawMatch[] {
  // handle@bank — no dot in the handle part after @, not a normal email (no TLD)
  return findAll(
    text,
    /(?<![a-zA-Z0-9._%+\-])[a-zA-Z0-9.\-_+]+@[a-zA-Z0-9]+(?!\.[a-zA-Z]{2,})(?!\w)/g,
    "upi_id",
    "medium"
  );
}

function detectCard(text: string): RawMatch[] {
  return findAll(
    text,
    /(?<!\d)\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{1,7}(?!\d)/g,
    "card",
    "critical",
    (v) => {
      const clean = v.replace(/[\s\-]/g, "");
      return clean.length >= 13 && clean.length <= 19 && luhnValidate(clean);
    }
  );
}

function detectApiKey(text: string): RawMatch[] {
  const results: RawMatch[] = [];

  // Named patterns — loosened to minimum-length matches
  const namedPatterns: RegExp[] = [
    /AIza[0-9A-Za-z_\-]{20,}/g,          // Google API key
    /sk-[A-Za-z0-9_\-]{20,}/g,           // OpenAI / generic sk-
    /ghp_[A-Za-z0-9]{20,}/g,             // GitHub PAT
    /AKIA[0-9A-Z]{16}/g,                 // AWS access key (exact — always 20 chars total)
    /sb_secret_[A-Za-z0-9_\-]{10,}/g,   // Supabase secret
    /eyJ[A-Za-z0-9\-_]+\.eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_.+/=]+/g, // JWT
  ];

  for (const re of namedPatterns) {
    results.push(...findAll(text, re, "api_key", "critical"));
  }

  // Generic label-colon/equals-value pattern.
  // Match the label part (api_key, token, secret, …) followed by optional
  // filler text then : or = then the value.
  // Capture group 1 = value only; we record only that span so masking leaves
  // the readable label intact.
  const genericRe =
    /(?:api[_\- ]?key|token|secret|access[_\-]?key|auth)[^\n]{0,40}?[:=]\s*["']?([A-Za-z0-9_\-./+]{16,})["']?/gi;
  const g = new RegExp(genericRe.source, genericRe.flags);
  let m: RegExpExecArray | null;
  while ((m = g.exec(text)) !== null) {
    // m[1] is the captured value; m.index + m[0].indexOf(m[1]) = value start
    const valueStart = m.index + m[0].indexOf(m[1]);
    results.push({
      start: valueStart,
      end: valueStart + m[1].length,
      category: "api_key",
      severity: "critical",
      value: m[1],
    });
  }

  return results;
}


function detectIpAddress(text: string): RawMatch[] {
  return findAll(
    text,
    /(?<!\d)(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)(?!\d)/g,
    "ip_address",
    "low"
  );
}

function detectPassword(text: string): RawMatch[] {
  return findAll(
    text,
    /(?:password|passwd|pwd)\s*(?:[:=]|is)\s*\S+/gi,
    "password",
    "critical"
  );
}

function detectCustomTerms(text: string, terms: string[]): RawMatch[] {
  const results: RawMatch[] = [];
  for (const term of terms) {
    if (!term.trim()) continue;
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(escaped, "gi");
    results.push(...findAll(text, re, "custom_term", "high"));
  }
  return results;
}

// ─── Overlap resolution ───────────────────────────────────────────────────────

const SEVERITY_RANK: Record<Severity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

function resolveOverlaps(matches: RawMatch[]): RawMatch[] {
  // Sort: by start, then prefer higher severity, then longer span
  const sorted = [...matches].sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start;
    const sd = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
    if (sd !== 0) return sd;
    return b.end - a.end;
  });

  const kept: RawMatch[] = [];
  let cursor = -1;
  for (const m of sorted) {
    if (m.start < cursor) continue; // overlaps with a previous match — drop
    kept.push(m);
    cursor = m.end;
  }
  return kept;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function detectAll(
  text: string,
  enabledCategories: Category[],
  customTerms: string[] = []
): RawMatch[] {
  const enabled = new Set(enabledCategories);
  const all: RawMatch[] = [];

  // Detect in a fixed priority-aware order
  const emails = enabled.has("email") ? detectEmail(text) : [];
  const emailRanges = emails.map((m) => [m.start, m.end] as [number, number]);

  if (enabled.has("email")) all.push(...emails);

  if (enabled.has("phone")) all.push(...detectPhone(text));

  if (enabled.has("aadhaar")) all.push(...detectAadhaar(text));

  if (enabled.has("pan")) all.push(...detectPan(text));

  if (enabled.has("upi_id")) {
    // Exclude spans that are already matched as email
    const upiCandidates = detectUpi(text).filter(
      (u) => !emailRanges.some(([s, e]) => u.start >= s && u.end <= e)
    );
    all.push(...upiCandidates);
  }

  if (enabled.has("card")) all.push(...detectCard(text));

  if (enabled.has("api_key")) all.push(...detectApiKey(text));

  if (enabled.has("ip_address")) all.push(...detectIpAddress(text));

  if (enabled.has("password")) all.push(...detectPassword(text));

  if (enabled.has("custom_term")) all.push(...detectCustomTerms(text, customTerms));

  return resolveOverlaps(all);
}
