"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import jsPDF from "jspdf";

interface User {
  id: string;
  credits: number;
}

interface GeneratedContent {
  cover_letter: string;
  cold_email: string;
}

interface AgentStep {
  name: string;
  status: "pending" | "in_progress" | "completed" | "error";
  message?: string;
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
  const [agentSteps, setAgentSteps] = useState<AgentStep[]>([
    { name: "Analyzing Job Requirements", status: "pending" },
    { name: "Researching Company", status: "pending" },
    { name: "Analyzing Your Resume", status: "pending" },
    { name: "Analyzing Writing Style", status: "pending" },
    { name: "Generating Documents", status: "pending" },
  ]);

  // Generated results (editable)
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [editedCoverLetter, setEditedCoverLetter] = useState("");
  const [editedColdEmail, setEditedColdEmail] = useState("");

  useEffect(() => {
    fetchUserData();
  }, []);

  useEffect(() => {
    // Update edited versions when new docs are generated
    if (generatedContent) {
      setEditedCoverLetter(generatedContent.cover_letter);
      setEditedColdEmail(generatedContent.cold_email);
    }
  }, [generatedContent]);

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

  const updateStepStatus = (
    stepIndex: number,
    status: "in_progress" | "completed" | "error",
    message?: string
  ) => {
    setAgentSteps((prev) =>
      prev.map((step, idx) =>
        idx === stepIndex ? { ...step, status, message } : step
      )
    );
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

    if (!user || !user.id) {
      alert("User not authenticated. Please login first.");
      return;
    }

    setLoading(true);
    setGeneratedContent(null);

    // Reset all steps to pending
    setAgentSteps([
      { name: "Analyzing Job Requirements", status: "pending" },
      { name: "Researching Company", status: "pending" },
      { name: "Analyzing Your Resume", status: "pending" },
      { name: "Analyzing Writing Style", status: "pending" },
      { name: "Generating Documents", status: "pending" },
    ]);

    try {
      const token = localStorage.getItem("access_token");

      // Use SSE for real-time progress updates
      const response = await fetch("http://localhost:8000/api/generate-stream", {
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
          user_id: user.id,
        }),
      });

      if (!response.ok) {
        throw new Error("Generation failed");
      }

      // Read SSE stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || ""; // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const jsonStr = line.substring(6).trim();
                if (!jsonStr) continue;

                const data = JSON.parse(jsonStr);
                console.log("SSE Event:", data);

                if (data.type === "progress") {
                  updateStepStatus(data.step - 1, "in_progress", data.message);
                } else if (data.type === "step_complete") {
                  updateStepStatus(data.step - 1, "completed", data.message);
                } else if (data.type === "complete") {
                  setGeneratedContent(data.generated_content);
                  await fetchUserData();
                } else if (data.type === "error") {
                  const stepIndex = data.step ? data.step - 1 : 0;
                  updateStepStatus(stepIndex, "error", data.message);
                  alert("Error: " + data.message);
                  break;
                }
              } catch (e) {
                console.error("Error parsing SSE data:", e, "Line:", line);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Generation error:", error);
      alert("Failed to generate documents. Please try again.");
      // Mark current step as error
      const currentStepIndex = agentSteps.findIndex((s) => s.status === "in_progress");
      if (currentStepIndex >= 0) {
        updateStepStatus(currentStepIndex, "error", "Generation failed");
      }
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

    doc.save(`${companyName || "Application"}_Documents.pdf`);
  };

  const getStepIcon = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case "in_progress":
        return (
          <svg className="w-5 h-5 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        );
      case "error":
        return (
          <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <div className="w-5 h-5 border-2 border-gray-300 rounded-full"></div>
        );
    }
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

        {!generatedContent ? (
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
                  className="w-full py-3 px-4 bg-linear-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Generating...
                    </span>
                  ) : (
                    `Generate Documents (1 Credit)`
                  )}
                </button>

                {user && user.credits <= 0 && (
                  <p className="text-red-600 text-sm text-center">
                    No credits remaining. Please contact support.
                  </p>
                )}

                {user && user.credits > 0 && (
                  <p className="text-gray-600 dark:text-gray-400 text-sm text-center">
                    You have {user.credits} credits remaining
                  </p>
                )}
              </div>
            </div>

            {/* Progress Panel */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                {loading ? "Generating Your Documents..." : "Progress"}
              </h2>

              {!loading && (
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
                  {agentSteps.map((step, index) => (
                    <div
                      key={index}
                      className={`flex items-start space-x-3 p-3 rounded-lg transition-all ${
                        step.status === "in_progress"
                          ? "bg-blue-50 dark:bg-blue-900/20"
                          : step.status === "completed"
                          ? "bg-green-50 dark:bg-green-900/20"
                          : step.status === "error"
                          ? "bg-red-50 dark:bg-red-900/20"
                          : "bg-gray-50 dark:bg-gray-700/50"
                      }`}
                    >
                      <div className="shrink-0 mt-0.5">
                        {getStepIcon(step.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-medium ${
                            step.status === "in_progress"
                              ? "text-blue-700 dark:text-blue-300"
                              : step.status === "completed"
                              ? "text-green-700 dark:text-green-300"
                              : step.status === "error"
                              ? "text-red-700 dark:text-red-300"
                              : "text-gray-600 dark:text-gray-400"
                          }`}
                        >
                          {step.name}
                        </p>
                        {step.message && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {step.message}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Success Message and Download All Button */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                <div className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
                      💡 You can edit the documents directly in the textareas below
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                      AI won't be 100% perfect - make changes and then copy or download as PDF
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <svg className="w-8 h-8 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Documents Generated Successfully!
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Edit, copy, and download your personalized documents
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setGeneratedContent(null);
                    setAgentSteps([
                      { name: "Analyzing Job Requirements", status: "pending" },
                      { name: "Researching Company", status: "pending" },
                      { name: "Analyzing Your Resume", status: "pending" },
                      { name: "Analyzing Writing Style", status: "pending" },
                      { name: "Generating Documents", status: "pending" },
                    ]);
                  }}
                  className="px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition-all"
                >
                  New Generation
                </button>
              </div>

              {/* Download All Button */}
              <button
                onClick={handleDownloadBoth}
                className="w-full py-3 px-4 bg-linear-to-r from-green-600 to-teal-600 text-white font-semibold rounded-lg hover:from-green-700 hover:to-teal-700 transition-all shadow-lg flex items-center justify-center space-x-2"
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
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <span>Download Both as PDF</span>
              </button>
            </div>

            {/* Editable Generated Documents */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                    <span>Copy</span>
                  </button>
                  <button
                    onClick={() =>
                      handleDownloadPDF(editedCoverLetter, "Cover_Letter")
                    }
                    className="flex-1 py-2 px-4 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-all flex items-center justify-center space-x-2"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
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
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                    <span>Copy</span>
                  </button>
                  <button
                    onClick={() =>
                      handleDownloadPDF(editedColdEmail, "Cold_Email")
                    }
                    className="flex-1 py-2 px-4 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-all flex items-center justify-center space-x-2"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <span>PDF</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
