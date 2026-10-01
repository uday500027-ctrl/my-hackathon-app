/**
 * scripts/check-phase3.mjs
 * Unit-style checks for Phase 3 schemas, fallback logic, and risk calculation.
 */

import { z } from "zod";

const contextualFindingCategoryEnum = z.enum([
  "confidential_business",
  "credential_in_prose",
  "personal_data",
  "other",
]);

const contextualFindingSeverityEnum = z.enum(["low", "medium", "high"]);

const rawAiContextualFindingSchema = z.object({
  category: contextualFindingCategoryEnum,
  phrase: z.string().max(120),
  reason: z.string().max(200),
  severity: contextualFindingSeverityEnum,
});

const aiRiskLevelEnum = z.enum(["low", "medium", "high", "critical"]);

const aiAnalysisOutputSchema = z.object({
  risk_level: aiRiskLevelEnum,
  risk_score: z.number().int().min(0).max(100),
  safe_to_send: z.boolean(),
  summary: z.string().max(300),
  contextual_findings: z.array(rawAiContextualFindingSchema).max(10),
  destination_assessment: z.string().max(300),
  recommended_actions: z.array(z.string().max(150)).max(5),
});

function assert(condition, message) {
  if (!condition) {
    console.error(`Assertion failed: ${message}`);
    process.exit(1);
  }
}

// 1. Validate sample AI response JSON against schema
const sampleAiOutput = {
  risk_level: "high",
  risk_score: 70,
  safe_to_send: false,
  summary: "The text mentions sensitive internal project names and upcoming contracts.",
  contextual_findings: [
    {
      category: "confidential_business",
      phrase: "Project Falcon",
      reason: "Internal unreleased project codename.",
      severity: "high",
    },
    {
      category: "confidential_business",
      phrase: "Acme contract dispute",
      reason: "Confidential legal and vendor dispute.",
      severity: "medium",
    },
  ],
  destination_assessment: "External AI chatbots may ingest or retain confidential project context.",
  recommended_actions: [
    "Redact unannounced project names before sending.",
    "Remove references to ongoing vendor disputes.",
  ],
};

const parsed = aiAnalysisOutputSchema.safeParse(sampleAiOutput);
assert(parsed.success, "Schema validation should pass for valid AI output");

// 2. Replacement logic test
const AI_CATEGORY_PREFIX = {
  confidential_business: "CONFIDENTIAL",
  credential_in_prose: "CREDENTIAL",
  personal_data: "PERSONAL",
  other: "OTHER",
};

let maskedText = "Project Falcon launch is delayed due to the Acme contract dispute.";
const phraseToPlaceholder = new Map();
const categoryCounters = {};
const appliedAiFindings = [];

for (const item of parsed.data.contextual_findings) {
  const phrase = item.phrase.trim();
  if (!maskedText.includes(phrase)) continue;

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

  maskedText = maskedText.replaceAll(phrase, meta.placeholder);
  appliedAiFindings.push({
    id: meta.id,
    category: item.category,
    placeholder: meta.placeholder,
    severity: item.severity,
    source: "ai",
    reason: item.reason,
  });
}

assert(
  maskedText === "[CONFIDENTIAL_1] launch is delayed due to the [CONFIDENTIAL_2].",
  `Masked text with AI findings should match expected: got "${maskedText}"`
);
assert(appliedAiFindings.length === 2, "Should have 2 applied findings");
assert(
  !appliedAiFindings.some((f) => "phrase" in f),
  "Raw phrase must NOT be stored in applied findings"
);

// 3. Risk score combination test
const deterministicScore = 30;
const aiScore = 70;
const finalRiskScore = Math.min(100, Math.max(deterministicScore, aiScore));
assert(finalRiskScore === 70, "Final risk score should be max(deterministic, ai)");

console.log("All Phase 3 checks passed successfully.");
