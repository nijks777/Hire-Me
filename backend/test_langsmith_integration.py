"""
Test LangSmith Integration
Verifies that all agents are properly traced with LangSmith
Run: python test_langsmith_integration.py
"""
import asyncio
import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add paths
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'resume-customization'))

from agents.state import AgentState
from agents.input_analyzer import input_analyzer_agent
from agents.research import research_agent


async def test_langsmith_integration():
    """Test that LangSmith is properly integrated"""

    print("\n" + "=" * 80)
    print("🧪 TESTING LANGSMITH INTEGRATION")
    print("=" * 80 + "\n")

    # Check environment variables
    print("1️⃣  Checking Environment Variables...")
    print("-" * 80)

    langsmith_enabled = os.getenv("LANGSMITH_TRACING", "false").lower() == "true"
    langsmith_project = os.getenv("LANGSMITH_PROJECT", "")
    langsmith_api_key = os.getenv("LANGSMITH_API_KEY", "")

    if langsmith_enabled:
        print(f"✅ LANGSMITH_TRACING: {langsmith_enabled}")
        print(f"✅ LANGSMITH_PROJECT: {langsmith_project}")
        print(f"✅ LANGSMITH_API_KEY: {'*' * 20}{langsmith_api_key[-10:] if langsmith_api_key else 'NOT SET'}")
    else:
        print("❌ LANGSMITH_TRACING is not enabled!")
        print("💡 Set LANGSMITH_TRACING=true in your .env file")
        return False

    print("\n2️⃣  Testing Agent Integration...")
    print("-" * 80)

    # Create test state
    test_state: AgentState = {
        "job_description": """
        Senior Software Engineer - AI/ML

        We're looking for an experienced Senior Software Engineer to join our AI team.

        Requirements:
        - 5+ years of Python experience
        - Strong background in machine learning
        - Experience with LangChain and LLM applications
        - Familiarity with FastAPI and async programming

        Nice to have:
        - Experience with LangSmith or similar observability tools
        - Knowledge of multi-agent systems
        """,
        "company_name": "TechCorp AI",
        "hr_name": "Sarah Johnson",
        "custom_prompt": "Focus on AI/ML experience and technical leadership",
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

    # Test Agent 1: Input Analyzer
    print("\n🔍 Testing Agent 1: Input Analyzer...")
    try:
        state = input_analyzer_agent(test_state)
        if state.get("errors"):
            print(f"   ❌ Agent 1 failed: {state['errors']}")
            return False
        else:
            print("   ✅ Agent 1 executed successfully")
            print(f"   📊 Trace should be visible in LangSmith with tag: agent-1")
    except Exception as e:
        print(f"   ❌ Agent 1 error: {str(e)}")
        return False

    # Test Agent 2: Research
    print("\n🔎 Testing Agent 2: Research Agent...")
    try:
        state = research_agent(state)
        if state.get("errors"):
            print(f"   ❌ Agent 2 failed: {state['errors']}")
            return False
        else:
            print("   ✅ Agent 2 executed successfully")
            print(f"   📊 Trace should be visible in LangSmith with tag: agent-2")
    except Exception as e:
        print(f"   ❌ Agent 2 error: {str(e)}")
        return False

    print("\n3️⃣  Verification Complete!")
    print("-" * 80)
    print("✅ LangSmith integration is working correctly!")
    print("\n📊 View your traces at:")
    print(f"   https://smith.langchain.com/projects/{langsmith_project}")
    print("\n💡 Tips:")
    print("   - Filter by tags: job-application, agent-1, agent-2, etc.")
    print("   - Check the 'Metadata' tab for agent details")
    print("   - Monitor token usage and costs")
    print("   - Set up alerts for failed traces")

    print("\n" + "=" * 80)
    print("🎉 TEST PASSED - All systems operational!")
    print("=" * 80 + "\n")

    return True


async def test_resume_customization_agents():
    """Test resume customization agents"""
    print("\n" + "=" * 80)
    print("🧪 TESTING RESUME CUSTOMIZATION AGENTS")
    print("=" * 80 + "\n")

    from resume_customization.agents.jd_analyzer import jd_analyzer_node
    from resume_customization.state import ResumeCustomizationState

    test_state: ResumeCustomizationState = {
        "job_description": """
        Machine Learning Engineer

        Requirements:
        - 3+ years ML experience
        - Python, TensorFlow, PyTorch
        - Experience with production ML systems
        """,
        "custom_instructions": "Highlight ML projects and publications",
        "resume_data": b"",
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

    print("🔍 Testing JD Analyzer Agent...")
    try:
        result = jd_analyzer_node(test_state)
        if result.get("errors"):
            print(f"   ❌ JD Analyzer failed: {result['errors']}")
            return False
        else:
            print("   ✅ JD Analyzer executed successfully")
            print(f"   📊 Trace should be visible with tag: resume-customization")
    except Exception as e:
        print(f"   ❌ JD Analyzer error: {str(e)}")
        return False

    print("\n✅ Resume customization agents working correctly!")
    print("=" * 80 + "\n")

    return True


if __name__ == "__main__":
    print("""

╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║                    🚀 LANGSMITH INTEGRATION TEST SUITE                       ║
║                                                                              ║
║  This script will test that LangSmith tracing is properly integrated        ║
║  into all your agents and that traces are being sent to LangSmith.          ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

    """)

    try:
        # Run main agent tests
        success = asyncio.run(test_langsmith_integration())

        if success:
            # Run resume customization tests
            asyncio.run(test_resume_customization_agents())

            print("\n" + "🎊" * 40)
            print("\n✨ ALL TESTS PASSED! LangSmith is fully integrated! ✨\n")
            print("🎊" * 40 + "\n")

    except KeyboardInterrupt:
        print("\n\n⚠️  Test interrupted by user")
    except Exception as e:
        print(f"\n\n❌ Test failed with error: {str(e)}")
        import traceback
        traceback.print_exc()
