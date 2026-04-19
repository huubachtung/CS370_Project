/**
 * Pipeline Orchestrator — the core of the TypeScript engine.
 *
 * executePipeline(input) performs:
 *   1. Validate  — parse raw input through Zod schema
 *   2. Call AI   — send validated request to Python AI Service
 *   3. Log       — structured logging of the full pipeline run
 *
 * Returns a discriminated union (PipelineResult) so callers can
 * handle success / failure in a type-safe way.
 */

import { AIClient, AIClientError } from "./ai-client.js";
import {
  type PredictRequest,
  type PredictResponse,
  validateRequest,
} from "./schemas.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PipelineSuccess {
  success: true;
  /** Validated input that was sent to the AI Service */
  request: PredictRequest;
  /** Zod-validated response from the AI Service */
  response: PredictResponse;
  /** Metadata about the pipeline execution */
  meta: PipelineMeta;
}

export interface PipelineFailure {
  success: false;
  /** Which stage failed */
  stage: "validation" | "ai-call" | "unknown";
  /** Human-readable error message */
  error: string;
  /** Detailed error information */
  details?: unknown;
  /** Metadata about the pipeline execution */
  meta: PipelineMeta;
}

export interface PipelineMeta {
  /** ISO-8601 timestamp when the pipeline started */
  startedAt: string;
  /** Total pipeline execution time in ms */
  durationMs: number;
  /** AI Service base URL used */
  serviceUrl: string;
}

export type PipelineResult = PipelineSuccess | PipelineFailure;

export interface PipelineConfig {
  /** Base URL of the AI Service */
  aiServiceUrl: string;
  /** Whether to print structured logs to console */
  verbose: boolean;
}

// ---------------------------------------------------------------------------
// Default config
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG: PipelineConfig = {
  aiServiceUrl: "http://localhost:8000",
  verbose: true,
};

// ---------------------------------------------------------------------------
// Logger
// ---------------------------------------------------------------------------

function log(
  level: "INFO" | "ERROR" | "DEBUG",
  stage: string,
  message: string,
  data?: unknown,
): void {
  const timestamp = new Date().toISOString();
  const prefix = `${timestamp} | ${level.padEnd(5)} | ${stage.padEnd(12)} |`;
  console.log(`${prefix} ${message}`);
  if (data !== undefined) {
    console.log(
      `${" ".repeat(prefix.length)} ${JSON.stringify(data, null, 2)}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

/**
 * Execute the full pipeline: Validate → Call AI → Log Result.
 *
 * @param input   - Raw, unvalidated input (could be anything)
 * @param config  - Optional pipeline configuration
 * @returns       - Discriminated union: PipelineSuccess | PipelineFailure
 *
 * @example
 * ```ts
 * const result = await executePipeline({
 *   text: "Tôi rất thích sản phẩm này",
 *   language: "vi",
 * });
 *
 * if (result.success) {
 *   console.log(result.response.label);       // "positive"
 *   console.log(result.response.confidence);   // 0.87
 * } else {
 *   console.error(result.error);
 * }
 * ```
 */
export async function executePipeline(
  input: unknown,
  config?: Partial<PipelineConfig>,
): Promise<PipelineResult> {
  const cfg: PipelineConfig = { ...DEFAULT_CONFIG, ...config };
  const startTime = performance.now();
  const startedAt = new Date().toISOString();

  const makeMeta = (): PipelineMeta => ({
    startedAt,
    durationMs: Math.round(performance.now() - startTime),
    serviceUrl: cfg.aiServiceUrl,
  });

  // -----------------------------------------------------------------------
  // Stage 1: VALIDATE
  // -----------------------------------------------------------------------
  if (cfg.verbose) log("INFO", "VALIDATE", "Validating input with Zod schema …");

  const validation = validateRequest(input);

  if (!validation.success) {
    const errorMsg = validation.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");

    if (cfg.verbose) log("ERROR", "VALIDATE", `Validation failed: ${errorMsg}`);

    return {
      success: false,
      stage: "validation",
      error: `Input validation failed: ${errorMsg}`,
      details: validation.error.issues,
      meta: makeMeta(),
    };
  }

  const request = validation.data;
  if (cfg.verbose) {
    log("INFO", "VALIDATE", "✅ Input valid", {
      text: request.text.slice(0, 80) + (request.text.length > 80 ? "…" : ""),
      language: request.language,
    });
  }

  // -----------------------------------------------------------------------
  // Stage 2: CALL AI SERVICE
  // -----------------------------------------------------------------------
  if (cfg.verbose) log("INFO", "AI-CALL", `Calling ${cfg.aiServiceUrl}/predict …`);

  const client = new AIClient({ baseUrl: cfg.aiServiceUrl });

  let response: PredictResponse;
  try {
    response = await client.predict(request);
  } catch (err) {
    const errorMsg =
      err instanceof AIClientError
        ? err.message
        : err instanceof Error
          ? err.message
          : String(err);

    if (cfg.verbose) log("ERROR", "AI-CALL", `AI Service call failed: ${errorMsg}`);

    return {
      success: false,
      stage: "ai-call",
      error: `AI Service call failed: ${errorMsg}`,
      details: err instanceof AIClientError ? err.responseBody : undefined,
      meta: makeMeta(),
    };
  }

  if (cfg.verbose) {
    log("INFO", "AI-CALL", "✅ Response received", {
      label: response.label,
      confidence: response.confidence,
      processing_time_ms: response.processing_time_ms,
    });
  }

  // -----------------------------------------------------------------------
  // Stage 3: LOG RESULT
  // -----------------------------------------------------------------------
  const meta = makeMeta();

  if (cfg.verbose) {
    log("INFO", "RESULT", "Pipeline completed successfully");
    console.log("");
    console.log("╔══════════════════════════════════════════════════════════════╗");
    console.log("║                    📊 PIPELINE RESULT                       ║");
    console.log("╠══════════════════════════════════════════════════════════════╣");
    console.log(`║  Input:       ${response.input_text.slice(0, 45).padEnd(45)} ║`);
    console.log(`║  Segmented:   ${response.segmented_text.slice(0, 45).padEnd(45)} ║`);
    console.log(`║  Tokens:      ${response.tokens.length.toString().padEnd(45)} ║`);
    console.log(`║  Label:       ${response.label.padEnd(45)} ║`);
    console.log(`║  Confidence:  ${(response.confidence * 100).toFixed(2).padStart(6)}%${" ".repeat(38)} ║`);
    console.log(`║  AI Time:     ${response.processing_time_ms.toFixed(1).padStart(8)} ms${" ".repeat(33)} ║`);
    console.log(`║  Total Time:  ${meta.durationMs.toString().padStart(8)} ms${" ".repeat(33)} ║`);
    console.log("╚══════════════════════════════════════════════════════════════╝");
    console.log("");
  }

  return {
    success: true,
    request,
    response,
    meta,
  };
}
