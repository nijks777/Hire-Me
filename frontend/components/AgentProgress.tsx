"use client";

interface AgentStatusProps {
  name: string;
  description: string;
  status: 'pending' | 'running' | 'complete' | 'error';
  icon: string;
}

function AgentStatus({ name, description, status, icon }: AgentStatusProps) {
  const statusIcons = {
    pending: '⏳',
    running: '🔄',
    complete: '✅',
    error: '❌'
  };

  const statusColors = {
    pending: 'border-cyan-500/30 bg-black/20',
    running: 'border-fuchsia-500 bg-fuchsia-500/10 animate-pulse',
    complete: 'border-emerald-500 bg-emerald-500/10',
    error: 'border-red-500 bg-red-500/10'
  };

  const textColors = {
    pending: 'text-cyan-400/50',
    running: 'text-fuchsia-300',
    complete: 'text-emerald-300',
    error: 'text-red-300'
  };

  return (
    <div className={`p-4 border-2 ${statusColors[status]} transition-all duration-300`}>
      <div className="flex items-center space-x-3">
        <div className="text-2xl">{icon}</div>
        <div className="flex-1">
          <div className={`font-bold font-mono ${textColors[status]} flex items-center space-x-2`}>
            <span>{name}</span>
            <span className="text-lg">{statusIcons[status]}</span>
          </div>
          <div className={`text-xs font-mono mt-1 ${status === 'running' ? 'text-fuchsia-200' : 'text-cyan-400/50'}`}>
            {description}
          </div>
        </div>
      </div>
    </div>
  );
}

interface AgentProgressProps {
  currentPhase: number;
  currentMessage: string;
  agents: {
    jd_analyzer: 'pending' | 'running' | 'complete' | 'error';
    resume_parser: 'pending' | 'running' | 'complete' | 'error';
    github_fetcher: 'pending' | 'running' | 'complete' | 'error';
    project_matcher: 'pending' | 'running' | 'complete' | 'error';
    experience_optimizer: 'pending' | 'running' | 'complete' | 'error';
    resume_rebuilder: 'pending' | 'running' | 'complete' | 'error';
    ats_validator: 'pending' | 'running' | 'complete' | 'error';
    qa_agent: 'pending' | 'running' | 'complete' | 'error';
    diff_generator: 'pending' | 'running' | 'complete' | 'error';
  };
}

export default function AgentProgress({ currentPhase, currentMessage, agents }: AgentProgressProps) {
  const agentList = [
    {
      key: 'jd_analyzer' as const,
      name: 'JD Analyzer',
      description: 'Extracting tech stack & ATS keywords',
      icon: '📋'
    },
    {
      key: 'resume_parser' as const,
      name: 'Resume Parser',
      description: 'Parsing resume structure',
      icon: '📄'
    },
    {
      key: 'github_fetcher' as const,
      name: 'GitHub Fetcher',
      description: 'Fetching your repositories',
      icon: '🔗'
    },
    {
      key: 'project_matcher' as const,
      name: 'Project Matcher',
      description: 'Matching projects to job requirements',
      icon: '🎯'
    },
    {
      key: 'experience_optimizer' as const,
      name: 'Experience Optimizer',
      description: 'Optimizing experience with keywords',
      icon: '✨'
    },
    {
      key: 'resume_rebuilder' as const,
      name: 'Resume Rebuilder',
      description: 'Rebuilding customized resume',
      icon: '🔨'
    },
    {
      key: 'ats_validator' as const,
      name: 'ATS Validator',
      description: 'Validating ATS compatibility score',
      icon: '🎯'
    },
    {
      key: 'qa_agent' as const,
      name: 'QA Agent',
      description: 'Checking for hallucinations & quality',
      icon: '🔍'
    },
    {
      key: 'diff_generator' as const,
      name: 'Diff Generator',
      description: 'Generating change report',
      icon: '📊'
    }
  ];

  return (
    <div className="space-y-4">
      {/* Current Status Message */}
      <div className="bg-black/60 border-2 border-fuchsia-500/50 p-4 backdrop-blur-lg">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-fuchsia-500 border-t-transparent"></div>
          <div className="flex-1">
            <div className="text-fuchsia-300 font-mono font-bold text-sm">
              PHASE {currentPhase}/9
            </div>
            <div className="text-cyan-300 font-mono text-sm mt-1">
              {currentMessage || 'Initializing agents...'}
            </div>
          </div>
        </div>
      </div>

      {/* Agent Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {agentList.map((agent) => (
          <AgentStatus
            key={agent.key}
            name={agent.name}
            description={agent.description}
            status={agents[agent.key]}
            icon={agent.icon}
          />
        ))}
      </div>

      {/* Progress Bar */}
      <div className="bg-black/40 border-2 border-cyan-500/30 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-cyan-400 font-mono text-sm font-bold">OVERALL PROGRESS</span>
          <span className="text-fuchsia-400 font-mono text-sm font-bold">
            {Math.round((currentPhase / 9) * 100)}%
          </span>
        </div>
        <div className="w-full bg-black/60 border border-cyan-500/30 h-3 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 via-fuchsia-500 to-emerald-500 transition-all duration-500"
            style={{ width: `${(currentPhase / 9) * 100}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}
