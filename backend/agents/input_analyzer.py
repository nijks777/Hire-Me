from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from agents.state import AgentState
from app.config import settings

def input_analyzer_agent(state: AgentState) -> AgentState:
    """
    Agent 1: Analyze job description and extract key requirements
    """
    print("🔍 Agent 1: Analyzing job description...")

    llm = ChatOpenAI(
        model="gpt-4o-mini",
        temperature=0.3,
        api_key=settings.OPENAI_API_KEY
    )

    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are an expert job description analyzer.
Extract and structure the following information from the job description:
1. Key required skills (technical and soft skills)
2. Required qualifications (education, experience)
3. Responsibilities
4. Company values/culture indicators
5. Job title and level

Return as structured JSON."""),
        ("human", "Job Description:\n{job_description}\n\nCompany: {company_name}")
    ])

    chain = prompt | llm

    try:
        response = chain.invoke({
            "job_description": state["job_description"],
            "company_name": state["company_name"]
        })

        # Parse LLM response (simplified - you'd want proper JSON parsing)
        job_requirements = {
            "raw_analysis": response.content,
            "company_name": state["company_name"]
        }

        state["job_requirements"] = job_requirements
        state["progress_messages"].append("✅ Job description analyzed successfully")
        state["current_agent"] = "input_analyzer"

    except Exception as e:
        state["errors"].append(f"Input Analyzer Error: {str(e)}")
        state["progress_messages"].append("❌ Failed to analyze job description")

    return state
