import json
from io import BytesIO
from typing import AsyncGenerator

import trafilatura
from fastapi import UploadFile, HTTPException, status
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from pypdf import PdfReader

from config.Setttings import settings
from core.llm import llm
from routers.mindmap.ctm_validator import validate_ctm
from routers.mindmap.dto import StreamStatus, StreamEvent
from routers.mindmap.prompt import mindmap_generate


async def generate_mindmap_from_text(message: str) -> AsyncGenerator[str, None]:
    """
    Generate mindmap from text with streaming status updates.

    Yields JSON events with detailed status for each processing step.

    Args:
        message: The input text to generate mindmap from

    Yields:
        JSON string events with status, message, and optional data
    """
    # Emit preparing status
    yield create_event(
        StreamStatus.PREPARING,
        "Đang chuẩn bị dữ liệu văn bản...",
        {"text_length": len(message)}
    )
    
    async for event in generate_mindmap(message):
        yield event


def extract_text_from_pdf(contents: bytes) -> str:
    """Extract text from PDF bytes. Raises HTTPException on error."""
    if len(contents) > 10 * 1024 * 1024:  # 10 MB:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File too large. Max size is 10 MB"
        )
    try:
        pdf_file = BytesIO(contents)
        reader = PdfReader(pdf_file)
        text = ""
        for page in reader.pages:
            text += page.extract_text() or ""
        return text
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid PDF file: {str(e)}"
        )


async def generate_mindmap_from_file(text: str, filename: str = "file.pdf") -> AsyncGenerator[str, None]:
    """
    Generate mindmap from pre-extracted text with detailed status updates.
    
    Args:
        text: Pre-extracted text content from file
        filename: Original filename for display purposes
    """
    # Emit extracting text status (file already read by router)
    yield create_event(
        StreamStatus.EXTRACTING_TEXT,
        f"Đã trích xuất văn bản từ {filename}...",
        {"text_length": len(text), "filename": filename}
    )
    
    async for event in generate_mindmap(text):
        yield event


async def generate_mindmap_from_web_url(site_url: str) -> AsyncGenerator[str, None]:
    """
    Generate mindmap from web URL with detailed status updates.
    
    Args:
        site_url: URL of the web page to extract content from
    """
    # Emit loading web status
    yield create_event(
        StreamStatus.LOADING_WEB,
        f"Đang tải nội dung từ {site_url}...",
        {"url": site_url}
    )
    
    downloaded = trafilatura.fetch_url(site_url)
    
    if not downloaded:
        yield create_event(
            StreamStatus.ERROR,
            f"Không thể tải trang web: {site_url}",
            {"url": site_url}
        )
        return
    
    # Emit extracting text status
    yield create_event(
        StreamStatus.EXTRACTING_TEXT,
        "Đang trích xuất nội dung từ trang web...",
        {"url": site_url}
    )
    
    content = trafilatura.extract(
        downloaded,
        output_format="markdown",
        include_tables=True,
        include_images=False
    )
    
    if not content:
        yield create_event(
            StreamStatus.ERROR,
            f"Không thể trích xuất nội dung từ URL: {site_url}",
            {"url": site_url}
        )
        return
    
    async for event in generate_mindmap(content):
        yield event


# Helper function
async def generate_mindmap(content: str) -> AsyncGenerator[str, None]:
    max_retry = settings.mindmap_generate_max_retry
    retry_cnt = max_retry
    attempt = 1
    messages = [
        SystemMessage(mindmap_generate),
        HumanMessage(content)
    ]

    while retry_cnt > 0:
        # Emit PROCESSING status
        yield create_event(
            StreamStatus.PROCESSING,
            f"Đang tạo mindmap... (lần thử {attempt}/{max_retry})",
            {"attempt": attempt, "max_retries": max_retry}
        )

        # Invoke LLM
        response = llm.invoke(messages).content

        # Emit VALIDATING status
        yield create_event(
            StreamStatus.VALIDATING,
            "Đang kiểm tra định dạng CTM...",
            {"attempt": attempt}
        )

        # Validate response
        validate_result = validate_ctm(response)

        if validate_result["is_valid"]:
            # Success!
            yield create_event(
                StreamStatus.SUCCESS,
                "Tạo mindmap thành công!",
                {
                    "ctm": response,
                    "attempts_used": attempt,
                    "validation_message": validate_result["message"]
                }
            )
            return

        # Validation failed - prepare for retry
        messages.append(AIMessage(response))
        messages.append(HumanMessage(
            f"CTM format validation failed: {validate_result['message']}. "
            "Please fix the error and regenerate the mindmap following the CTM rules strictly."
        ))

        retry_cnt -= 1
        attempt += 1

        if retry_cnt > 0:
            # Emit RETRY status
            yield create_event(
                StreamStatus.RETRY,
                f"Định dạng không hợp lệ, đang thử lại... ({attempt}/{max_retry})",
                {
                    "error": validate_result["message"],
                    "next_attempt": attempt,
                    "remaining_retries": retry_cnt
                }
            )

    # All retries exhausted
    yield create_event(
        StreamStatus.ERROR,
        f"Không thể tạo mindmap sau {max_retry} lần thử.",
        {
            "last_error": validate_result["message"],
            "attempts_used": max_retry
        }
    )


def create_event(status: StreamStatus, message: str, data: dict | None = None) -> str:
    """Create a JSON event string for streaming"""
    event: StreamEvent = {
        "status": status.value,
        "message": message,
        "data": data
    }
    return json.dumps(event, ensure_ascii=False) + "\n"
