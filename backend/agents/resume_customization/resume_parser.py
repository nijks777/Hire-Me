"""
Agent 2: Resume Parser
Parses resume into structured sections (experience, projects, skills)
"""
from langchain_core.prompts import ChatPromptTemplate
from agents.resume_customization.state import ResumeCustomizationState
from utils.langsmith_config import trace_agent, get_traced_llm
import json


@trace_agent("resume_parser", run_type="chain", tags=["resume-customization", "resume-parsing", "agent-2"])
def resume_parser_agent(state: ResumeCustomizationState) -> ResumeCustomizationState:
    """
    Agent 2: Parse resume into structured format

    Extracts:
    - Personal info (name, email, links)
    - Experience section (companies, roles, bullets, dates)
    - Projects section (name, description, tech, links)
    - Skills section (categorized)
    - Education
    - Certifications
    """
    print("📄 Agent 2: Parsing resume structure...")

    user_resume = state["user_resume"]

    try:
        llm = get_traced_llm(
            model="gpt-4o-mini",
            temperature=0.1,
            tags=["resume-parsing", "structure-extraction"],
            metadata={"agent": "resume_parser", "step": 2}
        )

        parsing_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an expert resume parser. Parse the resume into a structured JSON format.

CRITICAL RULES:
1. **Preserve original text exactly** - do not rephrase or modify
2. **Extract structure only** - maintain all original wording
3. **Capture formatting cues** - bullet points, sections, ordering

Return a JSON object with this structure (use double curly braces in your response):

{{
  "personal_info": {{
    "name": "...",
    "email": "...",
    "phone": "...",
    "linkedin": "...",
    "github": "...",
    "portfolio": "...",
    "location": "..."
  }},
  "experience": [
    {{
      "company": "...",
      "role": "...",
      "duration": "...",
      "bullets": ["...", "..."],
      "order": 1
    }}
  ],
  "projects": [
    {{
      "name": "...",
      "description": "...",
      "tech_stack": ["...", "..."],
      "live_link": "...",
      "github_link": "...",
      "order": 1
    }}
  ],
  "skills": {{
    "languages": ["...", "..."],
    "frameworks": ["...", "..."],
    "tools": ["...", "..."],
    "other": ["...", "..."]
  }},
  "education": [
    {{
      "degree": "...",
      "institution": "...",
      "year": "...",
      "gpa": "..."
    }}
  ],
  "certifications": ["...", "..."]
}}

DO NOT modify any text - just extract and structure it."""),
            ("human", """Resume to parse:

{resume}

Parse into structured JSON format. Preserve all original text exactly.""")
        ])

        chain = parsing_prompt | llm
        response = chain.invoke({"resume": user_resume})

        # Parse JSON response
        try:
            parsed_resume = json.loads(response.content)
        except json.JSONDecodeError:
            # Fallback: extract JSON from markdown code block
            content = response.content
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
            parsed_resume = json.loads(content)

        # Add metadata
        parsed_resume["total_experience_items"] = len(parsed_resume.get("experience", []))
        parsed_resume["total_projects"] = len(parsed_resume.get("projects", []))
        parsed_resume["parsing_method"] = "GPT-4o extraction"

        state["parsed_resume"] = parsed_resume
        state["progress_messages"].append(
            f"✅ Resume parsed: {parsed_resume['total_experience_items']} experiences, "
            f"{parsed_resume['total_projects']} projects"
        )
        state["current_agent"] = "resume_parser"

        print(f"  ✅ Parsed {parsed_resume['total_experience_items']} experience entries")
        print(f"  ✅ Parsed {parsed_resume['total_projects']} project entries")

    except Exception as e:
        print(f"  ❌ Resume parsing error: {e}")
        state["errors"].append(f"Resume Parser Error: {str(e)}")
        state["parsed_resume"] = {
            "error": str(e),
            "experience": [],
            "projects": [],
            "skills": {}
        }

    return state
