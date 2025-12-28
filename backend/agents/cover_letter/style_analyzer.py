"""
Agent 6: Style Analyzer
Analyzes writing style with web search fallback
"""
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from utils.langsmith_config import get_traced_llm
from agents.cover_letter.state import CoverLetterState
from tavily import TavilyClient
import json
import os


def style_analyzer_agent(state: CoverLetterState) -> CoverLetterState:
    """
    Analyze or generate writing style guide:
    1. If user has demo cover letters -> analyze their style
    2. Else -> web search for professional examples
    3. Else -> generate default professional style
    """
    print("🎨 Agent 6: Style Analyzer")

    document_type = state.get("document_type", "cover_letter")
    job_analysis = state.get("job_analysis", {})
    seniority = job_analysis.get("seniority_level", "mid")

    try:
        # For now, use web search to find style examples
        tavily_api_key = os.getenv("TAVILY_API_KEY")

        if tavily_api_key:
            print(f"  → Searching for {document_type} style examples...")
            tavily_client = TavilyClient(api_key=tavily_api_key)

            # Search for professional examples
            search_results = tavily_client.search(
                query=f"professional {document_type} examples {seniority} level best practices 2024",
                max_results=3
            )

            examples_content = "\n\n".join([
                f"Example {i+1}: {result.get('content', '')[:400]}"
                for i, result in enumerate(search_results.get("results", []))
            ])
        else:
            examples_content = "No examples found - using default professional style"

        # Use LLM to create style guide
        llm = get_traced_llm(
            model="gpt-4o-mini",
            temperature=0.3,
            tags=["style-analysis", document_type],
            metadata={"agent": "style_analyzer", "step": 6}
        )

        prompt = ChatPromptTemplate.from_messages([
            ("system", f"""You are a professional writing coach. Create a style guide for {document_type}s.

Return a JSON object with this structure (use double curly braces in your response):

{{{{
  "tone": "professional/conversational/formal",
  "structure": {{{{
    "opening": "how to start",
    "body": "how to structure main content",
    "closing": "how to end"
  }}}},
  "dos": ["do 1", "do 2", "do 3"],
  "donts": ["don't 1", "don't 2", "don't 3"],
  "key_phrases": ["phrase 1", "phrase 2"],
  "length_guideline": "3-4 paragraphs",
  "personalization_tips": ["tip 1", "tip 2"]
}}}}

Focus on modern, authentic, and engaging writing."""),
            ("human", """Document Type: {document_type}
Seniority Level: {seniority}

Professional Examples:
{examples}

Create a style guide that sounds natural and professional, not AI-generated.""")
        ])

        chain = prompt | llm
        response = chain.invoke({
            "document_type": document_type,
            "seniority": seniority,
            "examples": examples_content
        })

        # Parse response
        content = response.content.strip()
        if content.startswith("```json"):
            content = content[7:]
        if content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]

        writing_style = json.loads(content.strip())
        writing_style["source"] = "tavily_search" if tavily_api_key else "default"

        state["writing_style"] = writing_style
        state["progress_messages"].append(f"✅ Style guide created: {writing_style['tone']} tone")
        state["current_agent"] = "style_analyzer"

        print(f"  ✅ Tone: {writing_style['tone']}")
        print(f"  ✅ Structure guidelines created")

    except Exception as e:
        print(f"  ❌ Style Analyzer error: {e}")
        state["errors"].append(f"Style Analyzer Error: {str(e)}")
        # Fallback style
        state["writing_style"] = {
            "tone": "professional",
            "structure": {"opening": "Start with enthusiasm", "body": "Highlight qualifications", "closing": "Call to action"},
            "dos": ["Be specific", "Show enthusiasm", "Use active voice"],
            "donts": ["Avoid clichés", "Don't be generic", "Don't overuse 'I'"],
            "source": "fallback"
        }

    return state
