"""
Agent 8: QA/Testing Agent
Verifies no hallucinations and structure preservation
"""
from langchain_core.prompts import ChatPromptTemplate
from agents.resume_customization.state import ResumeCustomizationState
from utils.langsmith_config import trace_agent, get_traced_llm
import json


@trace_agent("qa_agent", run_type="chain", tags=["resume-customization", "qa-testing", "agent-8"])
def qa_agent(state: ResumeCustomizationState) -> ResumeCustomizationState:
    """
    Agent 8: Quality Assurance and Testing

    Checks:
    1. No hallucinated information (all claims verifiable in original)
    2. Structure preserved (sections in same order)
    3. Contact info unchanged
    4. No fabricated experience or skills
    5. Project links are valid GitHub URLs
    """
    print("🔍 Agent 8: Running QA checks...")

    user_resume = state.get("user_resume", "")
    customized_resume = state.get("customized_resume", "")
    parsed_resume = state.get("parsed_resume", {})
    matched_projects = state.get("matched_projects", [])
    optimized_experience = state.get("optimized_experience", [])

    try:
        if not customized_resume:
            print("  ⚠️ No customized resume to validate")
            state["qa_results"] = {"error": "No resume to validate"}
            state["hallucination_check"] = False
            return state

        llm = get_traced_llm(
            model="gpt-4o-mini",
            temperature=0.1,  # Low temperature for objective analysis
            tags=["qa-testing", "hallucination-check"],
            metadata={"agent": "qa_agent", "step": 8}
        )

        qa_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a meticulous QA engineer specializing in resume verification.

Your task is to verify that the customized resume contains NO hallucinated information.

CRITICAL CHECKS:
1. **Hallucination Check** - Every claim in the new resume must be verifiable in the original
2. **Structure Preservation** - Sections should be in similar order
3. **Contact Info** - Must be exactly the same
4. **Experience Verification** - All experience bullets must be based on original (rewording is OK, fabrication is NOT)
5. **Project Verification** - New projects must be from provided GitHub list
6. **Skills Verification** - No new skills added that weren't in original or GitHub repos

Return a JSON object (use double curly braces in your response):
{{
  "hallucination_check_passed": true/false,
  "structure_preserved": true/false,
  "contact_info_preserved": true/false,
  "issues_found": [],
  "warnings": [],
  "verification_details": {{
    "experience_verified": true/false,
    "projects_verified": true/false,
    "skills_verified": true/false
  }},
  "overall_quality": "excellent/good/fair/poor",
  "recommendations": []
}}

Be strict - flag ANY fabricated information as a hallucination."""),
            ("human", """Original Resume:
{original_resume}

Customized Resume:
{customized_resume}

Matched Projects (these are allowed):
{matched_projects}

Optimized Experience (check these against original):
{optimized_experience}

Verify the customized resume for hallucinations and quality issues.""")
        ])

        chain = qa_prompt | llm
        response = chain.invoke({
            "original_resume": user_resume,
            "customized_resume": customized_resume,
            "matched_projects": json.dumps(matched_projects, indent=2),
            "optimized_experience": json.dumps(optimized_experience, indent=2)
        })

        # Parse JSON response
        try:
            qa_results = json.loads(response.content)
        except json.JSONDecodeError:
            # Fallback: extract JSON from markdown code block
            content = response.content
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
            qa_results = json.loads(content)

        state["qa_results"] = qa_results
        state["hallucination_check"] = qa_results.get("hallucination_check_passed", False)

        # Print results
        if qa_results.get("hallucination_check_passed"):
            print("  ✅ Hallucination check: PASSED")
        else:
            print("  ⚠️ Hallucination check: FAILED")

        if qa_results.get("structure_preserved"):
            print("  ✅ Structure preservation: PASSED")
        else:
            print("  ⚠️ Structure preservation: FAILED")

        # Print issues
        issues = qa_results.get("issues_found", [])
        if issues:
            print("  ⚠️ Issues found:")
            for issue in issues[:3]:  # Show top 3
                print(f"    • {issue}")

        # Print warnings
        warnings = qa_results.get("warnings", [])
        if warnings:
            print("  💡 Warnings:")
            for warning in warnings[:3]:  # Show top 3
                print(f"    • {warning}")

        overall_quality = qa_results.get("overall_quality", "unknown")
        print(f"  📊 Overall Quality: {overall_quality.upper()}")

        state["progress_messages"].append(
            f"✅ QA complete: {overall_quality} quality, "
            f"{'no' if qa_results.get('hallucination_check_passed') else 'POTENTIAL'} hallucinations"
        )
        state["current_agent"] = "qa_agent"

        # Add errors if critical issues found
        if not qa_results.get("hallucination_check_passed"):
            state["errors"].append("QA: Potential hallucinations detected")

    except Exception as e:
        print(f"  ❌ QA error: {e}")
        state["errors"].append(f"QA Agent Error: {str(e)}")
        state["qa_results"] = {"error": str(e)}
        state["hallucination_check"] = False

    return state
