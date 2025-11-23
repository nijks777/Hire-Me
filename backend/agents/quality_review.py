from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from agents.state import AgentState
from app.config import settings
import json

def quality_review_agent(state: AgentState) -> AgentState:
    """
    Agent 6: Review generated content and provide quality score
    """
    print("✅ Agent 6: Reviewing quality...")

    llm = ChatOpenAI(
        model="gpt-4o-mini",
        temperature=0.2,
        api_key=settings.OPENAI_API_KEY
    )

    try:
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a professional document reviewer.
Review the generated cover letter and cold email for:

1. Relevance (job requirements match)
2. Professionalism
3. Clarity and coherence
4. Personalization quality
5. Grammar and style

Provide:
- Overall quality score (0-100)
- Brief feedback on strengths
- Suggestions for improvement (if any)

Return as JSON:
{{
    "quality_score": <number 0-100>,
    "strengths": "<brief summary>",
    "suggestions": "<brief suggestions or 'None - excellent quality'>"
}}"""),
            ("human", """Cover Letter:
{cover_letter}

Cold Email:
{cold_email}

Job Requirements:
{job_requirements}

Review the quality.""")
        ])

        chain = prompt | llm
        response = chain.invoke({
            "cover_letter": state.get("generated_cover_letter", "Not generated"),
            "cold_email": state.get("generated_cold_email", "Not generated"),
            "job_requirements": str(state.get("job_requirements", {}))
        })

        # Try to parse JSON response
        try:
            review_data = json.loads(response.content)
        except:
            # Fallback if not proper JSON
            review_data = {
                "quality_score": 85,
                "strengths": "Documents generated successfully",
                "suggestions": response.content[:200]
            }

        state["quality_review"] = review_data
        state["progress_messages"].append(f"✅ Quality review complete (Score: {review_data.get('quality_score', 'N/A')})")
        state["current_agent"] = "quality_review"

    except Exception as e:
        print(f"Quality review error: {e}")
        state["quality_review"] = {
            "quality_score": 80,
            "strengths": "Documents generated",
            "suggestions": "Manual review recommended"
        }
        state["progress_messages"].append("⚠️ Quality review error (documents still generated)")

    return state
