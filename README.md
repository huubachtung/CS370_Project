# Type-safe Data Pipeline — TypeScript ↔ Python

A **type-safe** data pipeline combining a TypeScript orchestration engine
(Zod + Node.js) with a Python AI service (FastAPI + PhoBERT) for Vietnamese
text analysis.

```
┌─────────────────────────────┐       HTTP        ┌─────────────────────────────┐
│     Engine (TypeScript)     │  ──────────────▶   │   AI Service (Python)       │
│                             │                    │                             │
│  Input ─▶ Zod Validate      │   POST /predict    │  Pydantic Validate          │
│        ─▶ AI Client ────────│───────────────────▶│  ─▶ PyVi Segmentation       │
│        ─▶ Log Result  ◀─────│───────────────────◁│  ─▶ PhoBERT Inference       │
│                             │   JSON Response    │  ─▶ Return Prediction       │
└─────────────────────────────┘                    └─────────────────────────────┘
```

---

## 📁 Project Structure

```
├── engine/                     # TypeScript Service (Node.js)
│   ├── src/
│   │   ├── schemas.ts          # Zod schemas (mirrors Pydantic)
│   │   ├── ai-client.ts        # HTTP client for the AI Service
│   │   ├── pipeline.ts         # executePipeline orchestrator
│   │   └── index.ts            # Demo entry point
│   ├── package.json
│   └── tsconfig.json
│
├── ai-service/                 # Python Service (FastAPI)
│   ├── app/
│   │   ├── schemas.py          # Pydantic schemas (source of truth)
│   │   ├── segmentation.py     # PyVi Vietnamese word segmentation
│   │   ├── model.py            # PhoBERT model loading & inference
│   │   └── main.py             # FastAPI app with endpoints
│   ├── requirements.txt
│   └── run.py                  # Uvicorn runner
│
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites

| Tool          | Version  | Notes                          |
| ------------- | -------- | ------------------------------ |
| **Node.js**   | ≥ 18     | For native `fetch` support     |
| **Python**    | ≥ 3.10   | For FastAPI + type hints       |
| **pip**       | latest   | Python package manager         |

---

### Step 1 — Start the Python AI Service

```bash
# 1. Navigate to the AI service directory
cd ai-service

# 2. Create a virtual environment (recommended)
python -m venv .venv
source .venv/bin/activate        # macOS / Linux
# .venv\Scripts\activate         # Windows

# 3. Install dependencies
pip install -r requirements.txt

# 4. Start the server
python run.py
# Server runs on http://localhost:8000
```

> ⚠️ **First run** will download `vinai/phobert-base` (~540 MB) from HuggingFace.

Verify:

```bash
curl http://localhost:8000/health
# {"status":"ok","model_loaded":true}
```

---

### Step 2 — Run the TypeScript Engine

```bash
# 1. Navigate to the engine directory
cd engine

# 2. Install dependencies
npm install

# 3. Run the demo pipeline
npm start
# or: npx tsx src/index.ts
```

The demo will:
1. Health-check the AI service
2. Send valid Vietnamese text through the pipeline
3. Demonstrate Zod validation failures with invalid inputs

---

## 🔌 API Contract

### `POST /predict`

**Request:**

```json
{
  "text": "Tôi rất thích sản phẩm này",
  "language": "vi"
}
```

| Field      | Type              | Required | Default | Validation           |
| ---------- | ----------------- | -------- | ------- | -------------------- |
| `text`     | `string`          | ✅       | —       | 1–5000 chars, trimmed |
| `language` | `"vi"` \| `"en"`  | ❌       | `"vi"`  | Enum                 |

**Response:**

```json
{
  "input_text": "Tôi rất thích sản phẩm này",
  "segmented_text": "Tôi rất thích sản_phẩm này",
  "tokens": ["Tôi", "rất", "thích", "sản_phẩm", "này"],
  "label": "positive",
  "confidence": 0.8742,
  "processing_time_ms": 45.32
}
```

### `GET /health`

```json
{
  "status": "ok",
  "model_loaded": true
}
```

---

## 🔒 Schema Synchronisation

The data contract is defined in **two places** that must stay in sync:

| Source of Truth (Python)          | Mirror (TypeScript)                 |
| --------------------------------- | ----------------------------------- |
| `ai-service/app/schemas.py`      | `engine/src/schemas.ts`             |
| `PredictRequest(BaseModel)`      | `PredictRequestSchema = z.object()` |
| `PredictResponse(BaseModel)`     | `PredictResponseSchema = z.object()` |
| `Language(str, Enum)`            | `LanguageEnum = z.enum()`           |
| `SentimentLabel(str, Enum)`      | `SentimentLabelEnum = z.enum()`     |

**Rules:**
1. Python Pydantic models are the **source of truth**
2. Any field change in Python **must** be mirrored in the Zod schema
3. Both sides validate independently — **double validation** ensures safety

---

## 🏗️ Architecture Details

### Pipeline Flow (`executePipeline`)

```
Input (unknown)
    │
    ▼
┌─────────────────┐
│  1. VALIDATE    │  ← Zod schema parse
│  (fail fast)    │     Bad input → PipelineFailure{stage: "validation"}
└────────┬────────┘
         │ PredictRequest
         ▼
┌─────────────────┐
│  2. CALL AI     │  ← HTTP POST to Python service
│  (fetch)        │     Network error → PipelineFailure{stage: "ai-call"}
└────────┬────────┘
         │ PredictResponse (Zod-validated)
         ▼
┌─────────────────┐
│  3. LOG RESULT  │  ← Structured console output
│  (return)       │     → PipelineSuccess{request, response, meta}
└─────────────────┘
```

### AI Service Flow (`POST /predict`)

```
JSON Body
    │
    ▼
┌─────────────────┐
│ Pydantic Parse  │  ← Auto-validation by FastAPI
└────────┬────────┘
         │ PredictRequest
         ▼
┌─────────────────┐
│ Word Segment    │  ← PyVi ViTokenizer
│ (segmentation)  │     "sản phẩm" → "sản_phẩm"
└────────┬────────┘
         │ segmented text
         ▼
┌─────────────────┐
│ PhoBERT         │  ← Tokenise → Encode → CLS pool → Classify
│ (model.py)      │     → label + confidence
└────────┬────────┘
         │
         ▼
    PredictResponse (JSON)
```

---

## 🐳 Docker (Optional)

If you prefer containerised deployment, create a `docker-compose.yml`:

```yaml
version: "3.9"

services:
  ai-service:
    build: ./ai-service
    ports:
      - "8000:8000"
    environment:
      - TRANSFORMERS_CACHE=/app/.cache
    volumes:
      - model-cache:/app/.cache

  engine:
    build: ./engine
    depends_on:
      - ai-service
    environment:
      - AI_SERVICE_URL=http://ai-service:8000

volumes:
  model-cache:
```

---

## 📝 Environment Variables

| Variable           | Service | Default                  | Description                     |
| ------------------ | ------- | ------------------------ | ------------------------------- |
| `AI_SERVICE_URL`   | Engine  | `http://localhost:8000`  | URL of the Python AI Service    |
| `HOST`             | AI      | `0.0.0.0`               | Bind host                       |
| `PORT`             | AI      | `8000`                   | Bind port                       |

---

## License

MIT
