"""
LangSmith Startup Configuration
Initialize LangSmith tracing on application startup
"""
import os


def configure_langsmith():
    """
    Configure LangSmith environment variables and display status
    This should be called at application startup
    """
    # Check if LangSmith is enabled
    langsmith_enabled = os.getenv("LANGSMITH_TRACING", "false").lower() == "true"
    langsmith_project = os.getenv("LANGSMITH_PROJECT", "Hire-Me")
    langsmith_api_key = os.getenv("LANGSMITH_API_KEY", "")

    print("\n" + "=" * 80)
    print("📊 LANGSMITH CONFIGURATION")
    print("=" * 80)

    if langsmith_enabled and langsmith_api_key:
        print(f"✅ LangSmith Tracing: ENABLED")
        print(f"📁 Project: {langsmith_project}")
        print(f"🔑 API Key: {'*' * 20}{langsmith_api_key[-10:]}")
        print(f"🌐 Dashboard: https://smith.langchain.com/")
        print(f"📈 View traces at: https://smith.langchain.com/projects/{langsmith_project}")
        print("\n💡 All agent calls and LLM interactions will be traced!")
        print("💡 Filter traces by tags: job-application, resume-customization, agent-1, etc.")
    else:
        print("⚠️  LangSmith Tracing: DISABLED")
        print("💡 To enable: Set LANGSMITH_TRACING=true in your .env file")

    print("=" * 80 + "\n")

    return langsmith_enabled


# Auto-configure on import
if __name__ != "__main__":
    configure_langsmith()
