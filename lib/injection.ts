// lib/injection.ts — pure, no I/O

import type { Severity } from "@/lib/detectors";
import type { Finding } from "@/lib/masking";

export interface InjectionResult {
  maskedText: string;
  findings: Finding[];
}

/**
 * Ordered list of prompt-injection phrase patterns.
 * All are case-insensitive and must NOT capture the matched text in findings.
 */
const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(?:all\s+)?(?:previous|prior|above)\s+instructions/gi,
  /disregard\s+(?:the\s+)?(?:system|previous)/gi,
  /you\s+are\s+now/gi,
  /reveal\s+(?:your\s+)?(?:system\s+)?prompt/gi,
  /act\s+as\s+(?:an?\s+)?(?:unrestricted|jailbroken)/gi,
  /do\s+not\s+tell\s+the\s+user/gi,
  /new\s+instructions:/gi,
];

/**
 * Detect and mask prompt-injection phrases in text.
 * Each unique match span is replaced with [REMOVED_INSTRUCTION_N].
 * Findings never contain the matched text.
 */
export function detectAndMaskInjections(text: string): InjectionResult {
  // Collect all match spans across all patterns
  const spans: Array<{ start: number; end: number }> = [];

  for (const pattern of INJECTION_PATTERNS) {
    // Create a fresh copy with global flag to avoid state issues
    const re = new RegExp(pattern.source, "gi");
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      spans.push({ start: m.index, end: m.index + m[0].length });
    }
  }

  if (spans.length === 0) {
    return { maskedText: text, findings: [] };
  }

  // Sort and merge overlapping spans
  spans.sort((a, b) => a.start - b.start);
  const merged: Array<{ start: number; end: number }> = [];
  for (const span of spans) {
    const last = merged[merged.length - 1];
    if (last && span.start < last.end) {
      last.end = Math.max(last.end, span.end);
    } else {
      merged.push({ ...span });
    }
  }

  // Build masked text and findings (no raw values stored)
  const findings: Finding[] = [];
  let maskedText = "";
  let cursor = 0;

  for (let i = 0; i < merged.length; i++) {
    const { start, end } = merged[i];
    const n = i + 1;
    const placeholder = `[REMOVED_INSTRUCTION_${n}]`;

    maskedText += text.slice(cursor, start);
    maskedText += placeholder;
    cursor = end;

    findings.push({
      id: `prompt_injection_${n}`,
      category: "prompt_injection",
      placeholder,
      severity: "high" as Severity,
      source: "detector",
    });
  }

  maskedText += text.slice(cursor);

  return { maskedText, findings };
}
