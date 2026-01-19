from fastapi import APIRouter, UploadFile
from fastapi.responses import StreamingResponse

from routers.mindmap.dto import MindmapRequest
from routers.mindmap.service import (
    generate_mindmap_from_text, generate_mindmap_from_file, generate_mindmap_from_web_url,
    extract_text_from_pdf
)

router = APIRouter()


@router.post("/generate/stream")
async def generate_mindmap_text(request: MindmapRequest):
    """
    Generate mindmap from text with streaming status updates.

    Returns Server-Sent Events with status updates:
    - PROCESSING: LLM is generating
    - VALIDATING: Checking CTM format
    - RETRY: Validation failed, retrying
    - SUCCESS: Mindmap generated successfully
    - ERROR: Failed after all retries

    Example response stream:
    ```
    {"status": "PROCESSING", "message": "Đang tạo mindmap...", "data": {...}}
    {"status": "VALIDATING", "message": "Đang kiểm tra...", "data": {...}}
    {"status": "SUCCESS", "message": "Thành công!", "data": {"ctm": "..."}}
    ```
    """
    return StreamingResponse(
        generate_mindmap_from_text(request.text),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"  # Disable nginx buffering
        }
    )


@router.post("/file/generate/stream")
async def generate_mindmap_file(file: UploadFile):
    # Process file BEFORE streaming to handle errors properly
    contents = await file.read()
    text = extract_text_from_pdf(contents)
    
    return StreamingResponse(
        generate_mindmap_from_file(text, file.filename or "file.pdf"),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@router.post("/web/generate/stream")
async def generate_mindmap_web(site_url: str):
    return StreamingResponse(
        generate_mindmap_from_web_url(site_url),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
