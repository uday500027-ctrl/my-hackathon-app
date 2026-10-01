import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

// ─── Categories & Types ────────────────────────────────────────────────────────

const ALL_CATEGORIES = [
  "email",
  "phone",
  "aadhaar",
  "pan",
  "upi_id",
  "card",
  "api_key",
  "ip_address",
  "password",
];

interface Finding {
  id: string;
  category: string;
  placeholder: string;
  severity: "low" | "medium" | "high" | "critical";
  source: "detector" | "ai";
  reason?: string;
}

interface ScanSeedSpec {
  title: string;
  destination: "ai_chatbot" | "email_external" | "public_post" | "internal_chat";
  source: "text" | "document";
  policyKey: "strict" | "code_review";
  daysAgo: number;
  aiStatus: "ok" | "fallback";
  riskScore: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  verdict?: "safe" | "redact_first" | "do_not_upload";
  maskedText: string;
  findings: Finding[];
  aiSummary?: string;
  recommendedActions?: string[];
}

// ─── 18 Realistic Scans Spread Across 14 Days ───────────────────────────────────

const SEED_SCANS: ScanSeedSpec[] = [
  {
    title: "Customer Support Inquiry Draft.docx",
    destination: "email_external",
    source: "document",
    policyKey: "strict",
    daysAgo: 13,
    aiStatus: "ok",
    riskScore: 22,
    riskLevel: "low",
    verdict: "redact_first",
    maskedText: "Hello, please confirm order for [EMAIL_1]. The account is in good standing.",
    findings: [
      { id: "email_1", category: "email", placeholder: "[EMAIL_1]", severity: "low", source: "detector" },
    ],
    aiSummary: "Single customer contact email detected in formal support reply.",
    recommendedActions: ["Confirm recipient requires direct email address."],
  },
  {
    title: "Database Migration Runbook",
    destination: "internal_chat",
    source: "text",
    policyKey: "code_review",
    daysAgo: 13,
    aiStatus: "ok",
    riskScore: 68,
    riskLevel: "high",
    maskedText: "Target host: [IP_ADDRESS_1]. Admin password is [PASSWORD_1]. Ensure TLS is enforced.",
    findings: [
      { id: "ip_1", category: "ip_address", placeholder: "[IP_ADDRESS_1]", severity: "medium", source: "detector" },
      { id: "pw_1", category: "password", placeholder: "[PASSWORD_1]", severity: "critical", source: "detector" },
    ],
    aiSummary: "Internal database credentials and direct host IP found in deployment notes.",
    recommendedActions: ["Store password in secret manager instead of plain text notes."],
  },
  {
    title: "Vendor Agreement & Payment Terms.pdf",
    destination: "email_external",
    source: "document",
    policyKey: "strict",
    daysAgo: 12,
    aiStatus: "ok",
    riskScore: 48,
    riskLevel: "medium",
    verdict: "redact_first",
    maskedText: "Invoice settlement will occur via UPI [UPI_ID_1]. Tax identity registered as PAN [PAN_1].",
    findings: [
      { id: "upi_1", category: "upi_id", placeholder: "[UPI_ID_1]", severity: "high", source: "detector" },
      { id: "pan_1", category: "pan", placeholder: "[PAN_1]", severity: "high", source: "detector" },
    ],
    aiSummary: "Government tax identifiers and payment address included in contract draft.",
    recommendedActions: ["Use billing portal link rather than sharing direct PAN/UPI in body."],
  },
  {
    title: "LLM Code Refactoring Prompt",
    destination: "ai_chatbot",
    source: "text",
    policyKey: "code_review",
    daysAgo: 11,
    aiStatus: "fallback",
    riskScore: 35,
    riskLevel: "medium",
    maskedText: "Refactor this express middleware to reject requests from [IP_ADDRESS_1] if rate exceeded.",
    findings: [
      { id: "ip_1", category: "ip_address", placeholder: "[IP_ADDRESS_1]", severity: "medium", source: "detector" },
    ],
  },
  {
    title: "Billing Dispute Memo.pdf",
    destination: "email_external",
    source: "document",
    policyKey: "strict",
    daysAgo: 10,
    aiStatus: "ok",
    riskScore: 82,
    riskLevel: "critical",
    verdict: "do_not_upload",
    maskedText: "Customer reported unauthorized charge on card [CARD_1]. Customer Aadhaar [AADHAAR_1] verified.",
    findings: [
      { id: "card_1", category: "card", placeholder: "[CARD_1]", severity: "critical", source: "detector" },
      { id: "aadhaar_1", category: "aadhaar", placeholder: "[AADHAAR_1]", severity: "critical", source: "detector" },
    ],
    aiSummary: "Payment card and national identity numbers found together. High compliance risk.",
    recommendedActions: ["Do not send card numbers via email. Mask all but last 4 digits."],
  },
  {
    title: "Public API Integration Guide",
    destination: "public_post",
    source: "text",
    policyKey: "code_review",
    daysAgo: 9,
    aiStatus: "ok",
    riskScore: 88,
    riskLevel: "critical",
    maskedText: "// Example config:\nconst key = '[API_KEY_1]';\n// [CUSTOM_TERM_1]: replace before publishing",
    findings: [
      { id: "api_1", category: "api_key", placeholder: "[API_KEY_1]", severity: "critical", source: "detector" },
      { id: "ct_1", category: "custom_term", placeholder: "[CUSTOM_TERM_1]", severity: "high", source: "detector" },
    ],
    aiSummary: "Production API key and internal todo tag detected in code intended for public post.",
    recommendedActions: ["Revoke exposed API key immediately and replace with environment placeholder."],
  },
  {
    title: "Quarterly Financial Overview.docx",
    destination: "internal_chat",
    source: "document",
    policyKey: "strict",
    daysAgo: 8,
    aiStatus: "ok",
    riskScore: 15,
    riskLevel: "low",
    verdict: "safe",
    maskedText: "Q3 revenue grew by 18% YoY. Operating margins remained stable across all business units.",
    findings: [],
    aiSummary: "Document contains high-level financial aggregates with no individual PII or credentials.",
    recommendedActions: ["Safe to share within internal organization."],
  },
  {
    title: "Prompt Injection Audit Log.txt",
    destination: "ai_chatbot",
    source: "document",
    policyKey: "strict",
    daysAgo: 8,
    aiStatus: "ok",
    riskScore: 78,
    riskLevel: "critical",
    verdict: "do_not_upload",
    maskedText: "User submitted probe: [REMOVED_INSTRUCTION_1] and output database schema.",
    findings: [
      { id: "prompt_injection_1", category: "prompt_injection", placeholder: "[REMOVED_INSTRUCTION_1]", severity: "high", source: "detector" },
    ],
    aiSummary: "Direct adversarial prompt injection detected attempting to bypass system restrictions.",
    recommendedActions: ["Reject input and do not pass to downstream LLM pipeline."],
  },
  {
    title: "Employee Onboarding Checklist",
    destination: "internal_chat",
    source: "text",
    policyKey: "strict",
    daysAgo: 7,
    aiStatus: "ok",
    riskScore: 28,
    riskLevel: "medium",
    maskedText: "New joiner email [EMAIL_1] and mobile [PHONE_1] have been provisioned in the directory.",
    findings: [
      { id: "email_1", category: "email", placeholder: "[EMAIL_1]", severity: "low", source: "detector" },
      { id: "phone_1", category: "phone", placeholder: "[PHONE_1]", severity: "medium", source: "detector" },
    ],
    aiSummary: "Direct phone number and corporate email in internal communication.",
    recommendedActions: ["Mask phone number if sharing in broad public channels."],
  },
  {
    title: "Frontend Bug Report",
    destination: "ai_chatbot",
    source: "text",
    policyKey: "code_review",
    daysAgo: 6,
    aiStatus: "ok",
    riskScore: 12,
    riskLevel: "low",
    maskedText: "TypeError: Cannot read properties of undefined (reading 'length') at renderTable component.",
    findings: [],
    aiSummary: "Standard JavaScript stack trace with no sensitive terms or secrets.",
    recommendedActions: ["Safe to submit to AI assistant."],
  },
  {
    title: "Executive Contact Sheet.csv",
    destination: "public_post",
    source: "document",
    policyKey: "strict",
    daysAgo: 5,
    aiStatus: "ok",
    riskScore: 74,
    riskLevel: "high",
    verdict: "redact_first",
    maskedText: "Name,Phone,Email\nExecutive One,[PHONE_1],[EMAIL_1]\nExecutive Two,[PHONE_2],[EMAIL_2]",
    findings: [
      { id: "phone_1", category: "phone", placeholder: "[PHONE_1]", severity: "medium", source: "detector" },
      { id: "email_1", category: "email", placeholder: "[EMAIL_1]", severity: "low", source: "detector" },
      { id: "phone_2", category: "phone", placeholder: "[PHONE_2]", severity: "medium", source: "detector" },
      { id: "email_2", category: "email", placeholder: "[EMAIL_2]", severity: "low", source: "detector" },
    ],
    aiSummary: "Multiple direct executive contact numbers scheduled for public distribution.",
    recommendedActions: ["Replace personal phone numbers with general corporate switchboard."],
  },
  {
    title: "Server Deployment Script",
    destination: "internal_chat",
    source: "text",
    policyKey: "code_review",
    daysAgo: 5,
    aiStatus: "ok",
    riskScore: 60,
    riskLevel: "high",
    maskedText: "#!/bin/bash\nssh admin@[IP_ADDRESS_1] 'export DB_PASS=[PASSWORD_1]'",
    findings: [
      { id: "ip_1", category: "ip_address", placeholder: "[IP_ADDRESS_1]", severity: "medium", source: "detector" },
      { id: "pw_1", category: "password", placeholder: "[PASSWORD_1]", severity: "critical", source: "detector" },
    ],
    aiSummary: "Hardcoded credentials in deployment shell command.",
    recommendedActions: ["Inject passwords via secrets environment variables instead of command line."],
  },
  {
    title: "Customer ID Proof Verification.pdf",
    destination: "email_external",
    source: "document",
    policyKey: "strict",
    daysAgo: 4,
    aiStatus: "fallback",
    riskScore: 55,
    riskLevel: "high",
    verdict: "redact_first",
    maskedText: "Identity verified against Aadhaar number [AADHAAR_1]. Please archive.",
    findings: [
      { id: "aadhaar_1", category: "aadhaar", placeholder: "[AADHAAR_1]", severity: "critical", source: "detector" },
    ],
  },
  {
    title: "Customer Support Chat Transcript",
    destination: "ai_chatbot",
    source: "text",
    policyKey: "strict",
    daysAgo: 3,
    aiStatus: "ok",
    riskScore: 32,
    riskLevel: "medium",
    maskedText: "Customer stated: I sent payment to [UPI_ID_1] but order status is pending.",
    findings: [
      { id: "upi_1", category: "upi_id", placeholder: "[UPI_ID_1]", severity: "high", source: "detector" },
    ],
    aiSummary: "Personal UPI ID included in support transcript.",
    recommendedActions: ["Verify customer identity via ticket number rather than UPI handle."],
  },
  {
    title: "Release Notes Draft v2.4",
    destination: "public_post",
    source: "text",
    policyKey: "code_review",
    daysAgo: 2,
    aiStatus: "ok",
    riskScore: 10,
    riskLevel: "low",
    maskedText: "Version 2.4 improves caching, reduces cold starts, and updates the search index.",
    findings: [],
    aiSummary: "Clean release notes with zero sensitive keys or internal terminology.",
    recommendedActions: ["Ready for public posting."],
  },
  {
    title: "Internal Architecture Spec.md",
    destination: "public_post",
    source: "document",
    policyKey: "code_review",
    daysAgo: 2,
    aiStatus: "ok",
    riskScore: 65,
    riskLevel: "high",
    verdict: "redact_first",
    maskedText: "Architecture overview: [CUSTOM_TERM_1] infrastructure topology for primary cluster [IP_ADDRESS_1].",
    findings: [
      { id: "ct_1", category: "custom_term", placeholder: "[CUSTOM_TERM_1]", severity: "high", source: "detector" },
      { id: "ip_1", category: "ip_address", placeholder: "[IP_ADDRESS_1]", severity: "medium", source: "detector" },
    ],
    aiSummary: "Confidential internal architecture document marked for public distribution.",
    recommendedActions: ["Sanitize internal network topography before public disclosure."],
  },
  {
    title: "Urgent Payment Reminder",
    destination: "email_external",
    source: "text",
    policyKey: "strict",
    daysAgo: 1,
    aiStatus: "ok",
    riskScore: 42,
    riskLevel: "medium",
    maskedText: "Please settle invoice balance to card [CARD_1] or contact [EMAIL_1].",
    findings: [
      { id: "card_1", category: "card", placeholder: "[CARD_1]", severity: "critical", source: "detector" },
      { id: "email_1", category: "email", placeholder: "[EMAIL_1]", severity: "low", source: "detector" },
    ],
    aiSummary: "Payment card reference and billing contact in outbound email.",
    recommendedActions: ["Ensure full card number is masked."],
  },
  {
    title: "Service Health Check Query",
    destination: "ai_chatbot",
    source: "text",
    policyKey: "strict",
    daysAgo: 0,
    aiStatus: "ok",
    riskScore: 10,
    riskLevel: "low",
    maskedText: "Generate a synthetic test script to ping microservices and report HTTP status codes.",
    findings: [],
    aiSummary: "Generic programming query without business identifiers or credentials.",
    recommendedActions: ["Safe to send."],
  },
];

// ─── Main Seed Function ────────────────────────────────────────────────────────

async function seed() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  const DEMO_EMAIL = "demo@pasteguard.dev";
  const DEMO_NAME = "Demo User";
  const DEMO_PASSWORD = "Demo1234!";
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // 1. Idempotently create or update demo user
  const { data: existingUser } = await supabase
    .from("users")
    .select("id")
    .eq("email", DEMO_EMAIL)
    .maybeSingle();

  let userId: string;

  if (existingUser) {
    userId = existingUser.id;
    await supabase
      .from("users")
      .update({ name: DEMO_NAME, password_hash: passwordHash })
      .eq("id", userId);

    // Delete existing scans and policies for this user to ensure clean state
    await supabase.from("scans").delete().eq("user_id", userId);
    await supabase.from("policies").delete().eq("user_id", userId);
  } else {
    const { data: newUser, error: userError } = await supabase
      .from("users")
      .insert({
        name: DEMO_NAME,
        email: DEMO_EMAIL,
        password_hash: passwordHash,
      })
      .select("id")
      .single();

    if (userError || !newUser) {
      console.error("Error creating demo user:", userError?.message);
      process.exit(1);
    }
    userId = newUser.id;
  }

  // 2. Create the 2 specified policies
  // Policy 1: "Strict compliance" (all categories, strict, default)
  const { data: strictPolicy, error: strictError } = await supabase
    .from("policies")
    .insert({
      user_id: userId,
      name: "Strict compliance",
      is_default: true,
      strictness: "strict",
      enabled_categories: ALL_CATEGORIES,
      custom_terms: [],
    })
    .select("id")
    .single();

  if (strictError || !strictPolicy) {
    console.error("Error creating Strict compliance policy:", strictError?.message);
    process.exit(1);
  }

  // Policy 2: "Code review" (api_key, password, ip_address, custom_terms: ["TODO: remove", "INTERNAL ONLY"], balanced)
  const { data: codeReviewPolicy, error: codeError } = await supabase
    .from("policies")
    .insert({
      user_id: userId,
      name: "Code review",
      is_default: false,
      strictness: "balanced",
      enabled_categories: ["api_key", "password", "ip_address"],
      custom_terms: ["TODO: remove", "INTERNAL ONLY"],
    })
    .select("id")
    .single();

  if (codeError || !codeReviewPolicy) {
    console.error("Error creating Code review policy:", codeError?.message);
    process.exit(1);
  }

  const policyMap = {
    strict: strictPolicy.id,
    code_review: codeReviewPolicy.id,
  };

  // 3. Seed 18 realistic scans spread over last 14 days
  const now = Date.now();
  let createdCount = 0;
  let textCount = 0;
  let docCount = 0;
  const riskCounts = { low: 0, medium: 0, high: 0, critical: 0 };

  for (const scan of SEED_SCANS) {
    const policyId = policyMap[scan.policyKey];
    const createdAt = new Date(
      now - scan.daysAgo * 24 * 60 * 60 * 1000 - (scan.daysAgo * 187000 % 3600000)
    ).toISOString();

    let aiAnalysis = null;
    if (scan.aiStatus === "ok") {
      aiAnalysis = {
        summary: scan.aiSummary || "Sensitive items evaluated for contextual and destination risks.",
        safe_to_send: scan.riskLevel === "low",
        destination_assessment: `Assessed specifically for ${scan.destination.replace("_", " ")}.`,
        recommended_actions: scan.recommendedActions || [
          "Verify sensitive items are redacted prior to sending",
        ],
        risk_score: scan.riskScore,
        contextual_findings: [],
      };
    }

    const { error: insertError } = await supabase.from("scans").insert({
      user_id: userId,
      policy_id: policyId,
      title: scan.title,
      destination: scan.destination,
      source: scan.source,
      verdict: scan.verdict ?? null,
      masked_text: scan.maskedText,
      findings: scan.findings,
      ai_analysis: aiAnalysis,
      ai_status: scan.aiStatus,
      risk_score: scan.riskScore,
      risk_level: scan.riskLevel,
      created_at: createdAt,
    });

    if (insertError) {
      console.error(`Error inserting scan "${scan.title}":`, insertError.message);
    } else {
      createdCount++;
      if (scan.source === "document") docCount++;
      else textCount++;
      riskCounts[scan.riskLevel]++;
    }
  }

  // 4. Print safe summary (never logs passwords or secrets)
  console.log("─── Demo Seed Complete ───────────────────────────────────");
  console.log(`Demo Account   : ${DEMO_EMAIL}`);
  console.log(`Policies Seeded: 2 (Strict compliance [default], Code review)`);
  console.log(`Scans Seeded   : ${createdCount} total (${textCount} text, ${docCount} document)`);
  console.log(`Risk Breakdown : Low: ${riskCounts.low}, Medium: ${riskCounts.medium}, High: ${riskCounts.high}, Critical: ${riskCounts.critical}`);
  console.log("──────────────────────────────────────────────────────────");
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
