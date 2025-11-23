from langgraph.graph import StateGraph, END
from agents.state import AgentState
from agents.input_analyzer import input_analyzer_agent
from agents.research import research_agent
from agents.resume_analyzer import resume_analyzer_agent
from agents.style_analyzer import style_analyzer_agent
from agents.content_generator import content_generator_agent
from agents.quality_review import quality_review_agent

def create_agent_workflow():
    """
    Create the LangGraph workflow connecting all 6 agents

    Flow:
    1. Input Analyzer → Analyzes job description
    2. Research → Searches company info (parallel with 3 & 4)
    3. Resume Analyzer → Analyzes user resume (parallel with 2 & 4)
    4. Style Analyzer → Learns writing style (parallel with 2 & 3)
    5. Content Generator → Creates cover letter & cold email
    6. Quality Review → Reviews and scores output
    """

    # Create the workflow
    workflow = StateGraph(AgentState)

    # Add all agents as nodes
    workflow.add_node("input_analyzer", input_analyzer_agent)
    workflow.add_node("research", research_agent)
    workflow.add_node("resume_analyzer", resume_analyzer_agent)
    workflow.add_node("style_analyzer", style_analyzer_agent)
    workflow.add_node("content_generator", content_generator_agent)
    workflow.add_node("quality_review", quality_review_agent)

    # Define the workflow edges
    # Start with input analyzer
    workflow.set_entry_point("input_analyzer")

    # After input analyzer, run research, resume, and style in parallel
    workflow.add_edge("input_analyzer", "research")
    workflow.add_edge("input_analyzer", "resume_analyzer")
    workflow.add_edge("input_analyzer", "style_analyzer")

    # All three feed into content generator
    workflow.add_edge("research", "content_generator")
    workflow.add_edge("resume_analyzer", "content_generator")
    workflow.add_edge("style_analyzer", "content_generator")

    # Content generator feeds into quality review
    workflow.add_edge("content_generator", "quality_review")

    # Quality review is the end
    workflow.add_edge("quality_review", END)

    # Compile the workflow
    app = workflow.compile()

    return app

def run_agent_pipeline(
    job_description: str,
    company_name: str,
    hr_name: str,
    custom_prompt: str,
    user_resume: str,
    demo_cover_letter: str,
    demo_cold_email: str
):
    """
    Run the complete agent pipeline

    Args:
        job_description: Job description text
        company_name: Name of company
        hr_name: HR/recruiter name (optional)
        custom_prompt: Custom instructions from user
        user_resume: User's resume text
        demo_cover_letter: Demo cover letter text
        demo_cold_email: Demo cold email text

    Returns:
        Final state with generated documents
    """

    # Initialize state
    initial_state: AgentState = {
        # Input data
        "job_description": job_description,
        "company_name": company_name,
        "hr_name": hr_name,
        "custom_prompt": custom_prompt,

        # User data
        "user_resume": user_resume,
        "demo_cover_letter": demo_cover_letter,
        "demo_cold_email": demo_cold_email,
        "user_profile": None,

        # Agent outputs (initialized as None)
        "job_requirements": None,
        "company_research": None,
        "user_qualifications": None,
        "writing_style": None,
        "generated_cover_letter": None,
        "generated_cold_email": None,
        "quality_review": None,

        # Progress tracking
        "current_agent": None,
        "progress_messages": [],
        "errors": []
    }

    # Create and run workflow
    app = create_agent_workflow()

    # Run the workflow
    final_state = app.invoke(initial_state)

    return final_state

async def run_agent_pipeline_streaming(
    job_description: str,
    company_name: str,
    hr_name: str,
    custom_prompt: str,
    user_resume: str,
    demo_cover_letter: str,
    demo_cold_email: str
):
    """
    Run agent pipeline with streaming updates

    Yields progress updates as each agent completes
    """

    # Initialize state
    initial_state: AgentState = {
        "job_description": job_description,
        "company_name": company_name,
        "hr_name": hr_name,
        "custom_prompt": custom_prompt,
        "user_resume": user_resume,
        "demo_cover_letter": demo_cover_letter,
        "demo_cold_email": demo_cold_email,
        "user_profile": None,
        "job_requirements": None,
        "company_research": None,
        "user_qualifications": None,
        "writing_style": None,
        "generated_cover_letter": None,
        "generated_cold_email": None,
        "quality_review": None,
        "current_agent": None,
        "progress_messages": [],
        "errors": []
    }

    # Create workflow
    app = create_agent_workflow()

    # Stream execution
    async for event in app.astream(initial_state):
        # Each event contains the state after an agent completes
        for node_name, state in event.items():
            if node_name != "__end__":
                # Yield progress update
                yield {
                    "agent": node_name,
                    "status": "completed",
                    "messages": state.get("progress_messages", []),
                    "current_state": {
                        "has_cover_letter": bool(state.get("generated_cover_letter")),
                        "has_cold_email": bool(state.get("generated_cold_email")),
                        "quality_score": state.get("quality_review", {}).get("quality_score")
                    }
                }

    # Final yield with complete results
    yield {
        "agent": "complete",
        "status": "finished",
        "cover_letter": initial_state.get("generated_cover_letter"),
        "cold_email": initial_state.get("generated_cold_email"),
        "quality_review": initial_state.get("quality_review"),
        "errors": initial_state.get("errors", [])
    }
