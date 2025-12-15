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
          // In production, you'd use a PDF parser library
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
        // No resume found - this is okay, user can upload one
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
        // For now, we'll just show success
        // Later this will trigger the multi-agent flow
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <Header />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-900 dark:text-white">Loading resume...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mb-4"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </button>

          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Customize Resume
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Tailor your resume for specific job positions with AI-powered optimization
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Resume Display Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Your Current Resume
              </h2>
              <button
                type="button"
                onClick={() => router.push("/profile")}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Upload Different Resume
              </button>
            </div>

            {resumeData ? (
              <div className="space-y-4">
                <div className="border-2 border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-700">
                  <div className="flex items-start space-x-4">
                    <div className="shrink-0">
                      <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                        {resumeData.fileName}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {resumeData.mimeType}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Resume Preview */}
                <div className="border-2 border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-800">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Resume Preview:</h4>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 max-h-96 overflow-y-auto">
                    <pre className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap font-mono">
                      {resumeText || 'Loading resume content...'}
                    </pre>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    ℹ️ This resume will be analyzed and customized based on the job description below
                  </p>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  No resume found. Please upload your resume first.
                </p>
                <button
                  type="button"
                  onClick={() => router.push("/profile")}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Upload Resume
                </button>
              </div>
            )}
          </div>

          {/* Job Description Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="mb-4">
              <label className="block text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Job Description <span className="text-red-500">*</span>
              </label>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Paste the job description you want to tailor your resume for
              </p>
            </div>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the complete job description here...&#10;&#10;Example:&#10;We are looking for a Senior Software Engineer with 5+ years of experience in React, Node.js, and AWS. The ideal candidate will have strong experience in building scalable web applications..."
              rows={12}
              required
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Tip: Include all requirements, responsibilities, and qualifications from the job posting
            </p>
          </div>

          {/* Custom Instructions Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="mb-4">
              <label className="block text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Custom Instructions <span className="text-gray-400">(Optional)</span>
              </label>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Add any specific instructions for how you want your resume customized
              </p>
            </div>
            <textarea
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder="Example instructions:&#10;- Highlight my experience with microservices architecture&#10;- Emphasize leadership and team management skills&#10;- Focus on my AWS certifications&#10;- Keep it to one page&#10;- Use action verbs"
              rows={8}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Tip: Be specific about what you want to emphasize or de-emphasize
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex justify-between items-center gap-4">
            <button
              type="button"
              onClick={handleTestAgents}
              disabled={testing || !jobDescription.trim()}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center space-x-2"
            >
              {testing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Testing Agents...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                  </svg>
                  <span>Test Agents</span>
                </>
              )}
            </button>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className="px-8 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !resumeData}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center space-x-2"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>Customize Resume</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Test Results Display */}
        {testResults && (
          <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Agent Test Results</h2>

            {testResults.errors && testResults.errors.length > 0 && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <h3 className="text-red-800 dark:text-red-200 font-semibold mb-2">Errors:</h3>
                {testResults.errors.map((error: string, idx: number) => (
                  <p key={idx} className="text-red-700 dark:text-red-300 text-sm">{error}</p>
                ))}
              </div>
            )}

            {/* JD Analysis Results */}
            {testResults.jd_analysis && (
              <div className="mb-6 p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <h3 className="text-xl font-semibold text-blue-900 dark:text-blue-100 mb-4 flex items-center">
                  <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  JD Analyzer Results
                </h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="font-semibold text-gray-700 dark:text-gray-300">Job Title:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">{testResults.jd_analysis.job_title}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700 dark:text-gray-300">Experience Level:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">{testResults.jd_analysis.experience_level}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700 dark:text-gray-300">Key Requirements:</span>
                    <ul className="mt-2 ml-6 list-disc text-gray-800 dark:text-gray-200">
                      {testResults.jd_analysis.key_requirements.map((req: string, idx: number) => (
                        <li key={idx}>{req}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700 dark:text-gray-300">Required Skills:</span>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {testResults.jd_analysis.required_skills.map((skill: string, idx: number) => (
                        <span key={idx} className="px-3 py-1 bg-blue-600 text-white text-xs rounded-full">
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
              <div className="p-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <h3 className="text-xl font-semibold text-green-900 dark:text-green-100 mb-4 flex items-center">
                  <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Resume Analyzer Results (GPT-4o-mini)
                </h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="font-semibold text-gray-700 dark:text-gray-300">Format:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">{testResults.resume_analysis.format_type}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700 dark:text-gray-300">Current Skills:</span>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {testResults.resume_analysis.current_skills.map((skill: string, idx: number) => (
                        <span key={idx} className="px-3 py-1 bg-green-600 text-white text-xs rounded-full">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700 dark:text-gray-300">Projects:</span>
                    <ul className="mt-2 ml-6 list-disc text-gray-800 dark:text-gray-200">
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
