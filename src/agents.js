const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Standard agent profiles with official SVG icons from @lobehub/icons-static-svg.
 */
const AGENT_PROFILES = [
  {
    id: 'claude',
    name: 'Claude Code',
    binary: 'claude',
    defaultArgs: [],
    color: '#D97757',
    gradient: 'linear-gradient(135deg, rgba(217, 119, 87, 0.2), rgba(180, 83, 9, 0.1))',
    category: 'ai-agent',
    description: "Anthropic's official CLI coding agent with tool use",
    icon: `<svg viewBox="0 0 24 24" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><title>Claude</title><path d="M4.709 15.955l4.72-2.647.08-.23-.08-.128H9.2l-.79-.048-2.698-.073-2.339-.097-2.266-.122-.571-.121L0 11.784l.055-.352.48-.321.686.06 1.52.103 2.278.158 1.652.097 2.449.255h.389l.055-.157-.134-.098-.103-.097-2.358-1.596-2.552-1.688-1.336-.972-.724-.491-.364-.462-.158-1.008.656-.722.881.06.225.061.893.686 1.908 1.476 2.491 1.833.365.304.145-.103.019-.073-.164-.274-1.355-2.446-1.446-2.49-.644-1.032-.17-.619a2.97 2.97 0 01-.104-.729L6.283.134 6.696 0l.996.134.42.364.62 1.414 1.002 2.229 1.555 3.03.456.898.243.832.091.255h.158V9.01l.128-1.706.237-2.095.23-2.695.08-.76.376-.91.747-.492.584.28.48.685-.067.444-.286 1.851-.559 2.903-.364 1.942h.212l.243-.242.985-1.306 1.652-2.064.73-.82.85-.904.547-.431h1.033l.76 1.129-.34 1.166-1.064 1.347-.881 1.142-1.264 1.7-.79 1.36.073.11.188-.02 2.856-.606 1.543-.28 1.841-.315.833.388.091.395-.328.807-1.969.486-2.309.462-3.439.813-.042.03.049.061 1.549.146.662.036h1.622l3.02.225.79.522.474.638-.079.485-1.215.62-1.64-.389-3.829-.91-1.312-.329h-.182v.11l1.093 1.068 2.006 1.81 2.509 2.33.127.578-.322.455-.34-.049-2.205-1.657-.851-.747-1.926-1.62h-.128v.17l.444.649 2.345 3.521.122 1.08-.17.353-.608.213-.668-.122-1.374-1.925-1.415-2.167-1.143-1.943-.14.08-.674 7.254-.316.37-.729.28-.607-.461-.322-.747.322-1.476.389-1.924.315-1.53.286-1.9.17-.632-.012-.042-.14.018-1.434 1.967-2.18 2.945-1.726 1.845-.414.164-.717-.37.067-.662.401-.589 2.388-3.036 1.44-1.882.93-1.086-.006-.158h-.055L4.132 18.56l-1.13.146-.487-.456.061-.746.231-.243 1.908-1.312-.006.006z" fill="#D97757" fill-rule="nonzero"/></svg>`
  },
  {
    id: 'agy',
    name: 'Antigravity CLI',
    binary: 'agy',
    defaultArgs: [],
    color: '#A855F7',
    gradient: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(126, 34, 206, 0.1))',
    category: 'ai-agent',
    description: 'Google DeepMind Antigravity CLI coding assistant (agy)',
    icon: `<svg viewBox="0 0 24 24" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><title>Antigravity CLI</title><path d="M21.751 22.607c1.34 1.005 3.35.335 1.508-1.508C17.73 15.74 18.904 1 12.037 1 5.17 1 6.342 15.74.815 21.1c-2.01 2.009.167 2.511 1.507 1.506 5.192-3.517 4.857-9.714 9.715-9.714 4.857 0 4.522 6.197 9.714 9.715z" fill="#A855F7" fill-rule="evenodd"/></svg>`
  },
  {
    id: 'codex',
    name: 'Codex CLI',
    binary: 'codex',
    defaultArgs: [],
    color: '#10B981',
    gradient: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(5, 150, 105, 0.1))',
    category: 'ai-agent',
    description: 'OpenAI-powered terminal code generator and assistant',
    icon: `<svg viewBox="0 0 24 24" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><title>Codex</title><path clip-rule="evenodd" d="M8.086.457a6.105 6.105 0 013.046-.415c1.333.153 2.521.72 3.564 1.7a.117.117 0 00.107.029c1.408-.346 2.762-.224 4.061.366l.063.03.154.076c1.357.703 2.33 1.77 2.918 3.198.278.679.418 1.388.421 2.126a5.655 5.655 0 01-.18 1.631.167.167 0 00.04.155 5.982 5.982 0 011.578 2.891c.385 1.901-.01 3.615-1.183 5.14l-.182.22a6.063 6.063 0 01-2.934 1.851.162.162 0 00-.108.102c-.255.736-.511 1.364-.987 1.992-1.199 1.582-2.962 2.462-4.948 2.451-1.583-.008-2.986-.587-4.21-1.736a.145.145 0 00-.14-.032c-.518.167-1.04.191-1.604.185a5.924 5.924 0 01-2.595-.622 6.058 6.058 0 01-2.146-1.781c-.203-.269-.404-.522-.551-.821a7.74 7.74 0 01-.495-1.283 6.11 6.11 0 01-.017-3.064.166.166 0 00.008-.074.115.115 0 00-.037-.064 5.958 5.958 0 01-1.38-2.202 5.196 5.196 0 01-.333-1.589 6.915 6.915 0 01.188-2.132c.45-1.484 1.309-2.648 2.577-3.493.282-.188.55-.334.802-.438.286-.12.573-.22.861-.304a.129.129 0 00.087-.087A6.016 6.016 0 015.635 2.31C6.315 1.464 7.132.846 8.086.457zm-.804 7.85a.848.848 0 00-1.473.842l1.694 2.965-1.688 2.848a.849.849 0 001.46.864l1.94-3.272a.849.849 0 00.007-.854l-1.94-3.393zm5.446 6.24a.849.849 0 000 1.695h4.848a.849.849 0 000-1.696h-4.848z" fill="#10B981" fill-rule="evenodd"/></svg>`
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
    icon: `<svg viewBox="0 0 24 24" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><title>OpenCode</title><path d="M16 6H8v12h8V6zm4 16H4V2h16v20z" fill="#38BDF8" fill-rule="evenodd"/></svg>`
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
    icon: `<svg viewBox="0 0 24 24" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><title>GitHub Copilot</title><path d="M19.245 5.364c1.322 1.36 1.877 3.216 2.11 5.817.622 0 1.2.135 1.592.654l.73.964c.21.278.323.61.323.955v2.62c0 .339-.173.669-.453.868C20.239 19.602 16.157 21.5 12 21.5c-4.6 0-9.205-2.583-11.547-4.258-.28-.2-.452-.53-.453-.868v-2.62c0-.345.113-.679.321-.956l.73-.963c.392-.517.974-.654 1.593-.654l.029-.297c.25-2.446.81-4.213 2.082-5.52 2.461-2.54 5.71-2.851 7.146-2.864h.198c1.436.013 4.685.323 7.146 2.864zm-7.244 4.328c-.284 0-.613.016-.962.05-.123.447-.305.85-.57 1.108-1.05 1.023-2.316 1.18-2.994 1.18-.638 0-1.306-.13-1.851-.464-.516.165-1.012.403-1.044.996a65.882 65.882 0 00-.063 2.884l-.002.48c-.002.563-.005 1.126-.013 1.69.002.326.204.63.51.765 2.482 1.102 4.83 1.657 6.99 1.657 2.156 0 4.504-.555 6.985-1.657a.854.854 0 00.51-.766c.03-1.682.006-3.372-.076-5.053-.031-.596-.528-.83-1.046-.996-.546.333-1.212.464-1.85.464-.677 0-1.942-.157-2.993-1.18-.266-.258-.447-.661-.57-1.108-.32-.032-.64-.049-.96-.05zm-2.525 4.013c.539 0 .976.426.976.95v1.753c0 .525-.437.95-.976.95a.964.964 0 01-.976-.95v-1.752c0-.525.437-.951.976-.951zm5 0c.539 0 .976.426.976.95v1.753c0 .525-.437.95-.976.95a.964.964 0 01-.976-.95v-1.752c0-.525.437-.951.976-.951z" fill="#818CF8"/></svg>`
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    binary: 'deepseek',
    defaultArgs: [],
    color: '#4D6BFE',
    gradient: 'linear-gradient(135deg, rgba(77, 107, 254, 0.2), rgba(37, 99, 235, 0.1))',
    category: 'ai-agent',
    description: 'DeepSeek AI reasoning and coding terminal assistant',
    icon: `<svg viewBox="0 0 24 24" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><title>DeepSeek</title><path d="M23.748 4.482c-.254-.124-.364.113-.512.234-.051.039-.094.09-.137.136-.372.397-.806.657-1.373.626-.829-.046-1.537.214-2.163.848-.133-.782-.575-1.248-1.247-1.548-.352-.156-.708-.311-.955-.65-.172-.241-.219-.51-.305-.774-.055-.16-.11-.323-.293-.35-.2-.031-.278.136-.356.276-.313.572-.434 1.202-.422 1.84.027 1.436.633 2.58 1.838 3.393.137.093.172.187.129.323-.082.28-.18.552-.266.833-.055.179-.137.217-.329.14a5.526 5.526 0 01-1.736-1.18c-.857-.828-1.631-1.742-2.597-2.458a11.365 11.365 0 00-.689-.471c-.985-.957.13-1.743.388-1.836.27-.098.093-.432-.779-.428-.872.004-1.67.295-2.687.684a3.055 3.055 0 01-.465.137 9.597 9.597 0 00-2.883-.102c-1.885.21-3.39 1.102-4.497 2.623C.082 8.606-.231 10.684.152 12.85c.403 2.284 1.569 4.175 3.36 5.653 1.858 1.533 3.997 2.284 6.438 2.14 1.482-.085 3.133-.284 4.994-1.86.47.234.962.327 1.78.397.63.059 1.236-.03 1.705-.128.735-.156.684-.837.419-.961-2.155-1.004-1.682-.595-2.113-.926 1.096-1.296 2.746-2.642 3.392-7.003.05-.347.007-.565 0-.845-.004-.17.035-.237.23-.256a4.173 4.173 0 001.545-.475c1.396-.763 1.96-2.015 2.093-3.517.02-.23-.004-.467-.247-.588z" fill="#4D6BFE"/></svg>`
  },
  {
    id: 'pi',
    name: 'Pi Assistant',
    binary: 'pi',
    defaultArgs: [],
    color: '#22C55E',
    gradient: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(21, 128, 61, 0.1))',
    category: 'ai-agent',
    description: 'Inflection AI Pi personal intelligence assistant CLI',
    icon: `<svg viewBox="0 0 24 24" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><title>Pi</title><path clip-rule="evenodd" d="M1 1h16.5v11H12v5.5H6.5V23H1V1zm5.5 5.5V12H12V6.5H6.5z" fill="#22C55E"/><path d="M17.5 12H23v11h-5.5V12z" fill="#22C55E"/></svg>`
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
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="#F87171" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 4 14h7v8l9-12h-7z"/></svg>`
  },
  {
    id: 'bash',
    name: 'Bash Shell',
    binary: 'bash',
    defaultArgs: [],
    color: '#94A3B8',
    gradient: 'linear-gradient(135deg, rgba(148, 163, 184, 0.2), rgba(71, 85, 105, 0.1))',
    category: 'shell',
    description: 'Interactive system shell terminal (Linux/macOS/Git Bash)',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>`
  },
  {
    id: 'powershell',
    name: 'PowerShell',
    binary: process.platform === 'win32' ? 'powershell.exe' : 'pwsh',
    defaultArgs: process.platform === 'win32' ? ['-NoLogo'] : [],
    color: '#0078D4',
    gradient: 'linear-gradient(135deg, rgba(0, 120, 212, 0.2), rgba(37, 99, 235, 0.1))',
    category: 'shell',
    description: 'Windows PowerShell / PowerShell Core terminal session',
    icon: `<svg viewBox="0 0 24 24" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><title>PowerShell</title><path d="M21.162 2.656a2.868 2.868 0 00-2.316-.656H5.154A2.867 2.867 0 002.3 4.846L.046 19.154A2.867 2.867 0 002.89 22h15.956a2.868 2.868 0 002.846-2.433l2.258-14.308a2.867 2.867 0 00-.788-2.603zM5.316 7.618l5.297 3.53-5.297 3.532-.977-1.464 3.1-2.068-3.1-2.066.977-1.464zm10.368 8.764H8.842v-1.752h6.842v1.752z" fill="#0078D4"/></svg>`
  },
  {
    id: 'cmd',
    name: 'Command Prompt',
    binary: 'cmd.exe',
    defaultArgs: [],
    color: '#38BDF8',
    gradient: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(30, 41, 59, 0.1))',
    category: 'shell',
    description: 'Windows Command Prompt (cmd.exe) session',
    icon: `<svg viewBox="0 0 24 24" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><title>Command Prompt</title><rect width="22" height="18" x="1" y="3" rx="3" fill="#0F172A" stroke="#475569" stroke-width="1.5"/><path d="M5 8l4 3.5L5 15" stroke="#38BDF8" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><line x1="12" y1="15" x2="18" y2="15" stroke="#38BDF8" stroke-width="1.8" stroke-linecap="round"/></svg>`
  }
];

/**
 * Check if a command is executable and find its path.
 */
function findExecutable(binaryName) {
  try {
    const isWindows = process.platform === 'win32';
    if (isWindows) {
      if (binaryName === 'cmd' || binaryName === 'cmd.exe') {
        const comspec = process.env.COMSPEC || path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'cmd.exe');
        if (fs.existsSync(comspec)) return comspec;
      }
      if (binaryName === 'powershell' || binaryName === 'powershell.exe') {
        const sysRoot = process.env.SystemRoot || 'C:\\Windows';
        const psPath = path.join(sysRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
        if (fs.existsSync(psPath)) return psPath;
      }
      if (binaryName === 'pwsh' || binaryName === 'pwsh.exe') {
        const pwshPaths = [
          path.join(process.env['ProgramFiles'] || 'C:\\Program Files', 'PowerShell', '7', 'pwsh.exe'),
          path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'PowerShell', '7', 'pwsh.exe')
        ];
        for (const p of pwshPaths) {
          if (fs.existsSync(p)) return p;
        }
      }
    }

    const checkCmd = isWindows ? `where ${binaryName}` : `which ${binaryName}`;
    const output = execSync(checkCmd, {
      stdio: ['pipe', 'pipe', 'ignore'],
      encoding: 'utf8',
      env: process.env
    }).trim();
    if (output) {
      return output.split(/\r?\n/)[0].trim();
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
 * Determine default shell agent based on OS platform.
 */
function getDefaultShellAgentId() {
  if (process.platform === 'win32') {
    if (findExecutable('powershell.exe') || findExecutable('powershell') || findExecutable('pwsh')) {
      return 'powershell';
    }
    return 'cmd';
  }
  return 'bash';
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
  // Alias deprecated or alternative names to official agy profile
  let targetId = agentIdOrCommand;
  if (targetId === 'gemini' || targetId === 'antigravity') {
    targetId = 'agy';
  }

  // Windows fallback: if bash was requested but is not installed, route to native PowerShell or cmd
  if (process.platform === 'win32' && targetId === 'bash') {
    const hasBash = !!findExecutable('bash');
    if (!hasBash) {
      targetId = getDefaultShellAgentId();
    }
  }

  const profile = AGENT_PROFILES.find(p => p.id === targetId || p.binary === targetId);
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
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>`,
    isInstalled: !!execPath,
    executablePath: execPath || agentIdOrCommand
  };
}

module.exports = {
  AGENT_PROFILES,
  detectAgents,
  getAgentProfile,
  getDefaultShellAgentId,
  findExecutable
};
