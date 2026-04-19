/**
 * AI Client — HTTP client for the Python AI Service.
 *
 * Uses native fetch (Node 18+) to call the FastAPI endpoints.
 * All responses are validated through Zod before being returned
 * to ensure type safety at the boundary.
 */

import {
  type PredictRequest,
  type PredictResponse,
  type HealthResponse,
  PredictResponseSchema,
  HealthResponseSchema,
} from "./schemas.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AIClientConfig {
  /** Base URL of the Python AI Service (default: http://localhost:8000) */
  baseUrl: string;
  /** Request timeout in milliseconds (default: 30_000) */
  timeoutMs: number;
}

export class AIClientError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly responseBody?: unknown,
  ) {
    super(message);
    this.name = "AIClientError";
  }
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export class AIClient {
  private readonly config: AIClientConfig;

  constructor(config?: Partial<AIClientConfig>) {
    this.config = {
      baseUrl: config?.baseUrl ?? "http://localhost:8000",
      timeoutMs: config?.timeoutMs ?? 30_000,
    };
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Call POST /predict on the AI Service.
   *
   * @param request - Validated PredictRequest payload
   * @returns Zod-validated PredictResponse
   * @throws AIClientError on network or validation failure
   */
  async predict(request: PredictRequest): Promise<PredictResponse> {
    const url = `${this.config.baseUrl}/predict`;

    const raw = await this.post(url, request);
    const parsed = PredictResponseSchema.safeParse(raw);

    if (!parsed.success) {
      throw new AIClientError(
        `AI Service returned invalid response: ${parsed.error.message}`,
        undefined,
        raw,
      );
    }

    return parsed.data;
  }

  /**
   * Call GET /health to check if the AI Service is up and the model loaded.
   *
   * @returns true if the service responds with status "ok"
   */
  async healthCheck(): Promise<HealthResponse> {
    const url = `${this.config.baseUrl}/health`;

    const response = await this.fetchWithTimeout(url, { method: "GET" });

    if (!response.ok) {
      throw new AIClientError(
        `Health check failed with status ${response.status}`,
        response.status,
      );
    }

    const raw = await response.json();
    const parsed = HealthResponseSchema.safeParse(raw);

    if (!parsed.success) {
      throw new AIClientError(
        `Health response invalid: ${parsed.error.message}`,
        undefined,
        raw,
      );
    }

    return parsed.data;
  }

  // -----------------------------------------------------------------------
  // Internals
  // -----------------------------------------------------------------------

  private async post(url: string, body: unknown): Promise<unknown> {
    const response = await this.fetchWithTimeout(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      let errorBody: unknown;
      try {
        errorBody = await response.json();
      } catch {
        errorBody = await response.text();
      }
      throw new AIClientError(
        `AI Service returned ${response.status}: ${JSON.stringify(errorBody)}`,
        response.status,
        errorBody,
      );
    }

    return response.json();
  }

  private async fetchWithTimeout(
    url: string,
    init: RequestInit,
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      this.config.timeoutMs,
    );

    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        throw new AIClientError(
          `Request to ${url} timed out after ${this.config.timeoutMs}ms`,
        );
      }
      throw new AIClientError(
        `Network error calling ${url}: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
