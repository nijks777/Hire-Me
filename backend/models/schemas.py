from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class GenerateRequest(BaseModel):
    job_description: str
    company_name: str
    hr_name: Optional[str] = None
    custom_prompt: Optional[str] = None
    user_id: str

class GenerationResponse(BaseModel):
    id: str
    job_description: str
    company_name: str
    hr_name: Optional[str]
    custom_prompt: Optional[str]
    cover_letter: str
    cold_email: str
    created_at: datetime

class TestStep1Request(BaseModel):
    job_description: str
    company_name: str
    hr_name: Optional[str] = None
    custom_prompt: Optional[str] = None

class TestStep1Response(BaseModel):
    success: bool
    job_requirements: Optional[dict] = None
    progress_messages: list[str]
    errors: list[str]
    current_agent: Optional[str] = None

class TestStep2Response(BaseModel):
    success: bool
    job_requirements: Optional[dict] = None
    company_research: Optional[dict] = None
    progress_messages: list[str]
    errors: list[str]
    current_agent: Optional[str] = None

class TestStep3Request(BaseModel):
    job_description: str
    company_name: str
    hr_name: Optional[str] = None
    custom_prompt: Optional[str] = None
    user_id: str  # To fetch user data from database

class TestStep3Response(BaseModel):
    success: bool
    job_requirements: Optional[dict] = None
    company_research: Optional[dict] = None
    user_qualifications: Optional[dict] = None
    progress_messages: list[str]
    errors: list[str]
    current_agent: Optional[str] = None

class TestStep4Request(BaseModel):
    job_description: str
    company_name: str
    hr_name: Optional[str] = None
    custom_prompt: Optional[str] = None
    user_id: str  # To fetch user data from database

class TestStep4Response(BaseModel):
    success: bool
    job_requirements: Optional[dict] = None
    company_research: Optional[dict] = None
    user_qualifications: Optional[dict] = None
    writing_style: Optional[dict] = None
    progress_messages: list[str]
    errors: list[str]
    current_agent: Optional[str] = None

class TestStep5Request(BaseModel):
    job_description: str
    company_name: str
    hr_name: Optional[str] = None
    custom_prompt: Optional[str] = None
    user_id: str  # To fetch user data from database

class TestStep5Response(BaseModel):
    success: bool
    job_requirements: Optional[dict] = None
    company_research: Optional[dict] = None
    user_qualifications: Optional[dict] = None
    writing_style: Optional[dict] = None
    generated_content: Optional[dict] = None
    progress_messages: list[str]
    errors: list[str]
    current_agent: Optional[str] = None
