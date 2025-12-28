"""
Agent 5: Resume Analyzer
Analyzes resume + GitHub data + DB profile for complete qualification map
"""
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from utils.langsmith_config import get_traced_llm
from agents.cover_letter.state import CoverLetterState
import json


def resume_analyzer_agent(state: CoverLetterState) -> CoverLetterState:
    """
    Analyze user's complete profile:
    - Resume content
    - GitHub projects (from Agent 3)
    - DB profile (from Agent 4)

    Output: Comprehensive qualifications map
    """
    print("📄 Agent 5: Resume Analyzer (Enhanced)")

    user_resume = state.get("user_resume", "")
    github_data = state.get("github_data", {})
    db_profile = state.get("db_profile", {})
    job_analysis = state.get("job_analysis", {})

    if not user_resume:
        state["errors"].append("Resume Analyzer Error: No resume provided")
        return state

    try:
        llm = get_traced_llm(
            model="gpt-4o-mini",
            temperature=0.2,
            tags=["resume-analysis", "qualification-mapping"],
            metadata={"agent": "resume_analyzer", "step": 5}
        )

        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an expert resume analyst. Analyze the user's resume along with their GitHub projects and profile data to create a comprehensive qualification map.

Return a JSON object with this structure (use double curly braces in your response):

{{
  "core_skills": ["skill1", "skill2", "skill3"],
  "technical_skills": {{
    "languages": ["Python", "JavaScript"],
    "frameworks": ["React", "Django"],
    "tools": ["Docker", "Git"],
    "databases": ["PostgreSQL", "MongoDB"]
  }},
  "experience_summary": {{
    "total_years": 5,
    "roles": ["Software Engineer", "Full Stack Developer"],
    "companies": ["Company A", "Company B"],
    "key_achievements": ["achievement1", "achievement2"]
  }},
  "projects": [
    {{
      "name": "Project Name",
      "description": "What it does",
      "tech_stack": ["tech1", "tech2"],
      "impact": "impact statement",
      "source": "resume or github"
    }}
  ],
  "education": ["degree", "certification"],
  "soft_skills": ["leadership", "communication"],
  "github_contributions": {{
    "total_repos": 15,
    "languages": ["Python", "JavaScript"],
    "notable_projects": ["project1", "project2"]
  }},
  "unique_strengths": ["strength1", "strength2"],
  "relevant_to_job": ["how qualification 1 matches", "how qualification 2 matches"]
}}

Be thorough. Highlight skills and projects most relevant to the job requirements."""),
            ("human", """Resume:
{resume}

GitHub Data:
{github_data}

Database Profile:
{db_profile}

Job Requirements:
{job_requirements}

Analyze all sources and create a comprehensive qualification map.""")
        ])

        chain = prompt | llm
        response = chain.invoke({
            "resume": user_resume,
            "github_data": json.dumps(github_data, indent=2) if github_data else "No GitHub data",
            "db_profile": json.dumps(db_profile, indent=2) if db_profile else "No profile data",
            "job_requirements": json.dumps(job_analysis.get("required_skills", []), indent=2) if job_analysis else "No job requirements"
        })

        # Parse response
        content = response.content.strip()
        if content.startswith("```json"):
            content = content[7:]
        if content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]

        resume_analysis = json.loads(content.strip())

        state["resume_analysis"] = resume_analysis
        state["progress_messages"].append(f"✅ Analyzed resume: {resume_analysis['experience_summary']['total_years']} years experience")
        state["current_agent"] = "resume_analyzer"

        print(f"  ✅ Total experience: {resume_analysis['experience_summary']['total_years']} years")
        print(f"  ✅ Core skills: {len(resume_analysis.get('core_skills', []))}")
        print(f"  ✅ Projects found: {len(resume_analysis.get('projects', []))}")

    except json.JSONDecodeError as e:
        print(f"  ❌ JSON parsing error: {e}")
        state["errors"].append(f"Resume Analyzer Error: Failed to parse analysis - {str(e)}")
    except Exception as e:
        print(f"  ❌ Resume Analyzer error: {e}")
        state["errors"].append(f"Resume Analyzer Error: {str(e)}")

    return state
