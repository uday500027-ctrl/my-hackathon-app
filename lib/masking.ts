import type { Category, RawMatch, Severity } from "@/lib/detectors";

export interface Finding {
  id: string;          // e.g. "email_1" or "confidential_1"
  category: Category | string;
  placeholder: string; // e.g. "[EMAIL_1]" or "[CONFIDENTIAL_1]"
  severity: Severity;
  source: "detector" | "ai";
  reason?: string;
  // NOTE: raw value is intentionally NOT stored here
}

export interface MaskResult {
  maskedText: string;
  findings: Finding[];
}

export function maskText(text: string, matches: RawMatch[]): MaskResult {
  const findings: Finding[] = [];

  // Assign a numbered placeholder per (category, value) pair.
  // Same raw value → same placeholder across the whole text.
  const categoryCounters: Partial<Record<Category, number>> = {};
  const valueToPlaceholder = new Map<string, string>();

  // Process matches left-to-right (resolveOverlaps already sorted them)
  const sortedMatches = [...matches].sort((a, b) => a.start - b.start);

  for (const m of sortedMatches) {
    if (!valueToPlaceholder.has(m.value)) {
      categoryCounters[m.category] = (categoryCounters[m.category] ?? 0) + 1;
      const n = categoryCounters[m.category]!;
      const placeholder = `[${m.category.toUpperCase()}_${n}]`;
      valueToPlaceholder.set(m.value, placeholder);

      findings.push({
        id: `${m.category}_${n}`,
        category: m.category,
        placeholder,
        severity: m.severity,
        source: "detector",
      });
    }
  }

  // Build masked text by walking through matches
  let result = "";
  let cursor = 0;
  for (const m of sortedMatches) {
    result += text.slice(cursor, m.start);
    result += valueToPlaceholder.get(m.value)!;
    cursor = m.end;
  }
  result += text.slice(cursor);

  return { maskedText: result, findings };
}
