"""
Agent 1: Input Analyzer
Runs in PARALLEL with Research Agent
Analyzes job description to extract requirements
"""
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from utils.langsmith_config import get_traced_llm
from agents.cover_letter.state import CoverLetterState
import json


def input_analyzer_agent(state: CoverLetterState) -> CoverLetterState:
    """
    Analyze job description to extract:
    - Job title
    - Required skills
    - Preferred qualifications
    - Responsibilities
    - Seniority level
    - Key requirements
    """
    print("🔍 Agent 1: Input Analyzer (Running in parallel...)")

    job_description = state.get("job_description", "")
    company_name = state.get("company_name", "Company")

    if not job_description:
        state["errors"].append("Input Analyzer Error: No job description provided")
        return state

    try:
        # Use GPT-4o-mini for cost efficiency
        llm = get_traced_llm(
            model="gpt-4o-mini",
            temperature=0.2,
            tags=["input-analyzer", "job-analysis"],
            metadata={"agent": "input_analyzer", "step": 1}
        )

        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an expert job description analyzer. Extract structured information from job postings.

Return a JSON object with this structure (use double curly braces in your response):

{{
  "job_title": "extracted job title",
  "seniority_level": "entry/mid/senior/lead/principal",
  "required_skills": ["skill1", "skill2", "skill3"],
  "preferred_skills": ["skill1", "skill2"],
  "key_responsibilities": ["resp1", "resp2", "resp3"],
  "must_have_qualifications": ["qual1", "qual2"],
  "nice_to_have": ["item1", "item2"],
  "experience_years": "3-5",
  "education_requirement": "Bachelor's in CS or equivalent",
  "technologies": ["tech1", "tech2"],
  "soft_skills": ["communication", "leadership"],
  "company_benefits": ["benefit1", "benefit2"],
  "remote_policy": "hybrid/remote/onsite",
  "key_focus_areas": ["area1", "area2"]
}}

Be thorough and specific. Extract all details mentioned."""),
            ("human", """Company: {company_name}

Job Description:
{job_description}

Extract all relevant information from this job posting.""")
        ])

        chain = prompt | llm
        response = chain.invoke({
            "company_name": company_name,
            "job_description": job_description
        })

        # Parse response
        content = response.content.strip()

        # Remove markdown code blocks if present
        if content.startswith("```json"):
            content = content[7:]
        if content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]

        job_analysis = json.loads(content.strip())

        state["job_analysis"] = job_analysis
        state["job_title"] = job_analysis.get("job_title", "Position")
        state["progress_messages"].append(f"✅ Analyzed job: {job_analysis.get('job_title')}")
        state["current_agent"] = "input_analyzer"

        print(f"  ✅ Extracted job title: {job_analysis.get('job_title')}")
        print(f"  ✅ Seniority level: {job_analysis.get('seniority_level')}")
        print(f"  ✅ Required skills: {len(job_analysis.get('required_skills', []))}")

    except json.JSONDecodeError as e:
        print(f"  ❌ JSON parsing error: {e}")
        state["errors"].append(f"Input Analyzer Error: Failed to parse job analysis - {str(e)}")
    except Exception as e:
        print(f"  ❌ Input Analyzer error: {e}")
        state["errors"].append(f"Input Analyzer Error: {str(e)}")

    return state
