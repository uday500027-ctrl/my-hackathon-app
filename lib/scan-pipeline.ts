import { detectAll, type Category } from "@/lib/detectors";
import { maskText, type Finding } from "@/lib/masking";
import { computeRiskScore, type Destination, type Strictness, type RiskLevel } from "@/lib/risk";

export interface ScanPolicy {
  enabled_categories: Category[];
  custom_terms: string[];
  strictness: Strictness;
}

export interface ScanResult {
  maskedText: string;
  findings: Finding[];
  riskScore: number;
  riskLevel: RiskLevel;
}

export function runScan(
  text: string,
  destination: Destination,
  policy: ScanPolicy
): ScanResult {
  // 1. Detect — only enabled categories
  const matches = detectAll(text, policy.enabled_categories, policy.custom_terms);

  // 2. Mask — replaces values, produces structured findings (no raw values)
  const { maskedText, findings } = maskText(text, matches);

  // 3. Deterministic risk score
  // Gemini analysis step will be inserted here in Phase 3
  const { riskScore, riskLevel } = computeRiskScore(findings, destination, policy.strictness);

  return { maskedText, findings, riskScore, riskLevel };
}
