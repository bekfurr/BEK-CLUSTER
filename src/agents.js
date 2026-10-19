const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Standard agent profiles with descriptions, colors, and SVG icons.
 */
const AGENT_PROFILES = [
  {
    id: 'claude',
    name: 'Claude Code',
    binary: 'claude',
    defaultArgs: [],
    color: '#D97706',
    gradient: 'linear-gradient(135deg, #F59E0B, #D97706)',
    category: 'ai-agent',
    description: 'Anthropic\'s official CLI coding agent with tool use',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg>`
  },
  {
    id: 'antigravity',
    name: 'Antigravity',
    binary: 'antigravity',
    defaultArgs: [],
    color: '#8B5CF6',
    gradient: 'linear-gradient(135deg, #A855F7, #7C3AED)',
    category: 'ai-agent',
    description: 'Google DeepMind advanced agentic coding assistant',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/><path d="m14.83 14.83 4.24 4.24"/><path d="m9.17 14.83-4.24 4.24"/><circle cx="12" cy="12" r="4"/></svg>`
  },
  {
    id: 'codex',
    name: 'Codex CLI',
    binary: 'codex',
    defaultArgs: [],
    color: '#10B981',
    gradient: 'linear-gradient(135deg, #34D399, #059669)',
    category: 'ai-agent',
    description: 'OpenAI-powered terminal code generator and assistant',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="m9 8 6 4-6 4"/></svg>`
  },
  {
    id: 'opencode',
    name: 'OpenCode',
    binary: 'opencode',
    defaultArgs: [],
    color: '#06B6D4',
    gradient: 'linear-gradient(135deg, #22D3EE, #0891B2)',
    category: 'ai-agent',
    description: 'Open-source autonomous AI coding agent for developers',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`
  },
  {
    id: 'gemini',
    name: 'Gemini CLI',
    binary: 'gemini',
    defaultArgs: [],
    color: '#3B82F6',
    gradient: 'linear-gradient(135deg, #60A5FA, #2563EB)',
    category: 'ai-agent',
    description: 'Google Gemini terminal assistant for CLI workflows',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15 9 22 12 15 15 12 22 9 15 2 12 9 9 12 2"/></svg>`
  },
  {
    id: 'copilot',
    name: 'GitHub Copilot',
    binary: 'copilot',
    defaultArgs: [],
    color: '#6366F1',
    gradient: 'linear-gradient(135deg, #818CF8, #4F46E5)',
    category: 'ai-agent',
    description: 'GitHub Copilot interactive CLI assistant',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3"/></svg>`
  },
  {
    id: 'crush',
    name: 'Crush CLI',
    binary: 'crush',
    defaultArgs: [],
    color: '#EF4444',
    gradient: 'linear-gradient(135deg, #F87171, #DC2626)',
    category: 'ai-agent',
    description: 'Crush AI coding assistant',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>`
  },
  {
    id: 'pi',
    name: 'Pi Assistant',
    binary: 'pi',
    defaultArgs: [],
    color: '#EC4899',
    gradient: 'linear-gradient(135deg, #F472B6, #DB2777)',
    category: 'ai-agent',
    description: 'Pi personal AI agent CLI',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M9 7v10a3 3 0 0 0 3 3M15 7v10a3 3 0 0 1-3 3"/></svg>`
  },
  {
    id: 'bash',
    name: 'Bash Shell',
    binary: 'bash',
    defaultArgs: [],
    color: '#64748B',
    gradient: 'linear-gradient(135deg, #94A3B8, #475569)',
    category: 'shell',
    description: 'Interactive system shell terminal',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>`
  }
];

/**
 * Check if a command is executable and find its path.
 */
function findExecutable(binaryName) {
  try {
    const isWindows = process.platform === 'win32';
    const checkCmd = isWindows ? `where ${binaryName}` : `which ${binaryName}`;
    const output = execSync(checkCmd, {
      stdio: ['pipe', 'pipe', 'ignore'],
      encoding: 'utf8',
      env: process.env
    }).trim();
    if (output) {
      return output.split('\n')[0].trim();
    }
  } catch (err) {
    // Check common mise/user paths if not in standard which
    const homeDir = process.env.HOME || process.env.USERPROFILE || '';
    const candidates = [
      path.join(homeDir, '.local/bin', binaryName),
      path.join('/usr/local/bin', binaryName),
      path.join('/usr/bin', binaryName)
    ];
    for (const cand of candidates) {
      if (fs.existsSync(cand)) {
        try {
          fs.accessSync(cand, fs.constants.X_OK);
          return cand;
        } catch {
          // not executable
        }
      }
    }
  }
  return null;
}

/**
 * Scan system and return all agent profiles with their installation status.
 */
function detectAgents() {
  return AGENT_PROFILES.map(agent => {
    const executablePath = findExecutable(agent.binary);
    return {
      ...agent,
      isInstalled: !!executablePath,
      executablePath: executablePath || null
    };
  });
}

/**
 * Get profile for a specific agent ID or command.
 */
function getAgentProfile(agentIdOrCommand) {
  const profile = AGENT_PROFILES.find(p => p.id === agentIdOrCommand || p.binary === agentIdOrCommand);
  if (profile) {
    const execPath = findExecutable(profile.binary);
    return {
      ...profile,
      isInstalled: !!execPath,
      executablePath: execPath || profile.binary
    };
  }

  // Fallback for custom command
  const execPath = findExecutable(agentIdOrCommand);
  return {
    id: agentIdOrCommand,
    name: agentIdOrCommand.charAt(0).toUpperCase() + agentIdOrCommand.slice(1),
    binary: agentIdOrCommand,
    defaultArgs: [],
    color: '#38BDF8',
    gradient: 'linear-gradient(135deg, #38BDF8, #0284C7)',
    category: 'custom',
    description: `Custom command: ${agentIdOrCommand}`,
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>`,
    isInstalled: !!execPath,
    executablePath: execPath || agentIdOrCommand
  };
}

module.exports = {
  AGENT_PROFILES,
  detectAgents,
  getAgentProfile,
  findExecutable
};
