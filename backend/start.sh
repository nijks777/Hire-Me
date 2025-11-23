#!/bin/bash

# Hire-Me Backend Startup Script

echo "🚀 Starting Hire-Me Backend..."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "✅ Activating virtual environment..."
source venv/bin/activate

# Install/update dependencies
echo "📥 Installing dependencies..."
pip install -r requirements.txt

# Check for .env file
if [ ! -f ".env" ]; then
    echo "⚠️  No .env file found!"
    echo "📝 Please copy .env.example to .env and add your API keys:"
    echo "   cp .env.example .env"
    echo ""
    echo "Required API keys:"
    echo "  - OPENAI_API_KEY (from https://platform.openai.com/api-keys)"
    echo "  - TAVILY_API_KEY (from https://tavily.com)"
    echo "  - LANGCHAIN_API_KEY is already configured"
    echo ""
    read -p "Press Enter after you've configured .env file..."
fi

# Start the server
echo "🎯 Starting FastAPI server..."
echo "📊 LangSmith dashboard: https://smith.langchain.com"
echo "🌐 API will be available at: http://localhost:8000"
echo ""

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
