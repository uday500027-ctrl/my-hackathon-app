import { detectAll, type Category } from "@/lib/detectors";
import { maskText, type Finding } from "@/lib/masking";
import { computeRiskScore, type Destination, type Strictness, type RiskLevel } from "@/lib/risk";
import { analyzeMaskedText } from "@/lib/gemini";
import type {
  StoredAiAnalysis,
  StoredAiContextualFinding,
  ContextualFindingCategory,
  ContextualFindingSeverity,
} from "@/lib/ai-schema";

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
  ai_status: "ok" | "fallback";
  ai_analysis: StoredAiAnalysis | null;
  ai_notice?: string;
}

const AI_CATEGORY_PREFIX: Record<string, string> = {
  confidential_business: "CONFIDENTIAL",
  credential_in_prose: "CREDENTIAL",
  personal_data: "PERSONAL",
  other: "OTHER",
};

function isPlaceholder(phrase: string): boolean {
  return /^\[[A-Z0-9_]+\]$/.test(phrase.trim());
}

export async function runScan(
  text: string,
  destination: Destination,
  policy: ScanPolicy
): Promise<ScanResult> {
  // 1. Detect — only enabled categories
  const matches = detectAll(text, policy.enabled_categories, policy.custom_terms);

  // 2. Deterministic Masking — produces structured findings (no raw values)
  const { maskedText: initialMaskedText, findings: deterministicFindings } = maskText(
    text,
    matches
  );

  // 3. Deterministic risk score
  const { riskScore: deterministicScore, riskLevel: deterministicLevel } = computeRiskScore(
    deterministicFindings,
    destination,
    policy.strictness
  );

  // 4. Gemini contextual analysis on MASKED text only (never raw text)
  const aiResult = await analyzeMaskedText({
    maskedText: initialMaskedText,
    destination,
    strictness: policy.strictness,
  });

  if (!aiResult.ok) {
    return {
      maskedText: initialMaskedText,
      findings: deterministicFindings,
      riskScore: deterministicScore,
      riskLevel: deterministicLevel,
      ai_status: "fallback",
      ai_analysis: null,
      ai_notice: "AI review is unavailable right now, so this result uses automatic detection only.",
    };
  }

  const aiData = aiResult.data;
  let currentMaskedText = initialMaskedText;
  const appliedAiFindings: Finding[] = [];
  const phraseToPlaceholder = new Map<string, { placeholder: string; id: string }>();
  const categoryCounters: Record<string, number> = {};

  for (const item of aiData.contextual_findings) {
    const phrase = item.phrase?.trim();
    if (!phrase) continue;
    if (isPlaceholder(phrase)) continue;
    if (!currentMaskedText.includes(phrase)) continue;

    let meta = phraseToPlaceholder.get(phrase);
    if (!meta) {
      const prefix = AI_CATEGORY_PREFIX[item.category] || "OTHER";
      categoryCounters[prefix] = (categoryCounters[prefix] || 0) + 1;
      const count = categoryCounters[prefix];
      meta = {
        placeholder: `[${prefix}_${count}]`,
        id: `${prefix.toLowerCase()}_${count}`,
      };
      phraseToPlaceholder.set(phrase, meta);
    }

    currentMaskedText = currentMaskedText.replaceAll(phrase, meta.placeholder);

    // Track applied AI finding without the raw phrase
    appliedAiFindings.push({
      id: meta.id,
      category: item.category,
      placeholder: meta.placeholder,
      severity: item.severity,
      source: "ai",
      reason: item.reason,
    });
  }

  const allFindings = [...deterministicFindings, ...appliedAiFindings];

  // Final risk score: max of deterministic & AI risk scores, capped at 100
  const finalRiskScore = Math.min(100, Math.max(deterministicScore, aiData.risk_score));

  let finalRiskLevel: RiskLevel;
  if (finalRiskScore < 25) finalRiskLevel = "low";
  else if (finalRiskScore < 50) finalRiskLevel = "medium";
  else if (finalRiskScore < 75) finalRiskLevel = "high";
  else finalRiskLevel = "critical";

  // If AI deems unsafe to send, elevate to at least medium
  if (!aiData.safe_to_send && finalRiskLevel === "low") {
    finalRiskLevel = "medium";
  }

  const storedContextualFindings: StoredAiContextualFinding[] = appliedAiFindings.map((f) => ({
    id: f.id,
    category: f.category as ContextualFindingCategory,
    placeholder: f.placeholder,
    severity: f.severity as ContextualFindingSeverity,
    reason: f.reason ?? "",
  }));

  const aiAnalysis: StoredAiAnalysis = {
    summary: aiData.summary,
    safe_to_send: aiData.safe_to_send,
    destination_assessment: aiData.destination_assessment,
    recommended_actions: aiData.recommended_actions,
    risk_score: aiData.risk_score,
    contextual_findings: storedContextualFindings,
  };

  return {
    maskedText: currentMaskedText,
    findings: allFindings,
    riskScore: finalRiskScore,
    riskLevel: finalRiskLevel,
    ai_status: "ok",
    ai_analysis: aiAnalysis,
  };
}
