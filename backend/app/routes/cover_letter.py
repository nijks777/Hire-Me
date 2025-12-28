"""
API Routes for Cover Letter & Cold Email Generation
Streaming endpoint with real-time progress + credit deduction
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, AsyncGenerator
from agents.cover_letter.graph_parallel import run_cover_letter_generation_parallel
from utils.database import get_user_data, deduct_credit, save_cover_letter_generation, save_cold_email_generation
import json
import asyncio


router = APIRouter(prefix="/api", tags=["cover-letter"])


class GenerateRequest(BaseModel):
    user_id: str
    job_description: str
    company_name: str
    document_type: str  # "cover_letter" or "cold_email"


@router.post("/cover-letter/generate-stream")
async def generate_cover_letter_stream(request: GenerateRequest):
    """
    Generate cover letter with streaming progress (SSE)

    Process:
    1. Check user credits (require at least 1 credit)
    2. Run 9-agent workflow
    3. Stream real-time progress
    4. Deduct 1 credit on successful generation
    5. Return final cover letter
    """
    async def event_generator() -> AsyncGenerator[str, None]:
        try:
            # Phase 0: Check credits
            yield f"data: {json.dumps({'type': 'progress', 'phase': 0, 'message': 'Checking credits...'})}\n\n"

            user_data = get_user_data(request.user_id)
            if not user_data:
                yield f"data: {json.dumps({'type': 'error', 'message': 'User not found'})}\n\n"
                return

            credits = user_data.get("credits", 0)
            if credits < 1:
                yield f"data: {json.dumps({'type': 'error', 'message': 'Insufficient credits. You have 0 credits remaining.'})}\n\n"
                return

            yield f"data: {json.dumps({'type': 'phase_complete', 'phase': 0, 'message': f'Credits available: {credits}'})}\n\n"

            # Phase 1: Input Analyzer
            yield f"data: {json.dumps({'type': 'progress', 'phase': 1, 'message': 'Analyzing job description...'})}\n\n"
            await asyncio.sleep(0.1)  # Small delay for streaming
            yield f"data: {json.dumps({'type': 'phase_complete', 'phase': 1, 'message': 'Job analysis complete'})}\n\n"

            # Phase 2: Research Agent
            yield f"data: {json.dumps({'type': 'progress', 'phase': 2, 'message': 'Researching company (Tavily)...'})}\n\n"
            await asyncio.sleep(0.1)
            yield f"data: {json.dumps({'type': 'phase_complete', 'phase': 2, 'message': 'Company research complete'})}\n\n"

            # Phase 3: GitHub Agent
            yield f"data: {json.dumps({'type': 'progress', 'phase': 3, 'message': 'Fetching GitHub repositories...'})}\n\n"
            await asyncio.sleep(0.1)
            yield f"data: {json.dumps({'type': 'phase_complete', 'phase': 3, 'message': 'GitHub data fetched'})}\n\n"

            # Phase 4: UserInfo Agent
            yield f"data: {json.dumps({'type': 'progress', 'phase': 4, 'message': 'Loading user profile...'})}\n\n"
            await asyncio.sleep(0.1)
            yield f"data: {json.dumps({'type': 'phase_complete', 'phase': 4, 'message': 'Profile loaded'})}\n\n"

            # Phase 5: Resume Analyzer
            yield f"data: {json.dumps({'type': 'progress', 'phase': 5, 'message': 'Analyzing resume + GitHub data...'})}\n\n"
            await asyncio.sleep(0.1)
            yield f"data: {json.dumps({'type': 'phase_complete', 'phase': 5, 'message': 'Resume analysis complete'})}\n\n"

            # Phase 6: Style Analyzer
            yield f"data: {json.dumps({'type': 'progress', 'phase': 6, 'message': 'Analyzing writing style...'})}\n\n"
            await asyncio.sleep(0.1)
            yield f"data: {json.dumps({'type': 'phase_complete', 'phase': 6, 'message': 'Style guide created'})}\n\n"

            # Phase 7: Content Generator
            yield f"data: {json.dumps({'type': 'progress', 'phase': 7, 'message': 'Generating content (GPT-4)...'})}\n\n"
            await asyncio.sleep(0.1)

            # Run the actual workflow (with parallel execution)
            final_state = await run_cover_letter_generation_parallel(
                user_id=request.user_id,
                job_description=request.job_description,
                company_name=request.company_name,
                document_type=request.document_type
            )

            yield f"data: {json.dumps({'type': 'phase_complete', 'phase': 7, 'message': 'Content generated'})}\n\n"

            # Phase 8: Humanization
            yield f"data: {json.dumps({'type': 'progress', 'phase': 8, 'message': 'Humanizing content...'})}\n\n"
            await asyncio.sleep(0.1)
            yield f"data: {json.dumps({'type': 'phase_complete', 'phase': 8, 'message': 'Content humanized'})}\n\n"

            # Phase 9: Quality Check
            yield f"data: {json.dumps({'type': 'progress', 'phase': 9, 'message': 'Quality check...'})}\n\n"
            await asyncio.sleep(0.1)

            quality_score = final_state.get("quality_score", 0)
            yield f"data: {json.dumps({'type': 'phase_complete', 'phase': 9, 'message': f'Quality score: {quality_score:.1f}%'})}\n\n"

            # Check for errors
            if final_state.get("errors"):
                error_count = len(final_state["errors"])
                yield f"data: {json.dumps({'type': 'warning', 'message': f'{error_count} warnings occurred'})}\n\n"

            # Deduct credit and save to history on successful generation
            if final_state.get("humanized_content"):
                print(f"💳 Deducting 1 credit from user {request.user_id}")
                deduct_credit(request.user_id, 1)
                new_credits = credits - 1
                yield f"data: {json.dumps({'type': 'info', 'message': f'1 credit deducted. Remaining: {new_credits}'})}\n\n"

                # Save to history
                print(f"💾 Saving {request.document_type} to history...")
                if request.document_type == "cover_letter":
                    save_cover_letter_generation(
                        user_id=request.user_id,
                        job_description=request.job_description,
                        company_name=request.company_name,
                        cover_letter=final_state.get("humanized_content", ""),
                        job_analysis=final_state.get("job_analysis"),
                        company_research=final_state.get("company_research")
                    )
                else:  # cold_email
                    save_cold_email_generation(
                        user_id=request.user_id,
                        job_description=request.job_description,
                        company_name=request.company_name,
                        cold_email=final_state.get("humanized_content", ""),
                        job_analysis=final_state.get("job_analysis"),
                        company_research=final_state.get("company_research")
                    )
            else:
                new_credits = credits

            # Final complete event
            yield f"data: {json.dumps({
                'type': 'complete',
                'generated_content': final_state.get('humanized_content', ''),
                'quality_score': final_state.get('quality_score', 0),
                'quality_feedback': final_state.get('quality_feedback', {}),
                'validation_passed': final_state.get('validation_passed', False),
                'execution_time': final_state.get('execution_time', 0),
                'errors': final_state.get('errors', []),
                'credits_remaining': new_credits
            })}\n\n"

        except Exception as e:
            print(f"❌ Error in cover letter generation: {e}")
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )


@router.post("/cold-email/generate-stream")
async def generate_cold_email_stream(request: GenerateRequest):
    """
    Generate cold email with streaming progress (SSE)
    Same as cover letter but with document_type = "cold_email"
    """
    request.document_type = "cold_email"
    return await generate_cover_letter_stream(request)
