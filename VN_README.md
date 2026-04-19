# Type-safe Data Pipeline — TypeScript ↔ Python

Một **type-safe** data pipeline kết hợp engine điều phối bằng TypeScript
(Zod + Node.js) với dịch vụ AI bằng Python (FastAPI + PhoBERT) nhằm 
phân tích văn bản tiếng Việt.

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

## 📁 Cấu trúc Dự án (Project Structure)

```
├── engine/                     # Dịch vụ TypeScript (Node.js)
│   ├── src/
│   │   ├── schemas.ts          # Zod schemas (ánh xạ từ Pydantic)
│   │   ├── ai-client.ts        # HTTP client gửi tới Dịch vụ AI
│   │   ├── pipeline.ts         # executePipeline điều phối (orchestrator)
│   │   └── index.ts            # Điểm bắt đầu Demo
│   ├── package.json
│   └── tsconfig.json
│
├── ai-service/                 # Dịch vụ Python (FastAPI)
│   ├── app/
│   │   ├── schemas.py          # Pydantic schemas (nguồn chân lý - source of truth)
│   │   ├── segmentation.py     # PyVi tách từ tiếng Việt
│   │   ├── model.py            # Load mô hình PhoBERT & suy luận
│   │   └── main.py             # Ứng dụng FastAPI kèm các endpoint
│   ├── requirements.txt
│   └── run.py                  # Uvicorn runner
│
└── README.md                   # Tiếng Anh
└── VN_README.md                # Tiếng Việt
└── implementation_plan.md      # Kế hoạch triển khai
└── VN_implementation_plan.md   # Tiếng Việt
```

---

## 🚀 Cài đặt Nhanh (Quick Start)

### Yêu cầu Tiên quyết (Prerequisites)

| Công cụ       | Phiên bản | Ghi chú                        |
| ------------- | -------- | ------------------------------ |
| **Node.js**   | ≥ 18     | Hỗ trợ `fetch` native           |
| **Python**    | ≥ 3.10   | Hỗ trợ FastAPI + type hints     |
| **pip**       | mới nhất | Trình quản lý gói của Python    |

---

### Bước 1 — Khởi động Dịch vụ Python AI

```bash
# 1. Truy cập vào thư mục Dịch vụ AI (ai-service)
cd ai-service

# 2. Tạo môi trường ảo (khuyến nghị)
python -m venv .venv
source .venv/bin/activate        # macOS / Linux
# .venv\Scripts\activate         # Windows

# 3. Cài đặt các gói phụ thuộc
pip install -r requirements.txt

# 4. Chạy máy chủ
python run.py
# Máy chủ hiện chạy tại http://localhost:8000
```

> ⚠️ **Lần chạy đầu tiên** sẽ tải xuống `vinai/phobert-base` (~540 MB) từ HuggingFace.

Kiểm tra:

```bash
curl http://localhost:8000/health
# {"status":"ok","model_loaded":true}
```

---

### Bước 2 — Chạy TypeScript Engine

```bash
# 1. Truy cập thư mục engine
cd engine

# 2. Cài đặt thư viện
npm install

# 3. Chạy pipeline demo
npm start
# hoặc: npx tsx src/index.ts
```

Demo sẽ:
1. Health-check kiểm tra tình trạng dịch vụ.
2. Gửi văn bản tiếng Việt hợp lệ qua cho pipeline xử lý.
3. Trình bày tình trạng báo lỗi Zod khi sử dụng input không hợp lệ.

---

## 🔌 Hợp đồng API (API Contract)

### `POST /predict`

**Yêu cầu (Request):**

```json
{
  "text": "Tôi rất thích sản phẩm này",
  "language": "vi"
}
```

| Trường     | Kiểu              | Bắt buộc | Mặc định| Xác thực             |
| ---------- | ----------------- | -------- | ------- | -------------------- |
| `text`     | `string`          | ✅       | —       | 1–5000 ký tự, đã phân trang (trimmed)|
| `language` | `"vi"` \| `"en"`  | ❌       | `"vi"`  | Kiểu Enum            |

**Phản hồi (Response):**

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

## 🔒 Đồng bộ Lược đồ Schema (Schema Synchronisation)

Hợp đồng dữ liệu hiện được thiết lập trong **hai nơi** cần phải được duy trì đồng bộ:

| Nguồn Chân lý (Python)            | Phản chiếu (TypeScript)             |
| --------------------------------- | ----------------------------------- |
| `ai-service/app/schemas.py`      | `engine/src/schemas.ts`             |
| `PredictRequest(BaseModel)`      | `PredictRequestSchema = z.object()` |
| `PredictResponse(BaseModel)`     | `PredictResponseSchema = z.object()` |
| `Language(str, Enum)`            | `LanguageEnum = z.enum()`           |
| `SentimentLabel(str, Enum)`      | `SentimentLabelEnum = z.enum()`     |

**Quy tắc:**
1. Các mô hình Pydantic thuộc Python sẽ luôn là **nguồn chân lý**.
2. Mọi thay đổi trường trong bên Python **bắt buộc** phải có thay đổi song song cho Zod schema.
3. Hai bên tự xác thực độc lập — **Xác thực kép (Double validation)** nhằm đảm bảo an toàn cao.

---

## 🏗️ Chi tiết Kiến trúc (Architecture Details)

### Luồng Pipeline (`executePipeline`)

```
Input (không xác định/unknown)
    │
    ▼
┌─────────────────┐
│  1. VALIDATE    │  ← Parse bằng Zod schema
│  (fail fast)    │     Dữ liệu xấu → PipelineFailure{stage: "validation"}
└────────┬────────┘
         │ PredictRequest
         ▼
┌─────────────────┐
│  2. CALL AI     │  ← HTTP POST tới Dịch vụ Python
│  (fetch)        │     Lỗi mạng → PipelineFailure{stage: "ai-call"}
└────────┬────────┘
         │ PredictResponse (Zod-validated)
         ▼
┌─────────────────┐
│  3. LOG RESULT  │  ← Structured console output (Log định dạng)
│  (return)       │     → PipelineSuccess{request, response, meta}
└─────────────────┘
```

### Luồng Service AI (`POST /predict`)

```
JSON Body
    │
    ▼
┌─────────────────┐
│ Pydantic Parse  │  ← Tự động Validate do FastAPI đảm nhiệm
└────────┬────────┘
         │ PredictRequest
         ▼
┌─────────────────┐
│ Word Segment    │  ← PyVi ViTokenizer
│ (segmentation)  │     "sản phẩm" → "sản_phẩm"
└────────┬────────┘
         │ segmented text (văn bản được tách từ)
         ▼
┌─────────────────┐
│ PhoBERT         │  ← Tokenise → Encode → CLS pool → Classify (Phân loại)
│ (model.py)      │     → label (nhãn) + confidence (độ tin cậy)
└────────┬────────┘
         │
         ▼
    PredictResponse (JSON)
```

---

## 🐳 Docker (Tuỳ chọn)

Nếu bạn muốn cấu trúc với docker để làm container, có thể tạo file cấu hình mang tên `docker-compose.yml`:

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

## 📝 Biến Môi Trường (Environment Variables)

| Biến               | Dịch vụ | Mặc định                 | Mô tả                           |
| ------------------ | ------- | ------------------------ | ------------------------------- |
| `AI_SERVICE_URL`   | Engine  | `http://localhost:8000`  | URL kết nối AI Service của Python|
| `HOST`             | AI      | `0.0.0.0`               | Địa chỉ lưu trữ máy chủ kết nối |
| `PORT`             | AI      | `8000`                   | Cổng giao tiếp                  |

---

## Giấy phép (License)

MIT
