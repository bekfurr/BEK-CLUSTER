const pty = require('node-pty');
const path = require('path');
const fs = require('fs');
const { getAgentProfile, getDefaultShellAgentId } = require('./agents');
const usageManager = require('./usage-manager');

class TerminalManager {
  constructor(defaultCwd = process.cwd()) {
    this.defaultCwd = defaultCwd;
    this.sessions = new Map();
    this.sessionCounter = 0;
    this.maxHistoryLength = 200000; // ~200KB scrollback per terminal
  }

  /**
   * Set the default working directory for new sessions.
   */
  setDefaultCwd(cwd) {
    this.defaultCwd = cwd;
  }

  getDefaultCwd() {
    return this.defaultCwd;
  }

  /**
   * Create a new terminal session.
   */
  createSession(options = {}) {
    const {
      agentId = getDefaultShellAgentId(),
      customCommand = null,
      customArgs = [],
      cwd = this.defaultCwd,
      cols = 100,
      rows = 30,
      customName = null
    } = options;

    const profile = getAgentProfile(agentId);
    const command = customCommand || profile.executablePath || profile.binary;
    const args = customArgs.length > 0 ? customArgs : profile.defaultArgs;
    const id = `sess_${Date.now()}_${++this.sessionCounter}`;

    const displayName = customName || `${profile.name} #${this.sessionCounter}`;

    // Environment setup
    const env = Object.assign({}, process.env, {
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor',
      BEK_CLUSTER: '1',
      LANG: process.env.LANG || 'en_US.UTF-8'
    });

    let ptyProcess = null;
    let initialError = null;

    try {
      ptyProcess = pty.spawn(command, args, {
        name: 'xterm-256color',
        cols: Math.max(10, cols),
        rows: Math.max(5, rows),
        cwd: cwd || this.defaultCwd,
        env
      });
    } catch (err) {
      initialError = err.message;
      console.error(`[TerminalManager] Failed to spawn ${command}:`, err.message);
    }

    const session = {
      id,
      agentId: profile.id,
      agentName: displayName,
      profile,
      command,
      args,
      cwd: cwd || this.defaultCwd,
      cols: Math.max(10, cols),
      rows: Math.max(5, rows),
      pty: ptyProcess,
      pid: ptyProcess ? ptyProcess.pid : null,
      status: ptyProcess ? 'running' : 'error',
      errorMessage: initialError,
      exitCode: null,
      startedAt: new Date().toISOString(),
      history: '',
      listeners: new Set(),
      exitListeners: new Set()
    };

    if (ptyProcess) {
      ptyProcess.onData(data => {
        // Append to history buffer, trimming if exceeds max size
        session.history += data;
        if (session.history.length > this.maxHistoryLength) {
          session.history = session.history.slice(session.history.length - this.maxHistoryLength);
        }

        // Notify active websocket listeners
        for (const listener of session.listeners) {
          try {
            listener(data);
          } catch (e) {
            console.error('[TerminalManager] Listener error:', e);
          }
        }
      });

      ptyProcess.onExit(({ exitCode, signal }) => {
        session.status = 'exited';
        session.exitCode = exitCode !== undefined ? exitCode : signal;
        usageManager.updateSessionStatus(id, 'exited');
        console.log(`[TerminalManager] Session ${id} (${displayName}) exited with code ${session.exitCode}`);

        for (const exitListener of session.exitListeners) {
          try {
            exitListener(session.exitCode);
          } catch (e) {
            console.error('[TerminalManager] Exit listener error:', e);
          }
        }
      });
    }

    this.sessions.set(id, session);
    return this.serializeSession(session);
  }

  /**
   * Write data into a session's PTY.
   */
  write(sessionId, data) {
    const session = this.sessions.get(sessionId);
    if (!session || !session.pty || session.status !== 'running') {
      return false;
    }
    try {
      session.pty.write(data);
      return true;
    } catch (err) {
      console.error(`[TerminalManager] Write error on session ${sessionId}:`, err);
      return false;
    }
  }

  /**
   * Resize a session's PTY.
   */
  resize(sessionId, cols, rows) {
    const session = this.sessions.get(sessionId);
    if (!session || !session.pty || session.status !== 'running') {
      return false;
    }
    try {
      const safeCols = Math.max(10, parseInt(cols, 10) || 80);
      const safeRows = Math.max(5, parseInt(rows, 10) || 24);
      session.cols = safeCols;
      session.rows = safeRows;
      session.pty.resize(safeCols, safeRows);
      return true;
    } catch (err) {
      console.error(`[TerminalManager] Resize error on session ${sessionId}:`, err);
      return false;
    }
  }

  /**
   * Restart an existing session (with optional new working directory).
   */
  restart(sessionId, newCwd = null) {
    const oldSession = this.sessions.get(sessionId);
    if (!oldSession) return null;

    let targetCwd = oldSession.cwd;
    if (newCwd && typeof newCwd === 'string') {
      try {
        const resolved = path.resolve(newCwd.trim());
        if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
          return { error: `Directory does not exist or is not a directory: ${newCwd}` };
        }
        targetCwd = resolved;
      } catch (err) {
        return { error: `Invalid directory path: ${err.message}` };
      }
    }

    // Terminate old process if running
    if (oldSession.pty && oldSession.status === 'running') {
      try {
        oldSession.pty.kill('SIGTERM');
      } catch (e) {
        // ignore
      }
    }

    oldSession.cwd = targetCwd;
    const command = oldSession.command;
    const args = oldSession.args;
    const cwd = oldSession.cwd;
    const cols = oldSession.cols;
    const rows = oldSession.rows;

    const env = Object.assign({}, process.env, {
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor',
      BEK_CLUSTER: '1',
      LANG: process.env.LANG || 'en_US.UTF-8'
    });

    try {
      const ptyProcess = pty.spawn(command, args, {
        name: 'xterm-256color',
        cols,
        rows,
        cwd,
        env
      });

      oldSession.pty = ptyProcess;
      oldSession.pid = ptyProcess.pid;
      oldSession.status = 'running';
      oldSession.exitCode = null;
      oldSession.startedAt = new Date().toISOString();
      usageManager.updateSessionStatus(sessionId, 'running');
      if (newCwd) {
        usageManager.updateSessionCwd(sessionId, cwd);
      }
      const cwdNotice = newCwd ? ` Directory changed to: ${cwd} &` : '';
      oldSession.history = `\r\n\x1b[33m--- [BEK-CLUSTER]${cwdNotice} Session Restarted ---\x1b[0m\r\n`;

      ptyProcess.onData(data => {
        oldSession.history += data;
        if (oldSession.history.length > this.maxHistoryLength) {
          oldSession.history = oldSession.history.slice(oldSession.history.length - this.maxHistoryLength);
        }
        for (const listener of oldSession.listeners) {
          try {
            listener(data);
          } catch (e) {
            console.error('[TerminalManager] Listener error:', e);
          }
        }
      });

      ptyProcess.onExit(({ exitCode, signal }) => {
        oldSession.status = 'exited';
        oldSession.exitCode = exitCode !== undefined ? exitCode : signal;
        usageManager.updateSessionStatus(sessionId, 'exited');
        for (const exitListener of oldSession.exitListeners) {
          try {
            exitListener(oldSession.exitCode);
          } catch (e) {
            console.error('[TerminalManager] Exit listener error:', e);
          }
        }
      });

      return this.serializeSession(oldSession);
    } catch (err) {
      oldSession.status = 'error';
      oldSession.errorMessage = err.message;
      usageManager.updateSessionStatus(sessionId, 'error');
      return this.serializeSession(oldSession);
    }
  }

  /**
   * Terminate and remove a session.
   */
  kill(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    usageManager.updateSessionStatus(sessionId, 'exited');

    if (session.pty && session.status === 'running') {
      try {
        session.pty.kill('SIGTERM');
        const killTimer = setTimeout(() => {
          try {
            if (session.pty && session.status === 'running') {
              session.pty.kill('SIGKILL');
            }
          } catch (e) {}
        }, 500);
        if (killTimer.unref) killTimer.unref();
      } catch (err) {
        console.error(`[TerminalManager] Error killing session ${sessionId}:`, err);
      }
    }

    session.status = 'exited';
    this.sessions.delete(sessionId);
    return true;
  }

  /**
   * Terminate all active sessions (clean shutdown).
   */
  killAll() {
    for (const [id, session] of this.sessions.entries()) {
      if (session.pty && session.status === 'running') {
        try {
          session.pty.kill('SIGTERM');
        } catch (e) {}
      }
    }
    this.sessions.clear();
  }

  /**
   * Broadcast a command or prompt to multiple sessions.
   * If sessionIds is null or empty, broadcasts to all running sessions.
   */
  broadcast(prompt, sessionIds = null, appendNewline = true) {
    const payload = prompt + (appendNewline ? '\r' : '');
    const results = [];

    const targetSessions = sessionIds && sessionIds.length > 0
      ? sessionIds.map(id => this.sessions.get(id)).filter(Boolean)
      : Array.from(this.sessions.values());

    for (const session of targetSessions) {
      if (session && session.status === 'running' && session.pty) {
        try {
          session.pty.write(payload);
          results.push({ id: session.id, name: session.agentName, success: true });
        } catch (err) {
          results.push({ id: session.id, name: session.agentName, success: false, error: err.message });
        }
      }
    }

    return results;
  }

  /**
   * Attach listener to session output.
   */
  subscribe(sessionId, onData, onExit) {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    if (onData) session.listeners.add(onData);
    if (onExit) session.exitListeners.add(onExit);
    return true;
  }

  /**
   * Unsubscribe listener from session.
   */
  unsubscribe(sessionId, onData, onExit) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    if (onData) session.listeners.delete(onData);
    if (onExit) session.exitListeners.delete(onExit);
  }

  /**
   * Get all active sessions as plain metadata objects.
   */
  getSessionsList() {
    return Array.from(this.sessions.values()).map(s => this.serializeSession(s));
  }

  /**
   * Get single session data including history.
   */
  getSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    return {
      ...this.serializeSession(session),
      history: session.history
    };
  }

  serializeSession(session) {
    return {
      id: session.id,
      agentId: session.agentId,
      agentName: session.agentName,
      profile: session.profile,
      command: session.command,
      args: session.args,
      cwd: session.cwd,
      cols: session.cols,
      rows: session.rows,
      pid: session.pid,
      status: session.status,
      errorMessage: session.errorMessage,
      exitCode: session.exitCode,
      startedAt: session.startedAt,
      hasHistory: session.history.length > 0
    };
  }
}

module.exports = TerminalManager;
