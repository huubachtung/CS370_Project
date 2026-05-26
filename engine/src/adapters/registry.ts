/**
 * registry.ts — Adapter Registry
 *
 * Cổng vào duy nhất của adapters module.
 *
 * ─── Tích hợp với executePipeline() ─────────────────────────
 * executePipeline() trong pipeline.ts nhận:
 *   (input: unknown, config?: Partial<PipelineConfig>)
 *
 * AdapterRegistry.toPipelineInput() nhận một NormalizedMessage
 * và trả về đúng shape { text, language } mà executePipeline
 * mong đợi — không cần sửa pipeline.ts.
 *
 * Cách dùng điển hình (ví dụ trong một webhook handler):
 *
 *   const registry = new AdapterRegistry();
 *
 *   // 1. Normalize raw webhook payload
 *   const adapted = registry.normalize("zalo", req.body);
 *   if (!adapted.success) { return res.status(400).json({ error: adapted.error }); }
 *
 *   // 2. Convert sang input shape cho executePipeline
 *   const pipelineInput = registry.toPipelineInput(adapted.data);
 *
 *   // 3. Chạy pipeline như bình thường — không thay đổi gì ở pipeline.ts
 *   const result = await executePipeline(pipelineInput, { aiServiceUrl });
 */

import { type AdapterResult } from "./normalized.js";
import { type NormalizedMessage, type Platform }     from "./normalized.js";
import { MessengerAdapter }                          from "./messenger.adapter.js";
import { ZaloAdapter }                               from "./zalo.adapter.js";
import { TelegramAdapter }                           from "./telegram.adapter.js";

/** Shape executePipeline() expects as its first argument */
export interface PipelineInput {
  text:     string;
  language: "vi" | "en";
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export class AdapterRegistry {
  private readonly adapters = new Map<string, IMessageAdapter>();

  constructor() {
    this.register(new MessengerAdapter());
    this.register(new ZaloAdapter());
    this.register(new TelegramAdapter());
  }

  private register(adapter: IMessageAdapter): void {
    this.adapters.set(adapter.platform, adapter);
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Normalize a raw webhook payload from the given platform.
   *
   * Returns AdapterResult — never throws.
   * On failure, AdapterResult.error describes what went wrong.
   */
  normalize(platform: Platform, rawPayload: unknown): AdapterResult {
    const adapter = this.adapters.get(platform);

    if (!adapter) {
      return {
        success: false,
        error: `Platform "${platform}" is not supported. Available: ${this.getSupportedPlatforms().join(", ")}.`,
      };
    }

    return adapter.normalize(rawPayload);
  }

  /**
   * Convert a NormalizedMessage into the { text, language } shape
   * that executePipeline() accepts as its `input` argument.
   *
   * This is the bridge between adapters and the existing pipeline —
   * no changes to pipeline.ts required.
   */
  toPipelineInput(message: NormalizedMessage): PipelineInput {
    return {
      text:     message.text,
      language: message.language,
    };
  }

  /** List all registered platform names */
  getSupportedPlatforms(): string[] {
    return [...this.adapters.keys()];
  }
}