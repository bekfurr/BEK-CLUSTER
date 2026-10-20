const fs = require('fs');
const path = require('path');
const os = require('os');

function parseTokenCount(str) {
  if (!str) return 0;
  const clean = String(str).replace(/,/g, '').trim().toLowerCase();
  if (clean.endsWith('k')) {
    return Math.round(parseFloat(clean) * 1000) || 0;
  }
  if (clean.endsWith('m')) {
    return Math.round(parseFloat(clean) * 1000000) || 0;
  }
  return parseInt(clean, 10) || 0;
}

class UsageManager {
  constructor() {
    this.storageDir = path.join(os.homedir(), '.bek-cluster');
    this.storageFile = path.join(this.storageDir, 'usage-history.json');

    // In-memory runtime session tracking
    this.sessionModels = new Map(); // sessionId -> detected model name
    this.streamAccumulators = new Map(); // sessionId -> text buffer
    this.lastSniffedChars = new Map(); // sessionId -> character count already processed

    this.data = {
      totalTokens: 0,
      totalPromptTokens: 0,
      totalCompletionTokens: 0,
      models: {}, // modelName -> { totalTokens, promptTokens, completionTokens, count }
      agents: {}, // agentId -> { name, totalTokens, count }
      sessions: {} // sessionId -> { id, agentId, agentName, model, cwd, promptTokens, completionTokens, totalTokens, status, startedAt, lastActiveAt }
    };

    this.load();
  }

  /**
   * Load usage from file
   */
  load() {
    try {
      if (fs.existsSync(this.storageFile)) {
        const raw = fs.readFileSync(this.storageFile, 'utf8');
        const parsed = JSON.parse(raw);
        this.data = Object.assign(this.data, parsed);

        // Ensure sessions object exists (for backward compatibility)
        if (!this.data.sessions || typeof this.data.sessions !== 'object' || Array.isArray(this.data.sessions)) {
          this.data.sessions = {};
        }

        // Initialize session models map from saved sessions
        for (const [id, sess] of Object.entries(this.data.sessions)) {
          if (sess && sess.model) {
            this.sessionModels.set(id, sess.model);
          }
        }
      }
    } catch (e) {
      console.warn('[UsageManager] Could not load usage history:', e.message);
    }
  }

  /**
   * Save usage to file (throttled to avoid disk thrashing)
   */
  save() {
    if (this._saveTimeout) return;
    this._saveTimeout = setTimeout(() => {
      this._saveTimeout = null;
      try {
        if (!fs.existsSync(this.storageDir)) {
          fs.mkdirSync(this.storageDir, { recursive: true });
        }
        fs.writeFileSync(this.storageFile, JSON.stringify(this.data, null, 2), 'utf8');
      } catch (e) {
        console.warn('[UsageManager] Could not save usage history:', e.message);
      }
    }, 500);
  }

  /**
   * Fallback model guess by agent profile ID
   */
  getDefaultModel(agentId) {
    const map = {
      agy: 'agy/gemini-3.8-flash-high',
      claude: 'claude-3-7-sonnet',
      codex: 'openai/gpt-4o',
      opencode: 'opencode-v1',
      copilot: 'copilot/gpt-4o',
      deepseek: 'deepseek-v3',
      pi: 'pi-inflection',
      crush: 'crush-coder'
    };
    return map[agentId] || 'custom-model';
  }

  /**
   * Robust model detection from terminal stream text (ANSI stripped)
   */
  detectModelFromText(text) {
    if (!text || typeof text !== 'string') return null;

    // Strip ANSI codes
    const clean = text.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '').trim();

    // 1. Terminal billing/header line (e.g. "agy/gemini-3.8-flash-high · API Usage Billing" or "gemini-3.8-flash-high • Billing")
    const billingMatch = clean.match(/([a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)?)\s*[·•]\s*(?:API\s+Usage\s+Billing|Usage\s+Billing|Billing|Subscription)/i);
    if (billingMatch && billingMatch[1]) {
      return billingMatch[1].trim();
    }

    // 2. Quoted model statement (e.g. Model "agy/gemini-3.8-flash-high" isn't recognized)
    const quotedModel = clean.match(/Model\s+["']([a-zA-Z0-9_./-]+)["']/i);
    if (quotedModel && quotedModel[1]) {
      return quotedModel[1].trim();
    }

    // 3. Provider / Model slash format (e.g. "agy/gemini-3.8-flash-high", "openai/gpt-4o", "anthropic/claude-3-7-sonnet")
    const providerSlash = clean.match(/\b((?:agy|anthropic|openai|google|deepseek|meta|mistral|openrouter)\/[a-zA-Z0-9_.-]+)\b/i);
    if (providerSlash && providerSlash[1]) {
      return providerSlash[1].trim();
    }

    // 4. Explicit "model: <name>" or "using model: <name>"
    const explicitModel = clean.match(/(?:model|using\s+model|active\s+model)\s*[:=]\s*["']?([a-zA-Z0-9_./-]+)["']?/i);
    if (explicitModel && explicitModel[1]) {
      const candidate = explicitModel[1].trim();
      if (!/^(the|a|an|unknown|custom|default)$/i.test(candidate)) {
        return candidate;
      }
    }

    // 5. Standard model identifiers
    const knownModels = [
      /\b(gemini-[0-9][a-zA-Z0-9_.-]*)\b/i,
      /\b(claude-(?:3[.-][0-9][a-zA-Z0-9_.-]*|sonnet[a-zA-Z0-9_.-]*|opus[a-zA-Z0-9_.-]*|haiku[a-zA-Z0-9_.-]*))\b/i,
      /\b(gpt-[345][a-zA-Z0-9_.-]*)\b/i,
      /\b(o[134](?:-mini|-preview)?[a-zA-Z0-9_.-]*)\b/i,
      /\b(deepseek-(?:chat|coder|v[23][a-zA-Z0-9_.-]*|r[1-9][a-zA-Z0-9_.-]*))\b/i,
      /\b(agy-(?:flash|pro)[a-zA-Z0-9_.-]*)\b/i
    ];

    for (const regex of knownModels) {
      const m = clean.match(regex);
      if (m && m[1]) {
        return m[1].trim();
      }
    }

    return null;
  }

  /**
   * Sniff and parse token usage from PTY output chunks
   */
  sniffOutput(sessionId, agent, textChunk) {
    if (!textChunk || typeof textChunk !== 'string') return;

    // Guard: System shells never consume LLM tokens
    const agentCategory = agent?.profile?.category || agent?.category;
    const agentId = agent?.agentId || agent?.id;
    if (agentCategory === 'shell' || agentId === 'bash' || agentId === 'powershell' || agentId === 'cmd' || agentId === 'pwsh') {
      return;
    }

    // Accumulate history for context-aware model and token extraction
    let buf = (this.streamAccumulators.get(sessionId) || '') + textChunk;
    if (buf.length > 60000) {
      buf = buf.slice(-30000);
    }
    this.streamAccumulators.set(sessionId, buf);

    // 1. Detect Model
    let detectedModel = this.detectModelFromText(textChunk) || this.detectModelFromText(buf);
    if (!detectedModel) {
      detectedModel = this.sessionModels.get(sessionId) || this.getDefaultModel(agentId);
    }

    // 2. Detect Tokens
    let totalTokens = 0;
    let promptTokens = 0;
    let completionTokens = 0;
    let foundExplicitTokens = false;

    // Pattern 1: Antigravity / Gemini billing or parameter summary
    // e.g. "prompt_tokens: 1,234 ... completion_tokens: 567" or "input tokens: 1.2k ... output tokens: 300"
    // or reverse order: "1,250 prompt tokens, 450 completion tokens"
    const inOutMatch = textChunk.match(/(?:input|prompt|prompt_token_count)\s*tokens?[:=\s]+([0-9,.]+[km]?)[^\n\r]*(?:output|completion|candidates_token_count)\s*tokens?[:=\s]+([0-9,.]+[km]?)/i)
      || textChunk.match(/([0-9,.]+[km]?)\s*(?:input|prompt|prompt_token_count)\s*tokens?[^\n\r]*?([0-9,.]+[km]?)\s*(?:output|completion|candidates_token_count)\s*tokens?/i);
    if (inOutMatch) {
      promptTokens = parseTokenCount(inOutMatch[1]);
      completionTokens = parseTokenCount(inOutMatch[2]);
      totalTokens = promptTokens + completionTokens;
      foundExplicitTokens = true;
    }

    // Pattern 2: Claude Code style: "Tokens: 1,234 (input: 1,000, output: 234)" or "Tokens: 12.5k (in: 10k, out: 2.5k)"
    if (!foundExplicitTokens) {
      const claudeTokenMatch = textChunk.match(/Tokens?[:=\s]+([0-9,.]+[km]?)\s*\((?:in(?:put)?[:=\s]+([0-9,.]+[km]?),?\s*out(?:put)?[:=\s]+([0-9,.]+[km]?))\)/i);
      if (claudeTokenMatch) {
        totalTokens = parseTokenCount(claudeTokenMatch[1]);
        promptTokens = parseTokenCount(claudeTokenMatch[2]);
        completionTokens = parseTokenCount(claudeTokenMatch[3]);
        if (totalTokens === 0 && (promptTokens > 0 || completionTokens > 0)) {
          totalTokens = promptTokens + completionTokens;
        }
        foundExplicitTokens = true;
      }
    }

    // Pattern 3: Generic single total: "Total tokens: 1,234" or "1,700 total tokens" or "Tokens used: 12.4k"
    if (!foundExplicitTokens) {
      const singleMatch = textChunk.match(/(?:total\s*)?tokens?(?:\s*used)?[:=\s]+([0-9,.]+[km]?)/i)
        || textChunk.match(/([0-9,.]+[km]?)\s*total\s*tokens?/i);
      if (singleMatch) {
        totalTokens = parseTokenCount(singleMatch[1]);
        promptTokens = Math.round(totalTokens * 0.7);
        completionTokens = totalTokens - promptTokens;
        foundExplicitTokens = true;
      }
    }

    if (foundExplicitTokens && totalTokens > 0) {
      const currentSess = this.data.sessions[sessionId];
      const prevTotal = currentSess ? currentSess.totalTokens : 0;
      if (totalTokens > prevTotal) {
        const diffTotal = totalTokens - prevTotal;
        const diffPrompt = Math.max(0, promptTokens - (currentSess?.promptTokens || 0));
        const diffComp = Math.max(0, completionTokens - (currentSess?.completionTokens || 0));

        this.recordSessionUsage({
          sessionId,
          agent,
          model: detectedModel,
          promptTokens: diffPrompt,
          completionTokens: diffComp,
          totalTokens: diffTotal
        });
      }
    } else {
      // Heuristic output estimation: ONLY if cleanChunk doesn't match raw directory listings,
      // diff headers, shell echoes, or compiler banners
      const cleanChunk = textChunk.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '').trim();

      // Skip file system listings, diffs, and shell prompts (Linux and Windows)
      const isShellNoise = /^(?:total\s+\d+|[d-][rwx-]{9}|diff\s+--git|@@\s+-\d+,\d+\s+\+\d+,\d+\s+@@|index\s+[a-f0-9]+\.\.[a-f0-9]+|Volume in drive|Directory of |PS [A-Z]:\\|[A-Z]:\\[^>]*>)/im.test(cleanChunk);
      const isShortLine = cleanChunk.length < 24;

      if (!isShellNoise && !isShortLine) {
        // Conservative heuristic: ~4 characters per token
        const estimatedTokens = Math.max(1, Math.round(cleanChunk.length / 4));
        this.recordSessionUsage({
          sessionId,
          agent,
          model: detectedModel,
          promptTokens: 0,
          completionTokens: estimatedTokens,
          totalTokens: estimatedTokens
        });
      }
    }
  }

  /**
   * Sniff user input prompt and count prompt tokens
   */
  sniffInput(sessionId, agent, inputData) {
    if (!inputData || typeof inputData !== 'string') return;
    const clean = inputData.trim();
    if (clean.length < 2) return;

    // Guard: System shells and common shell commands never count as AI prompt tokens
    const agentCategory = agent?.profile?.category || agent?.category;
    const agentId = agent?.agentId || agent?.id;
    if (agentCategory === 'shell' || agentId === 'bash' || agentId === 'powershell' || agentId === 'cmd' || agentId === 'pwsh') {
      return;
    }

    const shellCmdPattern = /^(?:ls|ll|la|cat|git|cd|pwd|clear|cls|dir|type|copy|move|del|rm|mkdir|md|rd|touch|node|npm|pnpm|yarn|bun|npx|python|python3|pip|export|set|echo|which|where|grep|find|findstr|curl|wget|head|tail|less|more|vim|nano|kill|taskkill|tasklist|ps|top|htop|df|du|chmod|chown|tar|zip|unzip|exit|history|ssh|ipconfig|ifconfig|ping|netstat|powershell|pwsh|cmd|winget|choco|scoop)\b/i;
    if (shellCmdPattern.test(clean)) {
      return;
    }

    const estimatedPromptTokens = Math.max(1, Math.round(clean.length / 4));
    const model = this.sessionModels.get(sessionId) || this.getDefaultModel(agentId);

    this.recordSessionUsage({
      sessionId,
      agent,
      model,
      promptTokens: estimatedPromptTokens,
      completionTokens: 0,
      totalTokens: estimatedPromptTokens
    });
  }

  /**
   * Record token usage into a single consolidated record per session pane
   */
  recordSessionUsage({ sessionId, agent, model, promptTokens = 0, completionTokens = 0, totalTokens = 0 }) {
    if (!sessionId) return;
    const total = totalTokens > 0 ? totalTokens : (promptTokens + completionTokens);
    if (total <= 0) return;

    // Check if session record already exists
    let sess = this.data.sessions[sessionId];
    const previousModel = sess ? sess.model : null;
    const currentModel = model || previousModel || this.getDefaultModel(agent?.agentId || agent?.id);

    if (!sess) {
      sess = {
        id: sessionId,
        agentId: agent?.agentId || agent?.id || 'agent',
        agentName: agent?.agentName || agent?.name || 'Agent',
        model: currentModel,
        cwd: agent?.cwd || process.cwd(),
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        status: agent?.status || 'running',
        startedAt: agent?.startedAt || new Date().toISOString(),
        lastActiveAt: new Date().toISOString()
      };
      this.data.sessions[sessionId] = sess;
    }

    // If model was refined/detected later (e.g. switched from generic default to specific agy/gemini-3.8-flash-high)
    if (previousModel && currentModel && previousModel !== currentModel) {
      // Re-allocate tokens in model summary
      if (this.data.models[previousModel]) {
        this.data.models[previousModel].totalTokens = Math.max(0, this.data.models[previousModel].totalTokens - sess.totalTokens);
        this.data.models[previousModel].promptTokens = Math.max(0, this.data.models[previousModel].promptTokens - sess.promptTokens);
        this.data.models[previousModel].completionTokens = Math.max(0, this.data.models[previousModel].completionTokens - sess.completionTokens);
        if (this.data.models[previousModel].totalTokens === 0) {
          delete this.data.models[previousModel];
        }
      }

      if (!this.data.models[currentModel]) {
        this.data.models[currentModel] = { totalTokens: 0, promptTokens: 0, completionTokens: 0, count: 0 };
      }
      this.data.models[currentModel].totalTokens += sess.totalTokens;
      this.data.models[currentModel].promptTokens += sess.promptTokens;
      this.data.models[currentModel].completionTokens += sess.completionTokens;

      sess.model = currentModel;
    }

    this.sessionModels.set(sessionId, currentModel);

    // Update session record
    sess.promptTokens += promptTokens;
    sess.completionTokens += completionTokens;
    sess.totalTokens += total;
    sess.lastActiveAt = new Date().toISOString();
    if (agent?.cwd) sess.cwd = agent.cwd;
    if (agent?.agentName) sess.agentName = agent.agentName;
    if (agent?.status) sess.status = agent.status;

    // Update global summary totals
    this.data.totalTokens += total;
    this.data.totalPromptTokens += promptTokens;
    this.data.totalCompletionTokens += completionTokens;

    // Update global model breakdown
    if (!this.data.models[currentModel]) {
      this.data.models[currentModel] = { totalTokens: 0, promptTokens: 0, completionTokens: 0, count: 0 };
    }
    this.data.models[currentModel].totalTokens += total;
    this.data.models[currentModel].promptTokens += promptTokens;
    this.data.models[currentModel].completionTokens += completionTokens;
    this.data.models[currentModel].count += 1;

    // Update global agent profile breakdown
    const agentKey = agent?.agentId || sess.agentId || 'custom';
    if (!this.data.agents[agentKey]) {
      this.data.agents[agentKey] = { name: sess.agentName, totalTokens: 0, count: 0 };
    }
    this.data.agents[agentKey].totalTokens += total;
    this.data.agents[agentKey].count += 1;

    this.save();
  }

  /**
   * Update session status (e.g. 'exited' or 'running')
   */
  updateSessionStatus(sessionId, status) {
    if (this.data.sessions[sessionId]) {
      this.data.sessions[sessionId].status = status;
      this.save();
    }
  }

  /**
   * Update session directory
   */
  updateSessionCwd(sessionId, newCwd) {
    if (this.data.sessions[sessionId]) {
      this.data.sessions[sessionId].cwd = newCwd;
      this.save();
    }
  }

  /**
   * Reset all usage statistics
   */
  reset() {
    this.data = {
      totalTokens: 0,
      totalPromptTokens: 0,
      totalCompletionTokens: 0,
      models: {},
      agents: {},
      sessions: {}
    };
    this.sessionModels.clear();
    this.streamAccumulators.clear();
    this.lastSniffedChars.clear();
    this.save();
  }

  /**
   * Return usage summary payload
   */
  getSummary() {
    const sessionsList = Object.values(this.data.sessions || {})
      .sort((a, b) => new Date(b.lastActiveAt || b.startedAt) - new Date(a.lastActiveAt || a.startedAt));

    return {
      totalTokens: this.data.totalTokens,
      totalPromptTokens: this.data.totalPromptTokens,
      totalCompletionTokens: this.data.totalCompletionTokens,
      models: this.data.models,
      agents: this.data.agents,
      sessions: sessionsList.slice(0, 50)
    };
  }
}

const usageManager = new UsageManager();
module.exports = usageManager;
