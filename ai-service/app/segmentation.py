"""
Vietnamese Word Segmentation using PyVi.

PyVi's ViTokenizer splits raw Vietnamese text into word-segmented form
where compound words are joined by underscores.

Example:
    "Trường đại học bách khoa" → "Trường_đại_học bách_khoa"
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

from pyvi import ViTokenizer

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class SegmentResult:
    """Result of word segmentation."""
    original: str
    segmented: str
    tokens: list[str]


class VietnameseSegmenter:
    """
    Wrapper around PyVi's ViTokenizer for Vietnamese word segmentation.

    Usage:
        segmenter = VietnameseSegmenter()
        result = segmenter.segment("Tôi yêu Việt Nam")
        # result.segmented == "Tôi yêu Việt_Nam"
        # result.tokens == ["Tôi", "yêu", "Việt_Nam"]
    """

    def __init__(self) -> None:
        logger.info("VietnameseSegmenter initialised (PyVi ViTokenizer)")

    def segment(self, text: str) -> SegmentResult:
        """
        Segment raw Vietnamese text into words.

        Args:
            text: Raw Vietnamese string.

        Returns:
            SegmentResult with original text, segmented text, and token list.
        """
        if not text or not text.strip():
            return SegmentResult(original=text, segmented="", tokens=[])

        cleaned = text.strip()
        segmented: str = ViTokenizer.tokenize(cleaned)
        tokens = segmented.split()

        logger.debug(
            "Segmented %d chars → %d tokens", len(cleaned), len(tokens)
        )

        return SegmentResult(
            original=cleaned,
            segmented=segmented,
            tokens=tokens,
        )
