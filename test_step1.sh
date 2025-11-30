#!/bin/bash

echo "Testing Step 1 Endpoint..."
curl -X POST http://localhost:8000/api/test-step-1 \
  -H "Content-Type: application/json" \
  -d '{"job_description":"We are looking for a Senior Python Developer with 5+ years of experience in FastAPI and LangChain.","company_name":"Tech Startup Inc"}'
