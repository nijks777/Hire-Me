"""
Agent 1: Job Description Analyzer
Extracts tech stack, keywords, and requirements from job description
"""
from langchain_core.prompts import ChatPromptTemplate
from agents.resume_customization.state import ResumeCustomizationState
from utils.langsmith_config import trace_agent, get_traced_llm
import json


@trace_agent("jd_analyzer", run_type="chain", tags=["resume-customization", "jd-analysis", "agent-1"])
def jd_analyzer_agent(state: ResumeCustomizationState) -> ResumeCustomizationState:
    """
    Agent 1: Analyze job description for tech stack, keywords, and requirements

    Extracts:
    - Required tech stack (languages, frameworks, tools)
    - Key responsibilities
    - ATS keywords
    - Seniority level
    - Must-have vs nice-to-have skills
    """
    print("📋 Agent 1: Analyzing job description...")

    job_description = state["job_description"]
    company_name = state["company_name"]

    try:
        llm = get_traced_llm(
            model="gpt-4o-mini",
            temperature=0.2,
            tags=["jd-analysis", "tech-stack-extraction"],
            metadata={"agent": "jd_analyzer", "step": 1}
        )

        analysis_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an expert job description analyzer and ATS specialist.

Your task is to extract structured information from the job description that will be used to customize a resume.

Extract and return a JSON object with:
1. **tech_stack**: Array of technologies mentioned (languages, frameworks, tools, platforms)
   - Categorize as: "languages", "frameworks", "tools", "platforms", "databases"
2. **key_responsibilities**: Top 5-7 main responsibilities
3. **ats_keywords**: 15-20 important keywords for ATS optimization
4. **must_have_skills**: Skills marked as required/must-have
5. **nice_to_have_skills**: Skills marked as preferred/nice-to-have
6. **seniority_level**: junior, mid-level, senior, or lead
7. **industry_domain**: e.g., fintech, healthcare, e-commerce, SaaS
8. **project_types**: Types of projects this role works on (e.g., web apps, mobile, APIs, data pipelines)

Be precise and extract only what's explicitly mentioned."""),
            ("human", """Company: {company_name}

Job Description:
{job_description}

Extract structured information in JSON format.""")
        ])

        chain = analysis_prompt | llm
        response = chain.invoke({
            "company_name": company_name,
            "job_description": job_description
        })

        # Parse JSON response
        try:
            jd_analysis = json.loads(response.content)
        except json.JSONDecodeError:
            # Fallback: extract JSON from markdown code block
            content = response.content
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
            jd_analysis = json.loads(content)

        # Add metadata
        jd_analysis["company_name"] = company_name
        jd_analysis["analysis_method"] = "GPT-4o extraction"

        state["jd_analysis"] = jd_analysis
        state["progress_messages"].append(f"✅ JD Analysis complete: {len(jd_analysis.get('ats_keywords', []))} keywords extracted")
        state["current_agent"] = "jd_analyzer"

        print(f"  ✅ Extracted tech stack: {', '.join(jd_analysis.get('tech_stack', {}).get('languages', [])[:5])}")
        print(f"  ✅ ATS keywords: {len(jd_analysis.get('ats_keywords', []))}")

    except Exception as e:
        print(f"  ❌ JD Analysis error: {e}")
        state["errors"].append(f"JD Analyzer Error: {str(e)}")
        state["jd_analysis"] = {
            "error": str(e),
            "tech_stack": {},
            "ats_keywords": []
        }

    return state
