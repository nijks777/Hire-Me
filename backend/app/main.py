from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from models.schemas import (
    GenerateRequest, GenerationResponse,
    TestStep1Request, TestStep1Response, TestStep2Response,
    TestStep3Request, TestStep3Response, TestStep4Request,
    TestStep4Response, TestStep5Request, TestStep5Response
)
from agents.state import AgentState
from agents.input_analyzer import input_analyzer_agent
from agents.research import research_agent
from agents.resume_analyzer import resume_analyzer_agent
from agents.style_analyzer import style_analyzer_agent
from agents.content_generator import content_generator_agent
from utils.database import (
    get_user_data, save_generation,
    get_user_generations, get_generation_by_id, delete_generation,
    deduct_user_credit
)
from utils.pdf_extractor import extract_text_from_file
from utils.langsmith_startup import configure_langsmith
from app.config import settings
import json
import asyncio
from typing import AsyncGenerator

# Configure LangSmith on startup
configure_langsmith()

app = FastAPI(
    title="Hire-Me Agent API",
    description="Multi-agent job application generator",
    version="1.0.0"
)

# CORS middleware - Allow development and production origins
import os

allowed_origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://localhost:3003",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://127.0.0.1:3002",
    "http://127.0.0.1:3003"
]

# Add production frontend URL if set
frontend_url = os.getenv("FRONTEND_URL")
if frontend_url:
    allowed_origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

@app.get("/")
async def root():
    """Basic health check endpoint"""
    return {
        "status": "ok",
        "message": "Hire-Me Agent API is running",
        "version": "1.0.0"
    }

@app.get("/health")
async def health_check():
    """
    Detailed health check endpoint
    Checks API, database, and environment configuration
    """
    import os
    from sqlalchemy import create_engine, text

    health_status = {
        "status": "healthy",
        "version": "1.0.0",
        "api": "running",
        "database": "unknown",
        "openai_configured": False,
        "langsmith_configured": False
    }

    # Check database connection
    try:
        database_url = os.getenv("DATABASE_URL")
        if database_url:
            engine = create_engine(database_url)
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            health_status["database"] = "connected"
        else:
            health_status["database"] = "not_configured"
            health_status["status"] = "degraded"
    except Exception as e:
        health_status["database"] = f"error: {str(e)[:50]}"
        health_status["status"] = "unhealthy"

    # Check OpenAI API key
    if os.getenv("OPENAI_API_KEY"):
        health_status["openai_configured"] = True
    else:
        health_status["status"] = "degraded"

    # Check LangSmith (optional)
    if os.getenv("LANGSMITH_API_KEY"):
        health_status["langsmith_configured"] = True

    return health_status

@app.post("/api/generate-stream")
async def generate_stream(request: GenerateRequest):
    """
    Generate documents with real-time SSE progress updates
    """
    async def event_generator() -> AsyncGenerator[str, None]:
        try:
            # Fetch user data
            user_data = get_user_data(request.user_id)

            if not user_data:
                yield f"data: {json.dumps({'type': 'error', 'message': 'User not found'})}\n\n"
                return

            # Check if user has enough credits
            if user_data.get("credits", 0) <= 0:
                yield f"data: {json.dumps({'type': 'error', 'message': 'Insufficient credits. Please contact support to add more credits.'})}\n\n"
                return

            # Extract resume and demo files
            user_resume = extract_text_from_file(
                user_data.get("resumeData"),
                user_data.get("resumeMimeType")
            )

            demo_cover_letter = extract_text_from_file(
                user_data.get("coverLetterData"),
                user_data.get("coverLetterMimeType")
            )

            demo_cold_email = extract_text_from_file(
                user_data.get("coldEmailData"),
                user_data.get("coldEmailMimeType")
            )

            user_profile = {
                "name": user_data.get("name"),
                "email": user_data.get("email")
            }

            # Initialize state
            initial_state: AgentState = {
                "job_description": request.job_description,
                "company_name": request.company_name,
                "hr_name": request.hr_name,
                "custom_prompt": request.custom_prompt,
                "user_resume": user_resume,
                "user_profile": user_profile,
                "demo_cover_letter": demo_cover_letter,
                "demo_cold_email": demo_cold_email,
                "job_requirements": None,
                "company_research": None,
                "user_qualifications": None,
                "writing_style": None,
                "generated_content": None,
                "current_agent": None,
                "progress_messages": [],
                "errors": []
            }

            # PHASE 1: Run Input Analyzer + Research in PARALLEL ⚡
            yield f"data: {json.dumps({'type': 'progress', 'step': 1, 'message': 'Running parallel analysis (Input + Research)...'})}\n\n"

            # Run both agents in parallel using asyncio
            def run_input_analyzer():
                return input_analyzer_agent(initial_state.copy())

            def run_research():
                # Research needs company_name which is already in initial_state
                return research_agent(initial_state.copy())

            # Execute in parallel
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            input_result, research_result = await asyncio.gather(
                asyncio.to_thread(run_input_analyzer),
                asyncio.to_thread(run_research)
            )

            # Merge results
            state = initial_state.copy()
            state["job_requirements"] = input_result.get("job_requirements")
            state["company_research"] = research_result.get("company_research")
            state["progress_messages"].extend(input_result.get("progress_messages", []))
            state["progress_messages"].extend(research_result.get("progress_messages", []))
            state["errors"].extend(input_result.get("errors", []))
            state["errors"].extend(research_result.get("errors", []))

            if state.get("errors"):
                yield f"data: {json.dumps({'type': 'error', 'step': 1, 'message': state['errors'][0]})}\n\n"
                return

            yield f"data: {json.dumps({'type': 'step_complete', 'step': 1, 'message': 'Parallel analysis complete! (Input + Research)'})}\n\n"

            # Step 3: Resume Analyzer
            yield f"data: {json.dumps({'type': 'progress', 'step': 3, 'message': 'Analyzing your resume...'})}\n\n"
            state = resume_analyzer_agent(state)

            if state.get("errors"):
                yield f"data: {json.dumps({'type': 'error', 'step': 3, 'message': state['errors'][0]})}\n\n"
                return

            yield f"data: {json.dumps({'type': 'step_complete', 'step': 3, 'message': 'Qualifications matched'})}\n\n"

            # Step 4: Style Analyzer
            yield f"data: {json.dumps({'type': 'progress', 'step': 4, 'message': 'Analyzing writing style...'})}\n\n"
            state = style_analyzer_agent(state)

            if state.get("errors"):
                yield f"data: {json.dumps({'type': 'error', 'step': 4, 'message': state['errors'][0]})}\n\n"
                return

            yield f"data: {json.dumps({'type': 'step_complete', 'step': 4, 'message': 'Writing style analyzed'})}\n\n"

            # Step 5: Content Generator
            yield f"data: {json.dumps({'type': 'progress', 'step': 5, 'message': 'Generating documents...'})}\n\n"
            final_state = content_generator_agent(state)

            if final_state.get("errors"):
                yield f"data: {json.dumps({'type': 'error', 'step': 5, 'message': final_state['errors'][0]})}\n\n"
                return

            yield f"data: {json.dumps({'type': 'step_complete', 'step': 5, 'message': 'Documents created successfully!'})}\n\n"

            # Save generation to database
            generated_content = final_state.get("generated_content", {})
            generation_id = save_generation(
                user_id=request.user_id,
                job_description=request.job_description,
                company_name=request.company_name,
                hr_name=request.hr_name,
                custom_prompt=request.custom_prompt,
                cover_letter=generated_content.get("cover_letter", ""),
                cold_email=generated_content.get("cold_email", ""),
                job_requirements=final_state.get("job_requirements"),
                company_research=final_state.get("company_research"),
                user_qualifications=final_state.get("user_qualifications"),
                writing_style=final_state.get("writing_style")
            )

            # Deduct 1 credit from user after successful generation
            credit_deducted = deduct_user_credit(request.user_id, amount=1)
            if not credit_deducted:
                print(f"⚠️ Warning: Failed to deduct credit for user {request.user_id}")

            # Send completion event with generated content
            yield f"data: {json.dumps({'type': 'complete', 'generation_id': generation_id, 'generated_content': generated_content})}\n\n"

        except Exception as e:
            print(f"Error in generate_stream: {e}")
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.get("/api/generations")
async def get_generations(user_id: str, limit: int = 50, offset: int = 0):
    """Get all generations for a user"""
    try:
        generations = get_user_generations(user_id, limit, offset)
        return {"success": True, "generations": generations}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/generations/{generation_id}")
async def get_generation(generation_id: str, user_id: str):
    """Get a specific generation by ID"""
    try:
        generation = get_generation_by_id(generation_id, user_id)
        if not generation:
            raise HTTPException(status_code=404, detail="Generation not found")
        return {"success": True, "generation": generation}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/generations/{generation_id}")
async def delete_generation_endpoint(generation_id: str, user_id: str):
    """Delete a generation"""
    try:
        success = delete_generation(generation_id, user_id)
        if not success:
            raise HTTPException(status_code=404, detail="Generation not found")
        return {"success": True, "message": "Generation deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/test-step-1", response_model=TestStep1Response)
async def test_step_1(request: TestStep1Request):
    """
    Test Step 1: Input Analyzer Agent

    This endpoint tests only the first agent (Input Analyzer)
    """

    # Initialize state
    initial_state: AgentState = {
        "job_description": request.job_description,
        "company_name": request.company_name,
        "hr_name": request.hr_name,
        "custom_prompt": request.custom_prompt,
        "user_resume": None,
        "user_profile": None,
        "job_requirements": None,
        "company_research": None,
        "user_qualifications": None,
        "current_agent": None,
        "progress_messages": [],
        "errors": []
    }

    # Run Agent 1
    final_state = input_analyzer_agent(initial_state)

    # Return response
    return TestStep1Response(
        success=len(final_state["errors"]) == 0,
        job_requirements=final_state.get("job_requirements"),
        progress_messages=final_state["progress_messages"],
        errors=final_state["errors"],
        current_agent=final_state.get("current_agent")
    )

@app.post("/api/test-step-2", response_model=TestStep2Response)
async def test_step_2(request: TestStep1Request):
    """
    Test Step 2: Input Analyzer + Research Agent

    This endpoint tests agents 1 and 2 in sequence
    """

    # Initialize state
    initial_state: AgentState = {
        "job_description": request.job_description,
        "company_name": request.company_name,
        "hr_name": request.hr_name,
        "custom_prompt": request.custom_prompt,
        "user_resume": None,
        "user_profile": None,
        "job_requirements": None,
        "company_research": None,
        "user_qualifications": None,
        "current_agent": None,
        "progress_messages": [],
        "errors": []
    }

    # Run Agent 1: Input Analyzer
    state = input_analyzer_agent(initial_state)

    # Run Agent 2: Research
    final_state = research_agent(state)

    # Return response
    return TestStep2Response(
        success=len(final_state["errors"]) == 0,
        job_requirements=final_state.get("job_requirements"),
        company_research=final_state.get("company_research"),
        progress_messages=final_state["progress_messages"],
        errors=final_state["errors"],
        current_agent=final_state.get("current_agent")
    )

@app.post("/api/test-step-3", response_model=TestStep3Response)
async def test_step_3(request: TestStep3Request):
    """
    Test Step 3: Input Analyzer + Research + Resume Analyzer

    This endpoint tests agents 1, 2, and 3 in sequence
    Fetches user data from database and extracts resume text
    """

    # Try to fetch user data from database
    user_data = get_user_data(request.user_id)

    # If no user found or database error, use mock data for testing
    if not user_data:
        print(f"⚠️ User {request.user_id} not found in database, using mock resume data for testing")
        user_resume = """
John Doe
Software Engineer

EXPERIENCE:
- Senior Full Stack Developer at Tech Corp (2020-Present)
  * Built scalable web applications using React, Node.js, and Python
  * Led a team of 5 developers on multiple projects
  * Improved application performance by 40%

- Software Developer at StartupXYZ (2018-2020)
  * Developed RESTful APIs and microservices
  * Worked with AWS, Docker, and Kubernetes

SKILLS:
- Languages: Python, JavaScript, TypeScript, Java
- Frameworks: React, Node.js, Django, FastAPI
- Tools: Git, Docker, AWS, PostgreSQL, MongoDB
- Soft Skills: Team leadership, Problem-solving, Communication

EDUCATION:
- B.S. Computer Science, University of Technology (2014-2018)

CERTIFICATIONS:
- AWS Certified Solutions Architect
- Google Cloud Professional
"""
        user_profile = {
            "name": "John Doe (Test User)",
            "email": "test@example.com"
        }
    else:
        # Extract resume text from PDF
        user_resume = extract_text_from_file(
            user_data.get("resumeData"),
            user_data.get("resumeMimeType")
        )

        # Build user profile
        user_profile = {
            "name": user_data.get("name"),
            "email": user_data.get("email")
        }

    # Initialize state
    initial_state: AgentState = {
        "job_description": request.job_description,
        "company_name": request.company_name,
        "hr_name": request.hr_name,
        "custom_prompt": request.custom_prompt,
        "user_resume": user_resume,
        "user_profile": user_profile,
        "job_requirements": None,
        "company_research": None,
        "user_qualifications": None,
        "current_agent": None,
        "progress_messages": [],
        "errors": []
    }

    # Run Agent 1: Input Analyzer
    state = input_analyzer_agent(initial_state)

    # Run Agent 2: Research
    state = research_agent(state)

    # Run Agent 3: Resume Analyzer
    final_state = resume_analyzer_agent(state)

    # Return response
    return TestStep3Response(
        success=len(final_state["errors"]) == 0,
        job_requirements=final_state.get("job_requirements"),
        company_research=final_state.get("company_research"),
        user_qualifications=final_state.get("user_qualifications"),
        progress_messages=final_state["progress_messages"],
        errors=final_state["errors"],
        current_agent=final_state.get("current_agent")
    )

@app.post("/api/test-step-4", response_model=TestStep4Response)
async def test_step_4(request: TestStep4Request):
    """
    Test Step 4: Input Analyzer + Research + Resume Analyzer + Style Analyzer

    This endpoint tests agents 1, 2, 3, and 4 in sequence
    Fetches user data from database and extracts resume and demo files
    """

    # Try to fetch user data from database
    user_data = get_user_data(request.user_id)

    # If no user found or database error, use mock data for testing
    if not user_data:
        print(f"⚠️ User {request.user_id} not found in database, using mock data for testing")
        user_resume = """
John Doe
Software Engineer

EXPERIENCE:
- Senior Full Stack Developer at Tech Corp (2020-Present)
  * Built scalable web applications using React, Node.js, and Python
  * Led a team of 5 developers on multiple projects
  * Improved application performance by 40%

SKILLS:
- Languages: Python, JavaScript, TypeScript, Java
- Frameworks: React, Node.js, Django, FastAPI
"""
        user_profile = {
            "name": "John Doe (Test User)",
            "email": "test@example.com"
        }
        demo_cover_letter = None
        demo_cold_email = None
    else:
        # Extract resume text from PDF
        user_resume = extract_text_from_file(
            user_data.get("resumeData"),
            user_data.get("resumeMimeType")
        )

        # Extract demo cover letter
        demo_cover_letter = extract_text_from_file(
            user_data.get("coverLetterData"),
            user_data.get("coverLetterMimeType")
        )

        # Extract demo cold email
        demo_cold_email = extract_text_from_file(
            user_data.get("coldEmailData"),
            user_data.get("coldEmailMimeType")
        )

        # Build user profile
        user_profile = {
            "name": user_data.get("name"),
            "email": user_data.get("email")
        }

    # Initialize state
    initial_state: AgentState = {
        "job_description": request.job_description,
        "company_name": request.company_name,
        "hr_name": request.hr_name,
        "custom_prompt": request.custom_prompt,
        "user_resume": user_resume,
        "user_profile": user_profile,
        "demo_cover_letter": demo_cover_letter,
        "demo_cold_email": demo_cold_email,
        "job_requirements": None,
        "company_research": None,
        "user_qualifications": None,
        "writing_style": None,
        "current_agent": None,
        "progress_messages": [],
        "errors": []
    }

    # Run Agent 1: Input Analyzer
    state = input_analyzer_agent(initial_state)

    # Run Agent 2: Research
    state = research_agent(state)

    # Run Agent 3: Resume Analyzer
    state = resume_analyzer_agent(state)

    # Run Agent 4: Style Analyzer
    final_state = style_analyzer_agent(state)

    # Return response
    return TestStep4Response(
        success=len(final_state["errors"]) == 0,
        job_requirements=final_state.get("job_requirements"),
        company_research=final_state.get("company_research"),
        user_qualifications=final_state.get("user_qualifications"),
        writing_style=final_state.get("writing_style"),
        progress_messages=final_state["progress_messages"],
        errors=final_state["errors"],
        current_agent=final_state.get("current_agent")
    )

@app.post("/api/test-step-5", response_model=TestStep5Response)
async def test_step_5(request: TestStep5Request):
    """
    Test Step 5: All agents including Content Generator

    This endpoint tests agents 1-5 in sequence:
    1. Input Analyzer
    2. Research
    3. Resume Analyzer
    4. Style Analyzer
    5. Content Generator (generates cover letter and cold email)
    """

    # Try to fetch user data from database
    user_data = get_user_data(request.user_id)

    # If no user found or database error, use mock data for testing
    if not user_data:
        print(f"⚠️ User {request.user_id} not found in database, using mock data for testing")
        user_resume = """
John Doe
Software Engineer

EXPERIENCE:
- Senior Full Stack Developer at Tech Corp (2020-Present)
  * Built scalable web applications using React, Node.js, and Python
  * Led a team of 5 developers on multiple projects
  * Improved application performance by 40%

SKILLS:
- Languages: Python, JavaScript, TypeScript, Java
- Frameworks: React, Node.js, Django, FastAPI
"""
        user_profile = {
            "name": "John Doe (Test User)",
            "email": "test@example.com"
        }
        demo_cover_letter = None
        demo_cold_email = None
    else:
        # Extract resume text from PDF
        user_resume = extract_text_from_file(
            user_data.get("resumeData"),
            user_data.get("resumeMimeType")
        )

        # Extract demo cover letter
        demo_cover_letter = extract_text_from_file(
            user_data.get("coverLetterData"),
            user_data.get("coverLetterMimeType")
        )

        # Extract demo cold email
        demo_cold_email = extract_text_from_file(
            user_data.get("coldEmailData"),
            user_data.get("coldEmailMimeType")
        )

        # Build user profile
        user_profile = {
            "name": user_data.get("name"),
            "email": user_data.get("email")
        }

    # Initialize state
    initial_state: AgentState = {
        "job_description": request.job_description,
        "company_name": request.company_name,
        "hr_name": request.hr_name,
        "custom_prompt": request.custom_prompt,
        "user_resume": user_resume,
        "user_profile": user_profile,
        "demo_cover_letter": demo_cover_letter,
        "demo_cold_email": demo_cold_email,
        "job_requirements": None,
        "company_research": None,
        "user_qualifications": None,
        "writing_style": None,
        "generated_content": None,
        "current_agent": None,
        "progress_messages": [],
        "errors": []
    }

    # Run Agent 1: Input Analyzer
    state = input_analyzer_agent(initial_state)

    # Run Agent 2: Research
    state = research_agent(state)

    # Run Agent 3: Resume Analyzer
    state = resume_analyzer_agent(state)

    # Run Agent 4: Style Analyzer
    state = style_analyzer_agent(state)

    # Run Agent 5: Content Generator
    final_state = content_generator_agent(state)

    # Return response
    return TestStep5Response(
        success=len(final_state["errors"]) == 0,
        job_requirements=final_state.get("job_requirements"),
        company_research=final_state.get("company_research"),
        user_qualifications=final_state.get("user_qualifications"),
        writing_style=final_state.get("writing_style"),
        generated_content=final_state.get("generated_content"),
        progress_messages=final_state["progress_messages"],
        errors=final_state["errors"],
        current_agent=final_state.get("current_agent")
    )

@app.post("/api/test-phase-1")
async def test_phase_1(request: dict):
    """
    Test Phase 1: Parallel execution of Input Analyzer + Research Agent

    This endpoint tests the new parallel architecture with Tavily web search
    """
    try:
        job_description = request.get("job_description", "")
        company_name = request.get("company_name", "")

        if not job_description or not company_name:
            raise HTTPException(status_code=400, detail="job_description and company_name required")

        # Initialize state
        initial_state: AgentState = {
            "job_description": job_description,
            "company_name": company_name,
            "hr_name": None,
            "custom_prompt": None,
            "user_resume": None,
            "user_profile": None,
            "demo_cover_letter": None,
            "demo_cold_email": None,
            "job_requirements": None,
            "company_research": None,
            "user_qualifications": None,
            "writing_style": None,
            "generated_content": None,
            "current_agent": None,
            "progress_messages": [],
            "errors": []
        }

        import time
        start_time = time.time()

        # Run both agents in parallel
        def run_input_analyzer():
            return input_analyzer_agent(initial_state.copy())

        def run_research():
            return research_agent(initial_state.copy())

        # Execute in parallel
        input_result, research_result = await asyncio.gather(
            asyncio.to_thread(run_input_analyzer),
            asyncio.to_thread(run_research)
        )

        end_time = time.time()
        execution_time = end_time - start_time

        # Merge results
        final_state = initial_state.copy()
        final_state["job_requirements"] = input_result.get("job_requirements")
        final_state["company_research"] = research_result.get("company_research")
        final_state["progress_messages"] = (
            input_result.get("progress_messages", []) +
            research_result.get("progress_messages", [])
        )
        final_state["errors"] = (
            input_result.get("errors", []) +
            research_result.get("errors", [])
        )

        return {
            "success": len(final_state["errors"]) == 0,
            "execution_time": f"{execution_time:.2f}s",
            "parallel_execution": True,
            "job_requirements": final_state.get("job_requirements"),
            "company_research": final_state.get("company_research"),
            "progress_messages": final_state["progress_messages"],
            "errors": final_state["errors"]
        }

    except Exception as e:
        print(f"Phase 1 test error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Include resume test routes
from app.routes import resume_test
app.include_router(resume_test.router)

# Include resume customization routes
from app.routes import resume_customization
from app.routes import resume_suggestions
from app.routes import cover_letter

app.include_router(resume_customization.router)
app.include_router(cover_letter.router)
app.include_router(resume_suggestions.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True
    )
