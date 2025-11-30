from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from agents.state import AgentState
from app.config import settings

def style_analyzer_agent(state: AgentState) -> AgentState:
    """
    Agent 4: Analyze user's writing style from demo files (cover letter & cold email)
    """
    print("✍️  Agent 4: Analyzing writing style...")

    llm = ChatOpenAI(
        model="gpt-4o-mini",
        temperature=0.3,
        api_key=settings.OPENAI_API_KEY
    )

    try:
        # Check if demo files are provided
        demo_cover_letter = state.get("demo_cover_letter")
        demo_cold_email = state.get("demo_cold_email")

        if not demo_cover_letter and not demo_cold_email:
            state["writing_style"] = {
                "note": "No demo files provided - will use default professional style"
            }
            state["progress_messages"].append("⚠️ No demo files found (using default style)")
            return state

        # Prepare demo content
        demo_content = ""
        if demo_cover_letter:
            demo_content += f"\n--- COVER LETTER SAMPLE ---\n{demo_cover_letter}\n"
        if demo_cold_email:
            demo_content += f"\n--- COLD EMAIL SAMPLE ---\n{demo_cold_email}\n"

        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an expert writing style analyzer.
Analyze the provided writing samples and extract:
1. Tone (formal, semi-formal, casual, enthusiastic, etc.)
2. Voice (active/passive, first-person perspective)
3. Sentence structure (short/concise, long/detailed, varied)
4. Vocabulary level (simple, intermediate, advanced/technical)
5. Key phrases and expressions commonly used
6. Opening and closing styles
7. Paragraph structure and organization
8. Use of storytelling or data-driven approach
9. Unique stylistic elements or patterns

Provide detailed analysis that can be used to replicate this writing style."""),
            ("human", """Analyze the following writing samples:
{demo_content}

Extract and describe the writing style in detail so it can be replicated in new documents.""")
        ])

        chain = prompt | llm
        response = chain.invoke({
            "demo_content": demo_content
        })

        state["writing_style"] = {
            "analysis": response.content,
            "has_demo_files": True,
            "demo_cover_letter_provided": bool(demo_cover_letter),
            "demo_cold_email_provided": bool(demo_cold_email)
        }
        state["progress_messages"].append("✅ Writing style analyzed successfully")
        state["current_agent"] = "style_analyzer"

    except Exception as e:
        print(f"Style analyzer error: {e}")
        state["errors"].append(f"Style Analyzer Error: {str(e)}")
        state["progress_messages"].append("❌ Style analysis failed")

    return state
