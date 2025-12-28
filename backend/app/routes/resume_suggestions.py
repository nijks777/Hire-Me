"""
API Routes for Resume Suggestions
AI suggests changes, user edits manually + Saves to history
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, AsyncGenerator
from agents.resume_suggestions.graph import run_resume_suggestion_workflow
from utils.database import get_user_data, deduct_credit, save_resume_suggestions
import json
import asyncio
import time


router = APIRouter(prefix="/api/resume", tags=["resume-suggestions"])


class SuggestionRequest(BaseModel):
    user_id: str
    job_description: str
    company_name: str


@router.post("/suggest-stream")
async def suggest_resume_improvements_stream(request: SuggestionRequest):
    """
    Generate resume improvement suggestions with streaming progress

    Process:
    1. Check credits
    2. Run 5-agent workflow
    3. Stream real-time progress with console logs
    4. Return suggestions (user applies manually)
    5. Deduct 1 credit
    """
    async def event_generator() -> AsyncGenerator[str, None]:
        try:
            # Phase 0: Check credits
            print("🔍 Phase 0: Checking credits...")
            yield f"data: {json.dumps({'type': 'progress', 'phase': 0, 'message': 'Checking credits...', 'agent': 'system'})}\n\n"

            user_data = get_user_data(request.user_id)
            if not user_data:
                yield f"data: {json.dumps({'type': 'error', 'message': 'User not found'})}\n\n"
                return

            credits = user_data.get("credits", 0)
            if credits < 1:
                yield f"data: {json.dumps({'type': 'error', 'message': 'Insufficient credits. You have 0 credits remaining.'})}\n\n"
                return

            print(f"✅ Credits available: {credits}")
            yield f"data: {json.dumps({'type': 'phase_complete', 'phase': 0, 'message': f'Credits available: {credits}', 'agent': 'system'})}\n\n"
            await asyncio.sleep(0.2)

            # Phase 1: JD Analyzer
            print("🔍 Phase 1: JD Analyzer starting...")
            yield f"data: {json.dumps({'type': 'progress', 'phase': 1, 'message': 'Analyzing job description...', 'agent': 'jd_analyzer'})}\n\n"
            await asyncio.sleep(0.3)

            # Run the workflow in background
            loop = asyncio.get_event_loop()
            def run_workflow():
                return run_resume_suggestion_workflow(
                    user_id=request.user_id,
                    job_description=request.job_description,
                    company_name=request.company_name
                )

            final_state = await loop.run_in_executor(None, run_workflow)

            print("✅ Phase 1: JD Analyzer complete")
            yield f"data: {json.dumps({'type': 'phase_complete', 'phase': 1, 'message': 'Job analysis complete', 'agent': 'jd_analyzer'})}\n\n"
            await asyncio.sleep(0.2)

            # Phase 2: Resume Parser
            if final_state.get("parsed_resume"):
                print("✅ Phase 2: Resume Parser complete")
                yield f"data: {json.dumps({'type': 'phase_complete', 'phase': 2, 'message': 'Resume parsed', 'agent': 'resume_parser'})}\n\n"
                await asyncio.sleep(0.2)

            # Phase 3: GitHub Fetcher
            if final_state.get("github_repos") is not None:
                repo_count = len(final_state.get("github_repos", []))
                print(f"✅ Phase 3: GitHub Fetcher complete - {repo_count} repos")
                yield f"data: {json.dumps({'type': 'phase_complete', 'phase': 3, 'message': f'GitHub repos fetched ({repo_count} repos)', 'agent': 'github_fetcher'})}\n\n"
                await asyncio.sleep(0.2)

            # Phase 4: ATS Validator
            if final_state.get("ats_analysis"):
                ats_score = final_state.get("ats_analysis", {}).get("overall_score", 0)
                print(f"✅ Phase 4: ATS Validator complete - Score: {ats_score:.1f}%")
                yield f"data: {json.dumps({'type': 'phase_complete', 'phase': 4, 'message': f'ATS score: {ats_score:.1f}%', 'agent': 'ats_validator'})}\n\n"
                await asyncio.sleep(0.2)

            # Phase 5: Suggestion Generator
            if final_state.get("suggestions"):
                suggestion_count = len(final_state.get("suggestions", {}).get("priority_changes", []))
                print(f"✅ Phase 5: Suggestion Generator complete - {suggestion_count} suggestions")
                yield f"data: {json.dumps({'type': 'phase_complete', 'phase': 5, 'message': f'{suggestion_count} suggestions generated', 'agent': 'suggestion_generator'})}\n\n"
                await asyncio.sleep(0.2)

            # Check for errors
            if final_state.get("errors"):
                error_count = len(final_state["errors"])
                print(f"⚠️ {error_count} warnings occurred")
                yield f"data: {json.dumps({'type': 'warning', 'message': f'{error_count} warnings occurred'})}\n\n"

            # Deduct credit and save to history on successful generation
            if final_state.get("suggestions"):
                print(f"💳 Deducting 1 credit from user {request.user_id}")
                deduct_credit(request.user_id, 1)
                new_credits = credits - 1
                yield f"data: {json.dumps({'type': 'info', 'message': f'1 credit deducted. Remaining: {new_credits}'})}\n\n"

                # Save to history
                print(f"💾 Saving resume suggestions to history...")
                save_resume_suggestions(
                    user_id=request.user_id,
                    job_description=request.job_description,
                    company_name=request.company_name,
                    suggestions=final_state.get("suggestions", {}),
                    jd_analysis=final_state.get("jd_analysis"),
                    ats_analysis=final_state.get("ats_analysis")
                )
            else:
                new_credits = credits

            # Send final result
            print(f"✅ Sending final result to frontend")
            result = {
                "type": "complete",
                "suggestions": final_state.get("suggestions", {}),
                "jd_analysis": final_state.get("jd_analysis", {}),
                "ats_analysis": final_state.get("ats_analysis", {}),
                "github_repos": final_state.get("github_repos", [])[:5],  # Top 5 repos
                "execution_time": final_state.get("execution_time", 0),
                "errors": final_state.get("errors", []),
                "credits_remaining": new_credits
            }

            yield f"data: {json.dumps(result)}\n\n"
            print("✅ Workflow complete!")

        except Exception as e:
            print(f"❌ Error in suggest_resume_improvements_stream: {e}")
            import traceback
            traceback.print_exc()
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )
