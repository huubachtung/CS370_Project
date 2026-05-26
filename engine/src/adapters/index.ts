/**
 * adapters/index.ts — Public API
 *
 * Import từ đây, không cần biết cấu trúc bên trong:
 *
 *   import { AdapterRegistry, type NormalizedMessage } from "./adapters/index.js";
 */

export type { NormalizedMessage, Platform } from "./normalized.js";
export { NormalizedMessageSchema, PlatformEnum } from "./normalized.js";

export type { AdapterResult } from "./normalized.js";

export { MessengerAdapter } from "./messenger.adapter.js";
export { ZaloAdapter }      from "./zalo.adapter.js";
export { TelegramAdapter }  from "./telegram.adapter.js";

export { AdapterRegistry }  from "./registry.js";
export type { PipelineInput } from "./registry.js";