"""
State Management for Cover Letter & Cold Email Generation
Uses TypedDict for LangGraph state management
"""
from typing import TypedDict, Optional, List, Dict, Any


class CoverLetterState(TypedDict):
    """
    Shared state for all cover letter and cold email agents
    Each agent reads from and writes to this state
    """
    # Input data
    user_id: str
    job_description: str
    company_name: str
    job_title: Optional[str]
    document_type: str  # "cover_letter" or "cold_email"

    # User data
    user_resume: Optional[str]
    user_profile: Optional[Dict[str, Any]]

    # Agent 1: Input Analyzer output
    job_analysis: Optional[Dict[str, Any]]  # {requirements, skills_needed, seniority, etc.}

    # Agent 2: Research Agent output (parallel with Agent 1)
    company_research: Optional[Dict[str, Any]]  # {about, culture, recent_news, glassdoor_reviews, etc.}

    # Agent 3: GitHub MCP output
    github_data: Optional[Dict[str, Any]]  # {repos, languages, contributions, projects}

    # Agent 4: UserInfo DB output
    db_profile: Optional[Dict[str, Any]]  # {location, experience_years, skills, certifications, etc.}

    # Agent 5: Resume Analyzer output
    resume_analysis: Optional[Dict[str, Any]]  # {qualifications, experiences, projects_from_resume, skills}

    # Agent 6: Style Analyzer output
    writing_style: Optional[Dict[str, Any]]  # {tone, structure, examples, patterns}

    # Agent 7: Content Generator output
    generated_content: Optional[str]  # Raw generated cover letter or cold email

    # Agent 8: Humanization output
    humanized_content: Optional[str]  # Final humanized content

    # Agent 9: Quality Check output
    quality_score: Optional[float]
    quality_feedback: Optional[Dict[str, Any]]
    validation_passed: Optional[bool]

    # Execution tracking
    current_agent: Optional[str]
    progress_messages: List[str]
    errors: List[str]
    execution_time: Optional[float]

    # Retry mechanism
    retry_count: int
