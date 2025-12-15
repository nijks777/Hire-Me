"""
LangGraph State for Resume Customization
"""
from typing import TypedDict, Optional, Dict, List, Any
from pydantic import BaseModel


class JDAnalysis(BaseModel):
    """Job Description Analysis Result"""
    key_requirements: List[str]
    required_skills: List[str]
    preferred_skills: List[str]
    experience_level: str
    job_title: str
    company_focus: str
    keywords: List[str]
    custom_instructions_parsed: Optional[str] = None


class ResumeAnalysis(BaseModel):
    """Resume Analysis Result"""
    current_skills: List[str]
    experiences: List[Dict[str, Any]]
    achievements: List[str]
    projects: List[str]
    education: List[Dict[str, Any]]
    structure: str
    format_type: str


class ContextEnrichment(BaseModel):
    """GitHub and Profile Context"""
    github_repos: Optional[List[Dict[str, Any]]] = None
    github_skills: Optional[List[str]] = None
    profile_data: Optional[Dict[str, Any]] = None
    relevant_projects: Optional[List[Dict[str, Any]]] = None


class CustomizedResume(BaseModel):
    """Customized Resume Output"""
    content: str
    format: str
    changes_made: List[str]
    skills_highlighted: List[str]
    attempt_number: int = 1


class ATSValidation(BaseModel):
    """ATS Validation Result"""
    passed: bool
    score: float
    issues: List[str]
    suggestions: List[str]
    keyword_match_percentage: float


class ResumeCustomizationState(TypedDict):
    """
    Main state for the resume customization workflow
    """
    # Input
    job_description: str
    custom_instructions: Optional[str]
    resume_data: bytes
    resume_file_name: str
    user_id: str

    # Agent Outputs
    jd_analysis: Optional[JDAnalysis]
    resume_analysis: Optional[ResumeAnalysis]
    context_enrichment: Optional[ContextEnrichment]
    customized_resume: Optional[CustomizedResume]
    ats_validation: Optional[ATSValidation]

    # Control Flow
    current_agent: str
    retry_count: int
    should_retry: bool
    is_complete: bool

    # Errors
    errors: List[str]
