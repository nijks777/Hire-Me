#!/usr/bin/env node

/**
 * Test script for MCP server
 * This simulates MCP client requests to test the server functionality
 */

import { spawn } from 'child_process';
import readline from 'readline';

const TEST_USERNAME = 'torvalds'; // Change to test with a different GitHub user

class MCPClient {
  constructor() {
    this.process = null;
    this.messageId = 1;
  }

  async start() {
    console.log('Starting MCP server...\n');

    this.process = spawn('node', ['index.js'], {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'inherit']
    });

    this.setupReadline();

    // Wait a bit for server to initialize
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Run tests
    await this.runTests();
  }

  setupReadline() {
    const rl = readline.createInterface({
      input: this.process.stdout,
      terminal: false
    });

    rl.on('line', (line) => {
      try {
        const response = JSON.parse(line);
        console.log('\n📨 Response:', JSON.stringify(response, null, 2));
      } catch (error) {
        console.log('Non-JSON output:', line);
      }
    });
  }

  sendRequest(method, params) {
    const request = {
      jsonrpc: '2.0',
      id: this.messageId++,
      method,
      params
    };

    console.log('\n📤 Request:', JSON.stringify(request, null, 2));
    this.process.stdin.write(JSON.stringify(request) + '\n');
  }

  async runTests() {
    console.log('🧪 Running MCP Server Tests\n');
    console.log('=' .repeat(50));

    // Test 1: List tools
    console.log('\n\n📋 Test 1: List Available Tools');
    console.log('-'.repeat(50));
    this.sendRequest('tools/list', {});

    await this.wait(2000);

    // Test 2: Get user repositories
    console.log('\n\n📚 Test 2: Get User Repositories');
    console.log('-'.repeat(50));
    this.sendRequest('tools/call', {
      name: 'get_user_repositories',
      arguments: {
        username: TEST_USERNAME
      }
    });

    await this.wait(3000);

    // Test 3: Get repository README
    console.log('\n\n📖 Test 3: Get Repository README');
    console.log('-'.repeat(50));
    this.sendRequest('tools/call', {
      name: 'get_repository_readme',
      arguments: {
        owner: TEST_USERNAME,
        repo: 'linux'
      }
    });

    await this.wait(3000);

    // Test 4: Get repository tech stack
    console.log('\n\n🔧 Test 4: Get Repository Tech Stack');
    console.log('-'.repeat(50));
    this.sendRequest('tools/call', {
      name: 'get_repository_tech_stack',
      arguments: {
        owner: TEST_USERNAME,
        repo: 'linux'
      }
    });

    await this.wait(3000);

    // Test 5: Get all repos data (limited to 3 for testing)
    console.log('\n\n📦 Test 5: Get All Repos Data (Limited to 3)');
    console.log('-'.repeat(50));
    this.sendRequest('tools/call', {
      name: 'get_all_repos_data',
      arguments: {
        username: TEST_USERNAME,
        limit: 3
      }
    });

    await this.wait(5000);

    console.log('\n\n✅ Tests completed!');
    this.cleanup();
  }

  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  cleanup() {
    if (this.process) {
      this.process.kill();
    }
    process.exit(0);
  }
}

// Run tests
const client = new MCPClient();
client.start().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
