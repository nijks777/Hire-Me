"""
Agent 3: GitHub MCP Agent
Fetches user's GitHub data using PyGithub
"""
from agents.cover_letter.state import CoverLetterState
from tools.github_mcp import fetch_github_repos_for_user
import os


def github_agent(state: CoverLetterState) -> CoverLetterState:
    """
    Fetch GitHub data:
    - Repositories
    - Tech stack / languages
    - Contributions
    - Project descriptions
    """
    print("🔗 Agent 3: GitHub MCP Agent")

    user_profile = state.get("user_profile", {})
    user_id = state.get("user_id")

    try:
        # Get GitHub token from user profile (OAuth token from database)
        github_token = user_profile.get("githubAccessToken") or os.getenv("GITHUB_TOKEN")
        github_username = user_profile.get("githubUsername") or os.getenv("GITHUB_USERNAME")

        if not github_token:
            print("  ⚠️ No GitHub token found - User hasn't connected GitHub account")
            state["github_data"] = {"repos": [], "languages": [], "projects": [], "source": "none"}
            state["progress_messages"].append("⚠️ GitHub integration skipped (no account linked)")
            return state

        # Check if token is from OAuth (user) or env (fallback)
        token_source = "user OAuth" if user_profile.get("githubAccessToken") else "environment"
        print(f"  ✅ Using GitHub token from: {token_source}")

        # Fetch repositories
        print(f"  → Fetching repos for user: {github_username or 'authenticated user'}...")

        repos = fetch_github_repos_for_user(
            token=github_token,
            username=github_username,
            enrich=True,  # Fetch READMEs
            include_forks=False,
            max_repos=15,  # Reduced from 30
            max_enrich=5   # Only enrich top 5 repos (saves API calls)
        )

        if not repos:
            print("  ⚠️ No GitHub repos found")
            state["github_data"] = {"repos": [], "languages": [], "projects": [], "source": "empty"}
            state["progress_messages"].append("⚠️ No GitHub repositories found")
            return state

        # Extract languages and tech stack
        all_languages = set()
        projects = []

        for repo in repos:
            # Add languages
            if repo.get("language"):
                all_languages.add(repo["language"])
            all_languages.update(repo.get("tech_stack", []))

            # Create project summaries
            if repo.get("stars", 0) > 0 or repo.get("readme"):  # Featured projects
                projects.append({
                    "name": repo["name"],
                    "description": repo.get("description", ""),
                    "tech_stack": repo.get("tech_stack", []),
                    "stars": repo.get("stars", 0),
                    "live_link": repo.get("live_links", [None])[0] if repo.get("live_links") else None,
                    "github_url": repo["url"]
                })

        github_data = {
            "repos": repos[:15],  # Top 15 repos
            "total_repos": len(repos),
            "languages": list(all_languages),
            "projects": projects[:8],  # Top 8 projects
            "source": "github_api"
        }

        state["github_data"] = github_data
        state["progress_messages"].append(f"✅ Fetched {len(repos)} GitHub repos, {len(projects)} projects")
        state["current_agent"] = "github_agent"

        print(f"  ✅ Found {len(repos)} repositories")
        print(f"  ✅ Languages: {', '.join(list(all_languages)[:8])}")
        print(f"  ✅ Featured projects: {len(projects)}")

    except Exception as e:
        print(f"  ❌ GitHub Agent error: {e}")
        state["errors"].append(f"GitHub Agent Error: {str(e)}")
        state["github_data"] = {"repos": [], "languages": [], "projects": [], "source": "error"}

    return state
