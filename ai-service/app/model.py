# """
# PhoBERT Model — Vietnamese text classification (sentiment analysis).

# Uses `vinai/phobert-base` from HuggingFace Transformers.

# PhoBERT is a RoBERTa-based pre-trained model for Vietnamese.  It expects
# **word-segmented** input (use segmentation.py first).

# For classification we take the [CLS] embedding and project it through a
# simple linear head.  In a production system you would fine-tune the full
# model; here we demonstrate the inference pipeline with a randomly-
# initialised head to keep the setup self-contained.
# """

# from __future__ import annotations

# import logging
# import time
# from dataclasses import dataclass
# from typing import Optional

# import torch
# import torch.nn as nn
# from transformers import AutoModel, AutoTokenizer, PreTrainedModel, PreTrainedTokenizerBase

# logger = logging.getLogger(__name__)

# # Labels for the demo sentiment classifier
# LABELS: list[str] = ["positive", "negative", "neutral"]


# @dataclass(frozen=True)
# class PredictResult:
#     """Prediction output from the model."""
#     label: str
#     confidence: float
#     processing_time_ms: float


# class PhoBERTPredictor:
#     """
#     Wraps vinai/phobert-base with a classification head.

#     The model is loaded lazily on first call to `load()` or `predict()`.
#     """

#     MODEL_NAME = "vinai/phobert-base"

#     def __init__(self) -> None:
#         self._tokenizer: Optional[PreTrainedTokenizerBase] = None
#         self._encoder: Optional[PreTrainedModel] = None
#         self._classifier: Optional[nn.Linear] = None
#         self._loaded = False

#     # ------------------------------------------------------------------
#     # Lifecycle
#     # ------------------------------------------------------------------

#     @property
#     def is_loaded(self) -> bool:
#         return self._loaded

#     def load(self) -> None:
#         """Download (if needed) and load PhoBERT + classification head."""
#         if self._loaded:
#             return

#         logger.info("Loading PhoBERT tokenizer from '%s' …", self.MODEL_NAME)
#         self._tokenizer = AutoTokenizer.from_pretrained(self.MODEL_NAME)

#         logger.info("Loading PhoBERT encoder from '%s' …", self.MODEL_NAME)
#         self._encoder = AutoModel.from_pretrained(self.MODEL_NAME)
#         self._encoder.eval()

#         # Simple linear head: hidden_size → num_labels
#         hidden_size: int = self._encoder.config.hidden_size  # 768
#         self._classifier = nn.Linear(hidden_size, len(LABELS))
#         self._classifier.eval()

#         self._loaded = True
#         logger.info("PhoBERT loaded successfully (%d labels)", len(LABELS))

#     # ------------------------------------------------------------------
#     # Inference
#     # ------------------------------------------------------------------

#     def predict(self, segmented_text: str) -> PredictResult:
#         """
#         Run sentiment classification on word-segmented Vietnamese text.

#         Args:
#             segmented_text: Vietnamese text **already** word-segmented
#                             (e.g. "Tôi rất thích sản_phẩm này").

#         Returns:
#             PredictResult with label, confidence and timing info.
#         """
#         if not self._loaded:
#             self.load()

#         assert self._tokenizer is not None
#         assert self._encoder is not None
#         assert self._classifier is not None

#         start = time.perf_counter()

#         # 1. Tokenize
#         inputs = self._tokenizer(
#             segmented_text,
#             return_tensors="pt",
#             truncation=True,
#             max_length=256,
#             padding=True,
#         )

#         # 2. Encode (no gradient needed)
#         with torch.no_grad():
#             encoder_output = self._encoder(**inputs)

#         # 3. CLS pooling → classify
#         cls_embedding = encoder_output.last_hidden_state[:, 0, :]  # (1, 768)

#         with torch.no_grad():
#             logits = self._classifier(cls_embedding)  # (1, num_labels)

#         # 4. Softmax → label + confidence
#         probs = torch.softmax(logits, dim=-1).squeeze(0)  # (num_labels,)
#         confidence, idx = probs.max(dim=0)

#         elapsed_ms = (time.perf_counter() - start) * 1000

#         result = PredictResult(
#             label=LABELS[idx.item()],
#             confidence=round(confidence.item(), 4),
#             processing_time_ms=round(elapsed_ms, 2),
#         )

#         logger.info(
#             "Prediction: %s (%.2f%%) in %.1f ms",
#             result.label,
#             result.confidence * 100,
#             result.processing_time_ms,
#         )

#         return result

from typing import Dict
import torch
import torch.nn.functional as F

from transformers import AutoTokenizer, AutoModelForSequenceClassification


class PhoBERTPredictor:
    """
    PhoBERT sentiment inference model wrapper.
    Loads model + tokenizer once, provides predict() method.
    """

    def __init__(self, model_name: str = "wonrax/phobert-base-vietnamese-sentiment"):
        self.model_name = model_name
        self.tokenizer = None
        self.model = None
        self.device = "cpu"

        # Sentiment mapping (standard requirement)
        # You may adjust this mapping depending on your fine-tuned model label order.
        self.label_map = {
            0: "negative",
            1: "neutral",
            2: "positive"
        }

    def load(self) -> None:
        """
        Load tokenizer and model into memory once.
        """

        self.device = "cuda" if torch.cuda.is_available() else "cpu"

        print(f"[PhoBERT] Loading model: {self.model_name}")
        print(f"[PhoBERT] Using device: {self.device}")

        self.tokenizer = AutoTokenizer.from_pretrained(self.model_name, use_fast=False)
        self.model = AutoModelForSequenceClassification.from_pretrained(self.model_name)

        self.model.to(self.device)
        self.model.eval()

        print("[PhoBERT] Model loaded and ready.")

    def predict(self, segmented_text: str) -> Dict:
        """
        Run sentiment inference on segmented text.
        Returns:
            {
                "label": "positive"|"negative"|"neutral",
                "confidence": float,
                "probabilities": {label: prob}
            }
        """

        if self.model is None or self.tokenizer is None:
            raise RuntimeError("Model is not loaded. Call load() before predict().")

        if not segmented_text.strip():
            return {
                "label": "neutral",
                "confidence": 0.0,
                "probabilities": {
                    "negative": 0.0,
                    "neutral": 1.0,
                    "positive": 0.0
                }
            }

        inputs = self.tokenizer(
            segmented_text,
            return_tensors="pt",
            truncation=True,
            padding=True,
            max_length=256
        )

        # Move tensors to correct device
        inputs = {k: v.to(self.device) for k, v in inputs.items()}

        with torch.no_grad():
            outputs = self.model(**inputs)

            # logits shape: [batch_size, num_labels]
            logits = outputs.logits

            # softmax probabilities
            probs = F.softmax(logits, dim=-1).squeeze(0)

            # get top label index
            top_idx = int(torch.argmax(probs).item())
            confidence = float(probs[top_idx].item())

        # map idx -> label
        label = self.label_map.get(top_idx, "neutral")

        probabilities = {
            self.label_map[i]: float(probs[i].item())
            for i in range(len(probs))
            if i in self.label_map
        }

        return {
            "label": label,
            "confidence": confidence,
            "probabilities": probabilities
        }