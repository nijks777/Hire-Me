"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Header from "@/components/Header";

export default function CustomizeResumePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [resumeData, setResumeData] = useState<{
    fileName: string;
    content: string;
    mimeType: string;
    uploadedAt?: string;
  } | null>(null);
  const [resumeText, setResumeText] = useState("");

  const [jobDescription, setJobDescription] = useState("");
  const [customInstructions, setCustomInstructions] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.push("/login");
      return;
    }
    fetchResume();
  }, [router]);

  const fetchResume = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch("/api/resume/get", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.resume) {
          setResumeData(data.resume);
          // Extract text from PDF for display (simplified version)
          if (data.resume.mimeType === 'application/pdf') {
            setResumeText('[PDF Resume - ' + data.resume.fileName + ']\n\nYour resume will be analyzed by AI. You can view the original PDF in your profile.');
          } else {
            // For text-based formats
            try {
              const decoded = atob(data.resume.content);
              setResumeText(decoded);
            } catch (e) {
              setResumeText('Resume uploaded: ' + data.resume.fileName);
            }
          }
        }
      } else if (response.status === 404) {
        console.log("No resume found yet");
        setResumeData(null);
      } else {
        console.error("Failed to fetch resume:", await response.text());
      }
    } catch (error) {
      console.error("Error fetching resume:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleTestAgents = async () => {
    if (!jobDescription.trim()) {
      alert("Please enter a job description to test.");
      return;
    }

    setTesting(true);
    setTestResults(null);

    try {
      const response = await fetch("http://localhost:8000/api/test/agents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          job_description: jobDescription,
          custom_instructions: customInstructions || null,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setTestResults(data);
      } else {
        const error = await response.json();
        alert(`Test Error: ${error.detail || "Failed to test agents"}`);
      }
    } catch (error) {
      console.error("Test Error:", error);
      alert("Failed to connect to backend. Make sure backend is running on port 8000.");
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!resumeData) {
      alert("No resume found. Please upload a resume first.");
      return;
    }

    if (!jobDescription.trim()) {
      alert("Please enter a job description.");
      return;
    }

    setSubmitting(true);

    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch("/api/resume/customize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          jobDescription,
          customInstructions,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert("Resume customization started! (Multi-agent flow will be implemented next)");
        console.log("Response:", data);
      } else {
        const error = await response.json();
        alert(`Error: ${error.message || "Failed to customize resume"}`);
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black relative overflow-hidden">
        {/* Matrix-style grid background */}
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(rgba(0, 255, 65, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 65, 0.03) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }}></div>

        <Header />
        <div className="relative z-10 flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-cyan-500 border-t-transparent mb-4"></div>
            <p className="text-cyan-400 font-mono font-bold">LOADING RESUME<span className="animate-pulse">...</span></p>
          </div>
        </div>
      </div>
    );
  }

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
        <div className="mb-8">
          <h1 className="text-4xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-emerald-400 drop-shadow-[0_0_30px_rgba(34,211,238,0.5)]">
            {'<'} CUSTOMIZE RESUME {'>'}
          </h1>
          <p className="text-emerald-300 font-mono mt-2 text-sm">
            // AI-powered resume optimization tailored to job positions
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Resume Display Section */}
          <div className="bg-black/60 backdrop-blur-lg border-2 border-cyan-500/30 shadow-lg shadow-cyan-500/20 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black font-mono text-cyan-400 flex items-center">
                <span className="text-fuchsia-400 mr-2">{'>'}</span> CURRENT RESUME
              </h2>
              <button
                type="button"
                onClick={() => router.push("/profile")}
                className="text-sm font-mono font-bold text-cyan-400 hover:text-fuchsia-400 transition-colors uppercase"
              >
                {'>'} UPLOAD DIFFERENT
              </button>
            </div>

            {resumeData ? (
              <div className="space-y-4">
                <div className="border-2 border-cyan-500/30 p-4 bg-black/40">
                  <div className="flex items-start space-x-4">
                    <div className="shrink-0">
                      <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-fuchsia-500 flex items-center justify-center border-2 border-cyan-400">
                        <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold font-mono text-emerald-300 mb-1">
                        {resumeData.fileName}
                      </h3>
                      <p className="text-sm text-emerald-300/60 font-mono">
                        {resumeData.mimeType}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Resume Preview */}
                <div className="border-2 border-cyan-500/30 p-4 bg-black/40">
                  <h4 className="text-sm font-bold font-mono text-emerald-300 mb-3 flex items-center">
                    <span className="text-fuchsia-400 mr-2">{'>'}</span> RESUME PREVIEW
                  </h4>
                  <div className="bg-black/60 p-4 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-cyan-500/50 scrollbar-track-transparent">
                    <pre className="text-sm text-emerald-200 whitespace-pre-wrap font-mono">
                      {resumeText || 'Loading resume content...'}
                    </pre>
                  </div>
                  <p className="text-xs text-emerald-300/60 font-mono mt-2">
                    // This resume will be analyzed and customized for the job
                  </p>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-cyan-500/30 p-8 text-center bg-black/20">
                <svg className="w-16 h-16 text-cyan-400/60 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <p className="text-emerald-300 font-mono mb-2 text-lg font-bold">
                  {'>'} NO RESUME FOUND
                </p>
                <p className="text-emerald-300/60 font-mono mb-4 text-sm">
                  // Please upload your resume first
                </p>
                <button
                  type="button"
                  onClick={() => router.push("/profile")}
                  className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-black font-mono font-bold uppercase border-2 border-cyan-400 hover:from-fuchsia-500 hover:to-cyan-500 transition-all shadow-lg shadow-cyan-500/30 transform hover:scale-105"
                >
                  UPLOAD RESUME
                </button>
              </div>
            )}
          </div>

          {/* Job Description Section */}
          <div className="bg-black/60 backdrop-blur-lg border-2 border-cyan-500/30 shadow-lg shadow-cyan-500/20 p-6">
            <div className="mb-4">
              <label className="block text-lg font-black font-mono text-cyan-400 mb-2 flex items-center">
                <span className="text-fuchsia-400 mr-2">{'>'}</span> JOB DESCRIPTION <span className="text-red-400 ml-2">*</span>
              </label>
              <p className="text-sm text-emerald-300/60 font-mono mb-4">
                // Paste the job description you want to target
              </p>
            </div>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the complete job description here...

Example:
We are looking for a Senior Software Engineer with 5+ years of experience in React, Node.js, and AWS. The ideal candidate will have strong experience in building scalable web applications..."
              rows={12}
              required
              className="w-full px-4 py-3 bg-black/40 border-2 border-cyan-500/30 focus:border-fuchsia-500 focus:outline-none text-emerald-200 font-mono text-sm resize-none scrollbar-thin scrollbar-thumb-cyan-500/50 scrollbar-track-transparent"
              style={{ boxShadow: '0 0 20px rgba(6, 182, 212, 0.1)' }}
            />
            <p className="text-xs text-emerald-300/60 font-mono mt-2">
              // Include all requirements, responsibilities, and qualifications
            </p>
          </div>

          {/* Custom Instructions Section */}
          <div className="bg-black/60 backdrop-blur-lg border-2 border-cyan-500/30 shadow-lg shadow-cyan-500/20 p-6">
            <div className="mb-4">
              <label className="block text-lg font-black font-mono text-cyan-400 mb-2 flex items-center">
                <span className="text-fuchsia-400 mr-2">{'>'}</span> CUSTOM INSTRUCTIONS <span className="text-emerald-300/40 ml-2">(OPTIONAL)</span>
              </label>
              <p className="text-sm text-emerald-300/60 font-mono mb-4">
                // Add specific instructions for customization
              </p>
            </div>
            <textarea
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder="Example instructions:
- Highlight my experience with microservices architecture
- Emphasize leadership and team management skills
- Focus on my AWS certifications
- Keep it to one page
- Use action verbs"
              rows={8}
              className="w-full px-4 py-3 bg-black/40 border-2 border-cyan-500/30 focus:border-fuchsia-500 focus:outline-none text-emerald-200 font-mono text-sm resize-none scrollbar-thin scrollbar-thumb-cyan-500/50 scrollbar-track-transparent"
              style={{ boxShadow: '0 0 20px rgba(6, 182, 212, 0.1)' }}
            />
            <p className="text-xs text-emerald-300/60 font-mono mt-2">
              // Be specific about what to emphasize or de-emphasize
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center gap-4 flex-wrap">
            <button
              type="button"
              onClick={handleTestAgents}
              disabled={testing || !jobDescription.trim()}
              className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-black font-mono font-bold uppercase border-2 border-emerald-400 hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg shadow-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transform hover:scale-105"
            >
              {testing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-black border-t-transparent"></div>
                  <span>TESTING...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                  </svg>
                  <span>TEST AGENTS</span>
                </>
              )}
            </button>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className="px-8 py-3 border-2 border-cyan-500/50 text-cyan-300 font-mono font-bold uppercase hover:bg-cyan-500/10 transition-all"
              >
                CANCEL
              </button>
              <button
                type="submit"
                disabled={submitting || !resumeData}
                className="px-8 py-3 bg-gradient-to-r from-fuchsia-500 to-cyan-500 text-black font-mono font-black uppercase tracking-wider shadow-lg shadow-fuchsia-500/50 hover:shadow-fuchsia-500/80 transition-all duration-300 transform hover:scale-105 border-2 border-fuchsia-400 hover:border-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-black border-t-transparent"></div>
                    <span>PROCESSING...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>CUSTOMIZE RESUME</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Test Results Display */}
        {testResults && (
          <div className="mt-8 bg-black/60 backdrop-blur-lg border-2 border-cyan-500/30 shadow-lg shadow-cyan-500/20 p-6">
            <h2 className="text-2xl font-black font-mono text-cyan-400 mb-6 flex items-center">
              <span className="text-fuchsia-400 mr-2">{'>'}</span> AGENT TEST RESULTS
            </h2>

            {testResults.errors && testResults.errors.length > 0 && (
              <div className="mb-6 p-4 bg-red-500/10 border-2 border-red-500/50">
                <h3 className="text-red-300 font-bold font-mono mb-2 flex items-center">
                  <span className="text-red-400 mr-2">{'>'}</span> ERRORS
                </h3>
                {testResults.errors.map((error: string, idx: number) => (
                  <p key={idx} className="text-red-300 text-sm font-mono">{error}</p>
                ))}
              </div>
            )}

            {/* JD Analysis Results */}
            {testResults.jd_analysis && (
              <div className="mb-6 p-6 bg-cyan-500/10 border-2 border-cyan-500/50">
                <h3 className="text-xl font-black font-mono text-cyan-300 mb-4 flex items-center">
                  <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  JD ANALYZER RESULTS
                </h3>
                <div className="space-y-3 text-sm font-mono">
                  <div>
                    <span className="font-bold text-emerald-300">JOB TITLE:</span>
                    <span className="ml-2 text-cyan-200">{testResults.jd_analysis.job_title}</span>
                  </div>
                  <div>
                    <span className="font-bold text-emerald-300">EXPERIENCE LEVEL:</span>
                    <span className="ml-2 text-cyan-200">{testResults.jd_analysis.experience_level}</span>
                  </div>
                  <div>
                    <span className="font-bold text-emerald-300">KEY REQUIREMENTS:</span>
                    <ul className="mt-2 ml-6 list-disc text-cyan-200">
                      {testResults.jd_analysis.key_requirements.map((req: string, idx: number) => (
                        <li key={idx}>{req}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <span className="font-bold text-emerald-300">REQUIRED SKILLS:</span>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {testResults.jd_analysis.required_skills.map((skill: string, idx: number) => (
                        <span key={idx} className="px-3 py-1 bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-black text-xs font-bold uppercase border border-cyan-400">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Resume Analysis Results */}
            {testResults.resume_analysis && (
              <div className="p-6 bg-emerald-500/10 border-2 border-emerald-500/50">
                <h3 className="text-xl font-black font-mono text-emerald-300 mb-4 flex items-center">
                  <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  RESUME ANALYZER (GPT-4o-mini)
                </h3>
                <div className="space-y-3 text-sm font-mono">
                  <div>
                    <span className="font-bold text-cyan-300">FORMAT:</span>
                    <span className="ml-2 text-emerald-200">{testResults.resume_analysis.format_type}</span>
                  </div>
                  <div>
                    <span className="font-bold text-cyan-300">CURRENT SKILLS:</span>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {testResults.resume_analysis.current_skills.map((skill: string, idx: number) => (
                        <span key={idx} className="px-3 py-1 bg-gradient-to-r from-emerald-500 to-emerald-600 text-black text-xs font-bold uppercase border border-emerald-400">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="font-bold text-cyan-300">PROJECTS:</span>
                    <ul className="mt-2 ml-6 list-disc text-emerald-200">
                      {testResults.resume_analysis.projects.map((proj: string, idx: number) => (
                        <li key={idx}>{proj}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
