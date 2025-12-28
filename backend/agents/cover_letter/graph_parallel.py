"""
LangGraph Workflow with TRUE Parallel Execution
Uses asyncio to run agents concurrently
"""
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
import asyncio
import time
from concurrent.futures import ThreadPoolExecutor


async def run_cover_letter_generation_parallel(
    user_id: str,
    job_description: str,
    company_name: str,
    document_type: str = "cover_letter"
) -> dict:
    """
    Run cover letter generation with TRUE parallel execution

    Parallel Phases:
    - Phase 1: Input Analyzer + Research Agent (parallel)
    - Phase 2: GitHub Agent + UserInfo Agent (parallel)
    - Phase 3-7: Sequential (depend on previous data)
    """
    print(f"\n{'='*80}")
    print(f"🚀 PARALLEL COVER LETTER GENERATION - {document_type.upper()}")
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
    state: CoverLetterState = {
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

    print("\n🔄 Starting parallel agent workflow...\n")

    # PHASE 1: Input Analyzer + Research Agent (PARALLEL)
    print("="*60)
    print("PHASE 1: Input Analyzer + Research Agent (PARALLEL)")
    print("="*60)
    phase1_start = time.time()

    with ThreadPoolExecutor(max_workers=2) as executor:
        future1 = executor.submit(input_analyzer_agent, state.copy())
        future2 = executor.submit(research_agent, state.copy())

        state1 = future1.result()
        state2 = future2.result()

        # Merge results
        state["job_analysis"] = state1.get("job_analysis")
        state["job_title"] = state1.get("job_title")
        state["company_research"] = state2.get("company_research")
        state["errors"].extend(state1.get("errors", []))
        state["errors"].extend(state2.get("errors", []))
        state["progress_messages"].extend(state1.get("progress_messages", []))
        state["progress_messages"].extend(state2.get("progress_messages", []))

    phase1_time = time.time() - phase1_start
    print(f"✅ Phase 1 complete in {phase1_time:.2f}s\n")

    # PHASE 2: GitHub Agent + UserInfo Agent (PARALLEL)
    print("="*60)
    print("PHASE 2: GitHub Agent + UserInfo Agent (PARALLEL)")
    print("="*60)
    phase2_start = time.time()

    with ThreadPoolExecutor(max_workers=2) as executor:
        future3 = executor.submit(github_agent, state.copy())
        future4 = executor.submit(userinfo_agent, state.copy())

        state3 = future3.result()
        state4 = future4.result()

        # Merge results
        state["github_data"] = state3.get("github_data")
        state["db_profile"] = state4.get("db_profile")
        state["errors"].extend(state3.get("errors", []))
        state["errors"].extend(state4.get("errors", []))
        state["progress_messages"].extend(state3.get("progress_messages", []))
        state["progress_messages"].extend(state4.get("progress_messages", []))

    phase2_time = time.time() - phase2_start
    print(f"✅ Phase 2 complete in {phase2_time:.2f}s\n")

    # PHASE 3: Resume Analyzer (sequential - needs all previous data)
    print("Phase 3: Resume Analyzer")
    state = resume_analyzer_agent(state)

    # PHASE 4: Style Analyzer (sequential)
    print("Phase 4: Style Analyzer")
    state = style_analyzer_agent(state)

    # PHASE 5: Content Generator (sequential)
    print("Phase 5: Content Generator")
    state = content_generator_agent(state)

    # PHASE 6: Humanizer (sequential)
    print("Phase 6: Humanizer")
    state = humanizer_agent(state)

    # PHASE 7: Quality Check (sequential)
    print("Phase 7: Quality Check")
    state = quality_check_agent(state)

    # Calculate execution time
    execution_time = time.time() - start_time
    state["execution_time"] = execution_time

    print(f"\n{'='*80}")
    print(f"✅ PARALLEL WORKFLOW COMPLETE")
    print(f"{'='*80}\n")
    print(f"⏱️  Total execution time: {execution_time:.2f}s")
    print(f"⏱️  Phase 1 (parallel): {phase1_time:.2f}s")
    print(f"⏱️  Phase 2 (parallel): {phase2_time:.2f}s")
    print(f"📊 Quality score: {state.get('quality_score', 0):.1f}%")

    if state.get("errors"):
        print(f"⚠️  Errors: {len(state['errors'])}")

    print()

    return state
