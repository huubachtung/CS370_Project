/**
 * messenger.adapter.ts — Facebook Messenger Webhook
 *
 * Docs: https://developers.facebook.com/docs/messenger-platform/webhooks
 *
 * Raw payload:
 * {
 *   "object": "page",
 *   "entry": [{
 *     "messaging": [{
 *       "sender":    { "id": "USER_ID" },
 *       "recipient": { "id": "PAGE_ID" },
 *       "timestamp": 1716200000000,
 *       "message": { "mid": "mid.xxx", "text": "Sản phẩm tốt không?" }
 *     }]
 *   }]
 * }
 */

import { z } from "zod";
import { type AdapterResult } from "./normalized.js";
import { NormalizedMessageSchema } from "./normalized.js";

// ---------------------------------------------------------------------------
// Raw payload schema — validates Messenger webhook structure
// ---------------------------------------------------------------------------

const MessengerPayloadSchema = z.object({
  object: z.string(),
  entry: z.array(
    z.object({
      messaging: z.array(
        z.object({
          sender:    z.object({ id: z.string() }),
          recipient: z.object({ id: z.string() }),
          timestamp: z.number(),
          message: z.object({
            mid:  z.string(),
            text: z.string().optional(), // absent for stickers / attachments
          }),
        })
      ),
    })
  ),
});

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export class MessengerAdapter implements IMessageAdapter {
  readonly platform = "messenger";

  normalize(rawPayload: unknown): AdapterResult {
    // Step 1 — validate raw structure
    const parsed = MessengerPayloadSchema.safeParse(rawPayload);
    if (!parsed.success) {
      return {
        success: false,
        error: "Payload does not match Messenger webhook format.",
        details: parsed.error.issues,
      };
    }

    // Step 2 — extract first messaging event (batch webhooks → take first)
    const event = parsed.data.entry[0]?.messaging[0];
    if (!event) {
      return { success: false, error: "Messenger payload contains no messaging events." };
    }

    // Step 3 — text-only messages; skip stickers / images / templates
    const text = event.message.text;
    if (!text) {
      return { success: false, error: "Messenger message has no text (sticker or attachment)." };
    }

    // Step 4 — build NormalizedMessage
    const normalized = NormalizedMessageSchema.safeParse({
      message_id:  event.message.mid,
      platform:    "messenger",
      sender_id:   event.sender.id,
      text,
      language:    "vi",
      timestamp:   event.timestamp,
      raw_payload: rawPayload,
    });

    if (!normalized.success) {
      return {
        success: false,
        error: "Failed to build NormalizedMessage from Messenger payload.",
        details: normalized.error.issues,
      };
    }

    return { success: true, data: normalized.data };
  }
}