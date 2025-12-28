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
  const [testing, setTesting] = useState(false);

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

  const handleTestPhase1 = async () => {
    if (!jobDescription.trim() || !companyName.trim()) {
      alert("Please enter Job Description and Company Name to test Phase 1.");
      return;
    }

    setTesting(true);

    try {
      const response = await fetch("http://localhost:8000/api/test-phase-1", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          job_description: jobDescription,
          company_name: companyName,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(`✅ Phase 1 Test Complete!\n\n⚡ Execution Time: ${data.execution_time}\n🔀 Parallel Execution: ${data.parallel_execution ? 'YES' : 'NO'}\n📊 Sources Found: ${data.company_research?.sources?.length || 0}\n\n✅ Check console for full results!`);
        console.log("🚀 Phase 1 Test Results:", data);
      } else {
        const error = await response.json();
        alert(`❌ Test Error: ${error.detail || "Failed to test Phase 1"}`);
      }
    } catch (error) {
      console.error("Phase 1 Test Error:", error);
      alert("❌ Failed to connect to backend. Make sure backend is running on port 8000.");
    } finally {
      setTesting(false);
    }
  };

  const handleGenerate = async () => {
    if (!jobDescription || !companyName) {
      alert("Please fill in job description and company name");
      return;
    }

    if (user && user.credits < 2) {
      alert("You need at least 2 credits (1 for cover letter + 1 for cold email). You have " + user.credits + " credits.");
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
      { name: "Credit Check", status: "pending" },
      { name: "Analyzing Job & Company", status: "pending" },
      { name: "Fetching GitHub & Profile", status: "pending" },
      { name: "Generating Cover Letter", status: "pending" },
      { name: "Generating Cold Email", status: "pending" },
    ]);

    try {
      let coverLetter = "";
      let coldEmail = "";

      // Step 1: Generate Cover Letter
      updateStepStatus(0, "in_progress", "Checking credits...");
      await new Promise(resolve => setTimeout(resolve, 500));
      updateStepStatus(0, "completed", `${user.credits} credits available`);

      updateStepStatus(1, "in_progress", "Processing cover letter...");

      const coverLetterResponse = await fetch("http://localhost:8000/api/cover-letter/generate-stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: user.id,
          job_description: jobDescription,
          company_name: companyName,
          document_type: "cover_letter",
        }),
      });

      if (!coverLetterResponse.ok) {
        throw new Error("Cover letter generation failed");
      }

      // Read cover letter SSE stream
      const clReader = coverLetterResponse.body?.getReader();
      const decoder = new TextDecoder();

      if (clReader) {
        let buffer = "";
        while (true) {
          const { done, value } = await clReader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const jsonStr = line.substring(6).trim();
                if (!jsonStr) continue;

                const data = JSON.parse(jsonStr);
                console.log("Cover Letter SSE:", data);

                if (data.type === "phase_complete") {
                  if (data.phase === 1 || data.phase === 2) {
                    updateStepStatus(1, "in_progress", data.message);
                  } else if (data.phase === 3 || data.phase === 4) {
                    updateStepStatus(2, "in_progress", data.message);
                  }
                } else if (data.type === "complete") {
                  coverLetter = data.generated_content || "";
                  updateStepStatus(1, "completed", "Job & company analysis done");
                  updateStepStatus(2, "completed", "GitHub & profile fetched");
                  updateStepStatus(3, "completed", "Cover letter generated");
                } else if (data.type === "error") {
                  throw new Error(data.message);
                }
              } catch (e) {
                console.error("Error parsing cover letter SSE:", e);
              }
            }
          }
        }
      }

      // Step 2: Generate Cold Email
      updateStepStatus(4, "in_progress", "Generating cold email...");

      const coldEmailResponse = await fetch("http://localhost:8000/api/cold-email/generate-stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: user.id,
          job_description: jobDescription,
          company_name: companyName,
          document_type: "cold_email",
        }),
      });

      if (!coldEmailResponse.ok) {
        throw new Error("Cold email generation failed");
      }

      // Read cold email SSE stream
      const ceReader = coldEmailResponse.body?.getReader();

      if (ceReader) {
        let buffer = "";
        while (true) {
          const { done, value } = await ceReader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const jsonStr = line.substring(6).trim();
                if (!jsonStr) continue;

                const data = JSON.parse(jsonStr);
                console.log("Cold Email SSE:", data);

                if (data.type === "complete") {
                  coldEmail = data.generated_content || "";
                  updateStepStatus(4, "completed", "Cold email generated");
                } else if (data.type === "error") {
                  throw new Error(data.message);
                }
              } catch (e) {
                console.error("Error parsing cold email SSE:", e);
              }
            }
          }
        }
      }

      // Set final content
      setGeneratedContent({
        cover_letter: coverLetter,
        cold_email: coldEmail,
      });

      // Refresh user data to get updated credits
      await fetchUserData();

    } catch (error) {
      console.error("Generation error:", error);
      alert("Failed to generate documents: " + (error instanceof Error ? error.message : "Unknown error"));
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
          <svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case "in_progress":
        return (
          <svg className="w-5 h-5 text-cyan-400 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        );
      case "error":
        return (
          <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <div className="w-5 h-5 border-2 border-cyan-500/50 rounded-full"></div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Matrix-style grid background */}
      <div className="absolute inset-0" style={{
        backgroundImage: `linear-gradient(rgba(0, 255, 65, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 65, 0.03) 1px, transparent 1px)`,
        backgroundSize: '50px 50px'
      }}></div>

      {/* Animated neon orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500 rounded-full mix-blend-screen filter blur-3xl opacity-10 animate-pulse"></div>
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-fuchsia-500 rounded-full mix-blend-screen filter blur-3xl opacity-10 animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-1/4 left-1/2 w-96 h-96 bg-emerald-500 rounded-full mix-blend-screen filter blur-3xl opacity-10 animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Scanline effect */}
      <div className="absolute inset-0 pointer-events-none opacity-5">
        <div className="h-full w-full" style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 255, 65, 0.1) 2px, rgba(0, 255, 65, 0.1) 4px)'
        }}></div>
      </div>

      <Header />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-emerald-400 drop-shadow-[0_0_30px_rgba(34,211,238,0.5)]">
              {'<'} GENERATE DOCUMENTS {'>'}
            </h1>
            <p className="text-emerald-300 font-mono mt-2 text-sm">
              // AI-powered cover letters and cold emails tailored to your job
            </p>
          </div>
          {user && (
            <div className="bg-black/60 border-2 border-cyan-500/30 px-6 py-3">
              <p className="text-cyan-400 font-mono font-bold text-sm">CREDITS: <span className="text-fuchsia-400 text-xl">{user.credits}</span></p>
            </div>
          )}
        </div>

        {!generatedContent ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input Form */}
            <div className="bg-black/60 backdrop-blur-lg border-2 border-cyan-500/30 shadow-lg shadow-cyan-500/20 p-6">
              <h2 className="text-xl font-black font-mono text-cyan-400 mb-4 flex items-center">
                <span className="text-fuchsia-400 mr-2">{'>'}</span> JOB DETAILS
              </h2>

              <div className="space-y-4">
                {/* Job Description */}
                <div>
                  <label className="block text-sm font-bold font-mono text-emerald-300 mb-2">
                    JOB DESCRIPTION *
                  </label>
                  <textarea
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    rows={8}
                    className="w-full px-4 py-3 bg-black/40 border-2 border-cyan-500/30 focus:border-fuchsia-500 focus:outline-none text-emerald-200 font-mono text-sm resize-none transition-colors scrollbar-thin scrollbar-thumb-cyan-500/50 scrollbar-track-transparent"
                    placeholder="Paste the complete job description here..."
                    disabled={loading}
                    style={{ boxShadow: '0 0 20px rgba(6, 182, 212, 0.1)' }}
                  />
                </div>

                {/* Company Name */}
                <div>
                  <label className="block text-sm font-bold font-mono text-emerald-300 mb-2">
                    COMPANY NAME *
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full px-4 py-3 bg-black/40 border-2 border-cyan-500/30 focus:border-fuchsia-500 focus:outline-none text-emerald-200 font-mono text-sm transition-colors"
                    placeholder="e.g., Google"
                    disabled={loading}
                    style={{ boxShadow: '0 0 20px rgba(6, 182, 212, 0.1)' }}
                  />
                </div>

                {/* HR Name */}
                <div>
                  <label className="block text-sm font-bold font-mono text-emerald-300 mb-2">
                    HR/RECRUITER NAME (OPTIONAL)
                  </label>
                  <input
                    type="text"
                    value={hrName}
                    onChange={(e) => setHrName(e.target.value)}
                    className="w-full px-4 py-3 bg-black/40 border-2 border-cyan-500/30 focus:border-fuchsia-500 focus:outline-none text-emerald-200 font-mono text-sm transition-colors"
                    placeholder="e.g., Jane Smith"
                    disabled={loading}
                    style={{ boxShadow: '0 0 20px rgba(6, 182, 212, 0.1)' }}
                  />
                </div>

                {/* Custom Prompt */}
                <div>
                  <label className="block text-sm font-bold font-mono text-emerald-300 mb-2">
                    CUSTOM INSTRUCTIONS (OPTIONAL)
                  </label>
                  <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 bg-black/40 border-2 border-cyan-500/30 focus:border-fuchsia-500 focus:outline-none text-emerald-200 font-mono text-sm resize-none transition-colors scrollbar-thin scrollbar-thumb-cyan-500/50 scrollbar-track-transparent"
                    placeholder="e.g., Make it enthusiastic and highlight my Python skills"
                    disabled={loading}
                    style={{ boxShadow: '0 0 20px rgba(6, 182, 212, 0.1)' }}
                  />
                </div>

                {/* Test Phase 1 Button */}
                <button
                  onClick={handleTestPhase1}
                  disabled={testing || loading || !jobDescription.trim() || !companyName.trim()}
                  className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-black font-mono font-bold uppercase tracking-wider shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all duration-300 border-2 border-emerald-400 hover:border-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {testing ? (
                    <span className="flex items-center justify-center">
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5"
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
                      TESTING PHASE 1...
                    </span>
                  ) : (
                    `🧪 TEST PHASE 1 (PARALLEL + TAVILY)`
                  )}
                </button>

                {/* Generate Button */}
                <button
                  onClick={handleGenerate}
                  disabled={loading || testing || !user || user.credits < 2}
                  className="w-full py-3 px-4 bg-gradient-to-r from-fuchsia-500 to-cyan-500 text-black font-mono font-black uppercase tracking-wider shadow-lg shadow-fuchsia-500/50 hover:shadow-fuchsia-500/80 transition-all duration-300 transform hover:scale-105 border-2 border-fuchsia-400 hover:border-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5"
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
                      GENERATING...
                    </span>
                  ) : (
                    `⚡ GENERATE DOCUMENTS (2 CREDITS)`
                  )}
                </button>

                {user && user.credits < 2 && (
                  <p className="text-red-400 text-sm text-center font-mono font-bold">
                    {'>'} NEED 2 CREDITS (YOU HAVE {user.credits})
                  </p>
                )}

                {user && user.credits >= 2 && (
                  <p className="text-emerald-300/60 text-sm text-center font-mono">
                    // {user.credits} credits remaining
                  </p>
                )}
              </div>
            </div>

            {/* Progress Panel */}
            <div className="bg-black/60 backdrop-blur-lg border-2 border-cyan-500/30 shadow-lg shadow-cyan-500/20 p-6">
              <h2 className="text-xl font-black font-mono text-cyan-400 mb-6 flex items-center">
                <span className="text-fuchsia-400 mr-2">{'>'}</span>
                {loading ? "PROCESSING..." : "PROGRESS"}
              </h2>

              {!loading && (
                <div className="text-center py-12">
                  <svg
                    className="w-16 h-16 mx-auto mb-4 text-cyan-400/60"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <p className="text-emerald-300 font-mono text-sm">
                    {'>'} Fill in job details and click Generate
                  </p>
                </div>
              )}

              {loading && (
                <div className="space-y-4">
                  {agentSteps.map((step, index) => (
                    <div
                      key={index}
                      className={`flex items-start space-x-3 p-3 border-2 transition-all ${step.status === "in_progress"
                          ? "bg-cyan-500/10 border-cyan-500/50"
                          : step.status === "completed"
                            ? "bg-emerald-500/10 border-emerald-500/50"
                            : step.status === "error"
                              ? "bg-red-500/10 border-red-500/50"
                              : "bg-black/20 border-cyan-500/20"
                        }`}
                    >
                      <div className="shrink-0 mt-0.5">
                        {getStepIcon(step.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-bold font-mono ${step.status === "in_progress"
                              ? "text-cyan-300"
                              : step.status === "completed"
                                ? "text-emerald-300"
                                : step.status === "error"
                                  ? "text-red-300"
                                  : "text-emerald-300/40"
                            }`}
                        >
                          {step.name}
                        </p>
                        {step.message && (
                          <p className="text-xs text-emerald-300/60 font-mono mt-1">
                            // {step.message}
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
            <div className="bg-black/60 backdrop-blur-lg border-2 border-cyan-500/30 shadow-lg shadow-cyan-500/20 p-6">
              <div className="bg-cyan-500/10 border border-cyan-500/50 p-4 mb-4">
                <div className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-cyan-400 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="text-sm font-bold text-cyan-300 font-mono">
                      {'>'} EDIT MODE ENABLED
                    </p>
                    <p className="text-xs text-emerald-300/60 font-mono mt-1">
                      // AI won't be 100% perfect - make changes and then copy or download
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <svg className="w-8 h-8 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <h3 className="text-lg font-black font-mono text-emerald-300">
                      {'>'} DOCUMENTS GENERATED!
                    </h3>
                    <p className="text-sm text-emerald-300/60 font-mono">
                      // Edit, copy, and download your documents
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setGeneratedContent(null);
                    setJobDescription("");
                    setCompanyName("");
                    setHrName("");
                    setCustomPrompt("");
                    setAgentSteps([
                      { name: "Credit Check", status: "pending" },
                      { name: "Analyzing Job & Company", status: "pending" },
                      { name: "Fetching GitHub & Profile", status: "pending" },
                      { name: "Generating Cover Letter", status: "pending" },
                      { name: "Generating Cold Email", status: "pending" },
                    ]);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-fuchsia-500 to-fuchsia-600 text-black font-mono font-bold uppercase border-2 border-fuchsia-400 hover:from-fuchsia-600 hover:to-fuchsia-700 transition-all shadow-lg shadow-fuchsia-500/30 transform hover:scale-105"
                >
                  NEW
                </button>
              </div>

              {/* Download All Button */}
              <button
                onClick={handleDownloadBoth}
                className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-black font-mono font-bold uppercase border-2 border-emerald-400 hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 flex items-center justify-center space-x-2 transform hover:scale-105"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <span>DOWNLOAD BOTH AS PDF</span>
              </button>
            </div>

            {/* Editable Generated Documents */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Cover Letter Editor */}
              <div className="bg-black/60 backdrop-blur-lg border-2 border-cyan-500/30 shadow-lg shadow-cyan-500/20 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-black font-mono text-cyan-400 flex items-center">
                    <span className="text-fuchsia-400 mr-2">{'>'}</span> COVER LETTER
                  </h3>
                  <span className="text-xs text-emerald-300/60 font-mono">
                    {editedCoverLetter.length} chars
                  </span>
                </div>

                <textarea
                  value={editedCoverLetter}
                  onChange={(e) => setEditedCoverLetter(e.target.value)}
                  rows={20}
                  className="w-full px-4 py-3 bg-black/40 border-2 border-cyan-500/30 focus:border-fuchsia-500 focus:outline-none text-emerald-200 font-mono text-sm resize-none mb-4 scrollbar-thin scrollbar-thumb-cyan-500/50 scrollbar-track-transparent"
                  style={{ boxShadow: '0 0 20px rgba(6, 182, 212, 0.1)' }}
                />

                <div className="flex space-x-3">
                  <button
                    onClick={() => handleCopy(editedCoverLetter, "Cover Letter")}
                    className="flex-1 py-2 px-4 bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-black font-mono font-bold uppercase border-2 border-cyan-400 hover:from-fuchsia-500 hover:to-cyan-500 transition-all shadow-lg shadow-cyan-500/30 hover:shadow-fuchsia-500/50 flex items-center justify-center space-x-2 transform hover:scale-105"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                    <span>COPY</span>
                  </button>
                  <button
                    onClick={() =>
                      handleDownloadPDF(editedCoverLetter, "Cover_Letter")
                    }
                    className="flex-1 py-2 px-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-black font-mono font-bold uppercase border-2 border-emerald-400 hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 flex items-center justify-center space-x-2 transform hover:scale-105"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <span>PDF</span>
                  </button>
                </div>
              </div>

              {/* Cold Email Editor */}
              <div className="bg-black/60 backdrop-blur-lg border-2 border-cyan-500/30 shadow-lg shadow-cyan-500/20 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-black font-mono text-cyan-400 flex items-center">
                    <span className="text-fuchsia-400 mr-2">{'>'}</span> COLD EMAIL
                  </h3>
                  <span className="text-xs text-emerald-300/60 font-mono">
                    {editedColdEmail.length} chars
                  </span>
                </div>

                <textarea
                  value={editedColdEmail}
                  onChange={(e) => setEditedColdEmail(e.target.value)}
                  rows={20}
                  className="w-full px-4 py-3 bg-black/40 border-2 border-cyan-500/30 focus:border-fuchsia-500 focus:outline-none text-emerald-200 font-mono text-sm resize-none mb-4 scrollbar-thin scrollbar-thumb-cyan-500/50 scrollbar-track-transparent"
                  style={{ boxShadow: '0 0 20px rgba(6, 182, 212, 0.1)' }}
                />

                <div className="flex space-x-3">
                  <button
                    onClick={() => handleCopy(editedColdEmail, "Cold Email")}
                    className="flex-1 py-2 px-4 bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-black font-mono font-bold uppercase border-2 border-cyan-400 hover:from-fuchsia-500 hover:to-cyan-500 transition-all shadow-lg shadow-cyan-500/30 hover:shadow-fuchsia-500/50 flex items-center justify-center space-x-2 transform hover:scale-105"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                    <span>COPY</span>
                  </button>
                  <button
                    onClick={() =>
                      handleDownloadPDF(editedColdEmail, "Cold_Email")
                    }
                    className="flex-1 py-2 px-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-black font-mono font-bold uppercase border-2 border-emerald-400 hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 flex items-center justify-center space-x-2 transform hover:scale-105"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
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
