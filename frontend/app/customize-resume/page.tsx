"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Header from "@/components/Header";

type AgentStatus = 'pending' | 'running' | 'complete' | 'error';

interface AgentStates {
  system: AgentStatus;
  jd_analyzer: AgentStatus;
  resume_parser: AgentStatus;
  github_fetcher: AgentStatus;
  ats_validator: AgentStatus;
  suggestion_generator: AgentStatus;
}

interface Suggestion {
  type: string;
  priority: 'high' | 'medium' | 'low';
  suggestion: string;
  reason: string;
  where?: string;
  original?: string;
  suggested?: string;
}

interface Suggestions {
  summary: string;
  ats_score: number;
  priority_changes: Suggestion[];
  missing_keywords: string[];
  github_projects_to_add: any[];
}

export default function CustomizeResumePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [credits, setCredits] = useState(0);
  const [resumeData, setResumeData] = useState<{
    fileName: string;
    content: string;
    mimeType: string;
  } | null>(null);
  const [resumeText, setResumeText] = useState("");

  const [jobDescription, setJobDescription] = useState("");
  const [companyName, setCompanyName] = useState("");

  // Agent progress state (5 agents + system check)
  const [currentPhase, setCurrentPhase] = useState(0);
  const [currentMessage, setCurrentMessage] = useState("");
  const [agents, setAgents] = useState<AgentStates>({
    system: 'pending',
    jd_analyzer: 'pending',
    resume_parser: 'pending',
    github_fetcher: 'pending',
    ats_validator: 'pending',
    suggestion_generator: 'pending'
  });

  // Results state
  const [suggestions, setSuggestions] = useState<Suggestions | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.push("/login");
      return;
    }
    fetchUserData();
  }, [router]);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");

      // Get user info
      const userResponse = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (userResponse.ok) {
        const userData = await userResponse.json();
        setUserId(userData.user.id);
        setCredits(userData.user.credits || 0);
      }

      // Get resume
      const response = await fetch("/api/resume/get", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.resume) {
          setResumeData(data.resume);
          if (data.resume.mimeType === 'application/pdf') {
            setResumeText('[PDF Resume - ' + data.resume.fileName + ']\n\nYour resume will be analyzed by AI.');
          } else {
            try {
              const decoded = atob(data.resume.content);
              setResumeText(decoded);
            } catch (e) {
              setResumeText('Resume uploaded: ' + data.resume.fileName);
            }
          }
        }
      } else if (response.status !== 404) {
        console.error("Failed to fetch resume:", await response.text());
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
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

    if (!userId) {
      alert("User not authenticated. Please refresh and try again.");
      return;
    }

    if (credits < 1) {
      alert("Insufficient credits. You need at least 1 credit to generate resume suggestions.");
      return;
    }

    setProcessing(true);
    setError(null);
    setSuggestions(null);

    // Reset agents to pending
    setAgents({
      system: 'pending',
      jd_analyzer: 'pending',
      resume_parser: 'pending',
      github_fetcher: 'pending',
      ats_validator: 'pending',
      suggestion_generator: 'pending'
    });
    setCurrentPhase(0);
    setCurrentMessage("Initializing AI agents...");

    try {
      const response = await fetch("http://localhost:8000/api/resume/suggest-stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: userId,
          job_description: jobDescription,
          company_name: companyName || extractCompanyName(jobDescription),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to start suggestion generation");
      }

      // Handle SSE stream
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Failed to get response stream");
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (!data) continue;

            try {
              const event = JSON.parse(data);
              handleSSEEvent(event);
            } catch (e) {
              console.error('Failed to parse SSE event:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error:", error);
      setError(error instanceof Error ? error.message : "Failed to generate suggestions");
      setProcessing(false);
    }
  };

  const handleSSEEvent = (event: any) => {
    console.log('SSE Event:', event);

    switch (event.type) {
      case 'progress':
        setCurrentPhase(event.phase);
        setCurrentMessage(event.message);
        // Mark current agent as running
        const agentMap: { [key: number]: keyof AgentStates } = {
          0: 'system',
          1: 'jd_analyzer',
          2: 'resume_parser',
          3: 'github_fetcher',
          4: 'ats_validator',
          5: 'suggestion_generator'
        };
        const currentAgent = agentMap[event.phase];
        if (currentAgent) {
          setAgents(prev => ({ ...prev, [currentAgent]: 'running' }));
        }
        break;

      case 'phase_complete':
        setCurrentPhase(event.phase);
        setCurrentMessage(event.message);
        // Mark agent as complete
        const phaseAgentMap: { [key: number]: keyof AgentStates } = {
          0: 'system',
          1: 'jd_analyzer',
          2: 'resume_parser',
          3: 'github_fetcher',
          4: 'ats_validator',
          5: 'suggestion_generator'
        };
        const completedAgent = phaseAgentMap[event.phase];
        if (completedAgent) {
          setAgents(prev => ({ ...prev, [completedAgent]: 'complete' }));
        }
        break;

      case 'warning':
        console.warn('Warning:', event.message);
        break;

      case 'info':
        // Credit deduction info
        console.log('Info:', event.message);
        // Refresh credits
        fetchUserData();
        break;

      case 'complete':
        setCurrentPhase(5);
        setCurrentMessage("All agents completed successfully!");
        setSuggestions(event.suggestions);
        setProcessing(false);
        // Refresh credits
        fetchUserData();
        break;

      case 'error':
        setError(event.message);
        setProcessing(false);
        // Mark current agent as error
        const errorAgent = Object.keys(agents).find(key => agents[key as keyof AgentStates] === 'running');
        if (errorAgent) {
          setAgents(prev => ({ ...prev, [errorAgent as keyof AgentStates]: 'error' }));
        }
        break;
    }
  };

  const extractCompanyName = (jd: string): string => {
    const match = jd.match(/(?:at|@|for)\s+([A-Z][a-zA-Z\s&]+?)(?:\n|,|\.|$)/);
    return match ? match[1].trim() : "Company";
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-400 border-red-500';
      case 'medium': return 'text-yellow-400 border-yellow-500';
      case 'low': return 'text-emerald-400 border-emerald-500';
      default: return 'text-cyan-400 border-cyan-500';
    }
  };

  const getPriorityBg = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500/10';
      case 'medium': return 'bg-yellow-500/10';
      case 'low': return 'bg-emerald-500/10';
      default: return 'bg-cyan-500/10';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black relative overflow-hidden">
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
      {/* Background effects */}
      <div className="absolute inset-0" style={{
        backgroundImage: `linear-gradient(rgba(0, 255, 65, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 65, 0.03) 1px, transparent 1px)`,
        backgroundSize: '50px 50px'
      }}></div>

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500 rounded-full mix-blend-screen filter blur-3xl opacity-10 animate-pulse"></div>
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-fuchsia-500 rounded-full mix-blend-screen filter blur-3xl opacity-10 animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-1/4 left-1/2 w-96 h-96 bg-emerald-500 rounded-full mix-blend-screen filter blur-3xl opacity-10 animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="absolute inset-0 pointer-events-none opacity-5">
        <div className="h-full w-full" style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 255, 65, 0.1) 2px, rgba(0, 255, 65, 0.1) 4px)'
        }}></div>
      </div>

      <Header />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-emerald-400 drop-shadow-[0_0_30px_rgba(34,211,238,0.5)]">
              {'<'} RESUME SUGGESTIONS {'>'}
            </h1>
            <p className="text-emerald-300 font-mono mt-2 text-sm">
              // AI-powered resume suggestions with 5 specialized agents
            </p>
          </div>
          <div className="bg-black/60 border-2 border-cyan-500/30 px-6 py-3">
            <p className="text-cyan-400 font-mono font-bold text-sm">CREDITS: <span className="text-fuchsia-400 text-xl">{credits}</span></p>
          </div>
        </div>

        {/* Show suggestions if completed */}
        {suggestions ? (
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-black/60 backdrop-blur-lg border-2 border-cyan-500/30 shadow-lg shadow-cyan-500/20 p-6">
              <h2 className="text-2xl font-black font-mono text-cyan-400 mb-4 flex items-center">
                <span className="text-fuchsia-400 mr-2">{'>'}</span> AI ANALYSIS SUMMARY
              </h2>
              <p className="text-emerald-200 font-mono text-sm mb-4">{suggestions.summary}</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-black/40 border-2 border-cyan-500/30 p-4 text-center">
                  <p className="text-cyan-400 font-mono text-sm mb-2">ATS SCORE</p>
                  <p className="text-4xl font-black font-mono text-fuchsia-400">{suggestions.ats_score.toFixed(1)}%</p>
                </div>
                <div className="bg-black/40 border-2 border-yellow-500/30 p-4 text-center">
                  <p className="text-yellow-400 font-mono text-sm mb-2">SUGGESTIONS</p>
                  <p className="text-4xl font-black font-mono text-yellow-300">{suggestions.priority_changes.length}</p>
                </div>
                <div className="bg-black/40 border-2 border-red-500/30 p-4 text-center">
                  <p className="text-red-400 font-mono text-sm mb-2">MISSING KEYWORDS</p>
                  <p className="text-4xl font-black font-mono text-red-300">{suggestions.missing_keywords.length}</p>
                </div>
              </div>
            </div>

            {/* Priority Suggestions */}
            <div className="bg-black/60 backdrop-blur-lg border-2 border-cyan-500/30 shadow-lg shadow-cyan-500/20 p-6">
              <h2 className="text-2xl font-black font-mono text-cyan-400 mb-6 flex items-center">
                <span className="text-fuchsia-400 mr-2">{'>'}</span> PRIORITY CHANGES
              </h2>
              <div className="space-y-4">
                {suggestions.priority_changes.map((change, idx) => (
                  <div key={idx} className={`border-2 ${getPriorityColor(change.priority)} ${getPriorityBg(change.priority)} p-4`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <span className={`text-2xl font-bold font-mono ${getPriorityColor(change.priority).split(' ')[0]}`}>
                          #{idx + 1}
                        </span>
                        <div>
                          <span className={`text-xs font-bold font-mono ${getPriorityColor(change.priority).split(' ')[0]} uppercase`}>
                            {change.priority} PRIORITY
                          </span>
                          <p className="text-sm font-mono text-emerald-300/60 mt-1">
                            Type: {change.type.replace(/_/g, ' ')}
                          </p>
                        </div>
                      </div>
                      {change.where && (
                        <span className="text-xs font-mono text-cyan-400 bg-black/40 px-3 py-1 border border-cyan-500/30">
                          {change.where}
                        </span>
                      )}
                    </div>

                    <p className="text-emerald-200 font-mono text-sm mb-3">
                      <span className="text-fuchsia-400 mr-2">{'>'}</span>
                      {change.suggestion}
                    </p>

                    <p className="text-emerald-300/60 font-mono text-xs mb-3">
                      <span className="text-cyan-400">Reason:</span> {change.reason}
                    </p>

                    {change.original && change.suggested && (
                      <div className="space-y-2 mt-4">
                        <div className="bg-black/40 border-l-4 border-red-500 p-3">
                          <p className="text-red-400 font-mono text-xs mb-1">BEFORE:</p>
                          <p className="text-emerald-200 font-mono text-sm">{change.original}</p>
                        </div>
                        <div className="bg-black/40 border-l-4 border-emerald-500 p-3">
                          <p className="text-emerald-400 font-mono text-xs mb-1">SUGGESTED:</p>
                          <p className="text-emerald-200 font-mono text-sm">{change.suggested}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Missing Keywords */}
            {suggestions.missing_keywords.length > 0 && (
              <div className="bg-black/60 backdrop-blur-lg border-2 border-red-500/30 shadow-lg shadow-red-500/20 p-6">
                <h2 className="text-2xl font-black font-mono text-red-400 mb-4 flex items-center">
                  <span className="text-fuchsia-400 mr-2">{'>'}</span> MISSING KEYWORDS
                </h2>
                <p className="text-emerald-300/60 font-mono text-sm mb-4">
                  // Add these keywords to improve ATS score
                </p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.missing_keywords.map((keyword, idx) => (
                    <span key={idx} className="bg-red-500/10 border border-red-500/50 text-red-300 px-3 py-1 font-mono text-sm">
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* GitHub Projects */}
            {suggestions.github_projects_to_add.length > 0 && (
              <div className="bg-black/60 backdrop-blur-lg border-2 border-emerald-500/30 shadow-lg shadow-emerald-500/20 p-6">
                <h2 className="text-2xl font-black font-mono text-emerald-400 mb-4 flex items-center">
                  <span className="text-fuchsia-400 mr-2">{'>'}</span> RECOMMENDED GITHUB PROJECTS
                </h2>
                <p className="text-emerald-300/60 font-mono text-sm mb-4">
                  // Consider adding these projects to your resume
                </p>
                <div className="space-y-3">
                  {suggestions.github_projects_to_add.map((project: any, idx: number) => (
                    <div key={idx} className="bg-black/40 border-2 border-emerald-500/30 p-4">
                      <h3 className="text-lg font-bold font-mono text-emerald-300 mb-2">{project.name}</h3>
                      <p className="text-sm text-emerald-200/80 font-mono mb-2">{project.description}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {project.tech_stack?.map((tech: string, techIdx: number) => (
                          <span key={techIdx} className="bg-emerald-500/10 border border-emerald-500/50 text-emerald-300 px-2 py-1 font-mono text-xs">
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-between items-center gap-4">
              <button
                type="button"
                onClick={() => {
                  setSuggestions(null);
                  setJobDescription("");
                  setCompanyName("");
                }}
                className="px-8 py-3 border-2 border-cyan-500/50 text-cyan-300 font-mono font-bold uppercase hover:bg-cyan-500/10 transition-all"
              >
                NEW ANALYSIS
              </button>
              <button
                type="button"
                onClick={() => router.push("/profile")}
                className="px-8 py-3 bg-gradient-to-r from-fuchsia-500 to-cyan-500 text-black font-mono font-black uppercase tracking-wider shadow-lg shadow-fuchsia-500/50 hover:shadow-fuchsia-500/80 transition-all duration-300 transform hover:scale-105 border-2 border-fuchsia-400 hover:border-cyan-400"
              >
                EDIT RESUME
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Show agent progress if processing */}
            {processing && (
              <div className="mb-8 bg-black/60 backdrop-blur-lg border-2 border-cyan-500/30 shadow-lg shadow-cyan-500/20 p-6">
                <h2 className="text-2xl font-black font-mono text-cyan-400 mb-6 flex items-center">
                  <span className="text-fuchsia-400 mr-2">{'>'}</span> AI AGENTS PROCESSING
                </h2>
                <div className="space-y-4">
                  {Object.entries(agents).map(([agent, status]) => (
                    <div key={agent} className="flex items-center space-x-4">
                      <div className="w-8 h-8 flex items-center justify-center">
                        {status === 'pending' && <span className="text-2xl text-gray-500">⏳</span>}
                        {status === 'running' && <div className="animate-spin rounded-full h-6 w-6 border-4 border-cyan-500 border-t-transparent"></div>}
                        {status === 'complete' && <span className="text-2xl">✅</span>}
                        {status === 'error' && <span className="text-2xl">❌</span>}
                      </div>
                      <div className="flex-1">
                        <p className="text-emerald-300 font-mono font-bold">{agent.replace(/_/g, ' ').toUpperCase()}</p>
                        {status === 'running' && <p className="text-cyan-400 font-mono text-sm">{currentMessage}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Show error if any */}
            {error && (
              <div className="mb-8 bg-red-500/10 border-2 border-red-500 p-6">
                <div className="flex items-center space-x-3">
                  <span className="text-3xl">❌</span>
                  <div>
                    <h3 className="text-red-300 font-mono font-bold text-lg">ERROR</h3>
                    <p className="text-red-200 font-mono text-sm mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Form - hidden when processing */}
            {!processing && (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Resume Display */}
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

                {/* Company Name */}
                <div className="bg-black/60 backdrop-blur-lg border-2 border-cyan-500/30 shadow-lg shadow-cyan-500/20 p-6">
                  <label className="block text-lg font-black font-mono text-cyan-400 mb-2 flex items-center">
                    <span className="text-fuchsia-400 mr-2">{'>'}</span> COMPANY NAME <span className="text-emerald-300/40 ml-2">(OPTIONAL)</span>
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g., TechCorp, Google, Microsoft..."
                    className="w-full px-4 py-3 bg-black/40 border-2 border-cyan-500/30 focus:border-fuchsia-500 focus:outline-none text-emerald-200 font-mono text-sm"
                    style={{ boxShadow: '0 0 20px rgba(6, 182, 212, 0.1)' }}
                  />
                  <p className="text-xs text-emerald-300/60 font-mono mt-2">
                    // Will be auto-extracted from job description if not provided
                  </p>
                </div>

                {/* Job Description */}
                <div className="bg-black/60 backdrop-blur-lg border-2 border-cyan-500/30 shadow-lg shadow-cyan-500/20 p-6">
                  <label className="block text-lg font-black font-mono text-cyan-400 mb-2 flex items-center">
                    <span className="text-fuchsia-400 mr-2">{'>'}</span> JOB DESCRIPTION <span className="text-red-400 ml-2">*</span>
                  </label>
                  <p className="text-sm text-emerald-300/60 font-mono mb-4">
                    // Paste the complete job description here
                  </p>
                  <textarea
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Paste the complete job description here...

Example:
We are looking for a Senior Software Engineer with 5+ years of experience in React, Node.js, and AWS..."
                    rows={12}
                    required
                    className="w-full px-4 py-3 bg-black/40 border-2 border-cyan-500/30 focus:border-fuchsia-500 focus:outline-none text-emerald-200 font-mono text-sm resize-none scrollbar-thin scrollbar-thumb-cyan-500/50 scrollbar-track-transparent"
                    style={{ boxShadow: '0 0 20px rgba(6, 182, 212, 0.1)' }}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between items-center gap-4">
                  <button
                    type="button"
                    onClick={() => router.push("/dashboard")}
                    className="px-8 py-3 border-2 border-cyan-500/50 text-cyan-300 font-mono font-bold uppercase hover:bg-cyan-500/10 transition-all"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    disabled={!resumeData || credits < 1}
                    className="px-8 py-3 bg-gradient-to-r from-fuchsia-500 to-cyan-500 text-black font-mono font-black uppercase tracking-wider shadow-lg shadow-fuchsia-500/50 hover:shadow-fuchsia-500/80 transition-all duration-300 transform hover:scale-105 border-2 border-fuchsia-400 hover:border-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>GET SUGGESTIONS (1 CREDIT)</span>
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
