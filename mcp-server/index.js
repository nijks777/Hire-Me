#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { Octokit } from 'octokit';
import dotenv from 'dotenv';

dotenv.config();

/**
 * MCP Server for GitHub Repository Data
 * Provides tools to fetch README files and tech stack information from public GitHub repositories
 */

class GitHubMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'github-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.octokit = null;
    this.setupHandlers();
    this.setupErrorHandling();
  }

  setupErrorHandling() {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'get_user_repositories',
          description: 'Fetch all public repositories for a GitHub user',
          inputSchema: {
            type: 'object',
            properties: {
              username: {
                type: 'string',
                description: 'GitHub username',
              },
              accessToken: {
                type: 'string',
                description: 'GitHub access token (optional, for authenticated requests)',
              },
            },
            required: ['username'],
          },
        },
        {
          name: 'get_repository_readme',
          description: 'Fetch the README content from a GitHub repository',
          inputSchema: {
            type: 'object',
            properties: {
              owner: {
                type: 'string',
                description: 'Repository owner username',
              },
              repo: {
                type: 'string',
                description: 'Repository name',
              },
              accessToken: {
                type: 'string',
                description: 'GitHub access token (optional)',
              },
            },
            required: ['owner', 'repo'],
          },
        },
        {
          name: 'get_repository_tech_stack',
          description: 'Detect tech stack/languages used in a GitHub repository',
          inputSchema: {
            type: 'object',
            properties: {
              owner: {
                type: 'string',
                description: 'Repository owner username',
              },
              repo: {
                type: 'string',
                description: 'Repository name',
              },
              accessToken: {
                type: 'string',
                description: 'GitHub access token (optional)',
              },
            },
            required: ['owner', 'repo'],
          },
        },
        {
          name: 'get_all_repos_data',
          description: 'Fetch all public repositories with README and tech stack for a user',
          inputSchema: {
            type: 'object',
            properties: {
              username: {
                type: 'string',
                description: 'GitHub username',
              },
              accessToken: {
                type: 'string',
                description: 'GitHub access token (optional)',
              },
              limit: {
                type: 'number',
                description: 'Maximum number of repositories to fetch (default: 10)',
                default: 10,
              },
            },
            required: ['username'],
          },
        },
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;

        // Initialize Octokit with access token if provided
        if (args.accessToken) {
          this.octokit = new Octokit({ auth: args.accessToken });
        } else {
          this.octokit = new Octokit();
        }

        switch (name) {
          case 'get_user_repositories':
            return await this.getUserRepositories(args);

          case 'get_repository_readme':
            return await this.getRepositoryReadme(args);

          case 'get_repository_tech_stack':
            return await this.getRepositoryTechStack(args);

          case 'get_all_repos_data':
            return await this.getAllReposData(args);

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  async getUserRepositories(args) {
    const { username } = args;

    try {
      const { data: repos } = await this.octokit.rest.repos.listForUser({
        username,
        type: 'public',
        sort: 'updated',
        per_page: 100,
      });

      const repoData = repos.map((repo) => ({
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        url: repo.html_url,
        language: repo.language,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        updatedAt: repo.updated_at,
        topics: repo.topics || [],
      }));

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(repoData, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to fetch repositories: ${error.message}`);
    }
  }

  async getRepositoryReadme(args) {
    const { owner, repo } = args;

    try {
      const { data } = await this.octokit.rest.repos.getReadme({
        owner,
        repo,
      });

      // Decode base64 content
      const readmeContent = Buffer.from(data.content, 'base64').toString('utf-8');

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              repo: `${owner}/${repo}`,
              readme: readmeContent,
              path: data.path,
              url: data.html_url,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      if (error.status === 404) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                repo: `${owner}/${repo}`,
                readme: null,
                message: 'No README found',
              }),
            },
          ],
        };
      }
      throw new Error(`Failed to fetch README: ${error.message}`);
    }
  }

  async getRepositoryTechStack(args) {
    const { owner, repo } = args;

    try {
      // Get languages
      const { data: languages } = await this.octokit.rest.repos.listLanguages({
        owner,
        repo,
      });

      // Get repository details for additional metadata
      const { data: repoData } = await this.octokit.rest.repos.get({
        owner,
        repo,
      });

      // Calculate language percentages
      const totalBytes = Object.values(languages).reduce((a, b) => a + b, 0);
      const languagePercentages = {};

      for (const [lang, bytes] of Object.entries(languages)) {
        languagePercentages[lang] = ((bytes / totalBytes) * 100).toFixed(2);
      }

      const techStack = {
        repo: `${owner}/${repo}`,
        languages: languagePercentages,
        primaryLanguage: repoData.language,
        topics: repoData.topics || [],
        hasWiki: repoData.has_wiki,
        hasPages: repoData.has_pages,
        license: repoData.license?.name || null,
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(techStack, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to fetch tech stack: ${error.message}`);
    }
  }

  async getAllReposData(args) {
    const { username, limit = 10 } = args;

    try {
      // Get repositories
      const { data: repos } = await this.octokit.rest.repos.listForUser({
        username,
        type: 'public',
        sort: 'updated',
        per_page: limit,
      });

      const allData = [];

      // Fetch README and tech stack for each repo
      for (const repo of repos) {
        try {
          const owner = repo.owner.login;
          const repoName = repo.name;

          // Get README
          let readmeContent = null;
          try {
            const { data: readme } = await this.octokit.rest.repos.getReadme({
              owner,
              repo: repoName,
            });
            readmeContent = Buffer.from(readme.content, 'base64').toString('utf-8');
          } catch (error) {
            // README not found, continue
          }

          // Get languages/tech stack
          const { data: languages } = await this.octokit.rest.repos.listLanguages({
            owner,
            repo: repoName,
          });

          const totalBytes = Object.values(languages).reduce((a, b) => a + b, 0);
          const languagePercentages = {};

          for (const [lang, bytes] of Object.entries(languages)) {
            languagePercentages[lang] = ((bytes / totalBytes) * 100).toFixed(2);
          }

          allData.push({
            name: repo.name,
            fullName: repo.full_name,
            description: repo.description,
            url: repo.html_url,
            stars: repo.stargazers_count,
            forks: repo.forks_count,
            updatedAt: repo.updated_at,
            readme: readmeContent ? readmeContent.substring(0, 1000) + '...' : null, // Truncate for summary
            readmeFull: readmeContent,
            techStack: {
              languages: languagePercentages,
              primaryLanguage: repo.language,
              topics: repo.topics || [],
            },
          });
        } catch (error) {
          console.error(`Error fetching data for ${repo.name}:`, error.message);
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              username,
              totalRepos: repos.length,
              repositories: allData,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to fetch all repos data: ${error.message}`);
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('GitHub MCP Server running on stdio');
  }
}

// Start the server
const server = new GitHubMCPServer();
server.run().catch(console.error);
