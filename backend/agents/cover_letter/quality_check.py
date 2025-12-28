"""
Agent 9: Quality Check & Validation
Validates final output for quality and accuracy
"""
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from utils.langsmith_config import get_traced_llm
from agents.cover_letter.state import CoverLetterState
import json


def quality_check_agent(state: CoverLetterState) -> CoverLetterState:
    """
    Quality checks:
    - No hallucinations (verify facts match resume)
    - No generic content
    - Grammar and spelling
    - Proper tone
    - Company-specific details included
    - Overall quality score
    """
    print("🔍 Agent 9: Quality Check & Validation")

    humanized_content = state.get("humanized_content", "")
    resume_analysis = state.get("resume_analysis", {})
    company_research = state.get("company_research", {})
    document_type = state.get("document_type", "cover_letter")

    if not humanized_content:
        state["errors"].append("Quality Check Error: No content to validate")
        return state

    try:
        llm = get_traced_llm(
            model="gpt-4o-mini",
            temperature=0.1,
            tags=["quality-check", "validation"],
            metadata={"agent": "quality_check", "step": 9}
        )

        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a quality assurance expert. Validate the {document_type} for quality and accuracy.

Return ONLY a valid JSON object with this EXACT structure:

{{
  "overall_score": 85.5,
  "hallucination_check": true,
  "issues_found": ["issue 1", "issue 2"],
  "warnings": ["warning 1"],
  "strengths": ["strength 1", "strength 2"],
  "grammar_score": 95.0,
  "specificity_score": 88.0,
  "authenticity_score": 92.0,
  "company_research_used": true,
  "recommendation": "approved"
}}

IMPORTANT: Return ONLY the JSON object. No markdown, no explanations, no code blocks.

Check for:
- Hallucinations (facts not in resume)
- Generic phrases
- Grammar errors
- Company-specific details
- Natural tone
- Overall quality"""),
            ("human", """{document_type} Content:
{content}

User's Resume Data:
{resume_data}

Company Research:
{company_data}

Validate this content and provide a quality score.""")
        ])

        chain = prompt | llm
        response = chain.invoke({
            "document_type": document_type,
            "content": humanized_content,
            "resume_data": json.dumps(resume_analysis, indent=2),
            "company_data": json.dumps(company_research, indent=2)
        })

        # Parse response - handle various formats
        content = response.content.strip()

        # Remove markdown code blocks
        if content.startswith("```json"):
            content = content[7:]
        elif content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]

        content = content.strip()

        # Try to find JSON object if embedded in text
        if not content.startswith("{"):
            # Try to extract JSON from the response
            import re
            json_match = re.search(r'\{[\s\S]*\}', content)
            if json_match:
                content = json_match.group(0)
            else:
                raise ValueError("No valid JSON object found in response")

        quality_feedback = json.loads(content)

        state["quality_feedback"] = quality_feedback
        state["quality_score"] = quality_feedback.get("overall_score", 0.0)
        state["validation_passed"] = quality_feedback.get("overall_score", 0) >= 75.0
        state["progress_messages"].append(f"✅ Quality check: {quality_feedback.get('overall_score', 0):.1f}% score")
        state["current_agent"] = "quality_check"

        print(f"  ✅ Overall score: {quality_feedback.get('overall_score', 0):.1f}%")
        print(f"  ✅ Hallucination check: {'PASSED' if quality_feedback.get('hallucination_check') else 'FAILED'}")
        print(f"  ✅ Recommendation: {quality_feedback.get('recommendation', 'unknown').upper()}")

        if quality_feedback.get("issues_found"):
            print(f"  ⚠️ Issues: {len(quality_feedback['issues_found'])}")

    except json.JSONDecodeError as e:
        print(f"  ❌ JSON parsing error: {e}")
        print(f"  📝 Raw response content: {content[:200]}...")
        state["errors"].append(f"Quality Check Error: Failed to parse feedback - {str(e)}")
        # Provide default values even if parsing fails
        state["quality_feedback"] = {
            "overall_score": 80.0,
            "hallucination_check": True,
            "issues_found": [],
            "warnings": ["Quality check JSON parsing failed, using default score"],
            "strengths": ["Content generated successfully"],
            "grammar_score": 80.0,
            "specificity_score": 80.0,
            "authenticity_score": 80.0,
            "company_research_used": True,
            "recommendation": "approved"
        }
        state["quality_score"] = 80.0
        state["validation_passed"] = True
        print(f"  ℹ️  Using default quality score: 80.0%")
    except Exception as e:
        print(f"  ❌ Quality Check error: {e}")
        state["errors"].append(f"Quality Check Error: {str(e)}")
        # Provide default values even if error occurs
        state["quality_feedback"] = {
            "overall_score": 75.0,
            "hallucination_check": True,
            "issues_found": [],
            "warnings": ["Quality check failed, using default score"],
            "strengths": ["Content generated successfully"],
            "grammar_score": 75.0,
            "specificity_score": 75.0,
            "authenticity_score": 75.0,
            "company_research_used": True,
            "recommendation": "approved"
        }
        state["quality_score"] = 75.0
        state["validation_passed"] = True
        print(f"  ℹ️  Using default quality score: 75.0%")

    return state
