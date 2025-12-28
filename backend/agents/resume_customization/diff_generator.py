"""
Agent 9: Diff Generator
Generates a detailed diff/changelog of resume changes
"""
from langchain_core.prompts import ChatPromptTemplate
from agents.resume_customization.state import ResumeCustomizationState
from utils.langsmith_config import trace_agent, get_traced_llm
import json
import difflib


@trace_agent("diff_generator", run_type="chain", tags=["resume-customization", "diff-generation", "agent-9"])
def diff_generator_agent(state: ResumeCustomizationState) -> ResumeCustomizationState:
    """
    Agent 9: Generate diff report showing changes

    Creates:
    1. Side-by-side comparison of major changes
    2. List of projects removed vs added
    3. Summary of experience bullet changes
    4. ATS score improvement
    5. Human-readable changelog
    """
    print("📊 Agent 9: Generating diff report...")

    user_resume = state.get("user_resume", "")
    customized_resume = state.get("customized_resume", "")
    parsed_resume = state.get("parsed_resume", {})
    matched_projects = state.get("matched_projects", [])
    optimized_experience = state.get("optimized_experience", [])
    ats_score = state.get("ats_score", 0)

    try:
        if not customized_resume:
            print("  ⚠️ No customized resume to compare")
            state["diff_report"] = {"error": "No resume to compare"}
            return state

        # Calculate text diff using difflib
        original_lines = user_resume.split("\n")
        customized_lines = customized_resume.split("\n")

        differ = difflib.Differ()
        diff = list(differ.compare(original_lines, customized_lines))

        # Count changes
        additions = sum(1 for line in diff if line.startswith("+ "))
        deletions = sum(1 for line in diff if line.startswith("- "))
        unchanged = sum(1 for line in diff if line.startswith("  "))

        # Use LLM to generate human-readable changelog
        llm = get_traced_llm(
            model="gpt-4o-mini",  # Use mini for cost savings
            temperature=0.2,
            tags=["diff-generation", "changelog"],
            metadata={"agent": "diff_generator", "step": 9}
        )

        changelog_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an expert at analyzing resume changes and creating clear changelogs.

Your task is to generate a user-friendly changelog that highlights the key changes made.

Return a JSON object (use double curly braces in your response):
{{
  "summary": "Brief 1-2 sentence summary of changes",
  "projects_changes": {{
    "removed": ["Project 1", "Project 2"],
    "added": ["New GitHub Project 1", "New GitHub Project 2"],
    "total_swapped": 2
  }},
  "experience_changes": {{
    "entries_modified": 3,
    "bullets_reworded": 12,
    "keywords_added": ["keyword1", "keyword2"],
    "major_changes": ["Highlighted Next.js experience", "Added AWS keywords"]
  }},
  "ats_improvements": {{
    "estimated_before": 60,
    "after": 85,
    "improvement": "+25 points"
  }},
  "key_improvements": [
    "Replaced outdated projects with recent GitHub work",
    "Optimized experience bullets for ATS keywords",
    "Improved keyword density for required technologies"
  ]
}}
"""),
            ("human", """Original Resume (excerpt):
{original_resume_excerpt}

New Resume (excerpt):
{customized_resume_excerpt}

Original Projects:
{original_projects}

New Matched Projects:
{matched_projects}

Optimized Experience:
{optimized_experience}

ATS Score: {ats_score}

Generate a clear, concise changelog highlighting the improvements made.""")
        ])

        chain = changelog_prompt | llm
        response = chain.invoke({
            "original_resume_excerpt": user_resume[:1000],  # First 1000 chars
            "customized_resume_excerpt": customized_resume[:1000],
            "original_projects": json.dumps(parsed_resume.get("projects", []), indent=2),
            "matched_projects": json.dumps(matched_projects, indent=2),
            "optimized_experience": json.dumps(optimized_experience, indent=2),
            "ats_score": ats_score
        })

        # Parse JSON response
        try:
            changelog = json.loads(response.content)
        except json.JSONDecodeError:
            # Fallback: extract JSON from markdown code block
            content = response.content
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
            changelog = json.loads(content)

        # Create comprehensive diff report
        diff_report = {
            "changelog": changelog,
            "statistics": {
                "lines_added": additions,
                "lines_removed": deletions,
                "lines_unchanged": unchanged,
                "total_lines": len(customized_lines),
                "change_percentage": round((additions + deletions) / len(original_lines) * 100, 2) if original_lines else 0
            },
            "raw_diff": "\n".join(diff[:100]),  # First 100 lines of diff
            "ats_score": ats_score
        }

        state["diff_report"] = diff_report
        state["progress_messages"].append(
            f"✅ Diff report generated: {additions} additions, {deletions} deletions"
        )
        state["current_agent"] = "diff_generator"

        # Print summary
        print(f"  📊 Changes: +{additions} lines, -{deletions} lines ({diff_report['statistics']['change_percentage']:.1f}% changed)")
        print(f"  📝 Summary: {changelog.get('summary', 'N/A')}")

        if changelog.get("key_improvements"):
            print("  ✨ Key Improvements:")
            for improvement in changelog["key_improvements"][:3]:
                print(f"    • {improvement}")

    except Exception as e:
        print(f"  ❌ Diff generation error: {e}")
        state["errors"].append(f"Diff Generator Error: {str(e)}")
        state["diff_report"] = {
            "error": str(e),
            "changelog": {"summary": "Error generating diff"}
        }

    return state
