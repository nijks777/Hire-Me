from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from agents.state import AgentState
from app.config import settings
from utils.langsmith_config import trace_agent, get_traced_llm
from tavily import TavilyClient
import os
import json

@trace_agent("research_agent", run_type="chain", tags=["job-application", "research", "agent-2", "tavily"])
def research_agent(state: AgentState) -> AgentState:
    """
    Agent 2: Research company information using Tavily Web Search
    Searches: Company info, Glassdoor reviews, job insights, culture, news
    """
    print("🔎 Agent 2: Researching company with Tavily Web Search...")

    company_name = state["company_name"]
    job_requirements = state.get("job_requirements", {})
    job_title = job_requirements.get("role_type", "position") if isinstance(job_requirements, dict) else "position"

    try:
        # Initialize Tavily client
        tavily_api_key = os.getenv("TAVILY_API_KEY")
        if not tavily_api_key:
            raise ValueError("TAVILY_API_KEY not found in environment")

        tavily = TavilyClient(api_key=tavily_api_key)

        # Search 1: Company overview and culture
        print(f"  → Searching company info for {company_name}...")
        company_search = tavily.search(
            query=f"{company_name} company culture values mission employee reviews",
            max_results=5,
            search_depth="advanced",
            include_domains=["glassdoor.com", "linkedin.com", "indeed.com"]
        )

        # Search 2: Recent news and achievements
        print(f"  → Searching recent news about {company_name}...")
        news_search = tavily.search(
            query=f"{company_name} recent news achievements products 2024 2025",
            max_results=3,
            search_depth="basic"
        )

        # Search 3: Job-specific insights
        print(f"  → Searching job insights for {job_title} at {company_name}...")
        job_search = tavily.search(
            query=f"{job_title} at {company_name} requirements skills interview experience",
            max_results=3,
            search_depth="basic"
        )

        # Combine all search results
        all_results = {
            "company_culture": company_search.get("results", []),
            "recent_news": news_search.get("results", []),
            "job_insights": job_search.get("results", [])
        }

        # Use LLM to synthesize research into structured insights
        llm = get_traced_llm(
            model="gpt-4o-mini",
            temperature=0.3,
            tags=["research-synthesis", "tavily-results"],
            metadata={"agent": "research_agent", "step": 2, "search_type": "tavily"}
        )

        synthesis_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a company research analyst synthesizing web search results.

Analyze the search results and create a comprehensive company profile with:
1. Company Overview (mission, values, what they do)
2. Company Culture (work environment, employee sentiment from reviews)
3. Recent News & Achievements (latest updates, products, milestones)
4. Job-Specific Insights (what they look for in candidates for this role)
5. Key Facts for Applicants (why join, unique selling points)

Be specific and cite sources. Focus on information useful for writing a compelling cover letter.
If reviews mention negatives, note them but frame constructively."""),
            ("human", """Company: {company_name}
Job Title: {job_title}

Search Results:
{search_results}

Synthesize this into a structured company research report.""")
        ])

        chain = synthesis_prompt | llm
        response = chain.invoke({
            "company_name": company_name,
            "job_title": job_title,
            "search_results": json.dumps(all_results, indent=2)
        })

        # Extract sources
        sources = []
        for category in all_results.values():
            for result in category:
                if result.get("url"):
                    sources.append({
                        "title": result.get("title", "Unknown"),
                        "url": result.get("url"),
                        "snippet": result.get("content", "")[:200]
                    })

        company_research = {
            "summary": response.content,
            "company_name": company_name,
            "sources": sources[:10],  # Top 10 sources
            "search_method": "Tavily Web Search",
            "searches_performed": 3,
            "total_results": len(sources)
        }

        state["company_research"] = company_research
        state["progress_messages"].append(f"✅ Company research completed ({len(sources)} sources found)")
        state["current_agent"] = "research"

        print(f"✅ Research complete: {len(sources)} sources analyzed")

    except Exception as e:
        print(f"❌ Research error: {e}")

        # Fallback to LLM knowledge if Tavily fails
        print("  → Falling back to LLM knowledge...")

        try:
            llm = get_traced_llm(
                model="gpt-4o-mini",
                temperature=0.3,
                tags=["company-research", "fallback"],
                metadata={"agent": "research_agent", "step": 2, "fallback": True}
            )

            fallback_prompt = ChatPromptTemplate.from_messages([
                ("system", """You are a company research analyst.
Based on your knowledge, provide information about the company.
Be honest if you don't have specific information."""),
                ("human", "Company: {company_name}\n\nProvide what you know about this company.")
            ])

            chain = fallback_prompt | llm
            response = chain.invoke({"company_name": company_name})

            state["company_research"] = {
                "summary": response.content,
                "company_name": company_name,
                "note": "Fallback: LLM knowledge (Tavily search unavailable)",
                "error": str(e)
            }
            state["progress_messages"].append("⚠️ Company research completed with fallback")

        except Exception as fallback_error:
            state["company_research"] = {
                "summary": f"Research unavailable. Company: {company_name}",
                "error": str(e)
            }
            state["errors"].append(f"Research Agent Error: {str(e)}")
            state["progress_messages"].append("⚠️ Company research failed (continuing)")

    return state
