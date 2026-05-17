"""
Pydantic Schemas — Source of Truth for the data contract.

These schemas are mirrored exactly in the TypeScript engine
as Zod schemas (engine/src/schemas.ts). Any changes here
MUST be reflected there to maintain type safety across the boundary.
"""

# from __future__ import annotations

# from enum import Enum
# from typing import Optional

# from pydantic import BaseModel, Field, field_validator


# # ---------------------------------------------------------------------------
# # Enums
# # ---------------------------------------------------------------------------

# class Language(str, Enum):
#     """Supported languages."""
#     VI = "vi"
#     EN = "en"


# class SentimentLabel(str, Enum):
#     """Sentiment classification labels."""
#     POSITIVE = "positive"
#     NEGATIVE = "negative"
#     NEUTRAL = "neutral"


# # ---------------------------------------------------------------------------
# # Request
# # ---------------------------------------------------------------------------

# class PredictRequest(BaseModel):
#     """
#     Request payload for the /predict endpoint.

#     Mirrors Zod schema: PredictRequestSchema
#     """
#     text: str = Field(
#         ...,
#         min_length=1,
#         max_length=5000,
#         description="Raw Vietnamese (or English) text to analyse.",
#         examples=["Tôi rất thích sản phẩm này"],
#     )
#     language: Language = Field(
#         default=Language.VI,
#         description="Language hint — defaults to Vietnamese.",
#     )

#     @field_validator("text")
#     @classmethod
#     def text_must_not_be_blank(cls, v: str) -> str:
#         if not v.strip():
#             raise ValueError("text must contain non-whitespace characters")
#         return v.strip()


# # ---------------------------------------------------------------------------
# # Response
# # ---------------------------------------------------------------------------

# class PredictResponse(BaseModel):
#     """
#     Response payload from the /predict endpoint.

#     Mirrors Zod schema: PredictResponseSchema
#     """
#     input_text: str = Field(
#         ...,
#         description="Echo of the original input text.",
#     )
#     segmented_text: str = Field(
#         ...,
#         description="Text after Vietnamese word segmentation.",
#     )
#     tokens: list[str] = Field(
#         ...,
#         description="List of segmented tokens.",
#     )
#     label: SentimentLabel = Field(
#         ...,
#         description="Predicted sentiment label.",
#     )
#     confidence: float = Field(
#         ...,
#         ge=0.0,
#         le=1.0,
#         description="Model confidence score (0–1).",
#     )
#     processing_time_ms: float = Field(
#         ...,
#         ge=0.0,
#         description="Total processing time in milliseconds.",
#     )


# # ---------------------------------------------------------------------------
# # Health
# # ---------------------------------------------------------------------------

# class HealthResponse(BaseModel):
#     """Response for the /health endpoint."""
#     status: str = "ok"
#     model_loaded: bool = False

from enum import Enum 
from pydantic import BaseModel, Field 

class LanguageEnum(str, Enum):
    vi = "vi"
    en = "en"


class SentimentLabel(str, Enum): 
    positive = "positive"
    negative = "negative"
    neutral  = "neutral"

class PredictRequest(BaseModel): 
    """
    input contract from typescript Engine -> Python AI Service 
    
    """

    text: str = Field(
        ..., 
        min_length= 1, 
        max_length= 5000, 
        description= "input Vietnamese/English text for sentiment analysis"
    )

    language: LanguageEnum = Field(
        default= LanguageEnum.vi, 
        description="Language identifier(default: vi)."
    )

class PredictResponse(BaseModel): 
    """
    Output contract from Python AI-Service -> TypeScript Engine
    """

    input_text: str = Field(
        ...,
        description="Original input text."
    )

    segmented_text: str = Field(
        ...,
        description="Vietnamese segmented text (PyVi tokenizer output)."
    )

    tokens: list[str] = Field(
        ...,
        description="List of tokens after segmentation."
    )

    label: SentimentLabel = Field(
        ...,
        description="Sentiment classification label."
    )

    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Confidence score between 0.0 and 1.0."
    )

    processing_time_ms: float = Field(
        ...,
        ge=0.0,
        description="Total processing time in milliseconds."
    )

class HealthResponse(BaseModel) :
    status: str = Field(..., description= "Service status (OK or loading)")
    model_config : bool = Field(..., description= "Whether the PhoBert model is loaded") 