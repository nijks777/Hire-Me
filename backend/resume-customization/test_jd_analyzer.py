"""
Test script for JD Analyzer Agent
Run this from resume-customization directory: python test_jd_analyzer.py
"""
import asyncio
import sys
import os
from dotenv import load_dotenv

# Load environment variables from backend/.env
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
load_dotenv(env_path)

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from agents.jd_analyzer import jd_analyzer_node
from state import ResumeCustomizationState


async def test_jd_analyzer():
    """Test the JD Analyzer agent"""

    # Sample job description
    test_jd = """
    Senior Software Engineer - Full Stack

    We are looking for an experienced Senior Software Engineer to join our team.

    Requirements:
    - 5+ years of experience in software development
    - Strong proficiency in React, Node.js, and TypeScript
    - Experience with AWS cloud services
    - Knowledge of PostgreSQL or similar databases
    - Experience with microservices architecture
    - Strong problem-solving skills

    Nice to have:
    - Experience with Docker and Kubernetes
    - Knowledge of GraphQL
    - Prior experience in fintech

    Responsibilities:
    - Design and develop scalable web applications
    - Lead technical discussions and code reviews
    - Mentor junior developers
    - Collaborate with product team on requirements
    """

    test_custom_instructions = """
    - Emphasize my experience with microservices
    - Highlight AWS certifications
    - Focus on leadership and mentoring
    - Keep resume to 2 pages maximum
    """

    # Create test state
    test_state: ResumeCustomizationState = {
        "job_description": test_jd,
        "custom_instructions": test_custom_instructions,
        "resume_data": b"",  # Empty for now
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

    print("=" * 80)
    print("Testing JD Analyzer Agent")
    print("=" * 80)
    print("\nJob Description:")
    print("-" * 80)
    print(test_jd)
    print("\nCustom Instructions:")
    print("-" * 80)
    print(test_custom_instructions)
    print("\n" + "=" * 80)
    print("Running Analysis...")
    print("=" * 80 + "\n")

    # Run the agent
    result = jd_analyzer_node(test_state)

    if result.get("errors"):
        print("❌ ERRORS:")
        for error in result["errors"]:
            print(f"  - {error}")
    else:
        print("✅ Analysis Complete!\n")
        jd_analysis = result.get("jd_analysis")

        if jd_analysis:
            print("📋 Job Title:", jd_analysis.job_title)
            print("📊 Experience Level:", jd_analysis.experience_level)
            print("🏢 Company Focus:", jd_analysis.company_focus)
            print("\n🔑 Key Requirements:")
            for req in jd_analysis.key_requirements:
                print(f"  • {req}")

            print("\n💻 Required Skills:")
            for skill in jd_analysis.required_skills:
                print(f"  • {skill}")

            print("\n✨ Preferred Skills:")
            for skill in jd_analysis.preferred_skills:
                print(f"  • {skill}")

            print("\n🔍 ATS Keywords:")
            for keyword in jd_analysis.keywords:
                print(f"  • {keyword}")

            if jd_analysis.custom_instructions_parsed:
                print("\n📝 Custom Instructions Summary:")
                print(f"  {jd_analysis.custom_instructions_parsed}")

            print("\n" + "=" * 80)
            print("✅ TEST PASSED - JD Analyzer is working correctly!")
            print("=" * 80)
        else:
            print("❌ No analysis data returned")


if __name__ == "__main__":
    asyncio.run(test_jd_analyzer())
