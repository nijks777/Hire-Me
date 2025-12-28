"""
Complete System Test
Tests all generation types + database saving + LangSmith tracing
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

import requests
import time
from utils.database import get_user_generations, get_user_data

# Test user ID
TEST_USER_ID = "6f659fad-906a-40f8-bab5-a44b2aadebd6"
BASE_URL = "http://localhost:8000"

def print_header(text):
    print("\n" + "="*80)
    print(f"🧪 {text}")
    print("="*80)

def print_success(text):
    print(f"✅ {text}")

def print_error(text):
    print(f"❌ {text}")

def print_info(text):
    print(f"ℹ️  {text}")


def test_1_check_user():
    """Test 1: Verify user exists and has credits"""
    print_header("TEST 1: Check User Data")

    user_data = get_user_data(TEST_USER_ID)
    if not user_data:
        print_error("User not found in database")
        return False

    print_success(f"User found: {user_data['name']} ({user_data['email']})")
    print_info(f"Credits: {user_data['credits']}")

    if user_data['credits'] < 3:
        print_error("User needs at least 3 credits for all tests")
        return False

    print_success("User has sufficient credits")
    return True


def test_2_cover_letter_generation():
    """Test 2: Generate cover letter and verify saving"""
    print_header("TEST 2: Cover Letter Generation + Database Save")

    # Get initial generation count
    initial_gens = get_user_generations(TEST_USER_ID)
    initial_count = len(initial_gens)
    print_info(f"Initial generations count: {initial_count}")

    # Test data
    payload = {
        "user_id": TEST_USER_ID,
        "job_description": "Senior Python Developer with AI/ML experience",
        "company_name": "Test Company AI",
        "document_type": "cover_letter"
    }

    print_info("Sending cover letter generation request...")
    print_info("This may take 30-60 seconds...")

    try:
        response = requests.post(
            f"{BASE_URL}/api/cover-letter/generate-stream",
            json=payload,
            stream=True,
            timeout=120
        )

        if response.status_code != 200:
            print_error(f"Request failed with status {response.status_code}")
            return False

        # Process SSE stream
        generated_content = None
        for line in response.iter_lines():
            if line:
                line_str = line.decode('utf-8')
                if line_str.startswith('data: '):
                    import json
                    try:
                        data = json.loads(line_str[6:])
                        if data.get('type') == 'progress':
                            print(f"   📊 {data.get('message')}")
                        elif data.get('type') == 'complete':
                            generated_content = data.get('generated_content')
                            print_success("Generation completed!")
                    except:
                        pass

        if not generated_content:
            print_error("No content generated")
            return False

        print_success(f"Cover letter generated ({len(generated_content)} chars)")

        # Wait a moment for DB write
        time.sleep(2)

        # Check if saved to database
        new_gens = get_user_generations(TEST_USER_ID)
        new_count = len(new_gens)

        if new_count > initial_count:
            print_success(f"Generation saved to database! ({new_count} total generations)")

            # Check the latest generation
            latest = new_gens[0]
            if latest.get('generation_type') == 'cover_letter':
                print_success(f"Generation type correct: cover_letter")
                print_info(f"Company: {latest.get('company_name')}")
                return True
            else:
                print_error(f"Wrong generation type: {latest.get('generation_type')}")
                return False
        else:
            print_error("Generation NOT saved to database")
            return False

    except Exception as e:
        print_error(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_3_resume_suggestions():
    """Test 3: Generate resume suggestions and verify saving"""
    print_header("TEST 3: Resume Suggestions Generation + Database Save")

    initial_gens = get_user_generations(TEST_USER_ID)
    initial_count = len(initial_gens)

    payload = {
        "user_id": TEST_USER_ID,
        "job_description": "Full Stack Engineer with React and Python",
        "company_name": "Test Startup Inc"
    }

    print_info("Sending resume suggestions request...")
    print_info("This may take 30-60 seconds...")

    try:
        response = requests.post(
            f"{BASE_URL}/api/resume/suggest-stream",
            json=payload,
            stream=True,
            timeout=120
        )

        if response.status_code != 200:
            print_error(f"Request failed with status {response.status_code}")
            return False

        suggestions = None
        for line in response.iter_lines():
            if line:
                line_str = line.decode('utf-8')
                if line_str.startswith('data: '):
                    import json
                    try:
                        data = json.loads(line_str[6:])
                        if data.get('type') == 'progress':
                            print(f"   📊 {data.get('message')}")
                        elif data.get('type') == 'complete':
                            suggestions = data.get('suggestions')
                            print_success("Suggestions generated!")
                    except:
                        pass

        if not suggestions:
            print_error("No suggestions generated")
            return False

        print_success(f"Suggestions count: {len(suggestions.get('priority_changes', []))}")

        time.sleep(2)

        new_gens = get_user_generations(TEST_USER_ID)
        new_count = len(new_gens)

        if new_count > initial_count:
            print_success(f"Suggestions saved to database!")
            latest = new_gens[0]
            if latest.get('generation_type') == 'resume_suggestions':
                print_success(f"Generation type correct: resume_suggestions")
                return True
            else:
                print_error(f"Wrong generation type: {latest.get('generation_type')}")
                return False
        else:
            print_error("Suggestions NOT saved to database")
            return False

    except Exception as e:
        print_error(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_4_verify_history():
    """Test 4: Verify all generations appear in history"""
    print_header("TEST 4: Verify History Contains All Generations")

    all_gens = get_user_generations(TEST_USER_ID, limit=100)

    print_info(f"Total generations in history: {len(all_gens)}")

    # Group by type
    by_type = {}
    for gen in all_gens:
        gen_type = gen.get('generation_type', 'unknown')
        by_type[gen_type] = by_type.get(gen_type, 0) + 1

    print("\n📊 Generations by type:")
    for gen_type, count in by_type.items():
        print(f"   {gen_type}: {count}")

    # Check if we have the types we just created
    if 'cover_letter' in by_type and 'resume_suggestions' in by_type:
        print_success("All generation types present in history!")
        return True
    else:
        print_error("Some generation types missing from history")
        return False


def test_5_langsmith_status():
    """Test 5: Check LangSmith configuration"""
    print_header("TEST 5: LangSmith Tracing Status")

    langsmith_enabled = os.getenv("LANGSMITH_TRACING", "false").lower() == "true"
    langsmith_api_key = os.getenv("LANGSMITH_API_KEY", "")
    langsmith_project = os.getenv("LANGSMITH_PROJECT", "Hire-Me")

    if langsmith_enabled and langsmith_api_key:
        print_success("LangSmith tracing is ENABLED")
        print_info(f"Project: {langsmith_project}")
        print_info(f"API Key: {'*' * 20}{langsmith_api_key[-10:]}")
        print_info(f"Dashboard: https://smith.langchain.com/")
        print("\n💡 Check your LangSmith dashboard to see traces:")
        print(f"   https://smith.langchain.com/projects/{langsmith_project}")
        return True
    else:
        print_error("LangSmith tracing is DISABLED")
        print_info("Set LANGSMITH_TRACING=true in .env to enable")
        return False


def main():
    """Run all tests"""
    print("\n" + "🚀" * 40)
    print("COMPLETE SYSTEM TEST - Hire-Me Application")
    print("🚀" * 40)

    print_info(f"Test User: {TEST_USER_ID}")
    print_info(f"Backend URL: {BASE_URL}")

    results = {
        "User Check": test_1_check_user(),
        "Cover Letter Generation": test_2_cover_letter_generation(),
        "Resume Suggestions": test_3_resume_suggestions(),
        "History Verification": test_4_verify_history(),
        "LangSmith Status": test_5_langsmith_status()
    }

    # Summary
    print("\n" + "="*80)
    print("📊 TEST SUMMARY")
    print("="*80)

    for test_name, passed in results.items():
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"{status} - {test_name}")

    total_tests = len(results)
    passed_tests = sum(1 for p in results.values() if p)

    print("\n" + "="*80)
    print(f"Final Score: {passed_tests}/{total_tests} tests passed")
    print("="*80 + "\n")

    if passed_tests == total_tests:
        print("🎉 ALL TESTS PASSED! System is working correctly!")
    else:
        print("⚠️  Some tests failed. Please review the output above.")

    return passed_tests == total_tests


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
