# Hire-Me Frontend

Next.js 16 frontend application with authentication for the Hire-Me multi-agent platform.

## Features

- ✅ Modern UI with Tailwind CSS
- ✅ TypeScript for type safety
- ✅ Login & Signup pages
- ✅ Protected Dashboard route
- ✅ JWT-based authentication
- ✅ API client for backend communication
- ✅ Auth context for state management

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Backend API running on port 8000

### Installation

```bash
# Install dependencies (already done)
npm install

# Start development server
npm run dev
```

The app will be available at http://localhost:3000 (or another port if 3000 is in use)

### Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
frontend/
├── app/
│   ├── login/          # Login page
│   ├── signup/         # Signup page
│   ├── dashboard/      # Protected dashboard
│   ├── layout.tsx      # Root layout
│   ├── page.tsx        # Home page
│   └── globals.css     # Global styles with Tailwind
├── lib/
│   ├── api.ts          # API client
│   ├── auth-context.tsx # Auth state management
│   └── types.ts        # TypeScript types
├── components/         # Reusable components
└── .env.local          # Environment variables
```

## Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Available Routes

- `/` - Home page
- `/login` - Login page
- `/signup` - Signup page
- `/dashboard` - Protected dashboard (requires authentication)

## Authentication Flow

1. User submits credentials on `/login` or `/signup`
2. Frontend sends request to backend API
3. Backend validates and returns JWT tokens
4. Tokens stored in localStorage
5. Protected routes check for valid token
6. Token included in Authorization header for API requests

## API Integration

The frontend expects the following backend endpoints:

- `POST /auth/login` - User login
- `POST /auth/signup` - User registration
- `POST /auth/refresh` - Refresh access token
- `GET /auth/me` - Get current user
- `POST /auth/logout` - Logout user

## Next Steps

- [x] Frontend UI complete
- [ ] Set up Python backend with FastAPI
- [ ] Create database models
- [ ] Implement authentication endpoints
- [ ] Connect frontend to backend
- [ ] Add LangGraph multi-agent functionality
