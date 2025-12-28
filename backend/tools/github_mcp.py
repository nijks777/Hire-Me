"""
GitHub MCP Integration Tool
Fetches user repositories, READMEs, and metadata using PyGithub
Supports both GitHub OAuth tokens (from DB) and Personal Access Tokens
"""
from github import Github, GithubException
from typing import List, Dict, Any, Optional
import os
import re


class GitHubMCPTool:
    """
    GitHub MCP (Model Context Protocol) Tool
    Provides structured access to GitHub repositories for resume customization
    """

    def __init__(self, token: Optional[str] = None, username: Optional[str] = None):
        """
        Initialize GitHub client

        Args:
            token: GitHub token (OAuth or PAT) - defaults to env var
            username: GitHub username (optional) - defaults to env var
        """
        self.token = token or os.getenv("GITHUB_TOKEN")
        self.username = username or os.getenv("GITHUB_USERNAME")

        if not self.token:
            print("  ⚠️ No GitHub token provided - GitHub features will be limited")
            self.client = None
            self.user = None
        else:
            self.client = Github(self.token)
            self.user = None

    def fetch_user_repos(self, include_forks: bool = False, min_stars: int = 0, max_repos: int = 50) -> List[Dict[str, Any]]:
        """
        Fetch repositories for the configured user

        Args:
            include_forks: Include forked repositories (default: False)
            min_stars: Minimum star count (default: 0)
            max_repos: Maximum number of repos to fetch (default: 50)

        Returns:
            List of repository dictionaries with metadata
        """
        if not self.client:
            print("  ❌ GitHub client not initialized - no token provided")
            return []

        try:
            if self.username:
                self.user = self.client.get_user(self.username)
            else:
                self.user = self.client.get_user()  # Authenticated user

            repos = []
            count = 0

            for repo in self.user.get_repos(sort="updated", direction="desc"):
                if count >= max_repos:
                    break

                # Skip forks if not included
                if repo.fork and not include_forks:
                    continue

                # Skip if below star threshold
                if repo.stargazers_count < min_stars:
                    continue

                repo_data = {
                    "name": repo.name,
                    "full_name": repo.full_name,
                    "description": repo.description or "",
                    "url": repo.html_url,
                    "homepage": repo.homepage or "",
                    "stars": repo.stargazers_count,
                    "forks": repo.forks_count,
                    "language": repo.language or "Unknown",
                    "topics": repo.get_topics() if hasattr(repo, "get_topics") else [],
                    "created_at": repo.created_at.isoformat() if repo.created_at else None,
                    "updated_at": repo.updated_at.isoformat() if repo.updated_at else None,
                    "is_fork": repo.fork,
                    "default_branch": repo.default_branch,
                }

                repos.append(repo_data)
                count += 1

            print(f"  ✅ Fetched {len(repos)} repositories from GitHub")
            return repos

        except GithubException as e:
            print(f"  ❌ GitHub API error: {e}")
            return []
        except Exception as e:
            print(f"  ❌ Error fetching repos: {e}")
            return []

    def fetch_readme(self, repo_name: str) -> Optional[str]:
        """
        Fetch README content for a specific repository

        Args:
            repo_name: Repository name (e.g., "username/repo")

        Returns:
            README content as markdown string, or None if not found
        """
        if not self.client:
            return None

        try:
            repo = self.client.get_repo(repo_name)
            readme = repo.get_readme()
            content = readme.decoded_content.decode("utf-8")
            return content
        except GithubException:
            return None
        except Exception as e:
            print(f"  ⚠️ Error fetching README for {repo_name}: {e}")
            return None

    def extract_live_links_from_readme(self, readme_content: str) -> List[str]:
        """
        Extract live demo/deployment links from README

        Args:
            readme_content: README markdown content

        Returns:
            List of URLs found in README
        """
        if not readme_content:
            return []

        # Common deployment link patterns
        patterns = [
            r"https?://[\w\-\.]+\.(?:vercel\.app|netlify\.app|herokuapp\.com|replit\.dev|railway\.app)",
            r"https?://[\w\-\.]+\.(?:github\.io|pages\.dev|web\.app|firebaseapp\.com)",
            r"\[.*?demo.*?\]\((https?://[^\)]+)\)",  # [Demo](url)
            r"\[.*?live.*?\]\((https?://[^\)]+)\)",  # [Live](url)
            r"https?://[\w\-\.]+\.(?:render\.com|fly\.io|cyclic\.app|glitch\.me)",
        ]

        links = []
        for pattern in patterns:
            matches = re.findall(pattern, readme_content, re.IGNORECASE)
            links.extend(matches)

        return list(set(links))  # Remove duplicates

    def fetch_repo_languages(self, repo_name: str) -> Dict[str, int]:
        """
        Fetch programming languages used in a repository

        Args:
            repo_name: Repository name (e.g., "username/repo")

        Returns:
            Dictionary of language: bytes_count
        """
        if not self.client:
            return {}

        try:
            repo = self.client.get_repo(repo_name)
            return repo.get_languages()
        except Exception as e:
            print(f"  ⚠️ Error fetching languages for {repo_name}: {e}")
            return {}

    def enrich_repos_with_details(self, repos: List[Dict[str, Any]], max_enrich: int = 20) -> List[Dict[str, Any]]:
        """
        Enrich repository data with README and additional metadata

        Args:
            repos: List of basic repository data
            max_enrich: Maximum number of repos to enrich (to save API calls)

        Returns:
            List of enriched repository data with READMEs and links
        """
        enriched_repos = []
        count = 0

        for repo in repos:
            if count >= max_enrich:
                # Add remaining repos without enrichment
                enriched_repos.append(repo)
                continue

            full_name = repo["full_name"]
            print(f"  → Enriching {full_name}...")

            # Fetch README
            readme = self.fetch_readme(full_name)
            repo["readme"] = readme

            # Extract live links from README
            if readme:
                live_links = self.extract_live_links_from_readme(readme)
                repo["live_links"] = live_links
            else:
                repo["live_links"] = []

            # Fetch languages
            languages = self.fetch_repo_languages(full_name)
            repo["languages"] = languages

            # Calculate tech stack from languages and topics
            tech_stack = list(languages.keys()) + repo.get("topics", [])
            repo["tech_stack"] = list(set(tech_stack))  # Remove duplicates

            enriched_repos.append(repo)
            count += 1

        print(f"  ✅ Enriched {count} repositories with READMEs and metadata")
        return enriched_repos


# Helper function for easy usage
def fetch_github_repos_for_user(
    token: Optional[str] = None,
    username: Optional[str] = None,
    enrich: bool = True,
    include_forks: bool = False,
    min_stars: int = 0,
    max_repos: int = 50,
    max_enrich: int = 20
) -> List[Dict[str, Any]]:
    """
    Convenience function to fetch and optionally enrich GitHub repos

    Args:
        token: GitHub token (defaults to env)
        username: GitHub username (defaults to env)
        enrich: Whether to fetch READMEs and additional data
        include_forks: Include forked repos
        min_stars: Minimum star count
        max_repos: Maximum number of repos to fetch
        max_enrich: Maximum number of repos to enrich with details

    Returns:
        List of repository data
    """
    tool = GitHubMCPTool(token=token, username=username)
    repos = tool.fetch_user_repos(include_forks=include_forks, min_stars=min_stars, max_repos=max_repos)

    if enrich and repos:
        repos = tool.enrich_repos_with_details(repos, max_enrich=max_enrich)

    return repos
