"""
API Routes for Resume Customization
Streaming endpoint for real-time progress updates
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, AsyncGenerator
from agents.resume_customization.graph import run_resume_customization
from utils.database import get_user_data, deduct_credit, save_resume_customization
from utils.pdf_extractor import extract_text_from_file
import json
import asyncio


router = APIRouter(prefix="/api/resume", tags=["resume-customization"])


class CustomizeResumeRequest(BaseModel):
    user_id: str
    job_description: str
    company_name: str


class CustomizeResumeResponse(BaseModel):
    success: bool
    customized_resume: Optional[str] = None
    ats_score: Optional[float] = None
    diff_report: Optional[dict] = None
    qa_results: Optional[dict] = None
    errors: Optional[list] = None


@router.post("/customize-stream")
async def customize_resume_stream(request: CustomizeResumeRequest):
    """
    Customize resume with streaming progress updates (SSE)

    Process:
    1. Fetch user data from database
    2. Run 9-agent workflow
    3. Stream real-time progress to client
    4. Return customized resume with diff and QA results
    """
    async def event_generator() -> AsyncGenerator[str, None]:
        try:
            # Phase 0: Fetch user data
            yield f"data: {json.dumps({'type': 'progress', 'phase': 0, 'message': 'Fetching user data...'})}\n\n"

            user_data = get_user_data(request.user_id)
            if not user_data:
                yield f"data: {json.dumps({'type': 'error', 'message': 'User not found'})}\n\n"
                return

            # Extract resume
            user_resume = extract_text_from_file(
                user_data.get("resumeData"),
                user_data.get("resumeMimeType")
            )

            if not user_resume:
                yield f"data: {json.dumps({'type': 'error', 'message': 'No resume found for user'})}\n\n"
                return

            user_profile = {
                "name": user_data.get("name"),
                "email": user_data.get("email"),
                "githubAccessToken": user_data.get("githubAccessToken"),
                "githubUsername": user_data.get("githubUsername"),
                "githubConnectedAt": user_data.get("githubConnectedAt")
            }

            yield f"data: {json.dumps({'type': 'phase_complete', 'phase': 0, 'message': 'User data loaded'})}\n\n"

            # Phase 1: JD Analysis + Resume Parsing + GitHub Fetching
            yield f"data: {json.dumps({'type': 'progress', 'phase': 1, 'message': 'Analyzing job description and parsing resume...'})}\n\n"

            # Run workflow in background thread
            loop = asyncio.get_event_loop()

            def run_workflow():
                return run_resume_customization(
                    user_id=request.user_id,
                    job_description=request.job_description,
                    company_name=request.company_name,
                    user_resume=user_resume,
                    user_profile=user_profile
                )

            # Execute workflow
            # Note: For real-time streaming, we'd need to modify the graph to yield progress
            # For now, we'll run it and report completion
            final_state = await loop.run_in_executor(None, run_workflow)

            # Send phase updates based on completed agents
            if final_state.get("jd_analysis"):
                yield f"data: {json.dumps({'type': 'phase_complete', 'phase': 1, 'message': 'JD analysis complete'})}\n\n"

            if final_state.get("parsed_resume"):
                yield f"data: {json.dumps({'type': 'phase_complete', 'phase': 2, 'message': 'Resume parsed'})}\n\n"

            if final_state.get("github_repos") is not None:
                repo_count = len(final_state.get("github_repos", []))
                yield f"data: {json.dumps({'type': 'phase_complete', 'phase': 3, 'message': f'GitHub repos fetched ({repo_count} repos)'})}\n\n"

            if final_state.get("matched_projects"):
                yield f"data: {json.dumps({'type': 'phase_complete', 'phase': 4, 'message': 'Projects matched to job'})}\n\n"

            if final_state.get("optimized_experience"):
                yield f"data: {json.dumps({'type': 'phase_complete', 'phase': 5, 'message': 'Experience optimized'})}\n\n"

            if final_state.get("customized_resume"):
                yield f"data: {json.dumps({'type': 'phase_complete', 'phase': 6, 'message': 'Resume rebuilt'})}\n\n"

            if final_state.get("ats_score") is not None:
                ats_score = final_state.get("ats_score", 0)
                yield f"data: {json.dumps({'type': 'phase_complete', 'phase': 7, 'message': f'ATS score: {ats_score:.1f}%'})}\n\n"

            if final_state.get("qa_results"):
                qa_quality = final_state.get("qa_results", {}).get("overall_quality", "unknown")
                yield f"data: {json.dumps({'type': 'phase_complete', 'phase': 8, 'message': f'QA complete: {qa_quality}'})}\n\n"

            if final_state.get("diff_report"):
                yield f"data: {json.dumps({'type': 'phase_complete', 'phase': 9, 'message': 'Diff report generated'})}\n\n"

            # Check for errors
            if final_state.get("errors"):
                error_count = len(final_state["errors"])
                yield f"data: {json.dumps({'type': 'warning', 'message': f'{error_count} warnings/errors occurred'})}\n\n"

            # Deduct 1 credit on successful generation
            if final_state.get("customized_resume"):
                print(f"💳 Deducting 1 credit from user {request.user_id}")
                deduct_credit(request.user_id, 1)
                user_data_updated = get_user_data(request.user_id)
                new_credits = user_data_updated.get("credits", 0) if user_data_updated else 0
                yield f"data: {json.dumps({'type': 'info', 'message': f'1 credit deducted. Remaining: {new_credits}'})}\n\n"

                # Save to history
                print(f"💾 Saving resume customization to history...")
                save_resume_customization(
                    user_id=request.user_id,
                    job_description=request.job_description,
                    company_name=request.company_name,
                    customized_resume=final_state.get("customized_resume", ""),
                    ats_score=final_state.get("ats_score"),
                    diff_report=final_state.get("diff_report"),
                    qa_results=final_state.get("qa_results"),
                    jd_analysis=final_state.get("jd_analysis"),
                    matched_projects=final_state.get("matched_projects")
                )
            else:
                new_credits = user_data.get("credits", 0)

            # Send final result
            result = {
                "type": "complete",
                "customized_resume": final_state.get("customized_resume"),
                "ats_score": final_state.get("ats_score"),
                "diff_report": final_state.get("diff_report"),
                "qa_results": final_state.get("qa_results"),
                "matched_projects": final_state.get("matched_projects"),
                "execution_time": final_state.get("execution_time"),
                "errors": final_state.get("errors", []),
                "hallucination_check": final_state.get("hallucination_check"),
                "credits_remaining": new_credits
            }

            yield f"data: {json.dumps(result)}\n\n"

        except Exception as e:
            print(f"Error in customize_resume_stream: {e}")
            import traceback
            traceback.print_exc()
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.post("/customize", response_model=CustomizeResumeResponse)
async def customize_resume(request: CustomizeResumeRequest):
    """
    Customize resume (non-streaming version)

    Returns the complete result after workflow finishes
    """
    try:
        # Fetch user data
        user_data = get_user_data(request.user_id)
        if not user_data:
            raise HTTPException(status_code=404, detail="User not found")

        # Extract resume
        user_resume = extract_text_from_file(
            user_data.get("resumeData"),
            user_data.get("resumeMimeType")
        )

        if not user_resume:
            raise HTTPException(status_code=400, detail="No resume found for user")

        user_profile = {
            "name": user_data.get("name"),
            "email": user_data.get("email"),
            "githubAccessToken": user_data.get("githubAccessToken"),
            "githubUsername": user_data.get("githubUsername"),
            "githubConnectedAt": user_data.get("githubConnectedAt")
        }

        # Run workflow
        final_state = run_resume_customization(
            user_id=request.user_id,
            job_description=request.job_description,
            company_name=request.company_name,
            user_resume=user_resume,
            user_profile=user_profile
        )

        # Return result
        return CustomizeResumeResponse(
            success=len(final_state.get("errors", [])) == 0,
            customized_resume=final_state.get("customized_resume"),
            ats_score=final_state.get("ats_score"),
            diff_report=final_state.get("diff_report"),
            qa_results=final_state.get("qa_results"),
            errors=final_state.get("errors")
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in customize_resume: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
