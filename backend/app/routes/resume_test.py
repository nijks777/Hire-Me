"""
Test routes for Resume Customization Agents
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import sys
import os

# Add resume-customization to path
resume_custom_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'resume-customization')
sys.path.insert(0, resume_custom_path)

# Now import from resume-customization
import importlib.util
jd_spec = importlib.util.spec_from_file_location("jd_analyzer", os.path.join(resume_custom_path, "agents", "jd_analyzer.py"))
jd_module = importlib.util.module_from_spec(jd_spec)
jd_spec.loader.exec_module(jd_module)
jd_analyzer_node = jd_module.jd_analyzer_node

resume_spec = importlib.util.spec_from_file_location("resume_analyzer", os.path.join(resume_custom_path, "agents", "resume_analyzer.py"))
resume_module = importlib.util.module_from_spec(resume_spec)
resume_spec.loader.exec_module(resume_module)
resume_analyzer_node = resume_module.resume_analyzer_node

state_spec = importlib.util.spec_from_file_location("state", os.path.join(resume_custom_path, "state.py"))
state_module = importlib.util.module_from_spec(state_spec)
state_spec.loader.exec_module(state_module)
ResumeCustomizationState = state_module.ResumeCustomizationState

router = APIRouter(prefix="/api/test", tags=["test"])


class TestAgentsRequest(BaseModel):
    job_description: str
    custom_instructions: Optional[str] = None


class TestAgentsResponse(BaseModel):
    jd_analysis: Optional[dict] = None
    resume_analysis: Optional[dict] = None
    errors: list[str] = []


@router.post("/agents", response_model=TestAgentsResponse)
async def test_agents(request: TestAgentsRequest):
    """
    Test both JD Analyzer and Resume Analyzer agents IN PARALLEL
    """
    try:
        import asyncio
        from concurrent.futures import ThreadPoolExecutor

        # Create initial state
        state: ResumeCustomizationState = {
            "job_description": request.job_description,
            "custom_instructions": request.custom_instructions,
            "resume_data": b"test_resume",
            "resume_file_name": "test_resume.pdf",
            "user_id": "test_user",
            "jd_analysis": None,
            "resume_analysis": None,
            "context_enrichment": None,
            "customized_resume": None,
            "ats_validation": None,
            "current_agent": "start",
            "retry_count": 0,
            "should_retry": False,
            "is_complete": False,
            "errors": []
        }

        # Run both agents in parallel using ThreadPoolExecutor
        with ThreadPoolExecutor(max_workers=2) as executor:
            # Submit both tasks
            jd_future = executor.submit(jd_analyzer_node, state.copy())
            resume_future = executor.submit(resume_analyzer_node, state.copy())

            # Wait for both to complete
            jd_result = jd_future.result()
            resume_result = resume_future.result()

        # Merge results
        state.update(jd_result)
        state.update(resume_result)

        # Convert Pydantic models to dicts for response
        jd_analysis_dict = None
        if state.get("jd_analysis"):
            jd_analysis_dict = state["jd_analysis"].model_dump()

        resume_analysis_dict = None
        if state.get("resume_analysis"):
            resume_analysis_dict = state["resume_analysis"].model_dump()

        return TestAgentsResponse(
            jd_analysis=jd_analysis_dict,
            resume_analysis=resume_analysis_dict,
            errors=state.get("errors", [])
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
