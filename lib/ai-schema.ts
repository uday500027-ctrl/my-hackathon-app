import { z } from "zod";
import { Type, type Schema } from "@google/genai";

export const contextualFindingCategoryEnum = z.enum([
  "confidential_business",
  "credential_in_prose",
  "personal_data",
  "other",
]);
export type ContextualFindingCategory = z.infer<typeof contextualFindingCategoryEnum>;

export const contextualFindingSeverityEnum = z.enum(["low", "medium", "high"]);
export type ContextualFindingSeverity = z.infer<typeof contextualFindingSeverityEnum>;

export const rawAiContextualFindingSchema = z.object({
  category: contextualFindingCategoryEnum,
  phrase: z.string().max(120),
  reason: z.string().max(200),
  severity: contextualFindingSeverityEnum,
});
export type RawAiContextualFinding = z.infer<typeof rawAiContextualFindingSchema>;

export const aiRiskLevelEnum = z.enum(["low", "medium", "high", "critical"]);
export type AiRiskLevel = z.infer<typeof aiRiskLevelEnum>;

export const aiAnalysisOutputSchema = z.object({
  risk_level: aiRiskLevelEnum,
  risk_score: z.number().int().min(0).max(100),
  safe_to_send: z.boolean(),
  summary: z.string().max(300),
  contextual_findings: z.array(rawAiContextualFindingSchema).max(10),
  destination_assessment: z.string().max(300),
  recommended_actions: z.array(z.string().max(150)).max(5),
});
export type AiAnalysisOutput = z.infer<typeof aiAnalysisOutputSchema>;

// Persisted AI contextual finding in DB (phrase is stripped for privacy)
export interface StoredAiContextualFinding {
  id?: string;
  category: ContextualFindingCategory;
  reason: string;
  severity: ContextualFindingSeverity;
  placeholder?: string;
}

export interface StoredAiAnalysis {
  summary: string;
  safe_to_send: boolean;
  destination_assessment: string;
  recommended_actions: string[];
  risk_score: number;
  contextual_findings: StoredAiContextualFinding[];
}

export const geminiAiResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    risk_level: {
      type: Type.STRING,
      enum: ["low", "medium", "high", "critical"],
      description: "Overall risk level assessment.",
    },
    risk_score: {
      type: Type.INTEGER,
      description: "Risk score from 0 (completely safe) to 100 (critical risk).",
    },
    safe_to_send: {
      type: Type.BOOLEAN,
      description: "True if safe to transmit to destination, false if risky.",
    },
    summary: {
      type: Type.STRING,
      description: "Brief summary of contextual risk (max 300 chars).",
    },
    contextual_findings: {
      type: Type.ARRAY,
      description: "Contextual risks not caught by standard regex masks (max 10).",
      items: {
        type: Type.OBJECT,
        properties: {
          category: {
            type: Type.STRING,
            enum: ["confidential_business", "credential_in_prose", "personal_data", "other"],
          },
          phrase: {
            type: Type.STRING,
            description: "Exact verbatim snippet from the text (max 120 chars).",
          },
          reason: {
            type: Type.STRING,
            description: "Explanation of why this snippet is risky (max 200 chars).",
          },
          severity: {
            type: Type.STRING,
            enum: ["low", "medium", "high"],
          },
        },
        required: ["category", "phrase", "reason", "severity"],
      },
    },
    destination_assessment: {
      type: Type.STRING,
      description: "Assessment specific to the destination context (max 300 chars).",
    },
    recommended_actions: {
      type: Type.ARRAY,
      description: "Recommended remediation steps (max 5 items, each max 150 chars).",
      items: {
        type: Type.STRING,
      },
    },
  },
  required: [
    "risk_level",
    "risk_score",
    "safe_to_send",
    "summary",
    "contextual_findings",
    "destination_assessment",
    "recommended_actions",
  ],
};
