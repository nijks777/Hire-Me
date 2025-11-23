from pydantic import BaseModel, Field
from typing import Optional, Dict, Any

class GenerateRequest(BaseModel):
    """Request model for document generation"""
    job_description: str = Field(..., description="Job description text")
    company_name: str = Field(..., description="Name of the company")
    hr_name: Optional[str] = Field(None, description="HR/Recruiter name")
    custom_prompt: Optional[str] = Field(None, description="Custom instructions from user")

class AgentProgress(BaseModel):
    """Progress update from an agent"""
    agent_name: str
    status: str  # running, completed, error
    message: str
    data: Optional[Dict[str, Any]] = None

class GenerateResponse(BaseModel):
    """Final response with generated documents"""
    cover_letter: str
    cold_email: str
    quality_score: Optional[float] = None
    suggestions: Optional[str] = None
    credits_remaining: int

class CreditsResponse(BaseModel):
    """Credits information"""
    credits: int
    message: Optional[str] = None
