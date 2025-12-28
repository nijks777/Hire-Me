"""
Resume Customization State Management
Defines the state structure for the resume customization workflow
"""
from typing import TypedDict, Optional, List, Dict, Any


class ResumeCustomizationState(TypedDict):
    """
    State for resume customization workflow

    This state is passed through all agents in the LangGraph workflow
    """
    # Input data
    user_id: str
    job_description: str
    company_name: str
    user_resume: str  # Original resume text from DB
    user_profile: Optional[Dict[str, Any]]  # User profile info

    # Agent 1: JD Analyzer outputs
    jd_analysis: Optional[Dict[str, Any]]  # Tech stack, keywords, requirements

    # Agent 2: Resume Parser outputs
    parsed_resume: Optional[Dict[str, Any]]  # Structured resume (experience, projects, skills)

    # Agent 3: GitHub Fetcher outputs
    github_repos: Optional[List[Dict[str, Any]]]  # All user GitHub repos with READMEs

    # Agent 4: Project Matcher outputs
    matched_projects: Optional[List[Dict[str, Any]]]  # Selected projects for resume

    # Agent 5: Experience Optimizer outputs
    optimized_experience: Optional[List[Dict[str, Any]]]  # Reworded experience bullets

    # Agent 6: Resume Rebuilder outputs
    customized_resume: Optional[str]  # Final customized resume

    # Agent 7: ATS Validator outputs
    ats_score: Optional[float]  # ATS score (0-100)
    ats_feedback: Optional[Dict[str, Any]]  # ATS feedback and suggestions
    retry_count: int  # Number of ATS validation retries

    # Agent 8: QA Agent outputs
    qa_results: Optional[Dict[str, Any]]  # Validation results
    hallucination_check: Optional[bool]  # True if no hallucinations detected

    # Agent 9: Diff Generator outputs
    diff_report: Optional[Dict[str, Any]]  # Changes between original and customized

    # Workflow metadata
    current_agent: Optional[str]
    progress_messages: List[str]
    errors: List[str]
    execution_time: Optional[float]  # Total execution time in seconds
