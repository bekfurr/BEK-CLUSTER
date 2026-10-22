const express = require('express');
const http = require('http');
const path = require('path');
const os = require('os');
const { detectAgents, getAgentProfile, getDefaultShellAgentId } = require('./agents');
const TerminalManager = require('./terminal-manager');
const ProOrchestrator = require('./pro-orchestrator');
const { setupWebSocketServer } = require('./websocket');
const usageManager = require('./usage-manager');

function createServer(options = {}) {
  const { cwd = process.cwd() } = options;

  const app = express();
  const httpServer = http.createServer(app);
  const terminalManager = new TerminalManager(cwd);
  const proOrchestrator = new ProOrchestrator(terminalManager, cwd);

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Serve static files from public directory
  const publicDir = path.join(__dirname, '../public');
  app.use(express.static(publicDir));

  // --- REST API ROUTES ---

  /**
   * System & workspace info
   */
  app.get('/api/info', (req, res) => {
    const pkg = require('../package.json');
    res.json({
      name: 'BEKFURR-AGENT-CLUSTER',
      version: pkg.version || '1.0.0',
      cwd: terminalManager.getDefaultCwd(),
      platform: process.platform,
      hostname: os.hostname(),
      nodeVersion: process.version,
      activeSessionsCount: terminalManager.getSessionsList().length
    });
  });

  /**
   * List detected agents & installation status
   */
  app.get('/api/agents', (req, res) => {
    try {
      const agents = detectAgents();
      res.json({ agents });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * Install agent endpoint (spawns install terminal or returns guide)
   */
  app.post('/api/agents/install', (req, res) => {
    try {
      const { agentId, method = 'auto' } = req.body;
      const profile = getAgentProfile(agentId);
      if (!profile) {
        return res.status(404).json({ error: 'Agent profili topilmadi' });
      }

      if (method === 'manual') {
        return res.json({
          success: true,
          method: 'manual',
          agent: profile,
          guide: profile.install ? profile.install.guide : []
        });
      }

      // Auto install via live terminal session
      if (!profile.install || !profile.install.autoCmd) {
        return res.status(400).json({
          error: "Ushbu agent uchun avtomatik o'rnatish buyrug'i topilmadi. Qo'lda o'rnatish yo'riqnomasidan foydalaning."
        });
      }

      const isWindows = process.platform === 'win32';
      const shellCmd = isWindows ? 'cmd.exe' : 'bash';
      const shellArgs = isWindows
        ? ['/c', `${profile.install.autoCmd} && echo. && echo [OK] O'rnatish yakunlandi! && pause`]
        : ['-c', `${profile.install.autoCmd} && echo "" && echo "✅ [OK] ${profile.name} muvaffaqiyatli o'rnatildi!" || echo "❌ Xatolik yuz berdi"; exec bash`];

      const session = terminalManager.createSession({
        agentId: getDefaultShellAgentId(),
        customCommand: shellCmd,
        customArgs: shellArgs,
        customName: `📦 O'rnatish: ${profile.name}`
      });

      res.status(201).json({
        success: true,
        method: 'auto',
        agent: profile,
        session
      });
    } catch (err) {
      console.error('[API] Agent install error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * List active terminal sessions
   */
  app.get('/api/sessions', (req, res) => {
    const sessions = terminalManager.getSessionsList();
    res.json({ sessions });
  });

  /**
   * Create a new terminal session
   */
  app.post('/api/sessions', (req, res) => {
    try {
      const {
        agentId = getDefaultShellAgentId(),
        customCommand = null,
        customArgs = [],
        cwd = terminalManager.getDefaultCwd(),
        cols = 100,
        rows = 30,
        customName = null
      } = req.body;

      const session = terminalManager.createSession({
        agentId,
        customCommand,
        customArgs,
        cwd,
        cols,
        rows,
        customName
      });

      res.status(201).json({ session });
    } catch (err) {
      console.error('[API] Error creating session:', err);
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * Get single session metadata & history
   */
  app.get('/api/sessions/:id', (req, res) => {
    const session = terminalManager.getSession(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.json({ session });
  });

  /**
   * Kill / delete a session
   */
  app.delete('/api/sessions/:id', (req, res) => {
    const success = terminalManager.kill(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.json({ success: true, message: `Session ${req.params.id} terminated` });
  });

  /**
   * Restart an existing session (optional new cwd)
   */
  app.post('/api/sessions/:id/restart', (req, res) => {
    const session = terminalManager.restart(req.params.id, req.body?.cwd);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    if (session.error) {
      return res.status(400).json({ error: session.error });
    }
    res.json({ session });
  });

  /**
   * Kill all sessions
   */
  app.post('/api/kill-all', (req, res) => {
    terminalManager.killAll();
    res.json({ success: true, message: 'All sessions terminated' });
  });

  /**
   * Broadcast prompt to all or selected sessions
   */
  app.post('/api/broadcast', (req, res) => {
    const { prompt, sessionIds = null, appendNewline = true } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid "prompt" parameter' });
    }

    const results = terminalManager.broadcast(prompt, sessionIds, appendNewline);
    for (const r of results) {
      const s = terminalManager.getSession(r.sessionId);
      if (s) usageManager.sniffInput(r.sessionId, s, prompt);
    }

    res.json({
      success: true,
      broadcastedTo: results
    });
  });

  /**
   * Token & Model Usage Stats
   */
  app.get('/api/usage', (req, res) => {
    res.json(usageManager.getSummary());
  });

  app.post('/api/usage/record', (req, res) => {
    usageManager.record(req.body);
    res.json({ success: true, summary: usageManager.getSummary() });
  });

  app.post('/api/usage/reset', (req, res) => {
    usageManager.reset();
    res.json({ success: true, summary: usageManager.getSummary() });
  });

  // --- PRO AGENT ORCHESTRATION ROUTES ---

  /**
   * Get current Pro Agent Project status
   */
  app.get('/api/pro/status', (req, res) => {
    try {
      const project = proOrchestrator.getProject(req.query.projectId);
      const allProjects = proOrchestrator.listProjects();
      const availableAgents = proOrchestrator.getAvailableAgentsKnowledge();
      res.json({
        activeProject: project,
        projects: allProjects,
        availableAgents
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * Create a new Pro Project with Lead (OTA) Agent
   */
  app.post('/api/pro/project', (req, res) => {
    try {
      const { name, customCwd, leadAgentId } = req.body;
      const project = proOrchestrator.createProject({
        name,
        customCwd,
        leadAgentId
      });
      res.status(201).json({ success: true, project });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  /**
   * Spawn a Worker sub-agent under a Pro Project
   */
  app.post('/api/pro/worker', (req, res) => {
    try {
      const { projectId, agentId, role, taskTitle, initialPrompt } = req.body;
      const result = proOrchestrator.spawnWorker(projectId, {
        agentId,
        role,
        taskTitle,
        initialPrompt
      });
      res.status(201).json({ success: true, ...result });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  /**
   * Human-in-the-loop intervention (correct worker through lead agent)
   */
  app.post('/api/pro/intervene', (req, res) => {
    try {
      const { projectId, workerId, feedbackMessage, directWorker } = req.body;
      const result = proOrchestrator.intervene(projectId, {
        workerId,
        feedbackMessage,
        directWorker
      });
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  /**
   * Close Pro Project
   */
  app.delete('/api/pro/project/:id', (req, res) => {
    const success = proOrchestrator.closeProject(req.params.id);
    res.json({ success });
  });

  // Attach WebSocket server
  const wss = setupWebSocketServer(httpServer, terminalManager);

  // Fallback to index.html for single page application (Express 5 compatible)
  app.use((req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });

  return {
    app,
    httpServer,
    wss,
    terminalManager
  };
}

module.exports = { createServer };
