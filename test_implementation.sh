#!/bin/bash

echo "======================================"
echo "Testing Hire-Me Implementation"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Check if backend directory exists
echo "1. Checking backend directory..."
if [ -d "backend" ]; then
    echo -e "${GREEN}✓${NC} Backend directory exists"
else
    echo -e "${RED}✗${NC} Backend directory not found"
    exit 1
fi

# 2. Check if migration file exists
echo "2. Checking migration file..."
if [ -f "backend/migrations/create_generations_table.sql" ]; then
    echo -e "${GREEN}✓${NC} Migration file exists"
else
    echo -e "${RED}✗${NC} Migration file not found"
    exit 1
fi

# 3. Check if database.py has new functions
echo "3. Checking database.py updates..."
if grep -q "save_generation" backend/utils/database.py; then
    echo -e "${GREEN}✓${NC} save_generation function found"
else
    echo -e "${RED}✗${NC} save_generation function not found"
    exit 1
fi

# 4. Check if main.py has SSE endpoint
echo "4. Checking SSE endpoint in main.py..."
if grep -q "/api/generate-stream" backend/app/main.py; then
    echo -e "${GREEN}✓${NC} SSE endpoint found"
else
    echo -e "${RED}✗${NC} SSE endpoint not found"
    exit 1
fi

# 5. Check if frontend generate page updated
echo "5. Checking frontend generate page..."
if grep -q "generate-stream" frontend/app/generate/page.tsx; then
    echo -e "${GREEN}✓${NC} Frontend updated to use SSE"
else
    echo -e "${RED}✗${NC} Frontend not updated"
    exit 1
fi

# 6. Check if history page exists
echo "6. Checking history page..."
if [ -f "frontend/app/history/page.tsx" ]; then
    echo -e "${GREEN}✓${NC} History page exists"
else
    echo -e "${RED}✗${NC} History page not found"
    exit 1
fi

# 7. Check if Header has History link
echo "7. Checking Header navigation..."
if grep -q '"/history"' frontend/components/Header.tsx; then
    echo -e "${GREEN}✓${NC} History link added to navigation"
else
    echo -e "${RED}✗${NC} History link not found in navigation"
    exit 1
fi

echo ""
echo "======================================"
echo -e "${GREEN}All checks passed!${NC}"
echo "======================================"
echo ""
echo "Next steps:"
echo "1. Run database migration:"
echo "   ${YELLOW}cd backend && python run_migration.py${NC}"
echo ""
echo "2. Start backend server:"
echo "   ${YELLOW}cd backend && python -m uvicorn app.main:app --reload${NC}"
echo ""
echo "3. Start frontend server (in new terminal):"
echo "   ${YELLOW}cd frontend && npm run dev${NC}"
echo ""
echo "4. Test the implementation:"
echo "   - Visit http://localhost:3000/generate"
echo "   - Generate documents and watch real-time progress"
echo "   - Visit http://localhost:3000/history to see saved generations"
echo ""
