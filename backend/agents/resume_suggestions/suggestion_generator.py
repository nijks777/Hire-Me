"""
Agent 5: Suggestion Generator
Generates actionable suggestions for the user to apply manually
"""
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from utils.langsmith_config import get_traced_llm
from agents.resume_suggestions.state import ResumeSuggestionState
import json


def suggestion_generator_agent(state: ResumeSuggestionState) -> ResumeSuggestionState:
    """
    Generate actionable suggestions:
    - Which skills to emphasize
    - Which projects to highlight
    - Which keywords to add
    - Which experience bullets to rewrite
    - Specific wording suggestions

    USER applies these suggestions manually in the editor
    """
    print("💡 Agent 5: Suggestion Generator")

    jd_analysis = state.get("jd_analysis", {})
    parsed_resume = state.get("parsed_resume", {})
    github_repos = state.get("github_repos", [])
    ats_analysis = state.get("ats_analysis", {})
    company_name = state.get("company_name", "Company")
    job_title = jd_analysis.get("job_title", "Position")

    try:
        llm = get_traced_llm(
            model="gpt-4o-mini",
            temperature=0.3,
            tags=["suggestion-generation", "resume-optimization"],
            metadata={"agent": "suggestion_generator", "step": 5}
        )

        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a resume optimization expert. Provide SPECIFIC, ACTIONABLE suggestions for improving a resume for a job application.

DO NOT rewrite the resume. Instead, give clear suggestions the user can apply themselves.

Return a JSON object with this structure (use double curly braces in your response):

{{{{
  "summary": "2-3 sentence overview of what needs improvement",
  "ats_score": 65.5,
  "priority_changes": [
    {{{{
      "type": "add_keyword",
      "priority": "high",
      "suggestion": "Add 'React.js' to your skills section",
      "reason": "Required skill mentioned 3 times in job description",
      "where": "Skills section"
    }}}},
    {{{{
      "type": "highlight_project",
      "priority": "high",
      "suggestion": "Move your 'E-commerce Platform' project to the top",
      "reason": "Directly relevant to the job requirements",
      "project_name": "E-commerce Platform"
    }}}},
    {{{{
      "type": "reword_bullet",
      "priority": "medium",
      "original": "Built web applications",
      "suggested": "Developed scalable web applications using React.js and Node.js, serving 10K+ users",
      "reason": "Add specificity, metrics, and keywords",
      "section": "Experience - Senior Developer"
    }}}},
    {{{{
      "type": "add_github_project",
      "priority": "medium",
      "suggestion": "Add your GitHub project 'nextjs-dashboard' to projects section",
      "reason": "Showcases Next.js skills required for the role",
      "project_details": {{{{
        "name": "nextjs-dashboard",
        "tech_stack": ["Next.js", "TypeScript"],
        "description": "Real-time analytics dashboard",
        "link": "https://github.com/user/nextjs-dashboard"
      }}}}
    }}}}
  ],
  "missing_keywords": ["React.js", "TypeScript", "Node.js", "AWS", "Docker"],
  "skills_to_emphasize": ["Full Stack Development", "React", "Node.js"],
  "sections_to_expand": [
    {{{{
      "section": "Experience",
      "suggestion": "Add more quantifiable achievements with metrics",
      "examples": ["Increased performance by X%", "Reduced load time by Y seconds"]
    }}}}
  ],
  "github_projects_to_add": [
    {{{{
      "repo_name": "nextjs-ecommerce",
      "relevance_score": 0.95,
      "reason": "Demonstrates Next.js and e-commerce experience",
      "suggested_description": "Modern e-commerce platform with Next.js and Stripe integration"
    }}}}
  ],
  "overall_strategy": "Focus on full-stack experience, add React/Next.js projects, quantify achievements"
}}}}

Be SPECIFIC. Give exact text suggestions, not vague advice."""),
            ("human", """Job: {job_title} at {company_name}

Job Requirements:
{job_requirements}

Current Resume:
{resume}

GitHub Projects Available:
{github_projects}

ATS Analysis:
{ats_analysis}

Generate specific, actionable suggestions to optimize this resume for the job.""")
        ])

        chain = prompt | llm
        response = chain.invoke({
            "job_title": job_title,
            "company_name": company_name,
            "job_requirements": json.dumps({
                "required_skills": jd_analysis.get("required_skills", []),
                "key_responsibilities": jd_analysis.get("key_responsibilities", []),
                "seniority": jd_analysis.get("seniority_level", "")
            }, indent=2),
            "resume": state.get("user_resume", ""),
            "github_projects": json.dumps([
                {
                    "name": repo.get("name", ""),
                    "tech_stack": repo.get("tech_stack", []),
                    "description": repo.get("description", ""),
                    "stars": repo.get("stars", 0)
                }
                for repo in github_repos[:8]
            ], indent=2) if github_repos else "No GitHub projects",
            "ats_analysis": json.dumps(ats_analysis, indent=2)
        })

        # Parse response
        content = response.content.strip()
        if content.startswith("```json"):
            content = content[7:]
        if content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]

        suggestions = json.loads(content.strip())

        state["suggestions"] = suggestions
        state["progress_messages"].append(f"✅ Generated {len(suggestions.get('priority_changes', []))} suggestions")
        state["current_agent"] = "suggestion_generator"

        print(f"  ✅ Generated {len(suggestions.get('priority_changes', []))} priority suggestions")
        print(f"  ✅ ATS score: {suggestions.get('ats_score', 0):.1f}%")
        print(f"  ✅ Missing {len(suggestions.get('missing_keywords', []))} keywords")

    except json.JSONDecodeError as e:
        print(f"  ❌ JSON parsing error: {e}")
        state["errors"].append(f"Suggestion Generator Error: Failed to parse suggestions - {str(e)}")
    except Exception as e:
        print(f"  ❌ Suggestion Generator error: {e}")
        state["errors"].append(f"Suggestion Generator Error: {str(e)}")

    return state
