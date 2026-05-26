/**
 * zalo.adapter.ts — Zalo Official Account Webhook
 *
 * Docs: https://developers.zalo.me/docs/api/official-account-api/webhook
 *
 * Raw payload:
 * {
 *   "event_name": "user_send_text",
 *   "timestamp":  "1716200000000",       ← STRING, not number
 *   "sender":    { "id": "ZALO_USER_ID", "display_name": "Nguyễn Văn A" },
 *   "recipient": { "id": "OA_ID" },
 *   "message":   { "msg_id": "msg_abc", "text": "Giao hàng mấy ngày?" }
 * }
 *
 * Notable differences from other platforms:
 *   • timestamp is a string — must be coerced to number
 *   • sender has display_name (→ sender_name)
 *   • only "user_send_text" events carry text; others (images, stickers) are skipped
 */

import { z } from "zod";
import { type AdapterResult } from "./normalized.js";
import { NormalizedMessageSchema } from "./normalized.js";

// ---------------------------------------------------------------------------
// Raw payload schema
// ---------------------------------------------------------------------------

const ZaloPayloadSchema = z.object({
  event_name: z.string(),
  timestamp:  z.string(), // Zalo sends timestamp as string
  sender: z.object({
    id:           z.string(),
    display_name: z.string().optional(),
  }),
  recipient: z.object({ id: z.string() }),
  message: z.object({
    msg_id: z.string(),
    text:   z.string().optional(),
  }),
});

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export class ZaloAdapter implements IMessageAdapter {
  readonly platform = "zalo";

  normalize(rawPayload: unknown): AdapterResult {
    // Step 1 — validate raw structure
    const parsed = ZaloPayloadSchema.safeParse(rawPayload);
    if (!parsed.success) {
      return {
        success: false,
        error: "Payload does not match Zalo OA webhook format.",
        details: parsed.error.issues,
      };
    }

    // Step 2 — only handle text events; ignore images, stickers, files
    if (parsed.data.event_name !== "user_send_text") {
      return {
        success: false,
        error: `Zalo event "${parsed.data.event_name}" is not a text message — skipping.`,
      };
    }

    // Step 3 — check text
    const text = parsed.data.message.text;
    if (!text) {
      return { success: false, error: "Zalo message has no text content." };
    }

    // Step 4 — coerce Zalo string timestamp → number
    const timestamp = Number(parsed.data.timestamp);
    if (isNaN(timestamp)) {
      return {
        success: false,
        error: `Invalid Zalo timestamp: "${parsed.data.timestamp}"`,
      };
    }

    // Step 5 — build NormalizedMessage
    const normalized = NormalizedMessageSchema.safeParse({
      message_id:  parsed.data.message.msg_id,
      platform:    "zalo",
      sender_id:   parsed.data.sender.id,
      sender_name: parsed.data.sender.display_name,
      text,
      language:    "vi",
      timestamp,
      raw_payload: rawPayload,
    });

    if (!normalized.success) {
      return {
        success: false,
        error: "Failed to build NormalizedMessage from Zalo payload.",
        details: normalized.error.issues,
      };
    }

    return { success: true, data: normalized.data };
  }
}