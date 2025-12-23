"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

export default function Home() {
  const [isVisible, setIsVisible] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [text, setText] = useState("");
  const fullText = "Hire-Me";

  useEffect(() => {
    setIsVisible(true);
    let index = 0;
    const timer = setInterval(() => {
      if (index <= fullText.length) {
        setText(fullText.slice(0, index));
        index++;
      } else {
        clearInterval(timer);
      }
    }, 150);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

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
        <div
          className="absolute bottom-1/4 left-1/2 w-96 h-96 bg-emerald-500 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-pulse"
          style={{
            transform: `translate(${mousePosition.x * 0.015}px, ${mousePosition.y * 0.015}px)`,
            transition: "transform 0.3s ease-out",
            animationDelay: "2s"
          }}
        ></div>
      </div>

      {/* Scanline effect */}
      <div className="absolute inset-0 pointer-events-none opacity-5">
        <div className="h-full w-full" style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 255, 65, 0.1) 2px, rgba(0, 255, 65, 0.1) 4px)'
        }}></div>
      </div>

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div
          className={`text-center space-y-8 max-w-5xl transition-all duration-1000 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
        >
          {/* Hero section */}
          <div className="space-y-6">
            <div className="inline-block">
              <span className="px-4 py-2 bg-cyan-500/10 border-2 border-cyan-500/50 rounded text-cyan-400 text-sm font-mono font-bold backdrop-blur-sm shadow-lg shadow-cyan-500/20">
                {'>'} AI-POWERED CAREER PLATFORM
              </span>
            </div>

            <div className="relative">
              <h1 className="text-6xl md:text-7xl lg:text-8xl font-black leading-tight font-mono">
                <span className="text-transparent bg-clip-text bg-linear-to-r from-cyan-400 via-fuchsia-400 to-emerald-400 drop-shadow-[0_0_30px_rgba(34,211,238,0.5)]">
                  {text}
                </span>
                <span className="animate-pulse text-cyan-400">_</span>
              </h1>
              {/* Glitch effect overlay */}
              <div className="absolute inset-0 text-6xl md:text-7xl lg:text-8xl font-black font-mono opacity-20 animate-glitch" style={{
                textShadow: '2px 2px #ff00de, -2px -2px #00ffff'
              }}>
                {text}_
              </div>
            </div>

            <p className="text-xl md:text-2xl text-emerald-300 max-w-2xl mx-auto leading-relaxed font-mono">
              <span className="text-cyan-400">{'{'}</span> Professional resume generation, personalized cover letters, and tailored outreach emails powered by AI <span className="text-cyan-400">{'}'}</span>
            </p>
          </div>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-12">
            <Link
              href="/signup"
              className="group relative px-8 py-4 bg-linear-to-r from-cyan-500 to-fuchsia-500 text-black font-mono font-black uppercase tracking-wider shadow-lg shadow-cyan-500/50 hover:shadow-cyan-500/80 transition-all duration-300 transform hover:scale-105 border-2 border-cyan-400 hover:border-fuchsia-400"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                <span>{'>'}</span> Initialize Free Account
              </span>
              <div className="absolute inset-0 bg-linear-to-r from-fuchsia-500 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </Link>

            <Link
              href="/login"
              className="px-8 py-4 bg-black/50 backdrop-blur-sm text-emerald-400 border-2 border-emerald-500 font-mono font-black uppercase tracking-wider hover:bg-emerald-500/10 hover:border-emerald-400 hover:text-emerald-300 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-emerald-500/30"
            >
              {'<'} Access System
            </Link>
          </div>

          {/* Features grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 px-4">
            <div className="group p-6 bg-black/40 backdrop-blur-lg border-2 border-cyan-500/30 hover:border-cyan-400 transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-cyan-500/50">
              <div className="w-12 h-12 bg-linear-to-br from-cyan-500 to-cyan-600 flex items-center justify-center mb-4 group-hover:rotate-12 transition-transform duration-300 border-2 border-cyan-400 shadow-lg shadow-cyan-500/50">
                <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-black text-cyan-400 mb-2 font-mono uppercase tracking-wide">{'<'} Resume.AI {'>'}</h3>
              <p className="text-emerald-300 font-mono text-sm">// AI-powered resume generation tailored to any job description</p>
            </div>

            <div className="group p-6 bg-black/40 backdrop-blur-lg border-2 border-fuchsia-500/30 hover:border-fuchsia-400 transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-fuchsia-500/50">
              <div className="w-12 h-12 bg-linear-to-br from-fuchsia-500 to-fuchsia-600 flex items-center justify-center mb-4 group-hover:rotate-12 transition-transform duration-300 border-2 border-fuchsia-400 shadow-lg shadow-fuchsia-500/50">
                <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-black text-fuchsia-400 mb-2 font-mono uppercase tracking-wide">{'<'} CoverLetter.AI {'>'}</h3>
              <p className="text-emerald-300 font-mono text-sm">// Compelling cover letters that showcase your unique value</p>
            </div>

            <div className="group p-6 bg-black/40 backdrop-blur-lg border-2 border-emerald-500/30 hover:border-emerald-400 transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-emerald-500/50">
              <div className="w-12 h-12 bg-linear-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mb-4 group-hover:rotate-12 transition-transform duration-300 border-2 border-emerald-400 shadow-lg shadow-emerald-500/50">
                <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                </svg>
              </div>
              <h3 className="text-xl font-black text-emerald-400 mb-2 font-mono uppercase tracking-wide">{'<'} Outreach.AI {'>'}</h3>
              <p className="text-emerald-300 font-mono text-sm">// Professional networking emails to connect with recruiters</p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes glitch {
          0%, 100% {
            transform: translate(0);
          }
          20% {
            transform: translate(-2px, 2px);
          }
          40% {
            transform: translate(-2px, -2px);
          }
          60% {
            transform: translate(2px, 2px);
          }
          80% {
            transform: translate(2px, -2px);
          }
        }

        .animate-glitch {
          animation: glitch 0.3s infinite;
        }
      `}</style>
    </div>
  );
}
