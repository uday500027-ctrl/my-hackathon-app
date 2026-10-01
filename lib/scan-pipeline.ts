import { detectAll, type Category } from "@/lib/detectors";
import { maskText, type Finding } from "@/lib/masking";
import { computeRiskScore, type Destination, type Strictness, type RiskLevel } from "@/lib/risk";
import { analyzeMaskedText } from "@/lib/gemini";
import { detectAndMaskInjections } from "@/lib/injection";
import type {
  StoredAiAnalysis,
  StoredAiContextualFinding,
  ContextualFindingCategory,
  ContextualFindingSeverity,
} from "@/lib/ai-schema";

export type Verdict = "safe" | "redact_first" | "do_not_upload";

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

export interface DocumentScanResult extends ScanResult {
  aiAnalysis: StoredAiAnalysis | null;
  aiStatus: "ok" | "fallback";
  aiNotice?: string;
  verdict: Verdict;
  truncated: boolean;
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

/**
 * Determine upload verdict from findings and risk level.
 * do_not_upload: critical risk level OR >= 3 critical findings OR AI says unsafe with high risk.
 * redact_first: medium or high risk OR any critical/high/medium finding exists.
 * safe: otherwise.
 */
export function computeVerdict(
  riskLevel: RiskLevel,
  findings: Finding[],
  aiAnalysis: StoredAiAnalysis | null
): Verdict {
  const criticalFindings = findings.filter((f) => f.severity === "critical");

  if (
    riskLevel === "critical" ||
    criticalFindings.length >= 3 ||
    (aiAnalysis && !aiAnalysis.safe_to_send && riskLevel === "high")
  ) {
    return "do_not_upload";
  }

  const hasAnySignificant = findings.some(
    (f) => f.severity === "critical" || f.severity === "high" || f.severity === "medium"
  );

  if (riskLevel === "medium" || riskLevel === "high" || hasAnySignificant) {
    return "redact_first";
  }

  return "safe";
}

// ─── Shared AI pipeline ───────────────────────────────────────────────────────

async function runAiPipeline(
  allFindings: Finding[],
  initialMaskedText: string,
  deterministicScore: number,
  deterministicLevel: RiskLevel,
  destination: Destination,
  strictness: Strictness
): Promise<ScanResult> {
  // Send only the first 10,000 chars of MASKED text to Gemini
  const maskedForAi = initialMaskedText.slice(0, 10_000);

  const aiResult = await analyzeMaskedText({
    maskedText: maskedForAi,
    destination,
    strictness,
  });

  if (!aiResult.ok) {
    return {
      maskedText: initialMaskedText,
      findings: allFindings,
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

    appliedAiFindings.push({
      id: meta.id,
      category: item.category,
      placeholder: meta.placeholder,
      severity: item.severity,
      source: "ai",
      reason: item.reason,
    });
  }

  const combinedFindings = [...allFindings, ...appliedAiFindings];

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
    findings: combinedFindings,
    riskScore: finalRiskScore,
    riskLevel: finalRiskLevel,
    ai_status: "ok",
    ai_analysis: aiAnalysis,
  };
}

// ─── Text scan (original) ────────────────────────────────────────────────────

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

  return runAiPipeline(
    deterministicFindings,
    initialMaskedText,
    deterministicScore,
    deterministicLevel,
    destination,
    policy.strictness
  );
}

// ─── Document scan ────────────────────────────────────────────────────────────

export async function runDocumentScan({
  text,
  destination,
  policy,
  truncated = false,
}: {
  text: string;
  destination: Destination;
  policy: ScanPolicy;
  truncated?: boolean;
}): Promise<DocumentScanResult> {
  let scanText = text;
  let isTruncated = truncated;
  if (scanText.length > 60_000) {
    scanText = scanText.slice(0, 60_000);
    isTruncated = true;
  }

  // 1. Run injection detection first, merge with deterministic detectors
  const { maskedText: injectionMasked, findings: injectionFindings } =
    detectAndMaskInjections(scanText);

  // 2. Run deterministic detectors on the injection-masked text
  const matches = detectAll(injectionMasked, policy.enabled_categories, policy.custom_terms);
  const { maskedText: fullyMaskedText, findings: deterministicFindings } = maskText(
    injectionMasked,
    matches
  );

  // 3. Merge all deterministic findings (injection + detector)
  const allDeterministicFindings: Finding[] = [...injectionFindings, ...deterministicFindings];

  // 4. Deterministic risk score (injection findings count as high severity)
  const { riskScore: deterministicScore, riskLevel: deterministicLevel } = computeRiskScore(
    allDeterministicFindings,
    destination,
    policy.strictness
  );

  // 5. AI pipeline on merged findings and masked text
  const aiResult = await runAiPipeline(
    allDeterministicFindings,
    fullyMaskedText,
    deterministicScore,
    deterministicLevel,
    destination,
    policy.strictness
  );

  // 6. Compute verdict from final result
  const verdict = computeVerdict(aiResult.riskLevel, aiResult.findings, aiResult.ai_analysis);

  return {
    ...aiResult,
    aiAnalysis: aiResult.ai_analysis,
    aiStatus: aiResult.ai_status,
    aiNotice: aiResult.ai_notice,
    verdict,
    truncated: isTruncated,
  };
}
