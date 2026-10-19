const express = require('express');
const http = require('http');
const path = require('path');
const os = require('os');
const { detectAgents, getAgentProfile } = require('./agents');
const TerminalManager = require('./terminal-manager');
const { setupWebSocketServer } = require('./websocket');
const usageManager = require('./usage-manager');

function createServer(options = {}) {
  const { cwd = process.cwd() } = options;

  const app = express();
  const httpServer = http.createServer(app);
  const terminalManager = new TerminalManager(cwd);

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
        agentId = 'bash',
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
