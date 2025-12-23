"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    setLoading(true);

    try {
      // Call our Next.js API route
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Signup failed");
      }

      const data = await response.json();

      // Store tokens
      localStorage.setItem("access_token", data.access_token);
      if (data.refresh_token) {
        localStorage.setItem("refresh_token", data.refresh_token);
      }

      // Redirect to dashboard
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-black flex items-center justify-center p-4">
      {/* Matrix grid background */}
      <div className="absolute inset-0" style={{
        backgroundImage: `linear-gradient(rgba(0, 255, 65, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 65, 0.03) 1px, transparent 1px)`,
        backgroundSize: '50px 50px'
      }}></div>

      {/* Neon orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-cyan-500 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-fuchsia-500 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: "1s" }}></div>
      </div>

      {/* Scanline */}
      <div className="absolute inset-0 pointer-events-none opacity-5">
        <div className="h-full w-full" style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 255, 65, 0.1) 2px, rgba(0, 255, 65, 0.1) 4px)'
        }}></div>
      </div>

      <div className={`w-full max-w-md relative z-10 transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <Link href="/">
            <h1 className="text-4xl font-black font-mono bg-clip-text text-transparent bg-linear-to-r from-cyan-400 via-fuchsia-400 to-emerald-400 inline-block cursor-pointer hover:scale-110 transition-transform drop-shadow-[0_0_20px_rgba(34,211,238,0.5)]">
              {'<'} Hire-Me {'>'}
            </h1>
          </Link>
        </div>

        <div className="bg-black/60 backdrop-blur-lg border-2 border-cyan-500/50 shadow-2xl shadow-cyan-500/30 p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-black font-mono text-cyan-400 uppercase tracking-wider">
              {'>'} Initialize Account
            </h2>
            <p className="text-emerald-300 mt-2 font-mono text-sm">
              // Join the network and start your journey
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-500/20 backdrop-blur-sm border-2 border-red-500 text-red-400 px-4 py-3 flex items-center gap-2 font-mono shadow-lg shadow-red-500/30">
                <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span>ERROR: {error}</span>
              </div>
            )}

            <div>
              <label
                htmlFor="name"
                className="block text-sm font-bold text-cyan-400 mb-2 font-mono uppercase"
              >
                {'>'} Full Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-black/50 backdrop-blur-sm border-2 border-emerald-500/50 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-emerald-300 placeholder-emerald-600 transition-all hover:border-emerald-400 font-mono"
                placeholder="// enter name"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-bold text-cyan-400 mb-2 font-mono uppercase"
              >
                {'>'} Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-black/50 backdrop-blur-sm border-2 border-emerald-500/50 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-emerald-300 placeholder-emerald-600 transition-all hover:border-emerald-400 font-mono"
                placeholder="// user@domain.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-bold text-cyan-400 mb-2 font-mono uppercase"
              >
                {'>'} Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={8}
                className="w-full px-4 py-3 bg-black/50 backdrop-blur-sm border-2 border-emerald-500/50 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-emerald-300 placeholder-emerald-600 transition-all hover:border-emerald-400 font-mono"
                placeholder="// min 8 chars"
              />
              <p className="text-xs text-emerald-500 mt-1 font-mono">
                // Must be at least 8 characters
              </p>
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-bold text-cyan-400 mb-2 font-mono uppercase"
              >
                {'>'} Confirm Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-black/50 backdrop-blur-sm border-2 border-emerald-500/50 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-emerald-300 placeholder-emerald-600 transition-all hover:border-emerald-400 font-mono"
                placeholder="// confirm password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-linear-to-r from-cyan-500 to-fuchsia-500 hover:from-fuchsia-500 hover:to-cyan-500 text-black font-mono font-black uppercase tracking-wider py-3 px-4 shadow-lg shadow-cyan-500/50 hover:shadow-fuchsia-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 border-2 border-cyan-400"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Initializing...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <span>{'>'}</span> Execute Signup
                </span>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-emerald-300 font-mono">
              <span className="text-emerald-500">// </span>Already registered?{" "}
              <Link
                href="/login"
                className="text-cyan-400 hover:text-fuchsia-400 font-bold transition-colors underline decoration-cyan-400 hover:decoration-fuchsia-400"
              >
                {'<'} Access System
              </Link>
            </p>
          </div>
        </div>

        <div className="text-center mt-6">
          <Link
            href="/"
            className="text-emerald-500 hover:text-cyan-400 text-sm transition-colors inline-flex items-center gap-2 group font-mono font-bold"
          >
            <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            {'<'} Return Home
          </Link>
        </div>
      </div>
    </div>
  );
}
