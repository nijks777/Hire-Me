"""
LangGraph Workflow for Resume Customization
Parallel execution of agents with smart dependency management
"""
from langgraph.graph import StateGraph, END
from agents.resume_customization.state import ResumeCustomizationState
from agents.resume_customization.jd_analyzer import jd_analyzer_agent
from agents.resume_customization.resume_parser import resume_parser_agent
from agents.resume_customization.github_fetcher import github_fetcher_agent
from agents.resume_customization.project_matcher import project_matcher_agent
from agents.resume_customization.experience_optimizer import experience_optimizer_agent
from agents.resume_customization.resume_rebuilder import resume_rebuilder_agent
from agents.resume_customization.ats_validator import ats_validator_agent
from agents.resume_customization.qa_agent import qa_agent
from agents.resume_customization.diff_generator import diff_generator_agent
import time


def create_resume_customization_graph() -> StateGraph:
    """
    Create LangGraph workflow for resume customization

    Workflow Structure:
    ┌─────────────────────────────────────────┐
    │ START                                   │
    └─────────────────────────────────────────┘
                    ↓
    ┌─────────────────────────────────────────┐
    │ PHASE 1: PARALLEL ANALYSIS             │
    ├─────────────────────────────────────────┤
    │ ┌─────────────┐  ┌──────────────────┐  │
    │ │ JD Analyzer │  │ Resume Parser +  │  │
    │ │             │  │ GitHub Fetcher   │  │
    │ └─────────────┘  └──────────────────┘  │
    └─────────────────────────────────────────┘
                    ↓ (merge)
    ┌─────────────────────────────────────────┐
    │ PHASE 2: PROJECT MATCHING              │
    └─────────────────────────────────────────┘
                    ↓
    ┌─────────────────────────────────────────┐
    │ PHASE 3: PARALLEL OPTIMIZATION         │
    ├─────────────────────────────────────────┤
    │ ┌──────────────┐  ┌────────────────┐   │
    │ │ Experience   │  │ (Project data  │   │
    │ │ Optimizer    │  │  already ready)│   │
    │ └──────────────┘  └────────────────┘   │
    └─────────────────────────────────────────┘
                    ↓
    ┌─────────────────────────────────────────┐
    │ PHASE 4: RESUME REBUILD                │
    └─────────────────────────────────────────┘
                    ↓
    ┌─────────────────────────────────────────┐
    │ PHASE 5: VALIDATION                    │
    │ • ATS Validator (with retry logic)     │
    └─────────────────────────────────────────┘
                    ↓
    ┌─────────────────────────────────────────┐
    │ PHASE 6: PARALLEL QA & DIFF            │
    ├─────────────────────────────────────────┤
    │ ┌──────────┐        ┌────────────────┐ │
    │ │ QA Agent │        │ Diff Generator │ │
    │ └──────────┘        └────────────────┘ │
    └─────────────────────────────────────────┘
                    ↓
    ┌─────────────────────────────────────────┐
    │ END                                     │
    └─────────────────────────────────────────┘
    """

    # Create state graph
    workflow = StateGraph(ResumeCustomizationState)

    # Add all nodes
    workflow.add_node("jd_analyzer", jd_analyzer_agent)
    workflow.add_node("resume_parser", resume_parser_agent)
    workflow.add_node("github_fetcher", github_fetcher_agent)
    workflow.add_node("project_matcher", project_matcher_agent)
    workflow.add_node("experience_optimizer", experience_optimizer_agent)
    workflow.add_node("resume_rebuilder", resume_rebuilder_agent)
    workflow.add_node("ats_validator", ats_validator_agent)
    workflow.add_node("qa_agent", qa_agent)
    workflow.add_node("diff_generator", diff_generator_agent)

    # PHASE 1: Parallel execution of JD Analyzer + (Resume Parser + GitHub Fetcher)
    # Note: LangGraph doesn't support true parallel execution yet, so we'll run sequentially
    # but optimized for minimal dependencies

    # Set entry point
    workflow.set_entry_point("jd_analyzer")

    # Phase 1: JD Analyzer → Resume Parser (can run in parallel in future)
    workflow.add_edge("jd_analyzer", "resume_parser")

    # Phase 1: Resume Parser → GitHub Fetcher
    workflow.add_edge("resume_parser", "github_fetcher")

    # Phase 2: GitHub Fetcher → Project Matcher
    workflow.add_edge("github_fetcher", "project_matcher")

    # Phase 3: Project Matcher → Experience Optimizer
    workflow.add_edge("project_matcher", "experience_optimizer")

    # Phase 4: Experience Optimizer → Resume Rebuilder
    workflow.add_edge("experience_optimizer", "resume_rebuilder")

    # Phase 5: Resume Rebuilder → ATS Validator
    workflow.add_edge("resume_rebuilder", "ats_validator")

    # Phase 6: ATS Validator → QA Agent
    workflow.add_edge("ats_validator", "qa_agent")

    # Phase 6: QA Agent → Diff Generator
    workflow.add_edge("qa_agent", "diff_generator")

    # End: Diff Generator → END
    workflow.add_edge("diff_generator", END)

    return workflow.compile()


def run_resume_customization(
    user_id: str,
    job_description: str,
    company_name: str,
    user_resume: str,
    user_profile: dict
) -> ResumeCustomizationState:
    """
    Run the complete resume customization workflow

    Args:
        user_id: User ID
        job_description: Job description text
        company_name: Company name
        user_resume: Original resume text
        user_profile: User profile dictionary

    Returns:
        Final state with customized resume and all metadata
    """
    print("\n" + "="*80)
    print("🚀 RESUME CUSTOMIZATION WORKFLOW")
    print("="*80 + "\n")

    start_time = time.time()

    # Initialize state
    initial_state: ResumeCustomizationState = {
        "user_id": user_id,
        "job_description": job_description,
        "company_name": company_name,
        "user_resume": user_resume,
        "user_profile": user_profile,
        "jd_analysis": None,
        "parsed_resume": None,
        "github_repos": None,
        "matched_projects": None,
        "optimized_experience": None,
        "customized_resume": None,
        "ats_score": None,
        "ats_feedback": None,
        "retry_count": 0,
        "qa_results": None,
        "hallucination_check": None,
        "diff_report": None,
        "current_agent": None,
        "progress_messages": [],
        "errors": [],
        "execution_time": None
    }

    # Create and run graph
    graph = create_resume_customization_graph()

    print("📋 Running 9-agent workflow with optimized execution order...\n")

    # Execute workflow
    final_state = graph.invoke(initial_state)

    # Calculate execution time
    end_time = time.time()
    execution_time = end_time - start_time
    final_state["execution_time"] = execution_time

    print("\n" + "="*80)
    print(f"✅ WORKFLOW COMPLETE ({execution_time:.2f}s)")
    print("="*80)

    # Print summary
    print(f"\n📊 SUMMARY:")
    print(f"  • ATS Score: {final_state.get('ats_score', 0):.1f}%")
    print(f"  • Projects Matched: {len(final_state.get('matched_projects', []))}")
    print(f"  • Experience Entries Optimized: {len(final_state.get('optimized_experience', []))}")
    print(f"  • Hallucination Check: {'✅ PASSED' if final_state.get('hallucination_check') else '⚠️ REVIEW NEEDED'}")
    print(f"  • Errors: {len(final_state.get('errors', []))}")

    if final_state.get("errors"):
        print("\n⚠️ Errors encountered:")
        for error in final_state["errors"][:3]:
            print(f"  • {error}")

    return final_state
