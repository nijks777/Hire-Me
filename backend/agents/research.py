from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_community.tools.tavily_search import TavilySearchResults
from agents.state import AgentState
from app.config import settings

def research_agent(state: AgentState) -> AgentState:
    """
    Agent 2: Research company information using web search
    """
    print("🔎 Agent 2: Researching company information...")

    llm = ChatOpenAI(
        model="gpt-4o-mini",
        temperature=0.3,
        api_key=settings.OPENAI_API_KEY
    )

    try:
        # Web search for company information
        if settings.TAVILY_API_KEY and settings.TAVILY_API_KEY != "your-tavily-api-key-here":
            search = TavilySearchResults(
                max_results=3,
                api_key=settings.TAVILY_API_KEY
            )

            # Search for company info
            search_query = f"{state['company_name']} company culture values recent news"
            search_results = search.invoke(search_query)

            # Synthesize search results
            prompt = ChatPromptTemplate.from_messages([
                ("system", """You are a company research analyst.
Analyze the search results and extract:
1. Company mission/values
2. Company culture
3. Recent news or achievements
4. Industry position
5. Key facts relevant for job application

Be concise and focus on what matters for a job applicant."""),
                ("human", "Company: {company_name}\n\nSearch Results:\n{search_results}")
            ])

            chain = prompt | llm
            response = chain.invoke({
                "company_name": state["company_name"],
                "search_results": str(search_results)
            })

            company_research = {
                "summary": response.content,
                "sources": search_results
            }
        else:
            # Fallback: Use LLM knowledge if no Tavily API key
            prompt = ChatPromptTemplate.from_messages([
                ("system", """You are a company research analyst.
Based on your knowledge, provide information about:
1. Company mission/values
2. Company culture (if known)
3. Industry position
4. Key facts relevant for job application

If you don't have specific information, provide general insights about the industry."""),
                ("human", "Company: {company_name}")
            ])

            chain = prompt | llm
            response = chain.invoke({
                "company_name": state["company_name"]
            })

            company_research = {
                "summary": response.content,
                "note": "Based on general knowledge (no web search)"
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
        state["progress_messages"].append("⚠️ Company research limited (continuing)")

    return state
