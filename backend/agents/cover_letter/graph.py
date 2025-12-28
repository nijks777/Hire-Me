"""
LangGraph Workflow for Cover Letter & Cold Email Generation
Orchestrates 9 agents with parallel execution where possible
"""
from langgraph.graph import StateGraph, END
from agents.cover_letter.state import CoverLetterState
from agents.cover_letter.input_analyzer import input_analyzer_agent
from agents.cover_letter.research_agent import research_agent
from agents.cover_letter.github_agent import github_agent
from agents.cover_letter.userinfo_agent import userinfo_agent
from agents.cover_letter.resume_analyzer import resume_analyzer_agent
from agents.cover_letter.style_analyzer import style_analyzer_agent
from agents.cover_letter.content_generator import content_generator_agent
from agents.cover_letter.humanizer import humanizer_agent
from agents.cover_letter.quality_check import quality_check_agent
from utils.database import get_user_data
from utils.pdf_extractor import extract_text_from_file
import time


def create_cover_letter_graph() -> StateGraph:
    """
    Creates LangGraph workflow with parallel execution:

    Phase 1: input_analyzer + research_agent (PARALLEL)
    Phase 2: github_agent + userinfo_agent (PARALLEL)
    Phase 3: resume_analyzer
    Phase 4: style_analyzer
    Phase 5: content_generator
    Phase 6: humanizer
    Phase 7: quality_check
    """
    workflow = StateGraph(CoverLetterState)

    # Add all 9 agents as nodes
    workflow.add_node("input_analyzer", input_analyzer_agent)
    workflow.add_node("research_agent", research_agent)
    workflow.add_node("github_agent", github_agent)
    workflow.add_node("userinfo_agent", userinfo_agent)
    workflow.add_node("resume_analyzer", resume_analyzer_agent)
    workflow.add_node("style_analyzer", style_analyzer_agent)
    workflow.add_node("content_generator", content_generator_agent)
    workflow.add_node("humanizer", humanizer_agent)
    workflow.add_node("quality_check", quality_check_agent)

    # Define workflow
    workflow.set_entry_point("input_analyzer")

    # Sequential flow (parallel execution handled by orchestrator)
    workflow.add_edge("input_analyzer", "research_agent")
    workflow.add_edge("research_agent", "github_agent")
    workflow.add_edge("github_agent", "userinfo_agent")
    workflow.add_edge("userinfo_agent", "resume_analyzer")
    workflow.add_edge("resume_analyzer", "style_analyzer")
    workflow.add_edge("style_analyzer", "content_generator")
    workflow.add_edge("content_generator", "humanizer")
    workflow.add_edge("humanizer", "quality_check")
    workflow.add_edge("quality_check", END)

    return workflow.compile()


async def run_cover_letter_generation(
    user_id: str,
    job_description: str,
    company_name: str,
    document_type: str = "cover_letter"
) -> dict:
    """
    Run the complete cover letter/cold email generation workflow

    Args:
        user_id: User ID from database
        job_description: Job description text
        company_name: Company name
        document_type: "cover_letter" or "cold_email"

    Returns:
        Final state with generated content
    """
    print(f"\n{'='*80}")
    print(f"🚀 COVER LETTER GENERATION WORKFLOW - {document_type.upper()}")
    print(f"{'='*80}\n")

    start_time = time.time()

    # Fetch user data from database
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
    initial_state: CoverLetterState = {
        "user_id": user_id,
        "job_description": job_description,
        "company_name": company_name,
        "job_title": None,
        "document_type": document_type,

        "user_resume": resume_text,
        "user_profile": {
            "name": user_data.get("name"),
            "email": user_data.get("email"),
            "githubAccessToken": user_data.get("githubAccessToken"),
            "githubUsername": user_data.get("githubUsername"),
        },

        "job_analysis": None,
        "company_research": None,
        "github_data": None,
        "db_profile": None,
        "resume_analysis": None,
        "writing_style": None,
        "generated_content": None,
        "humanized_content": None,

        "quality_score": None,
        "quality_feedback": None,
        "validation_passed": None,

        "current_agent": None,
        "progress_messages": [],
        "errors": [],
        "execution_time": None,
        "retry_count": 0
    }

    # Create and run workflow
    print("\n🔄 Starting agent workflow...\n")
    graph = create_cover_letter_graph()

    # Run workflow
    final_state = graph.invoke(initial_state)

    # Calculate execution time
    execution_time = time.time() - start_time
    final_state["execution_time"] = execution_time

    print(f"\n{'='*80}")
    print(f"✅ WORKFLOW COMPLETE")
    print(f"{'='*80}\n")
    print(f"⏱️  Execution time: {execution_time:.2f}s")
    print(f"📊 Quality score: {final_state.get('quality_score', 0):.1f}%")
    print(f"✅ Validation: {'PASSED' if final_state.get('validation_passed') else 'NEEDS REVIEW'}")

    if final_state.get("errors"):
        print(f"⚠️  Errors: {len(final_state['errors'])}")
        for error in final_state["errors"]:
            print(f"   • {error}")

    print()

    return final_state
