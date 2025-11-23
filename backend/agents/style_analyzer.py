from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from agents.state import AgentState
from app.config import settings

def style_analyzer_agent(state: AgentState) -> AgentState:
    """
    Agent 4: Analyze writing style from demo cover letter and cold email
    """
    print("✍️ Agent 4: Analyzing writing style...")

    llm = ChatOpenAI(
        model="gpt-4o-mini",
        temperature=0.3,
        api_key=settings.OPENAI_API_KEY
    )

    try:
        has_cover_letter = bool(state.get("demo_cover_letter"))
        has_cold_email = bool(state.get("demo_cold_email"))

        if not has_cover_letter and not has_cold_email:
            state["writing_style"] = {
                "tone": "professional",
                "style": "standard",
                "note": "No demo documents provided - using default professional style"
            }
            state["progress_messages"].append("⚠️ No demo docs (using default style)")
            return state

        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a writing style analyst.
Analyze the provided documents and identify:
1. Tone (formal, casual, enthusiastic, etc.)
2. Writing style (concise, detailed, storytelling, etc.)
3. Sentence structure preferences
4. Key phrases or patterns
5. Personality traits expressed

Provide a style guide to replicate this writing."""),
            ("human", """Demo Cover Letter:
{cover_letter}

Demo Cold Email:
{cold_email}

Analyze the writing style.""")
        ])

        chain = prompt | llm
        response = chain.invoke({
            "cover_letter": state.get("demo_cover_letter", "Not provided"),
            "cold_email": state.get("demo_cold_email", "Not provided")
        })

        state["writing_style"] = {
            "analysis": response.content,
            "has_cover_letter": has_cover_letter,
            "has_cold_email": has_cold_email
        }
        state["progress_messages"].append("✅ Writing style analyzed")
        state["current_agent"] = "style_analyzer"

    except Exception as e:
        print(f"Style analyzer error: {e}")
        state["errors"].append(f"Style Analyzer Error: {str(e)}")
        state["writing_style"] = {
            "tone": "professional",
            "note": "Error in analysis - using default"
        }
        state["progress_messages"].append("⚠️ Style analysis error (using defaults)")

    return state
