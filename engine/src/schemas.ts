/**
 * Zod Schemas — mirrors the Pydantic schemas in ai-service/app/schemas.py
 *
 * ⚠️  IMPORTANT: Any changes to these schemas MUST be synchronised with
 *    the Pydantic models in the Python AI Service to maintain type safety
 *    across the TypeScript ↔ Python boundary.
 *
 * The Pydantic schemas are the SOURCE OF TRUTH.
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

/** Supported languages — mirrors Python `Language(str, Enum)` */
export const LanguageEnum = z.enum(["vi", "en"]);
export type Language = z.infer<typeof LanguageEnum>;

/** Sentiment labels — mirrors Python `SentimentLabel(str, Enum)` */
export const SentimentLabelEnum = z.enum(["positive", "negative", "neutral"]);
export type SentimentLabel = z.infer<typeof SentimentLabelEnum>;

// ---------------------------------------------------------------------------
// Request Schema
// ---------------------------------------------------------------------------

/**
 * PredictRequestSchema
 *
 * Mirrors: `PredictRequest(BaseModel)` in schemas.py
 *
 * Fields:
 *   - text:     string, 1–5000 chars, trimmed, non-blank
 *   - language: "vi" | "en", defaults to "vi"
 */
export const PredictRequestSchema = z.object({
  text: z
    .string()
    .min(1, "text must contain at least 1 character")
    .max(5000, "text must not exceed 5000 characters")
    .transform((v) => v.trim())
    .refine((v) => v.length > 0, "text must contain non-whitespace characters"),

  language: LanguageEnum.default("vi"),
});

export type PredictRequest = z.infer<typeof PredictRequestSchema>;

// ---------------------------------------------------------------------------
// Response Schema
// ---------------------------------------------------------------------------

/**
 * PredictResponseSchema
 *
 * Mirrors: `PredictResponse(BaseModel)` in schemas.py
 *
 * Fields:
 *   - input_text:         string  — echo of the original input
 *   - segmented_text:     string  — after word segmentation
 *   - tokens:             string[] — list of segmented tokens
 *   - label:              SentimentLabel
 *   - confidence:         number  — 0..1
 *   - processing_time_ms: number  — ≥ 0
 */
export const PredictResponseSchema = z.object({
  input_text: z.string(),
  segmented_text: z.string(),
  tokens: z.array(z.string()),
  label: SentimentLabelEnum,
  confidence: z.number().min(0).max(1),
  processing_time_ms: z.number().min(0),
});

export type PredictResponse = z.infer<typeof PredictResponseSchema>;

// ---------------------------------------------------------------------------
// Health Schema
// ---------------------------------------------------------------------------

export const HealthResponseSchema = z.object({
  status: z.string(),
  model_loaded: z.boolean(),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;

// ---------------------------------------------------------------------------
// Validation Helpers
// ---------------------------------------------------------------------------

/**
 * Validate raw input as a PredictRequest.
 * Returns a discriminated union for type-safe error handling.
 */
export function validateRequest(input: unknown):
  | { success: true; data: PredictRequest }
  | { success: false; error: z.ZodError } {
  const result = PredictRequestSchema.safeParse(input);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Validate raw JSON as a PredictResponse.
 * Ensures the AI service returned data matching our contract.
 */
export function validateResponse(input: unknown):
  | { success: true; data: PredictResponse }
  | { success: false; error: z.ZodError } {
  const result = PredictResponseSchema.safeParse(input);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}
