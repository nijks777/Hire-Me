"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import jsPDF from "jspdf";

interface User {
  credits: number;
}

interface GeneratedDocuments {
  coverLetter: string;
  coldEmail: string;
  qualityScore?: number;
  suggestions?: string;
}

export default function GeneratePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  // Form inputs
  const [jobDescription, setJobDescription] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [hrName, setHrName] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");

  // Progress tracking
  const [currentAgent, setCurrentAgent] = useState("");
  const [progressMessages, setProgressMessages] = useState<string[]>([]);

  // Generated results (editable)
  const [generatedDocs, setGeneratedDocs] = useState<GeneratedDocuments | null>(null);
  const [editedCoverLetter, setEditedCoverLetter] = useState("");
  const [editedColdEmail, setEditedColdEmail] = useState("");

  useEffect(() => {
    fetchUserData();
  }, []);

  useEffect(() => {
    // Update edited versions when new docs are generated
    if (generatedDocs) {
      setEditedCoverLetter(generatedDocs.coverLetter);
      setEditedColdEmail(generatedDocs.coldEmail);
    }
  }, [generatedDocs]);

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        router.push("/login");
        return;
      }

      const response = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        router.push("/login");
      }
    } catch (error) {
      console.error("Failed to fetch user data:", error);
    }
  };

  const handleGenerate = async () => {
    if (!jobDescription || !companyName) {
      alert("Please fill in job description and company name");
      return;
    }

    if (user && user.credits <= 0) {
      alert("You don't have enough credits. Please contact support.");
      return;
    }

    setLoading(true);
    setProgressMessages([]);
    setCurrentAgent("Starting...");
    setGeneratedDocs(null);

    try {
      const token = localStorage.getItem("access_token");

      const response = await fetch("http://localhost:8000/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          job_description: jobDescription,
          company_name: companyName,
          hr_name: hrName,
          custom_prompt: customPrompt,
        }),
      });

      if (!response.ok) {
        throw new Error("Generation failed");
      }

      // Read SSE stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = JSON.parse(line.substring(6));

              if (data.type === "progress") {
                setCurrentAgent(data.agent);
                setProgressMessages((prev) => [...prev, data.message]);
              } else if (data.type === "complete") {
                setGeneratedDocs({
                  coverLetter: data.cover_letter,
                  coldEmail: data.cold_email,
                  qualityScore: data.quality_score,
                  suggestions: data.suggestions,
                });
                await fetchUserData();
                setCurrentAgent("Complete!");
              } else if (data.type === "error") {
                alert("Error: " + data.message);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Generation error:", error);
      alert("Failed to generate documents. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    alert(`${type} copied to clipboard!`);
  };

  const handleDownloadPDF = (text: string, filename: string) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const maxWidth = pageWidth - 2 * margin;

    // Add title
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(filename, margin, margin);

    // Add content
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");

    const lines = doc.splitTextToSize(text, maxWidth);
    let yPosition = margin + 10;

    lines.forEach((line: string) => {
      if (yPosition > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
      }
      doc.text(line, margin, yPosition);
      yPosition += 7;
    });

    doc.save(`${filename}.pdf`);
  };

  const handleDownloadBoth = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const maxWidth = pageWidth - 2 * margin;

    // Cover Letter
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Cover Letter", margin, margin);

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    let lines = doc.splitTextToSize(editedCoverLetter, maxWidth);
    let yPosition = margin + 10;

    lines.forEach((line: string) => {
      if (yPosition > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
      }
      doc.text(line, margin, yPosition);
      yPosition += 7;
    });

    // Cold Email - New Page
    doc.addPage();
    yPosition = margin;

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Cold Email", margin, yPosition);

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    lines = doc.splitTextToSize(editedColdEmail, maxWidth);
    yPosition += 10;

    lines.forEach((line: string) => {
      if (yPosition > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
      }
      doc.text(line, margin, yPosition);
      yPosition += 7;
    });

    doc.save(`${companyName || 'Application'}_Documents.pdf`);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Generate Cover Letter & Cold Email
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            AI-powered personalized documents tailored to your job application
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Form */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Job Details
            </h2>

            <div className="space-y-4">
              {/* Job Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Job Description *
                </label>
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white resize-none"
                  placeholder="Paste the complete job description here..."
                  disabled={loading}
                />
              </div>

              {/* Company Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Company Name *
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="e.g., Google"
                  disabled={loading}
                />
              </div>

              {/* HR Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  HR/Recruiter Name (Optional)
                </label>
                <input
                  type="text"
                  value={hrName}
                  onChange={(e) => setHrName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="e.g., Jane Smith"
                  disabled={loading}
                />
              </div>

              {/* Custom Prompt */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Custom Instructions (Optional)
                </label>
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white resize-none"
                  placeholder="e.g., Make it enthusiastic and highlight my Python skills"
                  disabled={loading}
                />
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={loading || !user || user.credits <= 0}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                  </span>
                ) : (
                  `Generate Documents (1 Credit)`
                )}
              </button>

              {/* Regenerate Button */}
              {generatedDocs && !loading && (
                <button
                  onClick={handleGenerate}
                  disabled={!user || user.credits <= 0}
                  className="w-full py-2 px-4 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Regenerate (1 Credit)
                </button>
              )}

              {user && user.credits <= 0 && (
                <p className="text-red-600 text-sm text-center">
                  No credits remaining. Please contact support.
                </p>
              )}
            </div>
          </div>

          {/* Progress & Results */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {generatedDocs ? "Quality Score" : "Progress"}
            </h2>

            {!loading && !generatedDocs && (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <svg
                  className="w-16 h-16 mx-auto mb-4 opacity-50"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <p>Fill in the job details and click Generate</p>
              </div>
            )}

            {loading && (
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="text-gray-700 dark:text-gray-300 font-medium">
                    {currentAgent}
                  </span>
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {progressMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className="text-sm text-gray-600 dark:text-gray-400 pl-11"
                    >
                      {msg}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {generatedDocs && (
              <div className="space-y-6">
                {/* Quality Score */}
                {generatedDocs.qualityScore && (
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Quality Score
                      </span>
                      <span className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        {generatedDocs.qualityScore}/100
                      </span>
                    </div>
                    {generatedDocs.suggestions && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                        {generatedDocs.suggestions}
                      </p>
                    )}
                  </div>
                )}

                {/* Download All Button */}
                <button
                  onClick={handleDownloadBoth}
                  className="w-full py-3 px-4 bg-gradient-to-r from-green-600 to-teal-600 text-white font-semibold rounded-lg hover:from-green-700 hover:to-teal-700 transition-all shadow-lg flex items-center justify-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Download Both as PDF</span>
                </button>

                <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                  Documents generated successfully! Edit and download below.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Editable Generated Documents */}
        {generatedDocs && (
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Cover Letter Editor */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Cover Letter
                </h3>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {editedCoverLetter.length} characters
                </span>
              </div>

              <textarea
                value={editedCoverLetter}
                onChange={(e) => setEditedCoverLetter(e.target.value)}
                rows={20}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white font-mono text-sm resize-none mb-4"
              />

              <div className="flex space-x-3">
                <button
                  onClick={() => handleCopy(editedCoverLetter, "Cover Letter")}
                  className="flex-1 py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-all flex items-center justify-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span>Copy</span>
                </button>
                <button
                  onClick={() => handleDownloadPDF(editedCoverLetter, "Cover_Letter")}
                  className="flex-1 py-2 px-4 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-all flex items-center justify-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>PDF</span>
                </button>
              </div>
            </div>

            {/* Cold Email Editor */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Cold Email
                </h3>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {editedColdEmail.length} characters
                </span>
              </div>

              <textarea
                value={editedColdEmail}
                onChange={(e) => setEditedColdEmail(e.target.value)}
                rows={20}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white font-mono text-sm resize-none mb-4"
              />

              <div className="flex space-x-3">
                <button
                  onClick={() => handleCopy(editedColdEmail, "Cold Email")}
                  className="flex-1 py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-all flex items-center justify-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span>Copy</span>
                </button>
                <button
                  onClick={() => handleDownloadPDF(editedColdEmail, "Cold_Email")}
                  className="flex-1 py-2 px-4 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-all flex items-center justify-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>PDF</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
