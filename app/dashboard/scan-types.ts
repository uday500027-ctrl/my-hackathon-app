// Shared type for a scan returned by the API
export interface AiContextualFinding {
  id?: string;
  category: string;
  reason: string;
  severity: string;
  placeholder?: string;
}

export interface AiAnalysisData {
  summary: string;
  safe_to_send: boolean;
  destination_assessment: string;
  recommended_actions: string[];
  risk_score: number;
  contextual_findings: AiContextualFinding[];
}

export type Verdict = "safe" | "redact_first" | "do_not_upload";

export interface ScanRecord {
  id: string;
  user_id: string;
  policy_id: string | null;
  title: string | null;
  destination: string;
  masked_text?: string; // only in detail view
  findings: Array<{
    id: string;
    category: string;
    placeholder: string;
    severity: string;
    source: string;
    reason?: string;
  }>;
  ai_status: "ok" | "fallback" | string;
  ai_analysis: AiAnalysisData | null;
  ai_notice?: string;
  risk_score: number;
  risk_level: string;
  source?: "text" | "document";
  verdict?: Verdict | null;
  created_at: string;
  // transient fields from document scan response (not persisted separately)
  truncated?: boolean;
  pageCount?: number;
}

export const DESTINATION_LABELS: Record<string, string> = {
  ai_chatbot: "AI Chatbot",
  email_external: "External Email",
  public_post: "Public Post",
  internal_chat: "Internal Chat",
};

export const RISK_LEVEL_LABELS: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export const CATEGORY_LABELS: Record<string, string> = {
  email: "Email address",
  phone: "Phone number",
  aadhaar: "Aadhaar number",
  pan: "PAN",
  upi_id: "UPI ID",
  card: "Card number",
  api_key: "API key / secret",
  ip_address: "IP address",
  password: "Password",
  custom_term: "Custom term",
  prompt_injection: "Prompt injection",
  confidential_business: "Confidential business info",
  credential_in_prose: "Credential in prose",
  personal_data: "Personal data",
  other: "Contextual risk",
};

export const VERDICT_LABELS: Record<Verdict, string> = {
  safe: "Safe to upload",
  redact_first: "Redact first",
  do_not_upload: "Do not upload",
};
