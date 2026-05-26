/**
 * normalized.ts — Canonical Message Format
 *
 * "Ngôn ngữ chung" mà mọi platform phải được chuyển đổi sang.
 *
 * Sau khi normalize, adapter trả về một NormalizedMessage.
 * Pipeline nhận NormalizedMessage và build thành PredictRequest
 * (text + language) để đưa vào executePipeline().
 *
 * ─── Mối quan hệ với schemas.ts ──────────────────────────────
 *  NormalizedMessage.text      → PredictRequest.text
 *  NormalizedMessage.language  → PredictRequest.language
 *  Các field còn lại (platform, sender_id…) là metadata —
 *  pipeline.ts không dùng chúng để gọi AI, nhưng có thể log.
 */

import { z } from "zod";

export const PlatformEnum = z.enum(["messenger", "zalo", "telegram", "raw"]);
export type Platform = z.infer<typeof PlatformEnum>;

export const NormalizedMessageSchema = z.object({
  /** ID duy nhất của message */
  message_id: z.string(),

  /** Platform nguồn */
  platform: PlatformEnum,

  /** ID người gửi */
  sender_id: z.string(),

  /** Tên hiển thị (nếu platform cung cấp) */
  sender_name: z.string().optional(),

  /**
   * Nội dung văn bản — sẽ được map sang PredictRequest.text.
   * Áp dụng cùng ràng buộc với PredictRequestSchema để lỗi
   * được bắt sớm tại adapter thay vì chờ đến Zod trong pipeline.
   */
  text: z
    .string()
    .min(1, "text must contain at least 1 character")
    .max(5000, "text must not exceed 5000 characters")
    .transform((v) => v.trim())
    .refine((v) => v.length > 0, "text must contain non-whitespace characters"),

  /** Ngôn ngữ — map sang PredictRequest.language */
  language: z.enum(["vi", "en"]).default("vi"),

  /** Unix timestamp milliseconds */
  timestamp: z.number(),

  /** Raw payload gốc giữ lại để debug */
  raw_payload: z.unknown().optional(),
});

export type NormalizedMessage = z.infer<typeof NormalizedMessageSchema>;

// ---------------------------------------------------------------------------
// AdapterResult — return type for all adapter normalize() methods
// ---------------------------------------------------------------------------

export type AdapterResult =
  | { success: true;  data: NormalizedMessage }
  | { success: false; error: string; details?: unknown };
