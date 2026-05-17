# """
# FastAPI Application — Vietnamese NLP AI Service.

# Endpoints
# ---------
# POST /predict   — Segment text + run PhoBERT inference → sentiment
# GET  /health    — Health check (reports model status)

# Startup
# -------
# The PhoBERT model is loaded once during application startup via the
# FastAPI lifespan context manager.
# """

# from __future__ import annotations

# import logging
# import time
# from contextlib import asynccontextmanager
# from typing import AsyncIterator

# from fastapi import FastAPI, HTTPException
# from fastapi.middleware.cors import CORSMiddleware

# from .model import PhoBERTPredictor
# from .schemas import HealthResponse, PredictRequest, PredictResponse, SentimentLabel
# from .segmentation import VietnameseSegmenter

# # ---------------------------------------------------------------------------
# # Logging
# # ---------------------------------------------------------------------------
# logging.basicConfig(
#     level=logging.INFO,
#     format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
# )
# logger = logging.getLogger(__name__)

# # ---------------------------------------------------------------------------
# # Singleton Services
# # ---------------------------------------------------------------------------
# segmenter = VietnameseSegmenter()
# predictor = PhoBERTPredictor()


# # ---------------------------------------------------------------------------
# # Lifespan — load model at startup
# # ---------------------------------------------------------------------------
# @asynccontextmanager
# async def lifespan(app: FastAPI) -> AsyncIterator[None]:
#     """Load the PhoBERT model when the application starts."""
#     logger.info("🚀 Starting AI Service — loading model …")
#     predictor.load()
#     logger.info("✅ Model ready")
#     yield
#     logger.info("👋 Shutting down AI Service")


# # ---------------------------------------------------------------------------
# # FastAPI App
# # ---------------------------------------------------------------------------
# app = FastAPI(
#     title="Vietnamese NLP AI Service",
#     description="Type-safe Vietnamese text analysis with PhoBERT",
#     version="1.0.0",
#     lifespan=lifespan,
# )

# # Allow the TypeScript engine (or any local client) to call us
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )


# # ---------------------------------------------------------------------------
# # Endpoints
# # ---------------------------------------------------------------------------

# @app.post("/predict", response_model=PredictResponse)
# async def predict(request: PredictRequest) -> PredictResponse:
#     """
#     Pipeline: validate → segment → PhoBERT inference → respond.

#     The request body is automatically validated by Pydantic.
#     """
#     try:
#         overall_start = time.perf_counter()

#         # 1. Word segmentation
#         seg_result = segmenter.segment(request.text)

#         # 2. Model inference
#         pred_result = predictor.predict(seg_result.segmented)

#         overall_ms = (time.perf_counter() - overall_start) * 1000

#         return PredictResponse(
#             input_text=request.text,
#             segmented_text=seg_result.segmented,
#             tokens=seg_result.tokens,
#             label=SentimentLabel(pred_result.label),
#             confidence=pred_result.confidence,
#             processing_time_ms=round(overall_ms, 2),
#         )

#     except Exception as exc:
#         logger.exception("Prediction failed")
#         raise HTTPException(status_code=500, detail=str(exc)) from exc


# @app.get("/health", response_model=HealthResponse)
# async def health() -> HealthResponse:
#     """Return service health and model readiness."""
#     return HealthResponse(
#         status="ok",
#         model_loaded=predictor.is_loaded,
#     )

import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.schemas import PredictRequest, PredictResponse, HealthResponse, SentimentLabel
from app.segmentation import segment_text
from app.model import PhoBERTSentimentModel


# Global model instance
MODEL: PhoBERTSentimentModel | None = None
MODEL_READY: bool = False


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan startup event:
    Load the PhoBERT model once at startup (avoid reloading every request).
    """
    global MODEL, MODEL_READY

    try:
        MODEL = PhoBERTSentimentModel()
        MODEL.load()
        MODEL_READY = True
        print("[AI-Service] PhoBERT model loaded successfully.")
    except Exception as e:
        MODEL_READY = False
        print("[AI-Service] Failed to load PhoBERT model:", str(e))

    yield

    # Shutdown (optional cleanup)
    MODEL = None
    MODEL_READY = False
    print("[AI-Service] Shutdown complete.")


app = FastAPI(
    title="AI-Service (PhoBERT Sentiment Analysis)",
    description="FastAPI AI microservice for Vietnamese sentiment prediction.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS (allow Node.js Engine to call API)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # for dev/demo; restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
def health_check():
    """
    Health endpoint for readiness probe.
    """
    if MODEL_READY:
        return HealthResponse(status="ok", model_loaded=True)

    return HealthResponse(status="loading", model_loaded=False)


@app.post("/predict", response_model=PredictResponse)
def predict_sentiment(request: PredictRequest):
    """
    Main inference endpoint.
    Receives text -> segmentation -> PhoBERT prediction -> returns JSON result.
    """
    global MODEL

    if not MODEL_READY or MODEL is None:
        raise HTTPException(
            status_code=503,
            detail="AI model is not loaded yet. Please retry later."
        )

    start_time = time.perf_counter()

    # Step 1: segmentation
    segmented_text, tokens = segment_text(request.text)

    # Step 2: model inference
    try:
        prediction = MODEL.predict(segmented_text)
        label = prediction["label"]
        confidence = prediction["confidence"]

        # Ensure label matches enum
        label_enum = SentimentLabel(label)

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Model inference failed: {str(e)}"
        )

    end_time = time.perf_counter()
    processing_time_ms = (end_time - start_time) * 1000

    # Step 3: return response contract
    return PredictResponse(
        input_text=request.text,
        segmented_text=segmented_text,
        tokens=tokens,
        label=label_enum,
        confidence=float(confidence),
        processing_time_ms=float(processing_time_ms)
    )