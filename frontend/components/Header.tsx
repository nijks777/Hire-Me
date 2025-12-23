"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  email: string;
  name: string;
  credits: number;
  resumeFileName?: string;
  coverLetterFileName?: string;
  coldEmailFileName?: string;
  githubUsername?: string;
  githubConnectedAt?: string;
}

export default function Header() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) {
      fetchUserData();
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) return;

      const response = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      }
    } catch (error) {
      console.error("Failed to fetch user data:", error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    router.push("/login");
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowedTypes.includes(file.type)) {
      alert("Please upload a PDF or Word document");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("File size must be less than 5MB");
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("resume", file);

      const token = localStorage.getItem("access_token");
      const response = await fetch("/api/resume/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      alert("Resume uploaded successfully!");
      await fetchUserData();
      setIsDropdownOpen(false);
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload resume. Please try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDisconnectGithub = async () => {
    if (!confirm("Are you sure you want to disconnect your GitHub account?")) {
      return;
    }

    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch("/api/auth/github/disconnect", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        alert("GitHub account disconnected successfully!");
        await fetchUserData();
      } else {
        throw new Error("Failed to disconnect");
      }
    } catch (error) {
      console.error("Disconnect GitHub error:", error);
      alert("Failed to disconnect GitHub account. Please try again.");
    }
  };

  if (!user) return null;

  return (
    <header className="bg-black/80 backdrop-blur-md shadow-lg border-b-2 border-cyan-500/30 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <Link href="/dashboard" className="flex items-center cursor-pointer group">
            <h1 className="text-lg sm:text-xl font-black font-mono bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-emerald-400 group-hover:drop-shadow-[0_0_20px_rgba(34,211,238,0.5)] transition-all">
              {'<'} HIRE-ME {'>'}
            </h1>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4 lg:space-x-6">
            <Link
              href="/history"
              className="text-emerald-300 hover:text-cyan-400 font-mono font-bold text-xs lg:text-sm uppercase tracking-wide transition-all hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.8)] cursor-pointer"
            >
              {'>'} History
            </Link>
            <Link
              href="/profile"
              className="text-emerald-300 hover:text-cyan-400 font-mono font-bold text-xs lg:text-sm uppercase tracking-wide transition-all hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.8)] cursor-pointer"
            >
              {'>'} User Info
            </Link>

            {/* Credits Badge */}
            {user && (
              <div className="flex items-center space-x-2 px-3 lg:px-4 py-2 bg-gradient-to-r from-cyan-500 to-fuchsia-500 border-2 border-cyan-400 shadow-lg shadow-cyan-500/50">
                <svg
                  className="w-4 h-4 lg:w-5 lg:h-5 text-black"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                </svg>
                <span className="text-black font-black text-xs lg:text-sm font-mono">
                  {user.credits}
                </span>
              </div>
            )}

            {/* Desktop Profile Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center space-x-2 lg:space-x-3 focus:outline-none cursor-pointer group"
              >
                <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-cyan-500 to-fuchsia-500 flex items-center justify-center text-black font-black border-2 border-cyan-400 shadow-lg shadow-cyan-500/50 group-hover:rotate-12 transition-transform text-sm lg:text-base">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="hidden lg:block text-left">
                  <p className="text-sm font-bold text-cyan-400 font-mono">
                    {user.name}
                  </p>
                  <p className="text-xs text-emerald-300 font-mono truncate max-w-[150px]">
                    {user.email}
                  </p>
                </div>
                <svg
                  className={`w-4 h-4 text-cyan-400 transition-transform ${isDropdownOpen ? "rotate-180" : ""
                    }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={3}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-black/95 backdrop-blur-lg border-2 border-cyan-500/50 shadow-lg shadow-cyan-500/50 py-2 z-100">
                  {/* User Info */}
                  <div className="px-4 py-3 border-b border-cyan-500/30">
                    <p className="text-sm font-bold text-cyan-400 font-mono">
                      {user.name}
                    </p>
                    <p className="text-xs text-emerald-300 font-mono truncate">
                      {user.email}
                    </p>
                  </div>

                  {/* Resume Upload Section */}
                  <div className="px-4 py-3 border-b border-cyan-500/30">
                    <p className="text-xs text-emerald-400 font-mono mb-2 uppercase tracking-wide">
                      {'>'} Resume
                    </p>
                    {user.resumeFileName ? (
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2 text-sm">
                          <svg
                            className="w-5 h-5 text-emerald-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            strokeWidth={3}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <span className="text-cyan-300 font-mono truncate text-xs">
                            {user.resumeFileName}
                          </span>
                        </div>
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploading}
                          className="w-full px-3 py-2 text-sm bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 hover:bg-cyan-500/30 hover:border-cyan-400 transition-colors disabled:opacity-50 cursor-pointer font-mono font-bold"
                        >
                          {uploading ? "UPLOADING..." : "UPDATE RESUME"}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="w-full px-4 py-2 bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-black border-2 border-cyan-400 hover:from-fuchsia-500 hover:to-cyan-500 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer font-mono font-black shadow-lg shadow-cyan-500/50"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          strokeWidth={3}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                          />
                        </svg>
                        <span>{uploading ? "UPLOADING..." : "UPLOAD RESUME"}</span>
                      </button>
                    )}
                    <p className="text-xs text-emerald-400/60 mt-2 font-mono">
                      // PDF or Word (Max 5MB)
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>

                  {/* GitHub Integration Section */}
                  <div className="px-4 py-3 border-b border-cyan-500/30">
                    <p className="text-xs text-emerald-400 font-mono mb-2 uppercase tracking-wide">
                      {'>'} GitHub Integration
                    </p>
                    {user.githubUsername ? (
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2 text-sm bg-emerald-500/10 border border-emerald-500/30 p-2">
                          <svg
                            className="w-5 h-5 text-emerald-400 shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            strokeWidth={3}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <div className="flex-1 min-w-0">
                            <p className="text-cyan-300 truncate font-bold font-mono text-xs">
                              {user.githubUsername}
                            </p>
                            <p className="text-xs text-emerald-400 font-mono">
                              CONNECTED
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => window.open(`https://github.com/${user.githubUsername}`, '_blank')}
                            className="px-3 py-2 text-sm bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 hover:bg-cyan-500/30 hover:border-cyan-400 transition-colors cursor-pointer flex items-center justify-center space-x-1 font-mono font-bold"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path fillRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" clipRule="evenodd" />
                            </svg>
                            <span>VIEW</span>
                          </button>
                          <button
                            onClick={handleDisconnectGithub}
                            className="px-3 py-2 text-sm bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30 hover:border-red-400 transition-colors cursor-pointer font-mono font-bold"
                          >
                            DISCONNECT
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => window.location.href = "/api/auth/github"}
                        className="w-full px-4 py-2 bg-white text-black border-2 border-white hover:bg-gray-200 transition-colors flex items-center justify-center space-x-2 cursor-pointer font-mono font-black shadow-lg"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path fillRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" clipRule="evenodd" />
                        </svg>
                        <span>CONNECT GITHUB</span>
                      </button>
                    )}
                    <p className="text-xs text-emerald-400/60 mt-2 font-mono">
                      // Auto-import your projects
                    </p>
                  </div>

                  {/* Logout */}
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/20 border-t border-cyan-500/30 cursor-pointer font-mono font-bold uppercase tracking-wide hover:text-red-300 transition-colors"
                  >
                    {'>'} LOGOUT
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden flex items-center space-x-2 focus:outline-none cursor-pointer"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-fuchsia-500 flex items-center justify-center text-black font-black border-2 border-cyan-400 shadow-lg shadow-cyan-500/50 text-sm">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <svg
              className={`w-6 h-6 text-cyan-400 transition-transform ${isMobileMenuOpen ? "rotate-90" : ""
                }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={3}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden pb-4 pt-2 border-t-2 border-cyan-500/30 mt-2">
            {/* Mobile Credits */}
            <div className="flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-cyan-500 to-fuchsia-500 border-2 border-cyan-400 shadow-lg shadow-cyan-500/50 mb-4">
              <svg
                className="w-5 h-5 text-black"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
              </svg>
              <span className="text-black font-black text-sm font-mono">
                {user.credits} CREDITS
              </span>
            </div>

            {/* Mobile Navigation Links */}
            <div className="space-y-2 mb-4">
              <Link
                href="/history"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-4 py-3 text-emerald-300 hover:bg-cyan-500/10 hover:text-cyan-400 font-mono font-bold text-sm uppercase tracking-wide transition-all border-l-4 border-transparent hover:border-cyan-400"
              >
                {'>'} History
              </Link>
              <Link
                href="/profile"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-4 py-3 text-emerald-300 hover:bg-cyan-500/10 hover:text-cyan-400 font-mono font-bold text-sm uppercase tracking-wide transition-all border-l-4 border-transparent hover:border-cyan-400"
              >
                {'>'} User Info
              </Link>
            </div>

            {/* Mobile Resume Section */}
            <div className="px-4 py-3 border-t border-b border-cyan-500/30 mb-2">
              <p className="text-xs text-emerald-400 font-mono mb-2 uppercase tracking-wide">
                {'>'} Resume
              </p>
              {user.resumeFileName ? (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-sm">
                    <svg
                      className="w-5 h-5 text-emerald-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span className="text-cyan-300 font-mono truncate text-xs">
                      {user.resumeFileName}
                    </span>
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="w-full px-3 py-2 text-sm bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 hover:bg-cyan-500/30 hover:border-cyan-400 transition-colors disabled:opacity-50 cursor-pointer font-mono font-bold"
                  >
                    {uploading ? "UPLOADING..." : "UPDATE RESUME"}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full px-4 py-2 bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-black border-2 border-cyan-400 hover:from-fuchsia-500 hover:to-cyan-500 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer font-mono font-black shadow-lg shadow-cyan-500/50"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  <span>{uploading ? "UPLOADING..." : "UPLOAD"}</span>
                </button>
              )}
            </div>

            {/* Mobile Logout */}
            <button
              onClick={handleLogout}
              className="w-full text-center px-4 py-3 text-sm text-red-400 hover:bg-red-500/20 cursor-pointer font-mono font-bold uppercase tracking-wide hover:text-red-300 transition-colors border-t border-cyan-500/30"
            >
              {'>'} LOGOUT
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
