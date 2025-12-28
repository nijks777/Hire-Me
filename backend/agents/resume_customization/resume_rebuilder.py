"""
Agent 6: Resume Rebuilder
Reconstructs resume with matched projects and optimized experience
"""
from langchain_core.prompts import ChatPromptTemplate
from agents.resume_customization.state import ResumeCustomizationState
from utils.langsmith_config import trace_agent, get_traced_llm
import json


@trace_agent("resume_rebuilder", run_type="chain", tags=["resume-customization", "resume-rebuild", "agent-6"])
def resume_rebuilder_agent(state: ResumeCustomizationState) -> ResumeCustomizationState:
    """
    Agent 6: Rebuild resume with new projects and optimized experience

    Process:
    1. Take original resume structure
    2. Replace projects section with matched GitHub projects
    3. Replace experience bullets with optimized versions
    4. Update live links with GitHub URLs
    5. Preserve all other sections (skills, education, etc.)
    6. Maintain original formatting and structure
    """
    print("🔨 Agent 6: Rebuilding resume...")

    parsed_resume = state.get("parsed_resume", {})
    matched_projects = state.get("matched_projects", [])
    optimized_experience = state.get("optimized_experience", [])
    user_resume = state.get("user_resume", "")

    try:
        llm = get_traced_llm(
            model="gpt-4o-mini",
            temperature=0.1,  # Very low temperature to preserve structure
            tags=["resume-rebuild", "formatting"],
            metadata={"agent": "resume_rebuilder", "step": 6}
        )

        rebuild_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an expert resume formatter. Your task is to rebuild the resume with updated sections.

CRITICAL RULES:
1. **PRESERVE STRUCTURE** - Maintain the exact same resume format and layout
2. **REPLACE PROJECTS** - Replace the projects section with new matched projects
3. **UPDATE EXPERIENCE** - Use optimized experience bullets
4. **UPDATE LINKS** - Replace old project links with new GitHub/live links
5. **KEEP EVERYTHING ELSE** - Skills, education, certifications stay exactly the same
6. **NO HALLUCINATION** - Only use provided data

Return the complete resume as a markdown-formatted string that preserves the original structure."""),
            ("human", """Original Resume:
{original_resume}

Parsed Structure:
{parsed_resume}

NEW PROJECTS (replace old projects section):
{matched_projects}

OPTIMIZED EXPERIENCE (replace old experience bullets):
{optimized_experience}

Rebuild the resume with:
- Same personal info, header, format
- Updated EXPERIENCE section with optimized bullets
- Updated PROJECTS section with matched GitHub projects (include live links and GitHub links)
- Same SKILLS, EDUCATION, CERTIFICATIONS sections
- Professional formatting

Return ONLY the complete resume text (markdown format).""")
        ])

        chain = rebuild_prompt | llm
        response = chain.invoke({
            "original_resume": user_resume,
            "parsed_resume": json.dumps(parsed_resume, indent=2),
            "matched_projects": json.dumps(matched_projects, indent=2),
            "optimized_experience": json.dumps(optimized_experience, indent=2)
        })

        customized_resume = response.content.strip()

        # Remove markdown code fences if present
        if customized_resume.startswith("```"):
            # Remove first line and last line
            lines = customized_resume.split("\n")
            customized_resume = "\n".join(lines[1:-1]) if len(lines) > 2 else customized_resume

        state["customized_resume"] = customized_resume
        state["progress_messages"].append("✅ Resume rebuilt with new projects and optimized experience")
        state["current_agent"] = "resume_rebuilder"

        # Calculate rough word count change
        original_words = len(user_resume.split())
        new_words = len(customized_resume.split())
        word_diff = new_words - original_words

        print(f"  ✅ Resume rebuilt successfully")
        print(f"  📊 Word count: {original_words} → {new_words} ({word_diff:+d} words)")

    except Exception as e:
        print(f"  ❌ Resume rebuild error: {e}")
        state["errors"].append(f"Resume Rebuilder Error: {str(e)}")
        # Fallback: use original resume
        state["customized_resume"] = user_resume

    return state
