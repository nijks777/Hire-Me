"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";

interface User {
  id: string;
  credits: number;
}

interface Generation {
  id: string;
  job_description: string;
  company_name: string;
  hr_name?: string;
  cover_letter: string;
  cold_email: string;
  created_at: string;
}

interface EditableGeneration extends Generation {
  editedCoverLetter?: string;
  editedColdEmail?: string;
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
      setEditedCoverLetter(selectedGeneration.cover_letter);
      setEditedColdEmail(selectedGeneration.cold_email);
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Generation History
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            View and manage your past document generations
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : generations.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="w-16 h-16 mx-auto mb-4 text-gray-400"
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
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              No generations yet
            </p>
            <button
              onClick={() => router.push("/generate")}
              className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-all"
            >
              Create Your First Generation
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Generations List */}
            <div className="lg:col-span-1 space-y-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                All Generations ({generations.length})
              </h2>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {generations.map((gen) => (
                  <div
                    key={gen.id}
                    onClick={() => setSelectedGeneration(gen)}
                    className={`p-4 rounded-lg cursor-pointer transition-all ${
                      selectedGeneration?.id === gen.id
                        ? "bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-500"
                        : "bg-white dark:bg-gray-800 border-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                  >
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                      {gen.company_name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {formatDate(gen.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Generation Details */}
            <div className="lg:col-span-2">
              {selectedGeneration ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                    <div className="flex items-start space-x-3">
                      <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
                          ✏️ Edit these documents as needed
                        </p>
                        <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                          Your changes aren't saved to history - make edits and then copy or download
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {selectedGeneration.company_name}
                      </h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Generated on {formatDate(selectedGeneration.created_at)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(selectedGeneration.id)}
                      className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-all"
                    >
                      Delete
                    </button>
                  </div>

                  {/* Job Description */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Job Description
                    </h3>
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg max-h-32 overflow-y-auto">
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {selectedGeneration.job_description}
                      </p>
                    </div>
                  </div>

                  {/* Cover Letter - Editable */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Cover Letter (Editable)
                      </h3>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {editedCoverLetter.length} characters
                      </span>
                    </div>
                    <textarea
                      value={editedCoverLetter}
                      onChange={(e) => setEditedCoverLetter(e.target.value)}
                      rows={15}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white font-mono text-sm resize-none mb-3"
                      placeholder="Cover letter content..."
                    />
                    <div className="flex space-x-3">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(editedCoverLetter);
                          alert("Cover letter copied to clipboard!");
                        }}
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

                  {/* Cold Email - Editable */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Cold Email (Editable)
                      </h3>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {editedColdEmail.length} characters
                      </span>
                    </div>
                    <textarea
                      value={editedColdEmail}
                      onChange={(e) => setEditedColdEmail(e.target.value)}
                      rows={15}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white font-mono text-sm resize-none mb-3"
                      placeholder="Cold email content..."
                    />
                    <div className="flex space-x-3">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(editedColdEmail);
                          alert("Cold email copied to clipboard!");
                        }}
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
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-12 text-center">
                  <svg
                    className="w-16 h-16 mx-auto mb-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
                    />
                  </svg>
                  <p className="text-gray-600 dark:text-gray-400">
                    Select a generation to view details
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
