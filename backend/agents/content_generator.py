from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from agents.state import AgentState
from app.config import settings

def content_generator_agent(state: AgentState) -> AgentState:
    """
    Agent 5: Generate personalized cover letter and cold email
    """
    print("📝 Agent 5: Generating content...")

    llm = ChatOpenAI(
        model="gpt-4o",  # Using GPT-4 for better quality generation
        temperature=0.7,  # Higher temperature for creative writing
        api_key=settings.OPENAI_API_KEY
    )

    try:
        # Generate Cover Letter
        cover_letter_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an expert cover letter writer.
Create a compelling, personalized cover letter based on:
- Job requirements and company research
- User's qualifications and experience
- User's writing style preferences
- Custom instructions provided

The cover letter should:
1. Be tailored to the specific job and company
2. Highlight relevant skills and experience
3. Show enthusiasm and cultural fit
4. Match the user's writing style
5. Be concise (300-400 words)

DO NOT include placeholder text like [Your Name] or [Date].
Write a complete, ready-to-use cover letter."""),
            ("human", """Job Information:
{job_requirements}

Company Research:
{company_research}

User Qualifications:
{user_qualifications}

Writing Style Guide:
{writing_style}

Custom Instructions:
{custom_prompt}

HR Name: {hr_name}
Company Name: {company_name}

Generate a personalized cover letter.""")
        ])

        cover_letter_chain = cover_letter_prompt | llm
        cover_letter_response = cover_letter_chain.invoke({
            "job_requirements": str(state.get("job_requirements", {})),
            "company_research": str(state.get("company_research", {})),
            "user_qualifications": str(state.get("user_qualifications", {})),
            "writing_style": str(state.get("writing_style", {})),
            "custom_prompt": state.get("custom_prompt", "No specific instructions"),
            "hr_name": state.get("hr_name", "Hiring Manager"),
            "company_name": state["company_name"]
        })

        state["generated_cover_letter"] = cover_letter_response.content
        state["progress_messages"].append("✅ Cover letter generated")

        # Generate Cold Email
        cold_email_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an expert at writing professional cold emails.
Create a compelling cold email based on:
- Job requirements and company research
- User's qualifications
- User's writing style preferences

The cold email should:
1. Be concise (150-200 words)
2. Have a catchy subject line
3. Quickly establish credibility
4. Show specific interest in the company
5. Include a clear call-to-action
6. Match the user's writing style

Format:
Subject: [Subject line]

[Email body]

DO NOT include placeholder text."""),
            ("human", """Job Information:
{job_requirements}

Company Research:
{company_research}

User Qualifications:
{user_qualifications}

Writing Style Guide:
{writing_style}

Custom Instructions:
{custom_prompt}

HR Name: {hr_name}
Company Name: {company_name}

Generate a cold email.""")
        ])

        cold_email_chain = cold_email_prompt | llm
        cold_email_response = cold_email_chain.invoke({
            "job_requirements": str(state.get("job_requirements", {})),
            "company_research": str(state.get("company_research", {})),
            "user_qualifications": str(state.get("user_qualifications", {})),
            "writing_style": str(state.get("writing_style", {})),
            "custom_prompt": state.get("custom_prompt", "No specific instructions"),
            "hr_name": state.get("hr_name", "Hiring Manager"),
            "company_name": state["company_name"]
        })

        state["generated_cold_email"] = cold_email_response.content
        state["progress_messages"].append("✅ Cold email generated")
        state["current_agent"] = "content_generator"

    except Exception as e:
        print(f"Content generator error: {e}")
        state["errors"].append(f"Content Generator Error: {str(e)}")
        state["progress_messages"].append("❌ Content generation failed")

    return state
