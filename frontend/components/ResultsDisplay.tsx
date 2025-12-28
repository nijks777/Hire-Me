"use client";

import { useState } from 'react';

interface ResultsDisplayProps {
  customizedResume: string;
  originalResume: string;
  atsScore: number;
  diffReport: {
    statistics: {
      lines_added: number;
      lines_removed: number;
      change_percentage: number;
    };
    changelog: {
      summary: string;
      projects_changes?: {
        removed: string[];
        added: string[];
        total_swapped: number;
      };
      experience_changes?: {
        entries_modified: number;
        bullets_reworded: number;
        keywords_added: string[];
      };
      key_improvements: string[];
    };
  };
  qaResults: {
    hallucination_check_passed: boolean;
    structure_preserved: boolean;
    overall_quality: string;
    issues_found: string[];
    warnings: string[];
  };
  matchedProjects?: any[];
  executionTime: number;
}

export default function ResultsDisplay({
  customizedResume,
  originalResume,
  atsScore,
  diffReport,
  qaResults,
  matchedProjects,
  executionTime
}: ResultsDisplayProps) {
  const [activeTab, setActiveTab] = useState<'customized' | 'original' | 'diff'>('customized');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(customizedResume);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([customizedResume], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customized-resume-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Success Header */}
      <div className="bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 border-2 border-emerald-500 p-6 backdrop-blur-lg">
        <div className="flex items-center space-x-4">
          <div className="text-5xl">✨</div>
          <div>
            <h2 className="text-2xl font-black font-mono text-emerald-300 mb-1">
              RESUME CUSTOMIZATION COMPLETE!
            </h2>
            <p className="text-cyan-300 font-mono text-sm">
              Processed in {executionTime.toFixed(2)}s by 9 AI agents
            </p>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* ATS Score */}
        <div className={`border-2 p-6 text-center ${atsScore >= 75 ? 'border-emerald-500 bg-emerald-500/10' : 'border-yellow-500 bg-yellow-500/10'}`}>
          <div className="text-4xl mb-2">{atsScore >= 75 ? '✅' : '⚠️'}</div>
          <div className="text-3xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-400 mb-2">
            {atsScore.toFixed(1)}%
          </div>
          <div className={`text-sm font-mono font-bold ${atsScore >= 75 ? 'text-emerald-300' : 'text-yellow-300'}`}>
            ATS SCORE {atsScore >= 75 ? 'PASSED' : 'NEEDS WORK'}
          </div>
          <div className="text-xs text-cyan-400/60 font-mono mt-1">
            Threshold: 75%
          </div>
        </div>

        {/* Quality Check */}
        <div className={`border-2 p-6 text-center ${qaResults.hallucination_check_passed ? 'border-emerald-500 bg-emerald-500/10' : 'border-red-500 bg-red-500/10'}`}>
          <div className="text-4xl mb-2">{qaResults.hallucination_check_passed ? '🔍' : '⚠️'}</div>
          <div className="text-2xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 mb-2">
            {qaResults.overall_quality.toUpperCase()}
          </div>
          <div className={`text-sm font-mono font-bold ${qaResults.hallucination_check_passed ? 'text-emerald-300' : 'text-red-300'}`}>
            QUALITY CHECK
          </div>
          <div className="text-xs text-cyan-400/60 font-mono mt-1">
            {qaResults.hallucination_check_passed ? 'No hallucinations' : 'Review needed'}
          </div>
        </div>

        {/* Changes Made */}
        <div className="border-2 border-fuchsia-500 bg-fuchsia-500/10 p-6 text-center">
          <div className="text-4xl mb-2">📊</div>
          <div className="text-3xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-emerald-400 mb-2">
            {diffReport.statistics.change_percentage.toFixed(0)}%
          </div>
          <div className="text-sm font-mono font-bold text-fuchsia-300">
            MODIFIED
          </div>
          <div className="text-xs text-cyan-400/60 font-mono mt-1">
            +{diffReport.statistics.lines_added} / -{diffReport.statistics.lines_removed} lines
          </div>
        </div>
      </div>

      {/* Key Improvements */}
      <div className="bg-black/60 border-2 border-cyan-500/30 p-6 backdrop-blur-lg">
        <h3 className="text-xl font-black font-mono text-cyan-400 mb-4 flex items-center">
          <span className="text-fuchsia-400 mr-2">{'>'}</span> KEY IMPROVEMENTS
        </h3>
        <div className="space-y-2">
          {diffReport.changelog.key_improvements.map((improvement, idx) => (
            <div key={idx} className="flex items-start space-x-3 p-3 bg-black/40 border-l-4 border-emerald-500">
              <span className="text-emerald-400 text-lg">✨</span>
              <span className="text-emerald-200 font-mono text-sm">{improvement}</span>
            </div>
          ))}
        </div>

        {diffReport.changelog.experience_changes && (
          <div className="mt-4 p-4 bg-cyan-500/10 border border-cyan-500/30">
            <div className="text-cyan-300 font-mono text-sm font-bold mb-2">EXPERIENCE CHANGES:</div>
            <div className="text-emerald-200 font-mono text-xs space-y-1">
              <div>• Entries modified: {diffReport.changelog.experience_changes.entries_modified}</div>
              <div>• Bullets reworded: {diffReport.changelog.experience_changes.bullets_reworded}</div>
              {diffReport.changelog.experience_changes.keywords_added.length > 0 && (
                <div className="mt-2">
                  <span className="text-fuchsia-300">Keywords added:</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {diffReport.changelog.experience_changes.keywords_added.map((keyword, idx) => (
                      <span key={idx} className="px-2 py-1 bg-gradient-to-r from-fuchsia-500 to-cyan-500 text-black text-xs font-bold uppercase">
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {diffReport.changelog.projects_changes && (
          <div className="mt-4 p-4 bg-fuchsia-500/10 border border-fuchsia-500/30">
            <div className="text-fuchsia-300 font-mono text-sm font-bold mb-2">PROJECT CHANGES:</div>
            <div className="text-emerald-200 font-mono text-xs">
              <div>• Total swapped: {diffReport.changelog.projects_changes.total_swapped}</div>
              {diffReport.changelog.projects_changes.added.length > 0 && (
                <div className="mt-2">
                  <span className="text-emerald-300">Added:</span>
                  <ul className="ml-4 mt-1 list-disc">
                    {diffReport.changelog.projects_changes.added.map((project, idx) => (
                      <li key={idx}>{project}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Resume Display Tabs */}
      <div className="bg-black/60 border-2 border-cyan-500/30 backdrop-blur-lg overflow-hidden">
        {/* Tab Headers */}
        <div className="flex border-b-2 border-cyan-500/30">
          <button
            onClick={() => setActiveTab('customized')}
            className={`flex-1 px-6 py-4 font-mono font-bold text-sm transition-all ${
              activeTab === 'customized'
                ? 'bg-gradient-to-r from-cyan-500/20 to-fuchsia-500/20 text-cyan-300 border-b-4 border-fuchsia-500'
                : 'text-cyan-400/50 hover:bg-cyan-500/5'
            }`}
          >
            {'>'} CUSTOMIZED RESUME
          </button>
          <button
            onClick={() => setActiveTab('original')}
            className={`flex-1 px-6 py-4 font-mono font-bold text-sm transition-all ${
              activeTab === 'original'
                ? 'bg-gradient-to-r from-cyan-500/20 to-fuchsia-500/20 text-cyan-300 border-b-4 border-fuchsia-500'
                : 'text-cyan-400/50 hover:bg-cyan-500/5'
            }`}
          >
            {'>'} ORIGINAL RESUME
          </button>
          <button
            onClick={() => setActiveTab('diff')}
            className={`flex-1 px-6 py-4 font-mono font-bold text-sm transition-all ${
              activeTab === 'diff'
                ? 'bg-gradient-to-r from-cyan-500/20 to-fuchsia-500/20 text-cyan-300 border-b-4 border-fuchsia-500'
                : 'text-cyan-400/50 hover:bg-cyan-500/5'
            }`}
          >
            {'>'} CHANGE SUMMARY
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'customized' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-black font-mono text-emerald-300">
                  CUSTOMIZED RESUME
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={handleCopy}
                    className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-black font-mono font-bold text-xs uppercase border border-cyan-400 hover:from-fuchsia-500 hover:to-cyan-500 transition-all"
                  >
                    {copied ? '✓ COPIED' : 'COPY'}
                  </button>
                  <button
                    onClick={handleDownload}
                    className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-black font-mono font-bold text-xs uppercase border border-emerald-400 hover:from-cyan-500 hover:to-emerald-500 transition-all"
                  >
                    DOWNLOAD
                  </button>
                </div>
              </div>
              <div className="bg-black/60 p-6 border border-cyan-500/30 max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-cyan-500/50 scrollbar-track-transparent">
                <pre className="text-sm text-emerald-200 whitespace-pre-wrap font-mono">
                  {customizedResume}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'original' && (
            <div>
              <h3 className="text-lg font-black font-mono text-cyan-400 mb-4">
                ORIGINAL RESUME
              </h3>
              <div className="bg-black/60 p-6 border border-cyan-500/30 max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-cyan-500/50 scrollbar-track-transparent">
                <pre className="text-sm text-cyan-200/60 whitespace-pre-wrap font-mono">
                  {originalResume}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'diff' && (
            <div className="space-y-4">
              <h3 className="text-lg font-black font-mono text-fuchsia-400 mb-4">
                CHANGE SUMMARY
              </h3>
              <div className="bg-black/40 p-4 border border-fuchsia-500/30">
                <p className="text-emerald-200 font-mono text-sm">{diffReport.changelog.summary}</p>
              </div>

              {qaResults.warnings.length > 0 && (
                <div className="bg-yellow-500/10 border-2 border-yellow-500/50 p-4">
                  <h4 className="text-yellow-300 font-mono font-bold mb-2">⚠️ WARNINGS ({qaResults.warnings.length})</h4>
                  {qaResults.warnings.map((warning, idx) => (
                    <p key={idx} className="text-yellow-200 text-sm font-mono mt-1">• {warning}</p>
                  ))}
                </div>
              )}

              {qaResults.issues_found.length > 0 && (
                <div className="bg-red-500/10 border-2 border-red-500/50 p-4">
                  <h4 className="text-red-300 font-mono font-bold mb-2">❌ ISSUES ({qaResults.issues_found.length})</h4>
                  {qaResults.issues_found.map((issue, idx) => (
                    <p key={idx} className="text-red-200 text-sm font-mono mt-1">• {issue}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center gap-4">
        <button
          onClick={handleDownload}
          className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-cyan-500 text-black font-mono font-black uppercase text-lg border-2 border-emerald-400 hover:from-cyan-500 hover:to-emerald-500 transition-all shadow-lg shadow-emerald-500/50 transform hover:scale-105"
        >
          DOWNLOAD RESUME
        </button>
        <button
          onClick={() => window.location.reload()}
          className="px-8 py-4 border-2 border-cyan-500 text-cyan-300 font-mono font-black uppercase text-lg hover:bg-cyan-500/10 transition-all"
        >
          CUSTOMIZE ANOTHER
        </button>
      </div>
    </div>
  );
}
