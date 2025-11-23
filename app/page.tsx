import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="text-center space-y-8 p-8">
        <h1 className="text-5xl font-bold text-gray-900 dark:text-white">
          Welcome to Hire-Me
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300">
          Multi-Agent Authentication Platform
        </p>

        <div className="flex gap-4 justify-center mt-8">
          <Link
            href="/login"
            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Login
          </Link>
          <Link
            href="/signup"
            className="px-8 py-3 bg-white text-blue-600 border-2 border-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium"
          >
            Sign Up
          </Link>
        </div>

        <div className="mt-12 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md mx-auto">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-white">
            Tech Stack
          </h2>
          <ul className="text-left space-y-2 text-gray-600 dark:text-gray-300">
            <li>✓ Next.js 16 with App Router</li>
            <li>✓ TypeScript</li>
            <li>✓ Tailwind CSS</li>
            <li>✓ PostgreSQL Database</li>
            <li>✓ Python + LangGraph Backend</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
