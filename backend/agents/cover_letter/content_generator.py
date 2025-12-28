"""
Agent 7: Content Generator
Generates cover letter or cold email using GPT-4/Sonnet
"""
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from utils.langsmith_config import get_traced_llm
from agents.cover_letter.state import CoverLetterState
import json


def content_generator_agent(state: CoverLetterState) -> CoverLetterState:
    """
    Generate cover letter or cold email using:
    - Job analysis (Agent 1)
    - Company research (Agent 2)
    - GitHub data (Agent 3)
    - User profile (Agent 4)
    - Resume analysis (Agent 5)
    - Writing style (Agent 6)
    """
    print("✍️ Agent 7: Content Generator (GPT-4)")

    document_type = state.get("document_type", "cover_letter")
    company_name = state.get("company_name", "Company")
    job_title = state.get("job_title", "Position")

    job_analysis = state.get("job_analysis", {})
    company_research = state.get("company_research", {})
    resume_analysis = state.get("resume_analysis", {})
    writing_style = state.get("writing_style", {})
    github_data = state.get("github_data", {})
    db_profile = state.get("db_profile", {})

    try:
        # Use GPT-4 for better quality
        llm = get_traced_llm(
            model="gpt-4o-mini",
            temperature=0.7,  # Higher for creativity
            tags=["content-generation", document_type],
            metadata={"agent": "content_generator", "step": 7}
        )

        if document_type == "cover_letter":
            prompt = ChatPromptTemplate.from_messages([
                ("system", """You are an expert cover letter writer. Create a compelling, personalized cover letter that:
- Opens with genuine enthusiasm and a strong hook
- Highlights 2-3 specific, relevant achievements with metrics
- Shows deep knowledge of the company (use research data)
- Demonstrates cultural fit
- Includes a GitHub project that's relevant to the role
- Closes with a clear call-to-action
- Sounds natural and authentic, NOT AI-generated

CRITICAL RULES:
❌ NO generic openings like "I am writing to express my interest..."
❌ NO clichés like "passionate professional", "highly motivated", "team player"
❌ NO bullet points - write in paragraph form
❌ NO overuse of "I" - vary sentence structure
✅ BE specific with numbers and impact
✅ USE conversational but professional tone
✅ SHOW personality and genuine interest
✅ REFERENCE specific company details from research

Length: 3-4 short paragraphs, ~300 words max.

Format:
[Opening paragraph: Hook + why this company]
[Body paragraph 1: Relevant achievement + how it applies]
[Body paragraph 2: Another achievement or project + company fit]
[Closing: Clear next steps]"""),
                ("human", """Job: {job_title} at {company_name}

Company Research:
{company_research}

Job Requirements:
{job_requirements}

My Qualifications:
{qualifications}

GitHub Projects:
{github_projects}

Writing Style Guide:
{style_guide}

Write a compelling cover letter that stands out and sounds authentic.""")
            ])
        else:  # cold_email
            prompt = ChatPromptTemplate.from_messages([
                ("system", """You are an expert at writing cold outreach emails that get responses. Create a concise, compelling cold email that:
- Subject line: Specific, intriguing, under 50 chars
- Opening: Personalized hook (mention company news, mutual connection, or specific project)
- Value proposition: What you can offer them (1-2 sentences)
- Social proof: One impressive achievement or project
- Call-to-action: Simple, low-commitment ask (15-min call, quick chat)
- Closing: Friendly but professional

CRITICAL RULES:
❌ NO "I hope this email finds you well"
❌ NO "I wanted to reach out"
❌ NO long paragraphs - keep it scannable
❌ NO asking for a job directly
✅ BE brief - under 150 words total
✅ LEAD with value for them
✅ USE their company name and specific details
✅ SHOW you've done research

Format:
Subject: [Compelling subject line]

[One sentence personalized hook]
[One sentence value proposition]
[One sentence social proof]
[Clear CTA]

Best,
[User name]"""),
                ("human", """Target: {job_title} at {company_name}

Company Research:
{company_research}

Job Info:
{job_requirements}

My Background:
{qualifications}

Notable Projects:
{github_projects}

Write a cold email that gets a response.""")
            ])

        chain = prompt | llm
        response = chain.invoke({
            "job_title": job_title,
            "company_name": company_name,
            "company_research": json.dumps(company_research, indent=2),
            "job_requirements": json.dumps({
                "required_skills": job_analysis.get("required_skills", [])[:5],
                "responsibilities": job_analysis.get("key_responsibilities", [])[:3],
                "seniority": job_analysis.get("seniority_level", "")
            }, indent=2),
            "qualifications": json.dumps({
                "experience_years": resume_analysis.get("experience_summary", {}).get("total_years", ""),
                "top_skills": resume_analysis.get("core_skills", [])[:8],
                "achievements": resume_analysis.get("experience_summary", {}).get("key_achievements", [])[:3],
                "unique_strengths": resume_analysis.get("unique_strengths", [])[:3]
            }, indent=2),
            "github_projects": json.dumps([
                f"{p.get('name', '')}: {p.get('description', '')} (Tech: {', '.join(p.get('tech_stack', [])[:3])})"
                for p in github_data.get("projects", [])[:3]
            ], indent=2) if github_data else "No GitHub projects",
            "style_guide": json.dumps(writing_style, indent=2)
        })

        generated_content = response.content.strip()

        state["generated_content"] = generated_content
        state["progress_messages"].append(f"✅ Generated {document_type}: {len(generated_content.split())} words")
        state["current_agent"] = "content_generator"

        print(f"  ✅ Generated {document_type}")
        print(f"  ✅ Word count: {len(generated_content.split())}")
        print(f"  ✅ Preview: {generated_content[:150]}...")

    except Exception as e:
        print(f"  ❌ Content Generator error: {e}")
        state["errors"].append(f"Content Generator Error: {str(e)}")

    return state
