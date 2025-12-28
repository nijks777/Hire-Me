"""
Agent 5: Experience Optimizer
Optimizes experience section bullets to match job keywords without hallucinating
"""
from langchain_core.prompts import ChatPromptTemplate
from agents.resume_customization.state import ResumeCustomizationState
from utils.langsmith_config import trace_agent, get_traced_llm
import json


@trace_agent("experience_optimizer", run_type="chain", tags=["resume-customization", "experience-optimization", "agent-5"])
def experience_optimizer_agent(state: ResumeCustomizationState) -> ResumeCustomizationState:
    """
    Agent 5: Optimize experience bullets for ATS keywords

    CRITICAL RULES:
    - NO hallucination - only reword existing accomplishments
    - NO fake claims - use only real experience from resume
    - Highlight relevant skills that match job requirements
    - Reorder bullets to put most relevant first
    - Add ATS keywords naturally where they fit
    """
    print("✨ Agent 5: Optimizing experience section...")

    jd_analysis = state.get("jd_analysis", {})
    parsed_resume = state.get("parsed_resume", {})

    try:
        experience = parsed_resume.get("experience", [])

        if not experience:
            print("  ⚠️ No experience section found in resume")
            state["optimized_experience"] = []
            state["progress_messages"].append("⚠️ No experience to optimize")
            state["current_agent"] = "experience_optimizer"
            return state

        llm = get_traced_llm(
            model="gpt-4o-mini",
            temperature=0.2,  # Low temperature to prevent hallucination
            tags=["experience-optimization", "ats-keywords"],
            metadata={"agent": "experience_optimizer", "step": 5}
        )

        optimization_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an expert resume optimizer focused on ATS optimization.

Your task is to optimize experience bullets to match job requirements WITHOUT hallucinating.

CRITICAL RULES:
1. **NO HALLUCINATION** - Only reword existing accomplishments, never invent new ones
2. **PRESERVE TRUTH** - All claims must be backed by original resume content
3. **KEYWORD OPTIMIZATION** - Naturally incorporate relevant ATS keywords where they fit
4. **PRIORITIZE** - Reorder bullets to put most relevant first
5. **QUANTIFY** - Keep all metrics and numbers from original
6. **STRUCTURE** - Maintain professional bullet point format

For each experience entry, return optimized bullets that:
- Highlight skills matching the job requirements
- Use action verbs from the job description where appropriate
- Incorporate ATS keywords naturally
- Maintain original meaning and truthfulness

Return JSON array (use double curly braces in your response):
[
  {{
    "company": "...",
    "role": "...",
    "duration": "...",
    "original_bullets": ["...", "..."],
    "optimized_bullets": ["...", "..."],
    "changes_made": ["Reordered to prioritize X skill", "Added ATS keyword 'Y' naturally"],
    "keywords_added": ["keyword1", "keyword2"]
  }}
]
"""),
            ("human", """Job Requirements (focus on these keywords):
{jd_analysis}

Current Experience Section:
{experience}

Optimize each experience entry for ATS while preserving truth. Show what keywords you added.""")
        ])

        chain = optimization_prompt | llm
        response = chain.invoke({
            "jd_analysis": json.dumps(jd_analysis, indent=2),
            "experience": json.dumps(experience, indent=2)
        })

        # Parse JSON response
        try:
            optimized_experience = json.loads(response.content)
        except json.JSONDecodeError:
            # Fallback: extract JSON from markdown code block
            content = response.content
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
            optimized_experience = json.loads(content)

        state["optimized_experience"] = optimized_experience
        state["progress_messages"].append(
            f"✅ Experience optimization complete: {len(optimized_experience)} entries optimized"
        )
        state["current_agent"] = "experience_optimizer"

        # Count total keywords added
        total_keywords = sum(len(exp.get("keywords_added", [])) for exp in optimized_experience)
        print(f"  ✅ Optimized {len(optimized_experience)} experience entries")
        print(f"  ✅ Added {total_keywords} ATS keywords naturally")

    except Exception as e:
        print(f"  ❌ Experience optimization error: {e}")
        state["errors"].append(f"Experience Optimizer Error: {str(e)}")
        # Fallback: use original experience
        state["optimized_experience"] = parsed_resume.get("experience", [])

    return state
