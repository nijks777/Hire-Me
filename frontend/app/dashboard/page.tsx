"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Header from "@/components/Header";

export default function DashboardPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.push("/login");
      return;
    }
    setIsAuthenticated(true);
  }, [router]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-cyan-400 font-mono">{'>'} LOADING SYSTEM...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-black">
      {/* Matrix-style grid background */}
      <div className="absolute inset-0" style={{
        backgroundImage: `linear-gradient(rgba(0, 255, 65, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 65, 0.03) 1px, transparent 1px)`,
        backgroundSize: '50px 50px'
      }}></div>

      {/* Animated neon orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-pulse"
          style={{
            transform: `translate(${mousePosition.x * 0.02}px, ${mousePosition.y * 0.02}px)`,
            transition: "transform 0.3s ease-out",
            animation: "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite"
          }}
        ></div>
        <div
          className="absolute top-1/3 right-1/4 w-96 h-96 bg-fuchsia-500 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-pulse"
          style={{
            transform: `translate(${mousePosition.x * -0.02}px, ${mousePosition.y * -0.02}px)`,
            transition: "transform 0.3s ease-out",
            animationDelay: "1s"
          }}
        ></div>
      </div>

      {/* Scanline effect */}
      <div className="absolute inset-0 pointer-events-none opacity-5">
        <div className="h-full w-full" style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 255, 65, 0.1) 2px, rgba(0, 255, 65, 0.1) 4px)'
        }}></div>
      </div>

      <Header />

      {/* Main content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Welcome Section */}
        <div className="mb-16 text-center">
          <div className="inline-block mb-6">
            <span className="px-4 py-2 bg-cyan-500/10 border-2 border-cyan-500/50 rounded text-cyan-400 text-sm font-mono font-bold backdrop-blur-sm shadow-lg shadow-cyan-500/20">
              {'>'} SYSTEM INITIALIZED
            </span>
          </div>
          <h1 className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-linear-to-r from-cyan-400 via-fuchsia-400 to-emerald-400 mb-4 font-mono drop-shadow-[0_0_30px_rgba(34,211,238,0.5)]">
            DASHBOARD.EXE
          </h1>
          <p className="text-xl text-emerald-300 font-mono">
            <span className="text-cyan-400">{'{'}</span> Select your mission <span className="text-cyan-400">{'}'}</span>
          </p>
        </div>

        {/* Main Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Customize Resume */}
          <button
            onClick={() => router.push('/customize-resume')}
            className="group relative bg-black/40 backdrop-blur-lg border-2 border-cyan-500/30 hover:border-cyan-400 transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-cyan-500/50 p-10 text-left overflow-hidden cursor-pointer"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-linear-to-br from-cyan-500 to-cyan-600 rounded-bl-full opacity-10 group-hover:opacity-20 transition-opacity"></div>

            <div className="relative z-10">
              <div className="w-16 h-16 bg-linear-to-br from-cyan-500 to-cyan-600 flex items-center justify-center mb-6 group-hover:rotate-12 transition-transform duration-300 border-2 border-cyan-400 shadow-lg shadow-cyan-500/50">
                <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>

              <h3 className="text-3xl font-black text-cyan-400 mb-3 font-mono uppercase tracking-wide">
                {'<'} Resume.AI {'>'}
              </h3>
              <p className="text-emerald-300 mb-6 font-mono text-sm">
                // Tailor your resume for specific job positions with AI-powered optimization
              </p>

              <div className="flex items-center text-cyan-400 font-mono font-bold group-hover:translate-x-2 transition-transform duration-300">
                {'>'} LAUNCH MISSION
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </button>

          {/* Generate Cover Letter & Cold Email */}
          <button
            onClick={() => router.push('/generate')}
            className="group relative bg-black/40 backdrop-blur-lg border-2 border-fuchsia-500/30 hover:border-fuchsia-400 transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-fuchsia-500/50 p-10 text-left overflow-hidden cursor-pointer"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-linear-to-br from-fuchsia-500 to-fuchsia-600 rounded-bl-full opacity-10 group-hover:opacity-20 transition-opacity"></div>

            <div className="relative z-10">
              <div className="w-16 h-16 bg-linear-to-br from-fuchsia-500 to-fuchsia-600 flex items-center justify-center mb-6 group-hover:rotate-12 transition-transform duration-300 border-2 border-fuchsia-400 shadow-lg shadow-fuchsia-500/50">
                <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>

              <h3 className="text-3xl font-black text-fuchsia-400 mb-3 font-mono uppercase tracking-wide">
                {'<'} Letter.AI {'>'}
              </h3>
              <p className="text-emerald-300 mb-6 font-mono text-sm">
                // Generate compelling cover letters and personalized outreach emails
              </p>

              <div className="flex items-center text-fuchsia-400 font-mono font-bold group-hover:translate-x-2 transition-transform duration-300">
                {'>'} LAUNCH MISSION
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
