# Hire-Me

AI-powered job application generator that creates personalized cover letters and cold emails using multi-agent system.

## Features

- **Multi-Agent AI Pipeline**: 5 specialized agents analyze job descriptions, research companies, and generate tailored content
- **Real-time Generation**: Live progress updates as each agent completes its analysis
- **Document Management**: View, edit, and download all generated documents with history tracking
- **User Authentication**: Secure signup/login with password reset via email OTP
- **Credit System**: Track usage with built-in credits system
- **Profile Management**: Store professional information for better content generation

## Tech Stack

**Frontend:**
- Next.js 16 (React, TypeScript)
- Tailwind CSS
- Prisma ORM

**Backend:**
- Python (FastAPI)
- LangGraph for multi-agent orchestration
- OpenAI GPT-4
- PostgreSQL (Neon)

**Email:**
- Resend API for transactional emails

## Setup

### Backend

1. Navigate to backend directory:
```bash
cd backend
```

2. Create virtual environment and install dependencies:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

3. Create `.env` file:
```
DATABASE_URL=your_postgresql_url
OPENAI_API_KEY=your_openai_key
```

4. Run migrations:
```bash
python run_migration.py
```

5. Start backend server:
```bash
python -m uvicorn app.main:app --reload --port 8000
```

### Frontend

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env.local` file:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
DATABASE_URL=your_postgresql_url
NEXTAUTH_SECRET=your_secret_key
NEXTAUTH_URL=http://localhost:3000
RESEND_API_KEY=your_resend_api_key
```

4. Run Prisma migrations:
```bash
npx prisma generate
npx prisma db push
```

5. Start development server:
```bash
npm run dev
```

## Usage

1. **Sign Up**: Create an account at `/signup`
2. **Complete Profile**: Add your professional information at `/profile`
3. **Generate Documents**: Go to `/generate`, enter job details, and let AI create personalized content
4. **View History**: Access all past generations at `/history`
5. **Edit & Download**: Edit generated content and download as PDF

## Multi-Agent Pipeline

1. **Input Analyzer**: Extracts job requirements and key information
2. **Research Agent**: Gathers company information and culture insights
3. **Resume Analyzer**: Analyzes user qualifications and matches them to job
4. **Style Analyzer**: Studies user's writing style from previous documents
5. **Content Generator**: Creates personalized cover letter and cold email

## License

MIT
