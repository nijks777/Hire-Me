# GitHub MCP Server

Model Context Protocol (MCP) server for fetching GitHub repository data including README files and tech stack information.

## Features

- Fetch all public repositories for a GitHub user
- Get README content from any repository
- Detect tech stack and languages used in repositories
- Fetch comprehensive data (README + tech stack) for all repos in one call

## Installation

```bash
npm install
```

## Usage

The MCP server runs on stdio and communicates via the Model Context Protocol.

### Start the server:

```bash
npm start
```

### Available Tools:

1. **get_user_repositories**
   - Fetch all public repositories for a GitHub user
   - Input: `{ username: string, accessToken?: string }`

2. **get_repository_readme**
   - Fetch README content from a specific repository
   - Input: `{ owner: string, repo: string, accessToken?: string }`

3. **get_repository_tech_stack**
   - Detect languages and tech stack used in a repository
   - Input: `{ owner: string, repo: string, accessToken?: string }`

4. **get_all_repos_data**
   - Fetch all repos with README and tech stack for a user
   - Input: `{ username: string, accessToken?: string, limit?: number }`

## Environment Variables

Copy `.env.example` to `.env` and configure:

- `GITHUB_ACCESS_TOKEN`: Optional GitHub token for higher rate limits

## Integration with Frontend

The frontend can communicate with this MCP server to fetch GitHub data for authenticated users.
