"""
Pydantic Schemas — Source of Truth for the data contract.

These schemas are mirrored exactly in the TypeScript engine
as Zod schemas (engine/src/schemas.ts). Any changes here
MUST be reflected there to maintain type safety across the boundary.
"""

from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, field_validator


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class Language(str, Enum):
    """Supported languages."""
    VI = "vi"
    EN = "en"


class SentimentLabel(str, Enum):
    """Sentiment classification labels."""
    POSITIVE = "positive"
    NEGATIVE = "negative"
    NEUTRAL = "neutral"


# ---------------------------------------------------------------------------
# Request
# ---------------------------------------------------------------------------

class PredictRequest(BaseModel):
    """
    Request payload for the /predict endpoint.

    Mirrors Zod schema: PredictRequestSchema
    """
    text: str = Field(
        ...,
        min_length=1,
        max_length=5000,
        description="Raw Vietnamese (or English) text to analyse.",
        examples=["Tôi rất thích sản phẩm này"],
    )
    language: Language = Field(
        default=Language.VI,
        description="Language hint — defaults to Vietnamese.",
    )

    @field_validator("text")
    @classmethod
    def text_must_not_be_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("text must contain non-whitespace characters")
        return v.strip()


# ---------------------------------------------------------------------------
# Response
# ---------------------------------------------------------------------------

class PredictResponse(BaseModel):
    """
    Response payload from the /predict endpoint.

    Mirrors Zod schema: PredictResponseSchema
    """
    input_text: str = Field(
        ...,
        description="Echo of the original input text.",
    )
    segmented_text: str = Field(
        ...,
        description="Text after Vietnamese word segmentation.",
    )
    tokens: list[str] = Field(
        ...,
        description="List of segmented tokens.",
    )
    label: SentimentLabel = Field(
        ...,
        description="Predicted sentiment label.",
    )
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Model confidence score (0–1).",
    )
    processing_time_ms: float = Field(
        ...,
        ge=0.0,
        description="Total processing time in milliseconds.",
    )


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

class HealthResponse(BaseModel):
    """Response for the /health endpoint."""
    status: str = "ok"
    model_loaded: bool = False
