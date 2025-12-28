"""
Agent 4: Project Matcher
Matches GitHub projects to job requirements and selects best ones for resume
"""
from langchain_core.prompts import ChatPromptTemplate
from agents.resume_customization.state import ResumeCustomizationState
from utils.langsmith_config import trace_agent, get_traced_llm
import json
import os


@trace_agent("project_matcher", run_type="chain", tags=["resume-customization", "project-matching", "agent-4"])
def project_matcher_agent(state: ResumeCustomizationState) -> ResumeCustomizationState:
    """
    Agent 4: Match GitHub projects to job requirements

    Process:
    1. Analyze job requirements tech stack
    2. Score each GitHub repo based on relevance
    3. Select top N projects (configurable via env)
    4. Prepare project descriptions from READMEs
    5. Extract live links to include in resume
    """
    print("🎯 Agent 4: Matching GitHub projects to job requirements...")

    jd_analysis = state.get("jd_analysis", {})
    github_repos = state.get("github_repos", [])
    parsed_resume = state.get("parsed_resume", {})

    # Get max projects from env or use default
    max_projects = int(os.getenv("MAX_PROJECTS", "5"))

    try:
        if not github_repos:
            print("  ⚠️ No GitHub repos available - skipping project matching")
            state["matched_projects"] = []
            state["progress_messages"].append("⚠️ Project matching skipped (no GitHub data)")
            state["current_agent"] = "project_matcher"
            return state

        llm = get_traced_llm(
            model="gpt-4o-mini",
            temperature=0.3,
            tags=["project-matching", "relevance-scoring"],
            metadata={"agent": "project_matcher", "step": 4}
        )

        # Prepare GitHub repos summary for LLM
        repos_summary = []
        for repo in github_repos:
            summary = {
                "name": repo["name"],
                "description": repo["description"],
                "tech_stack": repo.get("tech_stack", []),
                "language": repo.get("language"),
                "topics": repo.get("topics", []),
                "stars": repo.get("stars", 0),
                "url": repo["url"],
                "live_links": repo.get("live_links", []),
                "has_readme": bool(repo.get("readme"))
            }
            repos_summary.append(summary)

        matching_prompt = ChatPromptTemplate.from_messages([
            ("system", f"""You are an expert at matching projects to job requirements.

Your task is to select the top {max_projects} most relevant GitHub projects for this job application.

Scoring criteria:
1. **Tech stack match** (40%) - How well do the project technologies match the job requirements?
2. **Project complexity** (20%) - Is the project substantial enough to showcase skills?
3. **Relevance to role** (30%) - Does the project demonstrate relevant work (e.g., web app for full-stack role)?
4. **Presentation** (10%) - Does it have a good README, live link, stars?

Return a JSON array of the top {max_projects} projects, ordered by relevance:
```json
[
  {{
    "repo_name": "...",
    "relevance_score": 0.95,
    "match_reasons": ["Uses Next.js which is required", "Has live deployment", "Relevant to e-commerce domain"],
    "suggested_description": "Brief description highlighting relevant aspects (2-3 sentences)",
    "tech_stack": ["Next.js", "TypeScript", "..."],
    "live_link": "https://...",
    "github_link": "https://github.com/..."
  }}
]
```

Be selective - only include projects that genuinely strengthen the application."""),
            ("human", """Job Requirements:
{jd_analysis}

Available GitHub Repositories:
{repos_summary}

Current Resume Projects (for reference):
{current_projects}

Select top {max_projects} most relevant projects and provide detailed scoring.""")
        ])

        chain = matching_prompt | llm
        response = chain.invoke({
            "jd_analysis": json.dumps(jd_analysis, indent=2),
            "repos_summary": json.dumps(repos_summary, indent=2),
            "current_projects": json.dumps(parsed_resume.get("projects", []), indent=2),
            "max_projects": max_projects
        })

        # Parse JSON response
        try:
            matched_projects = json.loads(response.content)
        except json.JSONDecodeError:
            # Fallback: extract JSON from markdown code block
            content = response.content
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
            matched_projects = json.loads(content)

        # Enrich matched projects with full README content
        for project in matched_projects:
            repo_name = project["repo_name"]
            # Find full repo data
            full_repo = next((r for r in github_repos if r["name"] == repo_name), None)
            if full_repo:
                project["full_readme"] = full_repo.get("readme", "")
                project["repo_metadata"] = {
                    "stars": full_repo.get("stars", 0),
                    "language": full_repo.get("language"),
                    "updated_at": full_repo.get("updated_at")
                }

        state["matched_projects"] = matched_projects
        state["progress_messages"].append(
            f"✅ Project matching complete: {len(matched_projects)} projects selected"
        )
        state["current_agent"] = "project_matcher"

        print(f"  ✅ Selected {len(matched_projects)} projects:")
        for proj in matched_projects:
            print(f"    • {proj['repo_name']} (score: {proj.get('relevance_score', 0):.2f})")

    except Exception as e:
        print(f"  ❌ Project matching error: {e}")
        state["errors"].append(f"Project Matcher Error: {str(e)}")
        state["matched_projects"] = []

    return state
