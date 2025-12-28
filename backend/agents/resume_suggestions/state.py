"""
State Management for Resume Suggestion System
AI provides suggestions, user makes edits manually
"""
from typing import TypedDict, Optional, List, Dict, Any


class ResumeSuggestionState(TypedDict):
    """Shared state for resume suggestion agents"""

    # Input data
    user_id: str
    job_description: str
    company_name: str
    user_resume: Optional[str]
    user_profile: Optional[Dict[str, Any]]

    # Agent 1: JD Analyzer output
    jd_analysis: Optional[Dict[str, Any]]

    # Agent 2: Resume Parser output
    parsed_resume: Optional[Dict[str, Any]]

    # Agent 3: GitHub Fetcher output
    github_repos: Optional[List[Dict[str, Any]]]

    # Agent 4: ATS Analyzer output
    ats_analysis: Optional[Dict[str, Any]]

    # Agent 5: Suggestion Generator output (MAIN OUTPUT)
    suggestions: Optional[Dict[str, Any]]  # Structured suggestions for user to apply

    # Execution tracking
    current_agent: Optional[str]
    progress_messages: List[str]
    errors: List[str]
    execution_time: Optional[float]
