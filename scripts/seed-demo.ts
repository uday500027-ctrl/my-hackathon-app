import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { detectAll, type Category } from "../lib/detectors";
import { maskText } from "../lib/masking";
import { computeRiskScore, type Destination, type Strictness } from "../lib/risk";

const ALL_CATEGORIES: Category[] = [
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

  const DEMO_EMAIL = "demo@pasteguard.app";
  const DEMO_NAME = "Demo Reviewer";
  const rawPassword = process.env.DEMO_PASSWORD || "PasteGuard-Demo-2026";
  const passwordHash = await bcrypt.hash(rawPassword, 10);

  // 1. Idempotently create or update user
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

  // 2. Create 3 demo policies
  const policyDefinitions = [
    {
      name: "Default policy",
      is_default: true,
      strictness: "balanced" as Strictness,
      enabled_categories: ALL_CATEGORIES,
      custom_terms: [] as string[],
    },
    {
      name: "Strict - public posts",
      is_default: false,
      strictness: "strict" as Strictness,
      enabled_categories: ALL_CATEGORIES,
      custom_terms: ["Project Falcon", "Acme"],
    },
    {
      name: "Relaxed - internal chat",
      is_default: false,
      strictness: "relaxed" as Strictness,
      enabled_categories: ALL_CATEGORIES,
      custom_terms: [] as string[],
    },
  ];

  const createdPolicies: Record<string, string> = {};

  for (const def of policyDefinitions) {
    const { data, error } = await supabase
      .from("policies")
      .insert({
        user_id: userId,
        name: def.name,
        is_default: def.is_default,
        strictness: def.strictness,
        enabled_categories: def.enabled_categories,
        custom_terms: def.custom_terms,
      })
      .select("id, name")
      .single();

    if (error || !data) {
      console.error("Error creating policy:", error?.message);
      process.exit(1);
    }
    createdPolicies[data.name] = data.id;
  }

  // 3. Create ~14 scans spread over the last 14 days
  // Assemble fake secrets by string concatenation so no raw keys exist in code
  const fakeKey1 = ["AIza", "SyDemoKey", "493021", "AbCdEfGhIjK"].join("");
  const fakeKey2 = ["sk-live-", "testcorp-", "99482019482", "xyz"].join("");

  const sampleScanConfigs: Array<{
    title: string;
    rawText: string;
    destination: Destination;
    policyName: string;
    daysAgo: number;
    aiStatus: "ok" | "fallback";
    aiSummary?: string;
  }> = [
    {
      title: "Support email reply",
      rawText: "Hi team, please contact support lead at lead@example.com or mobile +1 555 019 2834 regarding ticket 402.",
      destination: "email_external",
      policyName: "Default policy",
      daysAgo: 13,
      aiStatus: "ok",
      aiSummary: "Standard business email with direct contact details. Low severity once masked.",
    },
    {
      title: "Staging database instructions",
      rawText: "Connect to database server 10.0.4.12. The password is devPassword2026! and admin email is devops@example.com.",
      destination: "internal_chat",
      policyName: "Relaxed - internal chat",
      daysAgo: 12,
      aiStatus: "fallback",
    },
    {
      title: "ChatGPT API helper prompt",
      rawText: `Please debug this function that calls external services using key ${fakeKey1} for project client.`,
      destination: "ai_chatbot",
      policyName: "Default policy",
      daysAgo: 11,
      aiStatus: "ok",
      aiSummary: "High risk credential exposed in prompt. Must be kept out of public LLM context.",
    },
    {
      title: "Billing dispute memo",
      rawText: "The customer paid with Visa card 4111 1111 1111 1111 under Acme account dispute reference #994.",
      destination: "email_external",
      policyName: "Strict - public posts",
      daysAgo: 10,
      aiStatus: "ok",
      aiSummary: "Payment card details detected alongside proprietary partner name.",
    },
    {
      title: "Roadmap public announcement draft",
      rawText: "Our team is announcing Project Falcon next Tuesday. Contact press@example.com for early embargo access.",
      destination: "public_post",
      policyName: "Strict - public posts",
      daysAgo: 9,
      aiStatus: "fallback",
    },
    {
      title: "Customer onboarding verification",
      rawText: "Client PAN is ABCDE1234F and verification email has been sent to client.test@example.com.",
      destination: "email_external",
      policyName: "Default policy",
      daysAgo: 8,
      aiStatus: "ok",
      aiSummary: "Government tax ID and personal email present in correspondence.",
    },
    {
      title: "Vendor invoice UPI transfer",
      rawText: "Send payment of invoice to vendor account via UPI ID vendor.payments@icici before end of day.",
      destination: "internal_chat",
      policyName: "Relaxed - internal chat",
      daysAgo: 7,
      aiStatus: "fallback",
    },
    {
      title: "Public blog post code snippet",
      rawText: `// Configuration\nconst API_SECRET = "${fakeKey2}";\nconst IP = "192.168.1.100";`,
      destination: "public_post",
      policyName: "Strict - public posts",
      daysAgo: 6,
      aiStatus: "ok",
      aiSummary: "Critical production secrets embedded in draft intended for public distribution.",
    },
    {
      title: "Internal meeting minutes",
      rawText: "Met with Acme leadership to review quarterly deliverables. Follow up with team@example.com.",
      destination: "internal_chat",
      policyName: "Strict - public posts",
      daysAgo: 5,
      aiStatus: "fallback",
    },
    {
      title: "Claude assistant query",
      rawText: "Analyze this crash log from server 172.16.254.1 for user john.doe@example.com with password reset request.",
      destination: "ai_chatbot",
      policyName: "Default policy",
      daysAgo: 4,
      aiStatus: "ok",
      aiSummary: "Personal identifiers and internal IP addresses in chatbot prompt.",
    },
    {
      title: "Urgent refund notification",
      rawText: "Refunding order for card 4111 1111 1111 1111. Contact accounts@example.com or +91 98765 43210 for queries.",
      destination: "email_external",
      policyName: "Default policy",
      daysAgo: 3,
      aiStatus: "fallback",
    },
    {
      title: "Project Falcon status update",
      rawText: "Project Falcon milestone 3 completed ahead of schedule. Acme integration ongoing.",
      destination: "internal_chat",
      policyName: "Strict - public posts",
      daysAgo: 2,
      aiStatus: "ok",
      aiSummary: "Confidential internal project references detected.",
    },
    {
      title: "External contractor access",
      rawText: "Granted temporary access to server 192.168.2.55. Temporary password is TempPass#2026 for contractor.",
      destination: "email_external",
      policyName: "Default policy",
      daysAgo: 1,
      aiStatus: "fallback",
    },
    {
      title: "Marketing email campaign list",
      rawText: "Preview list includes subscriber sarah.smith@example.com and phone +1 555 432 1098.",
      destination: "email_external",
      policyName: "Default policy",
      daysAgo: 0,
      aiStatus: "ok",
      aiSummary: "Direct consumer contact identifiers detected in email blast copy.",
    },
  ];

  const now = Date.now();
  let createdScansCount = 0;

  for (const config of sampleScanConfigs) {
    const policyId = createdPolicies[config.policyName] || Object.values(createdPolicies)[0];
    const isStrict = config.policyName.includes("Strict");
    const customTerms = isStrict ? ["Project Falcon", "Acme"] : [];
    const strictness: Strictness = isStrict ? "strict" : config.policyName.includes("Relaxed") ? "relaxed" : "balanced";

    // Run pure detection and masking
    const matches = detectAll(config.rawText, ALL_CATEGORIES, customTerms);
    const { maskedText, findings } = maskText(config.rawText, matches);
    const { riskScore, riskLevel } = computeRiskScore(findings, config.destination, strictness);

    // Calculate timestamp with slight variation
    const createdAt = new Date(
      now - config.daysAgo * 24 * 60 * 60 * 1000 - (config.daysAgo * 137000 % 3600000)
    ).toISOString();

    let aiAnalysis = null;
    if (config.aiStatus === "ok") {
      aiAnalysis = {
        summary: config.aiSummary || "Sensitive items detected and reviewed for destination appropriateness.",
        safe_to_send: riskLevel === "low",
        destination_assessment: `Evaluated risks specifically for ${config.destination.replace("_", " ")}.`,
        recommended_actions: [
          "Ensure sensitive identifiers are redacted prior to sending",
          "Verify destination authorization for masked data types",
        ],
        risk_score: riskScore,
      };
    }

    const { error: scanError } = await supabase.from("scans").insert({
      user_id: userId,
      policy_id: policyId,
      title: config.title,
      destination: config.destination,
      masked_text: maskedText,
      findings,
      ai_analysis: aiAnalysis,
      ai_status: config.aiStatus,
      risk_score: riskScore,
      risk_level: riskLevel,
      created_at: createdAt,
    });

    if (scanError) {
      console.error("Error creating demo scan:", scanError.message);
    } else {
      createdScansCount++;
    }
  }

  // Print only demo user email and counts — never passwords, hashes or keys
  console.log(`Created demo user: ${DEMO_EMAIL}`);
  console.log(`Policies created: ${Object.keys(createdPolicies).length}`);
  console.log(`Scans created: ${createdScansCount}`);
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
