"""
Agent 7: ATS Validator
Validates resume ATS score and provides feedback for improvement
"""
from agents.resume_customization.state import ResumeCustomizationState
from utils.langsmith_config import trace_agent
from tools.ats_scorer import score_resume_ats
import os


@trace_agent("ats_validator", run_type="tool", tags=["resume-customization", "ats-validation", "agent-7"])
def ats_validator_agent(state: ResumeCustomizationState) -> ResumeCustomizationState:
    """
    Agent 7: Validate resume ATS score

    Process:
    1. Score customized resume against job requirements
    2. Check if score meets threshold (default: 75%)
    3. Provide detailed feedback
    4. Flag for retry if below threshold (up to max retries)
    """
    print("🎯 Agent 7: Validating ATS score...")

    customized_resume = state.get("customized_resume", "")
    jd_analysis = state.get("jd_analysis", {})
    retry_count = state.get("retry_count", 0)

    # Get threshold from env or use default
    threshold = float(os.getenv("ATS_SCORE_THRESHOLD", "75"))
    max_retries = 2  # Maximum number of retry attempts

    try:
        if not customized_resume:
            print("  ⚠️ No customized resume to validate")
            state["ats_score"] = 0
            state["ats_feedback"] = {"error": "No resume to validate"}
            state["errors"].append("ATS Validator: No resume available")
            return state

        # Score the resume
        print(f"  → Scoring resume (threshold: {threshold}%)...")
        ats_result = score_resume_ats(
            resume=customized_resume,
            job_requirements=jd_analysis,
            threshold=threshold
        )

        score = ats_result["overall_score"]
        passed = ats_result["passed"]

        state["ats_score"] = score
        state["ats_feedback"] = ats_result

        # Print detailed results
        print(f"  📊 ATS Score: {score:.1f}% (threshold: {threshold}%)")
        print(f"  📈 Keyword Match: {ats_result['keyword_analysis']['match_percentage']:.1f}%")
        print(f"  📋 Format Score: {ats_result['format_analysis']['format_score']:.1f}%")

        if passed:
            print(f"  ✅ PASSED - Resume meets ATS threshold!")
            state["progress_messages"].append(f"✅ ATS validation passed: {score:.1f}% score")
        else:
            print(f"  ⚠️ FAILED - Score below threshold ({score:.1f}% < {threshold}%)")
            state["progress_messages"].append(f"⚠️ ATS score: {score:.1f}% (below threshold)")

            # Check if we should retry
            if retry_count < max_retries:
                print(f"  🔄 Retry {retry_count + 1}/{max_retries} possible")
                state["retry_count"] = retry_count + 1

                # Add feedback for retry
                missing_keywords = ats_result["keyword_analysis"].get("missing_keywords", [])
                if missing_keywords:
                    top_missing = missing_keywords[:10]
                    print(f"  💡 Missing keywords to add: {', '.join(top_missing)}")
                    state["ats_feedback"]["retry_suggestions"] = {
                        "missing_keywords": top_missing,
                        "recommendations": ats_result["recommendations"]
                    }
            else:
                print(f"  ⚠️ Max retries reached ({max_retries}), proceeding anyway")

        # Print feedback
        if ats_result.get("feedback"):
            print("  📝 Feedback:")
            for fb in ats_result["feedback"][:3]:  # Show top 3 feedback items
                print(f"    • {fb}")

        state["current_agent"] = "ats_validator"

    except Exception as e:
        print(f"  ❌ ATS validation error: {e}")
        state["errors"].append(f"ATS Validator Error: {str(e)}")
        state["ats_score"] = 0
        state["ats_feedback"] = {"error": str(e)}

    return state
