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
    gradient: 'linear-gradient(135deg, rgba(217, 119, 6, 0.2), rgba(180, 83, 9, 0.1))',
    category: 'ai-agent',
    description: 'Anthropic\'s official CLI coding agent with tool use',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3z"/></svg>`
  },
  {
    id: 'antigravity',
    name: 'Antigravity',
    binary: 'antigravity',
    defaultArgs: [],
    color: '#8B5CF6',
    gradient: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(109, 40, 217, 0.1))',
    category: 'ai-agent',
    description: 'Google DeepMind advanced agentic coding assistant',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8" stroke-dasharray="2 4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2"/></svg>`
  },
  {
    id: 'codex',
    name: 'Codex CLI',
    binary: 'codex',
    defaultArgs: [],
    color: '#10B981',
    gradient: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.1))',
    category: 'ai-agent',
    description: 'OpenAI-powered terminal code generator and assistant',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="m9 10 3 2-3 2m5 0h2"/></svg>`
  },
  {
    id: 'opencode',
    name: 'OpenCode',
    binary: 'opencode',
    defaultArgs: [],
    color: '#38BDF8',
    gradient: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(2, 132, 199, 0.1))',
    category: 'ai-agent',
    description: 'Open-source autonomous AI coding agent for developers',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/></svg>`
  },
  {
    id: 'gemini',
    name: 'Gemini CLI',
    binary: 'gemini',
    defaultArgs: [],
    color: '#60A5FA',
    gradient: 'linear-gradient(135deg, rgba(96, 165, 250, 0.2), rgba(37, 99, 235, 0.1))',
    category: 'ai-agent',
    description: 'Google Gemini terminal assistant for CLI workflows',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C12 7.5 7.5 12 2 12c5.5 0 10 4.5 10 10 0-5.5 4.5-10 10-10-5.5 0-10-4.5-10-10z"/></svg>`
  },
  {
    id: 'copilot',
    name: 'GitHub Copilot',
    binary: 'copilot',
    defaultArgs: [],
    color: '#818CF8',
    gradient: 'linear-gradient(135deg, rgba(129, 140, 248, 0.2), rgba(79, 70, 229, 0.1))',
    category: 'ai-agent',
    description: 'GitHub Copilot interactive CLI assistant',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 18a4 4 0 0 0-8 0"/><circle cx="12" cy="11" r="3"/><path d="M12 2a8 8 0 0 0-8 8v3a4 4 0 0 0 4 4h8a4 4 0 0 0 4-4v-3a8 8 0 0 0-8-8z"/></svg>`
  },
  {
    id: 'crush',
    name: 'Crush CLI',
    binary: 'crush',
    defaultArgs: [],
    color: '#F87171',
    gradient: 'linear-gradient(135deg, rgba(248, 113, 113, 0.2), rgba(220, 38, 38, 0.1))',
    category: 'ai-agent',
    description: 'Crush AI coding assistant',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 4 14h7v8l9-12h-7z"/></svg>`
  },
  {
    id: 'pi',
    name: 'Pi Assistant',
    binary: 'pi',
    defaultArgs: [],
    color: '#F472B6',
    gradient: 'linear-gradient(135deg, rgba(244, 114, 182, 0.2), rgba(219, 39, 119, 0.1))',
    category: 'ai-agent',
    description: 'Pi personal AI agent CLI',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 7h14M9 7v10a2 2 0 0 0 2 2M15 7v10a2 2 0 0 1-2 2"/></svg>`
  },
  {
    id: 'bash',
    name: 'Bash Shell',
    binary: 'bash',
    defaultArgs: [],
    color: '#94A3B8',
    gradient: 'linear-gradient(135deg, rgba(148, 163, 184, 0.2), rgba(71, 85, 105, 0.1))',
    category: 'shell',
    description: 'Interactive system shell terminal',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m5 8 4 4-4 4m6 0h6"/></svg>`
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
    color: '#94A3B8',
    gradient: 'linear-gradient(135deg, rgba(148, 163, 184, 0.2), rgba(71, 85, 105, 0.1))',
    category: 'custom',
    description: `Custom command: ${agentIdOrCommand}`,
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m5 8 4 4-4 4m6 0h6"/></svg>`,
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
