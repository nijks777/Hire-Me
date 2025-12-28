"""
Agent 3: GitHub Fetcher
Fetches user's GitHub repositories, READMEs, and metadata using MCP tool
"""
from agents.resume_customization.state import ResumeCustomizationState
from utils.langsmith_config import trace_agent
from tools.github_mcp import fetch_github_repos_for_user
import os


@trace_agent("github_fetcher", run_type="tool", tags=["resume-customization", "github-fetch", "agent-3", "mcp"])
def github_fetcher_agent(state: ResumeCustomizationState) -> ResumeCustomizationState:
    """
    Agent 3: Fetch GitHub repositories and metadata

    Fetches:
    - All user repositories (non-forked by default)
    - README content for each repo
    - Tech stack (languages + topics)
    - Live demo links extracted from READMEs
    - Repository metadata (stars, description, etc.)
    """
    print("🔗 Agent 3: Fetching GitHub repositories...")

    user_profile = state.get("user_profile", {})
    user_id = state.get("user_id")

    try:
        # Get GitHub token from user profile (OAuth token from database)
        github_token = user_profile.get("githubAccessToken") or os.getenv("GITHUB_TOKEN")
        github_username = user_profile.get("githubUsername") or os.getenv("GITHUB_USERNAME")

        if not github_token:
            print("  ⚠️ No GitHub token found - User hasn't connected GitHub account")
            print("  💡 User needs to connect GitHub account in profile settings")

            state["github_repos"] = []
            state["progress_messages"].append("⚠️ GitHub integration skipped (no account linked)")
            state["current_agent"] = "github_fetcher"
            return state

        # Check if token is from OAuth (user) or env (fallback)
        token_source = "user OAuth" if user_profile.get("githubAccessToken") else "environment"
        print(f"  ✅ Using GitHub token from: {token_source}")

        # Fetch repositories with enrichment
        print(f"  → Fetching repos for user: {github_username or 'authenticated user'}...")

        repos = fetch_github_repos_for_user(
            token=github_token,
            username=github_username,
            enrich=True,  # Fetch READMEs and details
            include_forks=False,  # Skip forks
            min_stars=0,  # Include all repos
            max_repos=15,  # Reduced from 50 for performance
            max_enrich=5   # Reduced from 20 - only enrich top 5 repos
        )

        if not repos:
            print("  ⚠️ No repositories found or GitHub API error")
            state["github_repos"] = []
            state["progress_messages"].append("⚠️ No GitHub repositories found")
        else:
            print(f"  ✅ Fetched {len(repos)} repositories from GitHub")

            # Count repos with READMEs
            repos_with_readme = sum(1 for r in repos if r.get("readme"))
            print(f"  ✅ {repos_with_readme} repos have READMEs")

            # Count repos with live links
            repos_with_links = sum(1 for r in repos if r.get("live_links"))
            print(f"  ✅ {repos_with_links} repos have live demo links")

            state["github_repos"] = repos
            state["progress_messages"].append(
                f"✅ GitHub fetch complete: {len(repos)} repos, "
                f"{repos_with_readme} with READMEs, "
                f"{repos_with_links} with live links"
            )

        state["current_agent"] = "github_fetcher"

    except Exception as e:
        print(f"  ❌ GitHub fetch error: {e}")
        state["errors"].append(f"GitHub Fetcher Error: {str(e)}")
        state["github_repos"] = []
        state["progress_messages"].append("⚠️ GitHub fetch failed (continuing without GitHub data)")

    return state
