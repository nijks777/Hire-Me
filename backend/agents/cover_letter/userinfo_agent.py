"""
Agent 4: UserInfo DB Agent
Fetches additional user profile data from database
"""
from agents.cover_letter.state import CoverLetterState
from utils.database import get_user_data


def userinfo_agent(state: CoverLetterState) -> CoverLetterState:
    """
    Fetch user profile data from database:
    - Location
    - Experience years
    - Skills
    - Certifications
    - LinkedIn profile
    - Portfolio links
    """
    print("👤 Agent 4: UserInfo DB Agent")

    user_id = state.get("user_id")

    if not user_id:
        state["errors"].append("UserInfo Agent Error: No user ID provided")
        return state

    try:
        # Fetch user data from database
        user_data = get_user_data(user_id)

        if not user_data:
            print("  ⚠️ User not found in database")
            state["db_profile"] = {}
            state["errors"].append("UserInfo Agent Error: User not found")
            return state

        # Extract profile fields
        db_profile = {
            "user_id": user_data.get("id"),
            "name": user_data.get("name"),
            "email": user_data.get("email"),
            "github_username": user_data.get("githubUsername"),
            "github_connected": bool(user_data.get("githubAccessToken")),
            # Add any additional profile fields from your database schema
            # e.g., location, phone, linkedin, portfolio_url, etc.
        }

        state["db_profile"] = db_profile
        state["progress_messages"].append(f"✅ Loaded profile for {db_profile.get('name', 'user')}")
        state["current_agent"] = "userinfo_agent"

        print(f"  ✅ User: {db_profile.get('name')}")
        print(f"  ✅ GitHub connected: {db_profile.get('github_connected')}")

    except Exception as e:
        print(f"  ❌ UserInfo Agent error: {e}")
        state["errors"].append(f"UserInfo Agent Error: {str(e)}")
        state["db_profile"] = {}

    return state
