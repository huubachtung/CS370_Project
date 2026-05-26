/**
 * telegram.adapter.ts — Telegram Bot API Update
 *
 * Docs: https://core.telegram.org/bots/api#update
 *
 * Raw payload:
 * {
 *   "update_id": 987654321,
 *   "message": {
 *     "message_id": 42,
 *     "from": { "id": 123456789, "first_name": "Minh", "last_name": "Trần" },
 *     "chat": { "id": 123456789, "type": "private" },
 *     "date": 1716200000,        ← UNIX SECONDS, not milliseconds
 *     "text": "Phân tích câu này"
 *   }
 * }
 *
 * Notable differences from other platforms:
 *   • date is Unix seconds — must multiply by 1000 for ms
 *   • sender id is a number — must be converted to string
 *   • sender name split across first_name / last_name
 *   • update may not contain a message field (callback_query, inline_query…)
 */

import { z } from "zod";
import { type AdapterResult } from "./normalized.js";
import { NormalizedMessageSchema } from "./normalized.js";

// ---------------------------------------------------------------------------
// Raw payload schema
// ---------------------------------------------------------------------------

const TelegramPayloadSchema = z.object({
  update_id: z.number(),
  message: z
    .object({
      message_id: z.number(),
      from: z.object({
        id:         z.number(), // Telegram uses numeric IDs
        first_name: z.string(),
        last_name:  z.string().optional(),
        username:   z.string().optional(),
      }),
      chat: z.object({ id: z.number(), type: z.string() }),
      date: z.number(), // Unix seconds
      text: z.string().optional(),
    })
    .optional(), // update_id may arrive without a message (callbacks, polls…)
});

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export class TelegramAdapter implements IMessageAdapter {
  readonly platform = "telegram";

  normalize(rawPayload: unknown): AdapterResult {
    // Step 1 — validate raw structure
    const parsed = TelegramPayloadSchema.safeParse(rawPayload);
    if (!parsed.success) {
      return {
        success: false,
        error: "Payload does not match Telegram Bot update format.",
        details: parsed.error.issues,
      };
    }

    // Step 2 — ensure this update carries a message
    const msg = parsed.data.message;
    if (!msg) {
      return {
        success: false,
        error: "Telegram update has no message field (may be a callback_query or inline_query).",
      };
    }

    // Step 3 — text-only
    const text = msg.text;
    if (!text) {
      return { success: false, error: "Telegram message has no text (photo, sticker, or document)." };
    }

    // Step 4 — build sender_name from first_name + optional last_name
    const senderName = [msg.from.first_name, msg.from.last_name]
      .filter(Boolean)
      .join(" ") || undefined;

    // Step 5 — convert Telegram Unix seconds → milliseconds
    const timestamp = msg.date * 1000;

    // Step 6 — build NormalizedMessage
    const normalized = NormalizedMessageSchema.safeParse({
      message_id:  `${parsed.data.update_id}_${msg.message_id}`,
      platform:    "telegram",
      sender_id:   String(msg.from.id), // number → string
      sender_name: senderName,
      text,
      language:    "vi",
      timestamp,
      raw_payload: rawPayload,
    });

    if (!normalized.success) {
      return {
        success: false,
        error: "Failed to build NormalizedMessage from Telegram payload.",
        details: normalized.error.issues,
      };
    }

    return { success: true, data: normalized.data };
  }
}