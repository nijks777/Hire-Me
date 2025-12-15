from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from agents.state import AgentState
from app.config import settings
from utils.langsmith_config import trace_agent, get_traced_llm

@trace_agent("research_agent", run_type="chain", tags=["job-application", "research", "agent-2"])
def research_agent(state: AgentState) -> AgentState:
    """
    Agent 2: Research company information
    Uses LLM knowledge (no web search for now - can add Tavily later)
    """
    print("🔎 Agent 2: Researching company information...")

    llm = get_traced_llm(
        model="gpt-4o-mini",
        temperature=0.3,
        tags=["company-research", "analysis"],
        metadata={"agent": "research_agent", "step": 2}
    )

    try:
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a company research analyst.
Based on your knowledge, provide comprehensive information about the company:
1. Company mission/values
2. Company culture and work environment
3. Industry position and competitors
4. Recent achievements or news (if known)
5. Key facts relevant for job applicants
6. What makes this company unique

Be specific and factual. If you don't have specific information, provide general insights about the industry and what job seekers should know.
Focus on information that would help someone write a compelling cover letter."""),
            ("human", """Company: {company_name}

Job Context: {job_requirements}

Provide detailed research about this company that will help craft a personalized job application.""")
        ])

        chain = prompt | llm
        response = chain.invoke({
            "company_name": state["company_name"],
            "job_requirements": str(state.get("job_requirements", {}))
        })

        company_research = {
            "summary": response.content,
            "company_name": state["company_name"],
            "note": "Based on LLM knowledge"
        }

        state["company_research"] = company_research
        state["progress_messages"].append("✅ Company research completed")
        state["current_agent"] = "research"

    except Exception as e:
        print(f"Research error: {e}")
        # Continue with basic info
        state["company_research"] = {
            "summary": f"Research unavailable. Company: {state['company_name']}",
            "error": str(e)
        }
        state["errors"].append(f"Research Agent Error: {str(e)}")
        state["progress_messages"].append("⚠️ Company research limited (continuing)")

    return state
