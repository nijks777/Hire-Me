"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";

interface User {
  id: string;
  credits: number;
}

interface Suggestion {
  type: string;
  section: string;
  current: string;
  suggested: string;
  reasoning: string;
  impact: string;
}

interface Generation {
  id: string;
  job_description: string;
  company_name: string;
  hr_name?: string;
  generation_type: 'cover_letter' | 'cold_email' | 'resume_suggestions' | 'resume_customization';
  cover_letter?: string;
  cold_email?: string;
  resume_suggestions?: {
    summary: string;
    ats_score: number;
    priority_changes: Suggestion[];
    missing_keywords: string[];
    github_projects_to_add: any[];
    customized_resume?: string;
    diff_report?: any;
    qa_results?: any;
    matched_projects?: any[];
  };
  created_at: string;
}

export default function HistoryPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [selectedGeneration, setSelectedGeneration] = useState<Generation | null>(null);
  const [editedCoverLetter, setEditedCoverLetter] = useState("");
  const [editedColdEmail, setEditedColdEmail] = useState("");

  useEffect(() => {
    fetchUserData();
  }, []);

  useEffect(() => {
    if (user) {
      fetchGenerations();
    }
  }, [user]);

  useEffect(() => {
    if (selectedGeneration) {
      setEditedCoverLetter(selectedGeneration.cover_letter || "");
      setEditedColdEmail(selectedGeneration.cold_email || "");
    }
  }, [selectedGeneration]);

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

  const fetchGenerations = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const response = await fetch(
        `http://localhost:8000/api/generations?user_id=${user.id}`
      );

      if (response.ok) {
        const data = await response.json();
        setGenerations(data.generations);
      }
    } catch (error) {
      console.error("Failed to fetch generations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (generationId: string) => {
    if (!user) return;

    if (!confirm("Are you sure you want to delete this generation?")) {
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:8000/api/generations/${generationId}?user_id=${user.id}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        setGenerations((prev) => prev.filter((g) => g.id !== generationId));
        if (selectedGeneration?.id === generationId) {
          setSelectedGeneration(null);
        }
        alert("Generation deleted successfully");
      } else {
        alert("Failed to delete generation");
      }
    } catch (error) {
      console.error("Failed to delete generation:", error);
      alert("Failed to delete generation");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'cover_letter':
        return {
          label: 'COVER LETTER',
          bgColor: 'bg-cyan-500/20',
          borderColor: 'border-cyan-500/50',
          textColor: 'text-cyan-300'
        };
      case 'cold_email':
        return {
          label: 'COLD EMAIL',
          bgColor: 'bg-fuchsia-500/20',
          borderColor: 'border-fuchsia-500/50',
          textColor: 'text-fuchsia-300'
        };
      case 'resume_suggestions':
        return {
          label: 'RESUME SUGGESTIONS',
          bgColor: 'bg-emerald-500/20',
          borderColor: 'border-emerald-500/50',
          textColor: 'text-emerald-300'
        };
      case 'resume_customization':
        return {
          label: 'RESUME CUSTOMIZATION',
          bgColor: 'bg-yellow-500/20',
          borderColor: 'border-yellow-500/50',
          textColor: 'text-yellow-300'
        };
      default:
        return {
          label: 'DOCUMENT',
          bgColor: 'bg-gray-500/20',
          borderColor: 'border-gray-500/50',
          textColor: 'text-gray-300'
        };
    }
  };

  const handleDownloadPDF = (text: string, filename: string) => {
    const jsPDF = require("jspdf");
    const doc = new jsPDF.default();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const maxWidth = pageWidth - 2 * margin;

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(filename, margin, margin);

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
            {'<'} GENERATION HISTORY {'>'}
          </h1>
          <p className="text-emerald-300 font-mono mt-2 text-sm">
            // View and manage your past document generations
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-cyan-500 border-t-transparent mb-4"></div>
              <p className="text-cyan-400 font-mono font-bold">LOADING HISTORY<span className="animate-pulse">...</span></p>
            </div>
          </div>
        ) : generations.length === 0 ? (
          <div className="bg-black/60 backdrop-blur-lg border-2 border-cyan-500/30 shadow-lg shadow-cyan-500/20 p-12 text-center">
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
            <p className="text-emerald-300 font-mono mb-2 text-lg font-bold">
              {'>'} NO GENERATIONS YET
            </p>
            <p className="text-emerald-300/60 font-mono mb-6 text-sm">
              // Start by creating your first document
            </p>
            <button
              onClick={() => router.push("/generate")}
              className="px-8 py-3 bg-gradient-to-r from-fuchsia-500 to-cyan-500 text-black font-mono font-black uppercase tracking-wider shadow-lg shadow-fuchsia-500/50 hover:shadow-fuchsia-500/80 transition-all duration-300 transform hover:scale-105 border-2 border-fuchsia-400 hover:border-cyan-400"
            >
              CREATE FIRST GENERATION
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Generations List */}
            <div className="lg:col-span-1 space-y-3">
              <h2 className="text-lg font-black font-mono text-cyan-400 mb-4 flex items-center">
                <span className="text-fuchsia-400 mr-2">{'>'}</span> ALL GENERATIONS
                <span className="ml-2 px-2 py-1 bg-cyan-500/20 border border-cyan-500/50 text-xs">{generations.length}</span>
              </h2>
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-cyan-500/50 scrollbar-track-transparent">
                {generations.map((gen) => {
                  const badge = getTypeBadge(gen.generation_type);
                  return (
                    <div
                      key={gen.id}
                      onClick={() => setSelectedGeneration(gen)}
                      className={`p-4 cursor-pointer transition-all duration-300 border-2 ${selectedGeneration?.id === gen.id
                          ? "bg-gradient-to-r from-fuchsia-500/20 to-cyan-500/20 border-fuchsia-500 shadow-lg shadow-fuchsia-500/50"
                          : "bg-black/40 backdrop-blur-sm border-cyan-500/30 hover:border-cyan-500/60 hover:bg-black/60"
                        }`}
                    >
                      <div className={`inline-block px-2 py-0.5 ${badge.bgColor} border ${badge.borderColor} mb-2`}>
                        <span className={`text-xs font-mono font-bold ${badge.textColor}`}>
                          {badge.label}
                        </span>
                      </div>
                      <h3 className="font-bold font-mono text-cyan-300 truncate flex items-center">
                        <span className="text-fuchsia-400 mr-2">▸</span>
                        {gen.company_name}
                      </h3>
                      <p className="text-xs text-emerald-300/60 font-mono mt-1">
                        {formatDate(gen.created_at)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Generation Details */}
            <div className="lg:col-span-2">
              {selectedGeneration ? (
                <div className="bg-black/60 backdrop-blur-lg border-2 border-cyan-500/30 shadow-lg shadow-cyan-500/20 p-6">
                  {/* Info Banner - Only show for editable types */}
                  {selectedGeneration.generation_type !== 'resume_suggestions' && (
                    <div className="bg-cyan-500/10 border border-cyan-500/50 p-4 mb-6">
                      <div className="flex items-start space-x-3">
                        <svg className="w-5 h-5 text-cyan-400 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <div>
                          <p className="text-sm font-bold text-cyan-300 font-mono">
                            {'>'} EDIT MODE ENABLED
                          </p>
                          <p className="text-xs text-emerald-300/60 font-mono mt-1">
                            // Changes aren't saved to history - edit then copy or download
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Header with Delete */}
                  <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-cyan-500/30">
                    <div>
                      <h2 className="text-2xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-cyan-400">
                        {selectedGeneration.company_name}
                      </h2>
                      <p className="text-sm text-emerald-300/60 font-mono mt-1">
                        // Generated on {formatDate(selectedGeneration.created_at)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(selectedGeneration.id)}
                      className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white font-mono font-bold uppercase border-2 border-red-400 hover:from-red-600 hover:to-red-700 transition-all shadow-lg shadow-red-500/30 hover:shadow-red-500/50 transform hover:scale-105"
                    >
                      DELETE
                    </button>
                  </div>

                  {/* Job Description */}
                  <div className="mb-6">
                    <h3 className="text-lg font-black font-mono text-cyan-400 mb-2 flex items-center">
                      <span className="text-fuchsia-400 mr-2">{'>'}</span> JOB DESCRIPTION
                    </h3>
                    <div className="bg-black/40 border border-cyan-500/30 p-4 max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-cyan-500/50 scrollbar-track-transparent">
                      <p className="text-sm text-emerald-200 font-mono whitespace-pre-wrap">
                        {selectedGeneration.job_description}
                      </p>
                    </div>
                  </div>

                  {/* Conditional Content Based on Generation Type */}
                  {selectedGeneration.generation_type === 'cover_letter' && selectedGeneration.cover_letter && selectedGeneration.cover_letter.trim() !== '' && (
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-black font-mono text-cyan-400 flex items-center">
                          <span className="text-fuchsia-400 mr-2">{'>'}</span> COVER LETTER (EDITABLE)
                        </h3>
                        <span className="text-xs text-emerald-300/60 font-mono">
                          {editedCoverLetter.length} characters
                        </span>
                      </div>
                      <textarea
                        value={editedCoverLetter}
                        onChange={(e) => setEditedCoverLetter(e.target.value)}
                        rows={15}
                        className="w-full px-4 py-3 bg-black/40 border-2 border-cyan-500/30 focus:border-fuchsia-500 focus:outline-none text-emerald-200 font-mono text-sm resize-none mb-3 transition-colors scrollbar-thin scrollbar-thumb-cyan-500/50 scrollbar-track-transparent"
                        placeholder="Cover letter content..."
                        style={{
                          boxShadow: '0 0 20px rgba(6, 182, 212, 0.1)'
                        }}
                      />
                      <div className="flex space-x-3">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(editedCoverLetter);
                            alert("Cover letter copied to clipboard!");
                          }}
                          className="flex-1 py-2 px-4 bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-black font-mono font-bold uppercase border-2 border-cyan-400 hover:from-fuchsia-500 hover:to-cyan-500 transition-all shadow-lg shadow-cyan-500/30 hover:shadow-fuchsia-500/50 flex items-center justify-center space-x-2 transform hover:scale-105"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          <span>COPY</span>
                        </button>
                        <button
                          onClick={() => handleDownloadPDF(editedCoverLetter, "Cover_Letter")}
                          className="flex-1 py-2 px-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-black font-mono font-bold uppercase border-2 border-emerald-400 hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 flex items-center justify-center space-x-2 transform hover:scale-105"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span>PDF</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {selectedGeneration.generation_type === 'cold_email' && selectedGeneration.cold_email && selectedGeneration.cold_email.trim() !== '' && (
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-black font-mono text-cyan-400 flex items-center">
                          <span className="text-fuchsia-400 mr-2">{'>'}</span> COLD EMAIL (EDITABLE)
                        </h3>
                        <span className="text-xs text-emerald-300/60 font-mono">
                          {editedColdEmail.length} characters
                        </span>
                      </div>
                      <textarea
                        value={editedColdEmail}
                        onChange={(e) => setEditedColdEmail(e.target.value)}
                        rows={15}
                        className="w-full px-4 py-3 bg-black/40 border-2 border-cyan-500/30 focus:border-fuchsia-500 focus:outline-none text-emerald-200 font-mono text-sm resize-none mb-3 transition-colors scrollbar-thin scrollbar-thumb-cyan-500/50 scrollbar-track-transparent"
                        placeholder="Cold email content..."
                        style={{
                          boxShadow: '0 0 20px rgba(6, 182, 212, 0.1)'
                        }}
                      />
                      <div className="flex space-x-3">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(editedColdEmail);
                            alert("Cold email copied to clipboard!");
                          }}
                          className="flex-1 py-2 px-4 bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-black font-mono font-bold uppercase border-2 border-cyan-400 hover:from-fuchsia-500 hover:to-cyan-500 transition-all shadow-lg shadow-cyan-500/30 hover:shadow-fuchsia-500/50 flex items-center justify-center space-x-2 transform hover:scale-105"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          <span>COPY</span>
                        </button>
                        <button
                          onClick={() => handleDownloadPDF(editedColdEmail, "Cold_Email")}
                          className="flex-1 py-2 px-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-black font-mono font-bold uppercase border-2 border-emerald-400 hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 flex items-center justify-center space-x-2 transform hover:scale-105"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span>PDF</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Resume Suggestions Display */}
                  {selectedGeneration.generation_type === 'resume_suggestions' && selectedGeneration.resume_suggestions && (
                    <div className="space-y-6">
                      {/* ATS Score */}
                      <div className="bg-black/40 border-2 border-cyan-500/30 p-6">
                        <h3 className="text-lg font-black font-mono text-cyan-400 mb-4 flex items-center">
                          <span className="text-fuchsia-400 mr-2">{'>'}</span> ATS SCORE
                        </h3>
                        <div className="flex items-center space-x-4">
                          <div className="text-6xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                            {selectedGeneration.resume_suggestions.ats_score.toFixed(1)}%
                          </div>
                          <div className="flex-1">
                            <div className="w-full bg-black/60 border border-cyan-500/30 h-4 overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-500"
                                style={{ width: `${selectedGeneration.resume_suggestions.ats_score}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Summary */}
                      {selectedGeneration.resume_suggestions.summary && (
                        <div className="bg-black/40 border-2 border-cyan-500/30 p-6">
                          <h3 className="text-lg font-black font-mono text-cyan-400 mb-3 flex items-center">
                            <span className="text-fuchsia-400 mr-2">{'>'}</span> SUMMARY
                          </h3>
                          <p className="text-emerald-200 font-mono text-sm whitespace-pre-wrap">
                            {selectedGeneration.resume_suggestions.summary}
                          </p>
                        </div>
                      )}

                      {/* Priority Changes */}
                      {selectedGeneration.resume_suggestions.priority_changes && selectedGeneration.resume_suggestions.priority_changes.length > 0 && (
                        <div className="bg-black/40 border-2 border-cyan-500/30 p-6">
                          <h3 className="text-lg font-black font-mono text-cyan-400 mb-4 flex items-center">
                            <span className="text-fuchsia-400 mr-2">{'>'}</span> PRIORITY CHANGES
                            <span className="ml-2 px-2 py-1 bg-fuchsia-500/20 border border-fuchsia-500/50 text-xs">
                              {selectedGeneration.resume_suggestions.priority_changes.length}
                            </span>
                          </h3>
                          <div className="space-y-4">
                            {selectedGeneration.resume_suggestions.priority_changes.map((suggestion, idx) => (
                              <div key={idx} className="bg-black/60 border border-emerald-500/30 p-4">
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex items-center space-x-2">
                                    <span className="px-2 py-1 bg-emerald-500/20 border border-emerald-500/50 text-xs font-mono font-bold text-emerald-300">
                                      {suggestion.type || 'CHANGE'}
                                    </span>
                                    <span className="px-2 py-1 bg-cyan-500/20 border border-cyan-500/50 text-xs font-mono font-bold text-cyan-300">
                                      {suggestion.section}
                                    </span>
                                  </div>
                                  {suggestion.impact && (
                                    <span className="px-2 py-1 bg-fuchsia-500/20 border border-fuchsia-500/50 text-xs font-mono font-bold text-fuchsia-300">
                                      {suggestion.impact}
                                    </span>
                                  )}
                                </div>
                                {suggestion.current && (
                                  <div className="mb-2">
                                    <p className="text-xs font-mono text-red-400 mb-1">CURRENT:</p>
                                    <p className="text-sm font-mono text-emerald-200/60 bg-black/40 border border-red-500/30 p-2">
                                      {suggestion.current}
                                    </p>
                                  </div>
                                )}
                                {suggestion.suggested && (
                                  <div className="mb-2">
                                    <p className="text-xs font-mono text-emerald-400 mb-1">SUGGESTED:</p>
                                    <p className="text-sm font-mono text-emerald-200 bg-black/40 border border-emerald-500/30 p-2">
                                      {suggestion.suggested}
                                    </p>
                                  </div>
                                )}
                                {suggestion.reasoning && (
                                  <div>
                                    <p className="text-xs font-mono text-cyan-400 mb-1">REASONING:</p>
                                    <p className="text-sm font-mono text-emerald-200/80">
                                      {suggestion.reasoning}
                                    </p>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Missing Keywords */}
                      {selectedGeneration.resume_suggestions.missing_keywords && selectedGeneration.resume_suggestions.missing_keywords.length > 0 && (
                        <div className="bg-black/40 border-2 border-cyan-500/30 p-6">
                          <h3 className="text-lg font-black font-mono text-cyan-400 mb-3 flex items-center">
                            <span className="text-fuchsia-400 mr-2">{'>'}</span> MISSING KEYWORDS
                            <span className="ml-2 px-2 py-1 bg-cyan-500/20 border border-cyan-500/50 text-xs">
                              {selectedGeneration.resume_suggestions.missing_keywords.length}
                            </span>
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {selectedGeneration.resume_suggestions.missing_keywords.map((keyword, idx) => (
                              <span
                                key={idx}
                                className="px-3 py-1 bg-cyan-500/20 border border-cyan-500/50 text-cyan-300 font-mono text-sm"
                              >
                                {keyword}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* GitHub Projects to Add */}
                      {selectedGeneration.resume_suggestions.github_projects_to_add && selectedGeneration.resume_suggestions.github_projects_to_add.length > 0 && (
                        <div className="bg-black/40 border-2 border-cyan-500/30 p-6">
                          <h3 className="text-lg font-black font-mono text-cyan-400 mb-4 flex items-center">
                            <span className="text-fuchsia-400 mr-2">{'>'}</span> GITHUB PROJECTS TO ADD
                            <span className="ml-2 px-2 py-1 bg-emerald-500/20 border border-emerald-500/50 text-xs">
                              {selectedGeneration.resume_suggestions.github_projects_to_add.length}
                            </span>
                          </h3>
                          <div className="space-y-3">
                            {selectedGeneration.resume_suggestions.github_projects_to_add.map((project, idx) => (
                              <div key={idx} className="bg-black/60 border border-emerald-500/30 p-4">
                                <h4 className="font-bold font-mono text-emerald-300 mb-2">
                                  {project.name || `Project ${idx + 1}`}
                                </h4>
                                {project.description && (
                                  <p className="text-sm font-mono text-emerald-200/80 mb-2">
                                    {project.description}
                                  </p>
                                )}
                                {project.technologies && project.technologies.length > 0 && (
                                  <div className="flex flex-wrap gap-2">
                                    {project.technologies.map((tech: string, techIdx: number) => (
                                      <span
                                        key={techIdx}
                                        className="px-2 py-0.5 bg-fuchsia-500/20 border border-fuchsia-500/50 text-fuchsia-300 font-mono text-xs"
                                      >
                                        {tech}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Resume Customization Display */}
                  {selectedGeneration.generation_type === 'resume_customization' && selectedGeneration.resume_suggestions && (
                    <div className="space-y-6">
                      {/* Customized Resume */}
                      {selectedGeneration.resume_suggestions.customized_resume && (
                        <div className="mb-6">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-lg font-black font-mono text-cyan-400 flex items-center">
                              <span className="text-fuchsia-400 mr-2">{'>'}</span> CUSTOMIZED RESUME
                            </h3>
                            <span className="text-xs text-emerald-300/60 font-mono">
                              {selectedGeneration.resume_suggestions.customized_resume.length} characters
                            </span>
                          </div>
                          <textarea
                            value={selectedGeneration.resume_suggestions.customized_resume}
                            readOnly
                            rows={15}
                            className="w-full px-4 py-3 bg-black/40 border-2 border-cyan-500/30 focus:border-fuchsia-500 focus:outline-none text-emerald-200 font-mono text-sm resize-none mb-3 transition-colors scrollbar-thin scrollbar-thumb-cyan-500/50 scrollbar-track-transparent"
                            style={{
                              boxShadow: '0 0 20px rgba(6, 182, 212, 0.1)'
                            }}
                          />
                          <div className="flex space-x-3">
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(selectedGeneration.resume_suggestions?.customized_resume || '');
                                alert("Customized resume copied to clipboard!");
                              }}
                              className="flex-1 py-2 px-4 bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-black font-mono font-bold uppercase border-2 border-cyan-400 hover:from-fuchsia-500 hover:to-cyan-500 transition-all shadow-lg shadow-cyan-500/30 hover:shadow-fuchsia-500/50 flex items-center justify-center space-x-2 transform hover:scale-105"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              <span>COPY</span>
                            </button>
                            <button
                              onClick={() => handleDownloadPDF(selectedGeneration.resume_suggestions?.customized_resume || '', "Customized_Resume")}
                              className="flex-1 py-2 px-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-black font-mono font-bold uppercase border-2 border-emerald-400 hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 flex items-center justify-center space-x-2 transform hover:scale-105"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <span>PDF</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* ATS Score */}
                      {selectedGeneration.resume_suggestions.ats_score !== undefined && (
                        <div className="bg-black/40 border-2 border-cyan-500/30 p-6">
                          <h3 className="text-lg font-black font-mono text-cyan-400 mb-4 flex items-center">
                            <span className="text-fuchsia-400 mr-2">{'>'}</span> ATS SCORE
                          </h3>
                          <div className="flex items-center space-x-4">
                            <div className="text-6xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                              {selectedGeneration.resume_suggestions.ats_score.toFixed(1)}%
                            </div>
                            <div className="flex-1">
                              <div className="w-full bg-black/60 border border-cyan-500/30 h-4 overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-500"
                                  style={{ width: `${selectedGeneration.resume_suggestions.ats_score}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* QA Results */}
                      {selectedGeneration.resume_suggestions.qa_results && (
                        <div className="bg-black/40 border-2 border-cyan-500/30 p-6">
                          <h3 className="text-lg font-black font-mono text-cyan-400 mb-3 flex items-center">
                            <span className="text-fuchsia-400 mr-2">{'>'}</span> QUALITY ASSURANCE
                          </h3>
                          <pre className="text-emerald-200 font-mono text-sm whitespace-pre-wrap bg-black/40 border border-cyan-500/30 p-4 overflow-auto max-h-96 scrollbar-thin scrollbar-thumb-cyan-500/50 scrollbar-track-transparent">
                            {JSON.stringify(selectedGeneration.resume_suggestions.qa_results, null, 2)}
                          </pre>
                        </div>
                      )}

                      {/* Matched Projects */}
                      {selectedGeneration.resume_suggestions.matched_projects && selectedGeneration.resume_suggestions.matched_projects.length > 0 && (
                        <div className="bg-black/40 border-2 border-cyan-500/30 p-6">
                          <h3 className="text-lg font-black font-mono text-cyan-400 mb-4 flex items-center">
                            <span className="text-fuchsia-400 mr-2">{'>'}</span> MATCHED PROJECTS
                            <span className="ml-2 px-2 py-1 bg-emerald-500/20 border border-emerald-500/50 text-xs">
                              {selectedGeneration.resume_suggestions.matched_projects.length}
                            </span>
                          </h3>
                          <div className="space-y-3">
                            {selectedGeneration.resume_suggestions.matched_projects.map((project: any, idx: number) => (
                              <div key={idx} className="bg-black/60 border border-emerald-500/30 p-4">
                                <h4 className="font-bold font-mono text-emerald-300 mb-2">
                                  {project.name || `Project ${idx + 1}`}
                                </h4>
                                {project.description && (
                                  <p className="text-sm font-mono text-emerald-200/80 mb-2">
                                    {project.description}
                                  </p>
                                )}
                                {project.relevance_score !== undefined && (
                                  <p className="text-xs font-mono text-cyan-300 mb-2">
                                    Relevance: {project.relevance_score}%
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-black/60 backdrop-blur-lg border-2 border-cyan-500/30 shadow-lg shadow-cyan-500/20 p-12 text-center">
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
                      d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
                    />
                  </svg>
                  <p className="text-emerald-300 font-mono text-lg font-bold">
                    {'>'} SELECT A GENERATION
                  </p>
                  <p className="text-emerald-300/60 font-mono text-sm mt-2">
                    // Click on a generation to view details
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
