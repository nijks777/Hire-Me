from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import json
import asyncio

from models.schemas import GenerateRequest, GenerateResponse, AgentProgress
from utils.auth import extract_user_id
from utils.database import get_user_data, check_user_credits, decrement_user_credits
from utils.pdf_extractor import extract_text_from_file
from agents.graph import run_agent_pipeline_streaming
from app.config import settings

app = FastAPI(
    title="Hire-Me Agent API",
    description="AI-powered job application document generator using LangGraph multi-agent system",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "ok",
        "message": "Hire-Me Agent API is running",
        "version": "1.0.0"
    }

@app.get("/api/health")
async def health():
    """Detailed health check"""
    return {
        "status": "healthy",
        "database": "connected" if settings.DATABASE_URL else "not configured",
        "langsmith": "enabled" if settings.LANGCHAIN_TRACING_V2 == "true" else "disabled",
        "openai": "configured" if settings.OPENAI_API_KEY else "not configured"
    }

async def generate_documents_stream(
    request: GenerateRequest,
    user_id: str,
    user_data: dict
):
    """
    Stream agent progress and generate documents
    """
    try:
        # Extract text from user files
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

        # Stream progress messages
        yield f"data: {json.dumps({'type': 'progress', 'agent': 'start', 'message': 'Starting agent pipeline...'})}\n\n"

        # Run the agent pipeline with streaming
        async for update in run_agent_pipeline_streaming(
            job_description=request.job_description,
            company_name=request.company_name,
            hr_name=request.hr_name or "Hiring Manager",
            custom_prompt=request.custom_prompt or "",
            user_resume=user_resume or "",
            demo_cover_letter=demo_cover_letter or "",
            demo_cold_email=demo_cold_email or ""
        ):
            # Send progress update to frontend
            if update["status"] == "completed":
                yield f"data: {json.dumps({'type': 'progress', 'agent': update['agent'], 'message': 'Agent ' + update['agent'] + ' completed'})}\n\n"
                await asyncio.sleep(0.1)  # Small delay for UX

            elif update["status"] == "finished":
                # Decrement credits after successful generation
                new_credits = decrement_user_credits(user_id)

                # Send final results
                final_response = {
                    "type": "complete",
                    "cover_letter": update.get("cover_letter"),
                    "cold_email": update.get("cold_email"),
                    "quality_score": update.get("quality_review", {}).get("quality_score"),
                    "suggestions": update.get("quality_review", {}).get("suggestions"),
                    "credits_remaining": new_credits,
                    "errors": update.get("errors", [])
                }
                yield f"data: {json.dumps(final_response)}\n\n"

    except Exception as e:
        error_response = {
            "type": "error",
            "message": str(e)
        }
        yield f"data: {json.dumps(error_response)}\n\n"

@app.post("/api/generate")
async def generate(
    request: GenerateRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Generate cover letter and cold email using multi-agent system

    Streams progress updates via Server-Sent Events (SSE)
    """

    # Verify authentication
    user_id = extract_user_id(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    # Get user data
    user_data = get_user_data(user_id)
    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")

    # Check credits
    credits = check_user_credits(user_id)
    if credits <= 0:
        raise HTTPException(
            status_code=403,
            detail="Insufficient credits. Please contact support."
        )

    # Return streaming response
    return StreamingResponse(
        generate_documents_stream(request, user_id, user_data),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True
    )
