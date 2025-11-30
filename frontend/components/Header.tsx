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
}

export default function Header() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingCoverLetter, setUploadingCoverLetter] = useState(false);
  const [uploadingColdEmail, setUploadingColdEmail] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverLetterInputRef = useRef<HTMLInputElement>(null);
  const coldEmailInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Get user info from localStorage (simplified for now)
    const token = localStorage.getItem("access_token");
    if (token) {
      // In a real app, decode JWT or fetch user data
      // For now, we'll fetch from API
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

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowedTypes.includes(file.type)) {
      alert("Please upload a PDF or Word document");
      return;
    }

    // Validate file size (max 5MB)
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

      // Refresh user data to show updated resume
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

  const handleCoverLetterSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type (PDF and TXT)
    const allowedTypes = ["application/pdf", "text/plain"];

    if (!allowedTypes.includes(file.type)) {
      alert("Please upload a PDF or TXT file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("File size must be less than 5MB");
      return;
    }

    setUploadingCoverLetter(true);

    try {
      const formData = new FormData();
      formData.append("coverLetter", file);

      const token = localStorage.getItem("access_token");
      const response = await fetch("/api/cover-letter/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      alert("Cover letter uploaded successfully!");

      // Refresh user data
      await fetchUserData();
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload cover letter. Please try again.");
    } finally {
      setUploadingCoverLetter(false);
      if (coverLetterInputRef.current) {
        coverLetterInputRef.current.value = "";
      }
    }
  };

  const handleColdEmailSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type (PDF and TXT)
    const allowedTypes = ["application/pdf", "text/plain"];

    if (!allowedTypes.includes(file.type)) {
      alert("Please upload a PDF or TXT file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("File size must be less than 5MB");
      return;
    }

    setUploadingColdEmail(true);

    try {
      const formData = new FormData();
      formData.append("coldEmail", file);

      const token = localStorage.getItem("access_token");
      const response = await fetch("/api/cold-email/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      alert("Cold email uploaded successfully!");

      // Refresh user data
      await fetchUserData();
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload cold email. Please try again.");
    } finally {
      setUploadingColdEmail(false);
      if (coldEmailInputRef.current) {
        coldEmailInputRef.current.value = "";
      }
    }
  };

  if (!user) return null;

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <Link href="/dashboard" className="flex items-center cursor-pointer">
            <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400">
              Hire-Me
            </h1>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center space-x-6">
            <Link
              href="/dashboard"
              className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors cursor-pointer"
            >
              Dashboard
            </Link>
            <Link
              href="/generate"
              className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors cursor-pointer"
            >
              Generate
            </Link>
            <Link
              href="/history"
              className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors cursor-pointer"
            >
              History
            </Link>
            <Link
              href="/profile"
              className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors cursor-pointer"
            >
              User Info
            </Link>

            {/* Credits Badge */}
            {user && (
              <div className="flex items-center space-x-2 px-4 py-2 bg-linear-to-r from-purple-500 to-blue-500 rounded-full shadow-lg">
                <svg
                  className="w-5 h-5 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                </svg>
                <span className="text-white font-bold text-sm">
                  {user.credits} Credits
                </span>
              </div>
            )}
          </div>

          {/* Profile Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center space-x-3 focus:outline-none cursor-pointer"
            >
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  {user.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {user.email}
                </p>
              </div>
              <svg
                className={`w-4 h-4 text-gray-600 dark:text-gray-300 transition-transform ${
                  isDropdownOpen ? "rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50">
                {/* User Info */}
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {user.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {user.email}
                  </p>
                </div>

                {/* Resume Upload Section */}
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    Resume
                  </p>
                  {user.resumeFileName ? (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-sm">
                        <svg
                          className="w-5 h-5 text-green-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <span className="text-gray-700 dark:text-gray-300 truncate">
                          {user.resumeFileName}
                        </span>
                      </div>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="w-full px-3 py-2 text-sm bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {uploading ? "Uploading..." : "Update Resume"}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                      </svg>
                      <span>{uploading ? "Uploading..." : "Upload Your Resume"}</span>
                    </button>
                  )}
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                    PDF or Word (Max 5MB)
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>

                {/* Cover Letter Upload Section */}
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    Demo Cover Letter
                  </p>
                  {user.coverLetterFileName ? (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-sm">
                        <svg
                          className="w-5 h-5 text-green-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <span className="text-gray-700 dark:text-gray-300 truncate">
                          {user.coverLetterFileName}
                        </span>
                      </div>
                      <button
                        onClick={() => coverLetterInputRef.current?.click()}
                        disabled={uploadingCoverLetter}
                        className="w-full px-3 py-2 text-sm bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {uploadingCoverLetter ? "Uploading..." : "Update Cover Letter"}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => coverLetterInputRef.current?.click()}
                      disabled={uploadingCoverLetter}
                      className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                      </svg>
                      <span>{uploadingCoverLetter ? "Uploading..." : "Upload Cover Letter"}</span>
                    </button>
                  )}
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                    PDF or TXT (Max 5MB)
                  </p>
                  <input
                    ref={coverLetterInputRef}
                    type="file"
                    accept=".pdf,.txt"
                    onChange={handleCoverLetterSelect}
                    className="hidden"
                  />
                </div>

                {/* Cold Email Upload Section */}
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    Demo Cold Email
                  </p>
                  {user.coldEmailFileName ? (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-sm">
                        <svg
                          className="w-5 h-5 text-green-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <span className="text-gray-700 dark:text-gray-300 truncate">
                          {user.coldEmailFileName}
                        </span>
                      </div>
                      <button
                        onClick={() => coldEmailInputRef.current?.click()}
                        disabled={uploadingColdEmail}
                        className="w-full px-3 py-2 text-sm bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-lg hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {uploadingColdEmail ? "Uploading..." : "Update Cold Email"}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => coldEmailInputRef.current?.click()}
                      disabled={uploadingColdEmail}
                      className="w-full px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                      </svg>
                      <span>{uploadingColdEmail ? "Uploading..." : "Upload Cold Email"}</span>
                    </button>
                  )}
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                    PDF or TXT (Max 5MB)
                  </p>
                  <input
                    ref={coldEmailInputRef}
                    type="file"
                    accept=".pdf,.txt"
                    onChange={handleColdEmailSelect}
                    className="hidden"
                  />
                </div>

                {/* Menu Items */}
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
