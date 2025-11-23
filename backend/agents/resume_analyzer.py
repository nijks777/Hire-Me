from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from agents.state import AgentState
from app.config import settings

def resume_analyzer_agent(state: AgentState) -> AgentState:
    """
    Agent 3: Analyze user's resume and extract relevant qualifications
    """
    print("📄 Agent 3: Analyzing user resume...")

    llm = ChatOpenAI(
        model="gpt-4o-mini",
        temperature=0.3,
        api_key=settings.OPENAI_API_KEY
    )

    try:
        if not state.get("user_resume"):
            state["user_qualifications"] = {
                "note": "No resume provided"
            }
            state["progress_messages"].append("⚠️ No resume found (continuing)")
            return state

        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an expert resume analyzer.
Analyze the resume and extract:
1. Key skills (technical and soft skills)
2. Relevant work experience
3. Education and certifications
4. Notable achievements
5. Years of experience

Match these to the job requirements provided.
Focus on strengths that align with the job."""),
            ("human", """Job Requirements:
{job_requirements}

User Resume:
{resume}

Extract and organize relevant qualifications.""")
        ])

        chain = prompt | llm
        response = chain.invoke({
            "job_requirements": str(state.get("job_requirements", {})),
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
