from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from agents.state import AgentState
from app.config import settings
from utils.langsmith_config import trace_agent, get_traced_llm

@trace_agent("resume_analyzer", run_type="chain", tags=["job-application", "resume-analysis", "agent-3"])
def resume_analyzer_agent(state: AgentState) -> AgentState:
    """
    Agent 3: Analyze user's resume and extract relevant qualifications
    """
    print("📄 Agent 3: Analyzing user resume...")

    llm = get_traced_llm(
        model="gpt-4o-mini",
        temperature=0.3,
        tags=["resume-analysis", "qualifications"],
        metadata={"agent": "resume_analyzer", "step": 3}
    )

    try:
        # Check if resume is provided
        if not state.get("user_resume"):
            state["user_qualifications"] = {
                "note": "No resume provided"
            }
            state["progress_messages"].append("⚠️ No resume found (continuing)")
            return state

        # Get user profile info if available
        user_profile_info = ""
        if state.get("user_profile"):
            profile = state["user_profile"]
            user_profile_info = f"""
User Profile:
- Name: {profile.get('name', 'N/A')}
- Email: {profile.get('email', 'N/A')}
"""

        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an expert resume analyzer.
Analyze the resume and extract:
1. Key skills (technical and soft skills)
2. Relevant work experience
3. Education and certifications
4. Notable achievements
5. Years of experience
6. Strengths that match the job requirements

Match these to the job requirements provided.
Focus on strengths that align with the job.
Highlight unique qualifications and competitive advantages."""),
            ("human", """Job Requirements:
{job_requirements}

{user_profile_info}

Resume Content:
{resume}

Extract and organize relevant qualifications that match the job requirements.""")
        ])

        chain = prompt | llm
        response = chain.invoke({
            "job_requirements": str(state.get("job_requirements", {})),
            "user_profile_info": user_profile_info,
            "resume": state["user_resume"]
        })

        state["user_qualifications"] = {
            "analysis": response.content,
            "resume_provided": True
        }
        state["progress_messages"].append("✅ Resume analyzed successfully")
        state["current_agent"] = "resume_analyzer"

    except Exception as e:
        print(f"Resume analyzer error: {e}")
        state["errors"].append(f"Resume Analyzer Error: {str(e)}")
        state["progress_messages"].append("❌ Resume analysis failed")

    return state
