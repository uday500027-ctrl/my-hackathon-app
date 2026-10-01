import { z } from "zod";

// ─── Register ─────────────────────────────────────────────────────────────────

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(60, "Name must be at most 60 characters"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Please enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be at most 72 characters")
    .regex(
      /^(?=.*[a-zA-Z])(?=.*\d)/,
      "Password must contain at least one letter and one number"
    ),
});

export type RegisterInput = z.infer<typeof registerSchema>;

// ─── Login ────────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

// ─── Policies ─────────────────────────────────────────────────────────────────

export const POLICY_CATEGORIES = [
  "email",
  "phone",
  "aadhaar",
  "pan",
  "upi_id",
  "card",
  "api_key",
  "ip_address",
  "password",
] as const;

export const policyCategorySchema = z.enum(POLICY_CATEGORIES);
export type PolicyCategory = z.infer<typeof policyCategorySchema>;

export const STRICTNESS_OPTIONS = ["relaxed", "balanced", "strict"] as const;
export const policyStrictnessSchema = z.enum(STRICTNESS_OPTIONS);
export type PolicyStrictness = z.infer<typeof policyStrictnessSchema>;

export const createPolicySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Policy name is required")
    .max(80, "Policy name must be at most 80 characters"),
  enabled_categories: z
    .array(policyCategorySchema)
    .min(1, "At least one category must be enabled")
    .transform((cats) => Array.from(new Set(cats))),
  custom_terms: z
    .array(
      z
        .string()
        .trim()
        .min(2, "Custom term must be between 2 and 50 characters")
        .max(50, "Custom term must be between 2 and 50 characters")
    )
    .max(20, "At most 20 custom terms allowed")
    .optional()
    .default([])
    .transform((terms) => {
      const seen = new Set<string>();
      const result: string[] = [];
      for (const t of terms) {
        const lower = t.toLowerCase();
        if (!seen.has(lower)) {
          seen.add(lower);
          result.push(t);
        }
      }
      return result;
    }),
  strictness: policyStrictnessSchema.default("balanced"),
  is_default: z.boolean().optional().default(false),
});

export type CreatePolicyInput = z.infer<typeof createPolicySchema>;

export const updatePolicySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Policy name is required")
    .max(80, "Policy name must be at most 80 characters")
    .optional(),
  enabled_categories: z
    .array(policyCategorySchema)
    .min(1, "At least one category must be enabled")
    .transform((cats) => Array.from(new Set(cats)))
    .optional(),
  custom_terms: z
    .array(
      z
        .string()
        .trim()
        .min(2, "Custom term must be between 2 and 50 characters")
        .max(50, "Custom term must be between 2 and 50 characters")
    )
    .max(20, "At most 20 custom terms allowed")
    .transform((terms) => {
      const seen = new Set<string>();
      const result: string[] = [];
      for (const t of terms) {
        const lower = t.toLowerCase();
        if (!seen.has(lower)) {
          seen.add(lower);
          result.push(t);
        }
      }
      return result;
    })
    .optional(),
  strictness: policyStrictnessSchema.optional(),
  is_default: z.boolean().optional(),
});

export type UpdatePolicyInput = z.infer<typeof updatePolicySchema>;
