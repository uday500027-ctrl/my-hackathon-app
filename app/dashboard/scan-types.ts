// Shared type for a scan returned by the API
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
  }>;
  ai_status: string;
  ai_analysis: unknown;
  risk_score: number;
  risk_level: string;
  created_at: string;
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
};
