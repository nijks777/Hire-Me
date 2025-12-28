from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from agents.state import AgentState
from app.config import settings
from utils.langsmith_config import trace_agent, get_traced_llm

@trace_agent("content_generator", run_type="chain", tags=["job-application", "content-generation", "agent-5"])
def content_generator_agent(state: AgentState) -> AgentState:
    """
    Agent 5: Generate personalized cover letter and cold email
    Uses outputs from all previous agents:
    - Agent 1: Job requirements
    - Agent 2: Company research
    - Agent 3: User qualifications
    - Agent 4: Writing style
    """
    print("📝 Agent 5: Generating cover letter and cold email...")

    llm = get_traced_llm(
        model="gpt-4o-mini",
        temperature=0.7,
        tags=["content-generation", "cover-letter", "cold-email"],
        metadata={"agent": "content_generator", "step": 5}
    )

    try:
        # Get data from previous agents
        job_requirements = state.get("job_requirements", {})
        company_research = state.get("company_research", {})
        user_qualifications = state.get("user_qualifications", {})
        writing_style = state.get("writing_style", {})
        user_profile = state.get("user_profile", {})
        custom_prompt = state.get("custom_prompt", "")

        # Prepare context for generation
        job_context = f"""
Job Description: {state.get('job_description', '')}
Company Name: {state.get('company_name', '')}
HR Name: {state.get('hr_name', 'Hiring Manager')}

Job Requirements Analysis:
{job_requirements}

Company Research:
{company_research}

User Qualifications:
{user_qualifications}

Writing Style Analysis:
{writing_style}

User Profile:
Name: {user_profile.get('name', 'N/A')}
Email: {user_profile.get('email', 'N/A')}
"""

        if custom_prompt:
            job_context += f"\nCustom Instructions: {custom_prompt}"

        # Generate Cover Letter
        cover_letter_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an expert cover letter writer.
Create a compelling, personalized cover letter that:
1. Matches the writing style provided (tone, voice, structure)
2. Highlights relevant qualifications that align with job requirements
3. Shows genuine interest in the company based on research
4. Demonstrates cultural fit and enthusiasm
5. Is professional yet authentic
6. Follows proper cover letter structure
7. Is ATS-friendly with relevant keywords

IMPORTANT: Use the exact writing style, tone, and structure from the style analysis.
Make it feel personal and genuine, not generic or templated."""),
            ("human", """Based on the following information, write a professional cover letter:

{context}

Generate a complete, ready-to-send cover letter.""")
        ])

        cover_letter_chain = cover_letter_prompt | llm
        cover_letter_response = cover_letter_chain.invoke({"context": job_context})

        # Generate Cold Email
        cold_email_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an expert at writing compelling cold emails for job applications.
Create a concise, engaging cold email that:
1. Matches the writing style provided (tone, voice, structure)
2. Has a strong, personalized subject line
3. Opens with a hook that shows you researched the company
4. Briefly highlights 2-3 most relevant qualifications
5. Shows enthusiasm and cultural fit
6. Includes a clear call-to-action
7. Is short (150-200 words max)
8. Is personalized, not generic

IMPORTANT: Use the exact writing style from the style analysis.
Format: Start with "Subject: [subject line]" then the email body."""),
            ("human", """Based on the following information, write a cold email for a job application:

{context}

Generate a complete cold email with subject line.""")
        ])

        cold_email_chain = cold_email_prompt | llm
        cold_email_response = cold_email_chain.invoke({"context": job_context})

        state["generated_content"] = {
            "cover_letter": cover_letter_response.content,
            "cold_email": cold_email_response.content,
            "generated_at": "success"
        }
        state["progress_messages"].append("✅ Cover letter and cold email generated successfully")
        state["current_agent"] = "content_generator"

    except Exception as e:
        print(f"Content generator error: {e}")
        state["errors"].append(f"Content Generator Error: {str(e)}")
        state["progress_messages"].append("❌ Content generation failed")
        state["generated_content"] = None

    return state
