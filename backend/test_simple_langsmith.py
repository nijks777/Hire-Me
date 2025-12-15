"""
Simple LangSmith Integration Test
Tests basic LangSmith functionality
"""
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

print("\n" + "=" * 80)
print("🧪 LANGSMITH SIMPLE INTEGRATION TEST")
print("=" * 80 + "\n")

# Check environment variables
print("1️⃣  Checking Environment Variables...")
print("-" * 80)

langsmith_enabled = os.getenv("LANGSMITH_TRACING", "false").lower() == "true"
langsmith_project = os.getenv("LANGSMITH_PROJECT", "")
langsmith_api_key = os.getenv("LANGSMITH_API_KEY", "")
openai_api_key = os.getenv("OPENAI_API_KEY", "")

print(f"LANGSMITH_TRACING: {langsmith_enabled}")
print(f"LANGSMITH_PROJECT: {langsmith_project}")
print(f"LANGSMITH_API_KEY: {'*' * 20}{langsmith_api_key[-10:] if langsmith_api_key else 'NOT SET'}")
print(f"OPENAI_API_KEY: {'*' * 20}{openai_api_key[-10:] if openai_api_key else 'NOT SET'}")

if langsmith_enabled and langsmith_api_key:
    print("\n✅ LangSmith is properly configured!")
else:
    print("\n❌ LangSmith is NOT configured!")
    exit(1)

# Test LangSmith import
print("\n2️⃣  Testing LangSmith Import...")
print("-" * 80)

try:
    from langsmith import traceable, Client
    print("✅ LangSmith SDK imported successfully")
except ImportError as e:
    print(f"❌ Failed to import LangSmith: {e}")
    exit(1)

# Test LangSmith client
print("\n3️⃣  Testing LangSmith Client...")
print("-" * 80)

try:
    ls_client = Client()
    print("✅ LangSmith client initialized successfully")
except Exception as e:
    print(f"❌ Failed to initialize LangSmith client: {e}")
    exit(1)

# Test a simple traced function
print("\n4️⃣  Testing Traced Function...")
print("-" * 80)

@traceable(name="test_function", tags=["test"])
def simple_test_function(text: str) -> str:
    """Simple function to test tracing"""
    return f"Processed: {text}"

try:
    result = simple_test_function("Hello LangSmith!")
    print(f"✅ Traced function executed: {result}")
    print(f"📊 Check trace at: https://smith.langchain.com/projects/{langsmith_project}")
except Exception as e:
    print(f"❌ Failed to execute traced function: {e}")
    exit(1)

# Test with OpenAI
print("\n5️⃣  Testing with OpenAI + LangSmith...")
print("-" * 80)

try:
    from langchain_openai import ChatOpenAI
    from langchain_core.messages import HumanMessage

    @traceable(name="test_llm_call", tags=["test", "llm"])
    def test_llm_call():
        llm = ChatOpenAI(
            model="gpt-4o-mini",
            temperature=0.3,
            api_key=openai_api_key,
            tags=["test-integration"],
            metadata={"test": "langsmith-integration"}
        )

        messages = [HumanMessage(content="Say 'LangSmith integration successful!' in one sentence.")]
        response = llm.invoke(messages)
        return response.content

    response = test_llm_call()
    print(f"✅ LLM call successful: {response}")
    print(f"📊 LLM trace should be visible in LangSmith")
except Exception as e:
    print(f"❌ LLM test failed: {e}")
    import traceback
    traceback.print_exc()
    exit(1)

# Success!
print("\n" + "=" * 80)
print("🎉 ALL TESTS PASSED!")
print("=" * 80)
print("\n✨ LangSmith is fully integrated and working!")
print(f"\n📊 View all traces at: https://smith.langchain.com/projects/{langsmith_project}")
print("\n💡 Next steps:")
print("   1. Start your FastAPI server: uvicorn app.main:app --reload")
print("   2. Make API calls to /api/test-step-1 or /api/generate-stream")
print("   3. View traces in real-time at LangSmith dashboard")
print("\n" + "=" * 80 + "\n")
