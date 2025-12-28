"""
Agent 2: Research Agent
Runs in PARALLEL with Input Analyzer
Uses Tavily API for real company research
"""
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from utils.langsmith_config import get_traced_llm
from agents.cover_letter.state import CoverLetterState
from tavily import TavilyClient
import json
import os


def research_agent(state: CoverLetterState) -> CoverLetterState:
    """
    Research company using Tavily API:
    - Company overview & mission
    - Recent news & achievements
    - Company culture & values
    - Glassdoor reviews (if available)
    - Industry trends
    """
    print("🔎 Agent 2: Research Agent (Running in parallel...)")

    company_name = state.get("company_name", "")
    job_title = state.get("job_title") or "position"

    if not company_name:
        state["errors"].append("Research Agent Error: No company name provided")
        return state

    try:
        # Initialize Tavily client
        tavily_api_key = os.getenv("TAVILY_API_KEY")
        if not tavily_api_key:
            print("  ⚠️ No Tavily API key found - using mock research")
            state["company_research"] = {
                "company_overview": f"{company_name} is a leading company in their industry.",
                "recent_news": ["Mock news: Company expanding operations"],
                "culture": "Collaborative and innovative work environment",
                "glassdoor_rating": "N/A",
                "key_values": ["Innovation", "Teamwork", "Excellence"],
                "source": "mock"
            }
            state["progress_messages"].append(f"⚠️ Used mock research for {company_name}")
            return state

        tavily_client = TavilyClient(api_key=tavily_api_key)

        # Search 1: Company overview
        print(f"  → Searching company overview...")
        overview_results = tavily_client.search(
            query=f"{company_name} company overview mission values culture",
            max_results=3
        )

        # Search 2: Recent news
        print(f"  → Searching recent news...")
        news_results = tavily_client.search(
            query=f"{company_name} recent news achievements 2024 2025",
            max_results=3
        )

        # Search 3: Glassdoor / employee reviews
        print(f"  → Searching employee reviews...")
        review_results = tavily_client.search(
            query=f"{company_name} glassdoor reviews employee experience culture",
            max_results=2
        )

        # Search 4: Job-specific insights
        print(f"  → Searching job insights...")
        job_results = tavily_client.search(
            query=f"{company_name} {job_title} role responsibilities team",
            max_results=2
        )

        # Combine all search results
        all_results = {
            "overview": overview_results.get("results", []),
            "news": news_results.get("results", []),
            "reviews": review_results.get("results", []),
            "job_insights": job_results.get("results", [])
        }

        # Use LLM to synthesize research into structured format
        llm = get_traced_llm(
            model="gpt-4o-mini",
            temperature=0.3,
            tags=["research-synthesis", "company-research"],
            metadata={"agent": "research_agent", "step": 2}
        )

        synthesis_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a company research analyst. Synthesize web search results into a structured company profile.

Return a JSON object with this structure (use double curly braces in your response):

{{
  "company_overview": "2-3 sentence overview of the company",
  "mission": "company mission statement",
  "recent_news": ["news item 1", "news item 2", "news item 3"],
  "culture_values": ["value 1", "value 2", "value 3"],
  "glassdoor_rating": "4.2/5 or N/A if not found",
  "employee_sentiment": "positive/neutral/negative with brief reason",
  "key_achievements": ["achievement 1", "achievement 2"],
  "industry_position": "market leader/growing company/startup/etc",
  "why_work_here": ["reason 1", "reason 2", "reason 3"],
  "sources_used": ["source 1", "source 2"]
}}

Be factual and specific. Use actual data from search results."""),
            ("human", """Company: {company_name}
Job Title: {job_title}

Search Results:

Overview Sources:
{overview_content}

Recent News:
{news_content}

Employee Reviews:
{reviews_content}

Job Insights:
{job_content}

Synthesize this information into a structured company profile.""")
        ])

        # Extract content from search results
        def extract_content(results_list):
            return "\n\n".join([
                f"- {result.get('title', 'No title')}: {result.get('content', 'No content')[:300]}..."
                for result in results_list
            ]) or "No results found"

        chain = synthesis_prompt | llm
        response = chain.invoke({
            "company_name": company_name,
            "job_title": job_title,
            "overview_content": extract_content(all_results["overview"]),
            "news_content": extract_content(all_results["news"]),
            "reviews_content": extract_content(all_results["reviews"]),
            "job_content": extract_content(all_results["job_insights"])
        })

        # Parse response
        content = response.content.strip()
        if content.startswith("```json"):
            content = content[7:]
        if content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]

        company_research = json.loads(content.strip())
        company_research["source"] = "tavily"
        company_research["search_results_count"] = sum(len(v) for v in all_results.values())

        state["company_research"] = company_research
        state["progress_messages"].append(f"✅ Researched {company_name} ({company_research['search_results_count']} sources)")
        state["current_agent"] = "research_agent"

        print(f"  ✅ Company overview: {company_research.get('company_overview', '')[:80]}...")
        print(f"  ✅ Found {len(company_research.get('recent_news', []))} news items")
        print(f"  ✅ Glassdoor rating: {company_research.get('glassdoor_rating', 'N/A')}")

    except json.JSONDecodeError as e:
        print(f"  ❌ JSON parsing error: {e}")
        state["errors"].append(f"Research Agent Error: Failed to parse research - {str(e)}")
    except Exception as e:
        print(f"  ❌ Research Agent error: {e}")
        state["errors"].append(f"Research Agent Error: {str(e)}")
        # Fallback to mock research
        state["company_research"] = {
            "company_overview": f"{company_name} is a company in the industry.",
            "recent_news": [],
            "culture_values": [],
            "source": "fallback"
        }

    return state
