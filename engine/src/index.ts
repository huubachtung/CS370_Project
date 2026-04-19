/**
 * Type-safe Data Pipeline — Demo Entry Point
 *
 * Demonstrates:
 *   1. Successful pipeline execution with valid Vietnamese text
 *   2. Validation failure with invalid input
 *   3. Health check against the AI Service
 */

import { AIClient } from "./ai-client.js";
import { executePipeline } from "./pipeline.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function separator(title: string): void {
  console.log("\n" + "─".repeat(64));
  console.log(`  ${title}`);
  console.log("─".repeat(64) + "\n");
}

// ---------------------------------------------------------------------------
// Demo
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log("🚀 Type-safe Data Pipeline — Demo\n");

  const AI_SERVICE_URL =
    process.env["AI_SERVICE_URL"] ?? "http://localhost:8000";

  // ----- Health Check -----
  separator("1️⃣  Health Check");

  const client = new AIClient({ baseUrl: AI_SERVICE_URL });
  try {
    const health = await client.healthCheck();
    console.log("✅ AI Service is healthy:", health);
  } catch (err) {
    console.error(
      "❌ AI Service is not reachable. Make sure it is running on",
      AI_SERVICE_URL,
    );
    console.error("   Start it with: cd ai-service && python run.py\n");
    console.error("   Error:", err instanceof Error ? err.message : err);
    // Continue to show validation demo even if service is down
  }

  // ----- Valid Input -----
  separator("2️⃣  Valid Input — Vietnamese Sentiment");

  const result1 = await executePipeline(
    {
      text: "Tôi rất thích sản phẩm này, chất lượng tuyệt vời!",
      language: "vi",
    },
    { aiServiceUrl: AI_SERVICE_URL },
  );

  if (result1.success) {
    console.log("✅ Pipeline succeeded!");
    console.log("   Label:", result1.response.label);
    console.log("   Confidence:", (result1.response.confidence * 100).toFixed(2) + "%");
  } else {
    console.log("⚠️  Pipeline failed at stage:", result1.stage);
    console.log("   Error:", result1.error);
  }

  // ----- Another Valid Input -----
  separator("3️⃣  Valid Input — Another Example");

  const result2 = await executePipeline(
    {
      text: "Dịch vụ chăm sóc khách hàng rất tệ, tôi rất thất vọng.",
      language: "vi",
    },
    { aiServiceUrl: AI_SERVICE_URL },
  );

  if (result2.success) {
    console.log("✅ Pipeline succeeded!");
    console.log("   Label:", result2.response.label);
  } else {
    console.log("⚠️  Pipeline failed at stage:", result2.stage);
    console.log("   Error:", result2.error);
  }

  // ----- Invalid Input — should fail at validation -----
  separator("4️⃣  Invalid Input — Validation Failure Demo");

  const result3 = await executePipeline(
    {
      text: "",         // ← empty string: violates min_length=1
      language: "jp",   // ← invalid language: not "vi" | "en"
    },
    { aiServiceUrl: AI_SERVICE_URL },
  );

  if (!result3.success) {
    console.log("✅ Correctly caught validation error!");
    console.log("   Stage:", result3.stage);
    console.log("   Error:", result3.error);
  }

  // ----- Invalid Input — missing required field -----
  separator("5️⃣  Invalid Input — Missing Field Demo");

  const result4 = await executePipeline(
    { language: "vi" }, // ← missing "text" field
    { aiServiceUrl: AI_SERVICE_URL },
  );

  if (!result4.success) {
    console.log("✅ Correctly caught validation error!");
    console.log("   Stage:", result4.stage);
    console.log("   Error:", result4.error);
  }

  // ----- Summary -----
  separator("📋  Summary");
  console.log("  Ran 4 pipeline executions:");
  console.log("  • 2 valid inputs (Vietnamese text → AI inference)");
  console.log("  • 2 invalid inputs (caught at Zod validation)");
  console.log("  Pipeline enforces type safety at every boundary.\n");
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
