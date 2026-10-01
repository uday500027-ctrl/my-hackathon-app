import type { Finding } from "@/lib/masking";
import type { Severity } from "@/lib/detectors";

export type RiskLevel = "low" | "medium" | "high" | "critical";
export type Destination = "ai_chatbot" | "email_external" | "public_post" | "internal_chat";
export type Strictness = "relaxed" | "balanced" | "strict";

const SEVERITY_BASE: Record<Severity, number> = {
  critical: 35,
  high: 20,
  medium: 10,
  low: 4,
};

const DESTINATION_MULTIPLIER: Record<Destination, number> = {
  public_post: 1.3,
  email_external: 1.1,
  ai_chatbot: 1.0,
  internal_chat: 0.6,
};

const STRICTNESS_MULTIPLIER: Record<Strictness, number> = {
  relaxed: 0.8,
  balanced: 1.0,
  strict: 1.2,
};

export function computeRiskScore(
  findings: Finding[],
  destination: Destination,
  strictness: Strictness
): { riskScore: number; riskLevel: RiskLevel } {
  // Group by category to apply diminishing returns
  const byCategory = new Map<string, Finding[]>();
  for (const f of findings) {
    const key = f.category;
    if (!byCategory.has(key)) byCategory.set(key, []);
    byCategory.get(key)!.push(f);
  }

  let raw = 0;
  for (const group of byCategory.values()) {
    // Sort so highest severity first
    const sorted = [...group].sort(
      (a, b) =>
        (["critical", "high", "medium", "low"].indexOf(a.severity)) -
        (["critical", "high", "medium", "low"].indexOf(b.severity))
    );
    for (let i = 0; i < sorted.length; i++) {
      const base = SEVERITY_BASE[sorted[i].severity];
      // Each extra finding of the same category counts 50%
      raw += base * Math.pow(0.5, i);
    }
  }

  raw *= DESTINATION_MULTIPLIER[destination];
  raw *= STRICTNESS_MULTIPLIER[strictness];

  const riskScore = Math.round(Math.min(100, Math.max(0, raw)));

  let riskLevel: RiskLevel;
  if (riskScore < 25) riskLevel = "low";
  else if (riskScore < 50) riskLevel = "medium";
  else if (riskScore < 75) riskLevel = "high";
  else riskLevel = "critical";

  return { riskScore, riskLevel };
}
