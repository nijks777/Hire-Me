#!/bin/bash

# Test script for GitHub MCP integration
# This script tests the API endpoints that fetch GitHub repository data

echo "🧪 Testing GitHub MCP Integration"
echo "=================================="
echo ""

# Check if the frontend server is running
echo "📋 Prerequisites:"
echo "  1. Frontend server should be running (npm run dev)"
echo "  2. You should be logged in and have GitHub connected"
echo "  3. Get your JWT token from localStorage"
echo ""

# Get the JWT token
read -p "Enter your JWT token (from localStorage): " JWT_TOKEN

if [ -z "$JWT_TOKEN" ]; then
  echo "❌ Error: JWT token is required"
  exit 1
fi

echo ""
echo "=" * 80
echo ""

# Test 1: Get all repositories
echo "🔍 Test 1: Fetching all repositories..."
echo "----------------------------------------"
curl -X GET "http://localhost:3000/api/github/repos" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  | jq '.'

echo ""
echo ""
echo "=" * 80
echo ""

# Test 2: Get specific repository details
read -p "Enter repository owner (e.g., torvalds): " OWNER
read -p "Enter repository name (e.g., linux): " REPO

if [ -n "$OWNER" ] && [ -n "$REPO" ]; then
  echo ""
  echo "📖 Test 2: Fetching repository details for $OWNER/$REPO..."
  echo "----------------------------------------"
  curl -X POST "http://localhost:3000/api/github/repo-details" \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"owner\": \"$OWNER\", \"repo\": \"$REPO\"}" \
    | jq '.'
fi

echo ""
echo ""
echo "=" * 80
echo ""

# Test 3: Get all repos data with README and tech stack
read -p "Enter limit for repos (default 5): " LIMIT
LIMIT=${LIMIT:-5}

echo ""
echo "📦 Test 3: Fetching all repos data (limit: $LIMIT)..."
echo "----------------------------------------"
curl -X GET "http://localhost:3000/api/github/all-repos-data?limit=$LIMIT" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  | jq '.'

echo ""
echo ""
echo "✅ Testing completed!"
