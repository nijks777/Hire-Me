"""
LangGraph Workflow for Resume Suggestions
5 agents: JD Analyzer → Resume Parser → GitHub Fetcher → ATS Analyzer → Suggestion Generator
"""
from langgraph.graph import StateGraph, END
from agents.resume_suggestions.state import ResumeSuggestionState
from agents.resume_customization.jd_analyzer import jd_analyzer_agent
from agents.resume_customization.resume_parser import resume_parser_agent
from agents.resume_customization.github_fetcher import github_fetcher_agent
from agents.resume_customization.ats_validator import ats_validator_agent
from agents.resume_suggestions.suggestion_generator import suggestion_generator_agent
from utils.database import get_user_data
from utils.pdf_extractor import extract_text_from_file
import time


def create_resume_suggestion_graph() -> StateGraph:
    """
    Creates LangGraph workflow with 5 agents:
    1. JD Analyzer
    2. Resume Parser
    3. GitHub Fetcher
    4. ATS Validator
    5. Suggestion Generator
    """
    workflow = StateGraph(ResumeSuggestionState)

    # Add 5 agents
    workflow.add_node("jd_analyzer", jd_analyzer_agent)
    workflow.add_node("resume_parser", resume_parser_agent)
    workflow.add_node("github_fetcher", github_fetcher_agent)
    workflow.add_node("ats_validator", ats_validator_agent)
    workflow.add_node("suggestion_generator", suggestion_generator_agent)

    # Define workflow
    workflow.set_entry_point("jd_analyzer")
    workflow.add_edge("jd_analyzer", "resume_parser")
    workflow.add_edge("resume_parser", "github_fetcher")
    workflow.add_edge("github_fetcher", "ats_validator")
    workflow.add_edge("ats_validator", "suggestion_generator")
    workflow.add_edge("suggestion_generator", END)

    return workflow.compile()


def run_resume_suggestion_workflow(
    user_id: str,
    job_description: str,
    company_name: str
) -> dict:
    """
    Run the resume suggestion workflow

    Returns:
        Final state with suggestions for user to apply
    """
    print(f"\n{'='*80}")
    print(f"💡 RESUME SUGGESTION WORKFLOW")
    print(f"{'='*80}\n")

    start_time = time.time()

    # Fetch user data
    print("📥 Fetching user data from database...")
    user_data = get_user_data(user_id)

    if not user_data:
        raise ValueError(f"User {user_id} not found in database")

    # Extract resume text
    resume_text = ""
    if user_data.get("resumeData"):
        print("📄 Extracting resume text...")
        resume_text = extract_text_from_file(
            file_data=user_data["resumeData"],
            mime_type=user_data.get("resumeMimeType", "application/pdf")
        )

    # Initialize state
    initial_state: ResumeSuggestionState = {
        "user_id": user_id,
        "job_description": job_description,
        "company_name": company_name,
        "user_resume": resume_text,
        "user_profile": {
            "name": user_data.get("name"),
            "email": user_data.get("email"),
            "githubAccessToken": user_data.get("githubAccessToken"),
            "githubUsername": user_data.get("githubUsername"),
        },
        "jd_analysis": None,
        "parsed_resume": None,
        "github_repos": None,
        "ats_analysis": None,
        "suggestions": None,
        "current_agent": None,
        "progress_messages": [],
        "errors": [],
        "execution_time": None
    }

    # Run workflow
    print("\n🔄 Starting 5-agent workflow...\n")
    graph = create_resume_suggestion_graph()
    final_state = graph.invoke(initial_state)

    # Calculate execution time
    execution_time = time.time() - start_time
    final_state["execution_time"] = execution_time

    print(f"\n{'='*80}")
    print(f"✅ WORKFLOW COMPLETE")
    print(f"{'='*80}\n")
    print(f"⏱️  Execution time: {execution_time:.2f}s")
    print(f"💡 Suggestions generated: {len(final_state.get('suggestions', {}).get('priority_changes', []))}")

    if final_state.get("errors"):
        print(f"⚠️  Errors: {len(final_state['errors'])}")

    print()

    return final_state
