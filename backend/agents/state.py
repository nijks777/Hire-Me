from typing import TypedDict, Optional, List, Dict, Any
from langgraph.graph import MessagesState

class AgentState(TypedDict):
    """State object passed between agents in the workflow"""

    # Input data
    job_description: str
    company_name: str
    hr_name: Optional[str]
    custom_prompt: Optional[str]

    # User data
    user_resume: Optional[str]
    demo_cover_letter: Optional[str]
    demo_cold_email: Optional[str]
    user_profile: Optional[Dict[str, Any]]

    # Agent outputs
    job_requirements: Optional[Dict[str, Any]]
    company_research: Optional[Dict[str, Any]]
    user_qualifications: Optional[Dict[str, Any]]
    writing_style: Optional[Dict[str, Any]]
    generated_cover_letter: Optional[str]
    generated_cold_email: Optional[str]
    quality_review: Optional[Dict[str, Any]]

    # Progress tracking
    current_agent: Optional[str]
    progress_messages: List[str]
    errors: List[str]
