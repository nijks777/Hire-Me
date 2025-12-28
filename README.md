# Hire-Me

AI-powered job application platform that creates personalized cover letters, cold emails, and optimizes resumes using a multi-agent AI system.

## Features

- **Multi-Agent AI Pipeline**: 9 specialized agents analyze job descriptions, research companies, and generate tailored content
- **Resume Customization**: AI-powered resume optimization with ATS scoring and GitHub project matching
- **Cover Letter & Cold Email Generation**: Personalized content generation with company research
- **Real-time Progress**: Live streaming updates as each agent completes its analysis
- **Document History**: View, edit, and download all generated documents with full history tracking
- **User Authentication**: Secure signup/login system with JWT tokens
- **Credit System**: Built-in credits system to track API usage
- **Profile Management**: Store professional information and GitHub integration for better content
- **LangSmith Tracing**: Full observability for debugging and monitoring AI agent performance

## Tech Stack

**Frontend:**
- Next.js 16 (React, TypeScript)
- Tailwind CSS with Cyberpunk theme
- Prisma ORM
- Server-Sent Events (SSE) for real-time updates

**Backend:**
- Python 3.11+ (FastAPI)
- LangGraph for multi-agent orchestration
- LangChain with LangSmith tracing
- OpenAI GPT-4 & GPT-4o-mini
- PyGithub for GitHub integration
- Tavily for web search
- PostgreSQL (Neon Database)

**AI & Agents:**
- 9-agent pipeline for cover letter/cold email generation
- 6-agent pipeline for resume customization
- ATS score validation
- Quality check and humanization

## Local Development Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL database (Neon recommended)
- OpenAI API key
- Tavily API key (for web search)

### Backend Setup

1. **Clone the repository**
```bash
git clone https://github.com/nijks777/Hire-Me.git
cd Hire-Me/backend
```

2. **Create virtual environment**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
```

4. **Configure environment variables**
```bash
cp .env.example .env
# Edit .env and add your API keys
```

Required environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `OPENAI_API_KEY` - OpenAI API key
- `TAVILY_API_KEY` - Tavily web search API key
- `JWT_SECRET_KEY` - Secret key for JWT tokens
- `FRONTEND_URL` - Frontend URL (http://localhost:3000 for dev)

Optional (for LangSmith tracing):
- `LANGSMITH_TRACING=true`
- `LANGSMITH_API_KEY` - LangSmith API key

5. **Run database migrations**
```bash
python run_migration.py
```

6. **Start backend server**
```bash
uvicorn app.main:app --reload --port 8000
```

The backend will be available at http://localhost:8000

### Frontend Setup

1. **Navigate to frontend directory**
```bash
cd frontend
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
```bash
cp .env.example .env.local
# Edit .env.local and add your values
```

Required environment variables:
- `NEXT_PUBLIC_API_URL` - Backend API URL (http://localhost:8000 for dev)
- `DATABASE_URL` - Same PostgreSQL URL as backend
- `RESEND_API_KEY` - Resend API key for email OTP

4. **Generate Prisma client**
```bash
npx prisma generate
npx prisma db push
```

5. **Start development server**
```bash
npm run dev
```

The frontend will be available at http://localhost:3000

## Usage

1. **Sign Up**: Create an account at `/signup`
2. **Complete Profile**: Add your professional information at `/profile`
3. **Generate Documents**: Go to `/generate`, enter job details, and let AI create personalized content
4. **View History**: Access all past generations at `/history`
5. **Edit & Download**: Edit generated content and download as PDF

## Multi-Agent Pipeline

### Cover Letter & Cold Email Generation (9 Agents)
1. **Input Analyzer**: Extracts job requirements and key information
2. **Research Agent**: Gathers company information via Tavily web search
3. **Resume Analyzer**: Analyzes user qualifications and GitHub projects
4. **Style Analyzer**: Studies user's writing style from previous documents
5. **Qualification Matcher**: Maps user skills to job requirements
6. **Content Generator**: Creates personalized cover letter and cold email
7. **Formatting Agent**: Structures content professionally
8. **Humanizer**: Makes content sound natural and authentic
9. **Quality Check**: Validates content for hallucinations and quality

### Resume Customization (6 Agents)
1. **JD Analyzer**: Extracts tech stack and requirements from job description
2. **Resume Parser**: Parses user's current resume structure
3. **GitHub Fetcher**: Fetches user repos with READMEs and tech stacks
4. **Project Matcher**: Matches GitHub projects to job requirements
5. **Resume Builder**: Rebuilds resume with optimized projects
6. **ATS Validator**: Validates ATS score and quality

## Deployment

### Backend Deployment (Render)

1. **Create a new Web Service on Render**
   - Connect your GitHub repository
   - Select the `backend` directory as root directory
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000`

2. **Add Environment Variables**
   - `DATABASE_URL` - Your PostgreSQL connection string
   - `OPENAI_API_KEY` - OpenAI API key
   - `TAVILY_API_KEY` - Tavily API key
   - `JWT_SECRET_KEY` - Generate a secure secret key
   - `FRONTEND_URL` - Your deployed frontend URL
   - `LANGSMITH_TRACING` - (Optional) Set to `true` for tracing
   - `LANGSMITH_API_KEY` - (Optional) LangSmith API key

3. **Deploy**
   - Render will automatically deploy using the Procfile
   - Your backend will be available at `https://your-app.onrender.com`

### Frontend Deployment (Vercel)

1. **Deploy to Vercel**
   ```bash
   cd frontend
   vercel --prod
   ```

2. **Set Environment Variables in Vercel**
   - `NEXT_PUBLIC_API_URL` - Your deployed backend URL
   - `DATABASE_URL` - PostgreSQL connection string
   - `RESEND_API_KEY` - Resend API key

3. **Update Backend FRONTEND_URL**
   - Go to Render dashboard
   - Update `FRONTEND_URL` environment variable to your Vercel URL
   - Restart the backend service

### Database Setup (Neon)

1. Create a PostgreSQL database on [Neon](https://neon.tech)
2. Copy the connection string
3. Add it to both frontend and backend environment variables
4. Run migrations (Render will run automatically on deploy)

## Environment Variables Reference

See `.env.example` files in `backend/` and `frontend/` directories for complete list of required and optional environment variables.

## License

MIT
