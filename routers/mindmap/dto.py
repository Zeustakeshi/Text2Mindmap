from enum import Enum
from typing import TypedDict

from pydantic import BaseModel


class StreamEvent(TypedDict):
    """Structure for stream events"""
    status: str
    message: str
    data: dict | None


class StreamStatus(str, Enum):
    """Status types for streaming response"""
    # Connection & Preparation
    CONNECTING = "CONNECTING"
    PREPARING = "PREPARING"
    
    # Input Processing
    READING_FILE = "READING_FILE"
    LOADING_WEB = "LOADING_WEB"
    EXTRACTING_TEXT = "EXTRACTING_TEXT"
    
    # AI Processing
    PROCESSING = "PROCESSING"
    VALIDATING = "VALIDATING"
    RETRY = "RETRY"
    
    # Final States
    SUCCESS = "SUCCESS"
    ERROR = "ERROR"


class MindmapRequest(BaseModel):
    """Request body for mindmap generation"""
    text: str
