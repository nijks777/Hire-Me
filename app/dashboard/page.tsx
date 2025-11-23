"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Header from "@/components/Header";

export default function DashboardPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.push("/login");
      return;
    }
    setIsAuthenticated(true);
  }, [router]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Welcome to Hire-Me!
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            You've successfully logged in to your multi-agent platform.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
            <div className="p-6 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Authentication
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                JWT-based secure authentication system
              </p>
            </div>

            <div className="p-6 bg-green-50 dark:bg-green-900/30 rounded-lg">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Multi-Agent System
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Powered by LangGraph for intelligent workflows
              </p>
            </div>

            <div className="p-6 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                PostgreSQL
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Robust database for data persistence
              </p>
            </div>
          </div>

          <div className="mt-8 p-4 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-yellow-800 dark:text-yellow-200">
              <strong>Next Steps:</strong> Connect to the Python backend API to enable full authentication functionality
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
