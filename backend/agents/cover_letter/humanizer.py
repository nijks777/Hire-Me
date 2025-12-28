"""
Agent 8: Humanization Agent
Makes AI-generated content sound natural and authentic
"""
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from utils.langsmith_config import get_traced_llm
from agents.cover_letter.state import CoverLetterState


def humanizer_agent(state: CoverLetterState) -> CoverLetterState:
    """
    Humanize AI-generated content:
    - Remove AI patterns and clichés
    - Add natural variations
    - Fix overly formal language
    - Add personality
    - Make it sound authentic
    """
    print("🤖→👤 Agent 8: Humanization Agent")

    generated_content = state.get("generated_content", "")

    if not generated_content:
        state["errors"].append("Humanization Agent Error: No content to humanize")
        return state

    try:
        llm = get_traced_llm(
            model="gpt-4o-mini",
            temperature=0.6,
            tags=["humanization", "post-processing"],
            metadata={"agent": "humanizer", "step": 8}
        )

        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an expert at making AI-written text sound human and authentic.

Your job: Remove AI patterns and make this sound like a real person wrote it.

AI PATTERNS TO REMOVE:
❌ "I am writing to express my interest..."
❌ "I am excited to apply..."
❌ "I believe I would be a great fit..."
❌ "I am confident that..."
❌ "It would be an honor..."
❌ "I look forward to hearing from you"
❌ Overuse of "passionate", "motivated", "dedicated"
❌ Overly formal language
❌ Perfect grammar (add slight natural variations)
❌ Repetitive sentence structures

HOW TO HUMANIZE:
✅ Start mid-conversation (skip preambles)
✅ Use contractions (I'm, you're, we've)
✅ Vary sentence length (mix short and long)
✅ Add subtle personality
✅ Use more specific, vivid language
✅ Sound confident but not robotic
✅ Natural transitions between ideas
✅ Conversational tone while staying professional

IMPORTANT: Keep all factual content (achievements, skills, numbers). Only change tone and phrasing."""),
            ("human", """Original content:
{content}

Make this sound like a real person wrote it. Keep the same information and length, just make it more natural and authentic.""")
        ])

        chain = prompt | llm
        response = chain.invoke({"content": generated_content})

        humanized_content = response.content.strip()

        state["humanized_content"] = humanized_content
        state["progress_messages"].append("✅ Content humanized and polished")
        state["current_agent"] = "humanizer"

        print(f"  ✅ Humanized content")
        print(f"  ✅ Before: {generated_content[:80]}...")
        print(f"  ✅ After: {humanized_content[:80]}...")

    except Exception as e:
        print(f"  ❌ Humanization Agent error: {e}")
        state["errors"].append(f"Humanization Agent Error: {str(e)}")
        # Fallback: use original content
        state["humanized_content"] = generated_content

    return state
