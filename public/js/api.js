/**
 * REST API and WebSocket Client for BEKFURR-AGENT-CLUSTER
 */
const API = {
  async getInfo() {
    const res = await fetch('/api/info');
    return res.json();
  },

  async getAgents() {
    const res = await fetch('/api/agents');
    return res.json();
  },

  async getSessions() {
    const res = await fetch('/api/sessions');
    return res.json();
  },

  async createSession(data) {
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async getSession(id) {
    const res = await fetch(`/api/sessions/${id}`);
    return res.json();
  },

  async killSession(id) {
    const res = await fetch(`/api/sessions/${id}`, {
      method: 'DELETE'
    });
    return res.json();
  },

  async restartSession(id, cwd = null) {
    const res = await fetch(`/api/sessions/${id}/restart`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cwd })
    });
    return res.json();
  },

  async getUsage() {
    const res = await fetch('/api/usage');
    return res.json();
  },

  async resetUsage() {
    const res = await fetch('/api/usage/reset', {
      method: 'POST'
    });
    return res.json();
  },

  async killAll() {
    const res = await fetch('/api/kill-all', {
      method: 'POST'
    });
    return res.json();
  },

  async broadcast(prompt, sessionIds = null) {
    const res = await fetch('/api/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, sessionIds, appendNewline: true })
    });
    return res.json();
  },

  async installAgent(data) {
    const res = await fetch('/api/agents/install', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async getProStatus(projectId = null) {
    const url = projectId ? `/api/pro/status?projectId=${encodeURIComponent(projectId)}` : '/api/pro/status';
    const res = await fetch(url);
    return res.json();
  },

  async createProProject(data) {
    const res = await fetch('/api/pro/project', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async spawnProWorker(data) {
    const res = await fetch('/api/pro/worker', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async intervenePro(data) {
    const res = await fetch('/api/pro/intervene', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async closeProProject(id) {
    const res = await fetch(`/api/pro/project/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    return res.json();
  }
};

/**
 * WebSocket manager for streaming PTY terminal data
 */
class WSClient {
  constructor() {
    this.ws = null;
    this.handlers = new Map(); // sessionId -> { onOutput, onHistory, onExit }
    this.pendingAttachments = new Set();
    this.reconnectAttempts = 0;
    this.connect();
  }

  connect() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${location.host}/ws`;

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      // Re-attach all sessions on reconnect
      for (const sessionId of this.handlers.keys()) {
        this.send({ type: 'attach', sessionId });
      }
      for (const sessionId of this.pendingAttachments) {
        this.send({ type: 'attach', sessionId });
      }
      this.pendingAttachments.clear();
    };

    this.ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        const { type, sessionId } = msg;

        const handler = this.handlers.get(sessionId);
        if (!handler) return;

        if (type === 'output' && handler.onOutput) {
          handler.onOutput(msg.data);
        } else if (type === 'history' && handler.onHistory) {
          handler.onHistory(msg.data);
        } else if (type === 'exit' && handler.onExit) {
          handler.onExit(msg.exitCode);
        }
      } catch (e) {
        console.error('[WSClient] Parse error:', e);
      }
    };

    this.ws.onclose = () => {
      // Auto-reconnect with exponential backoff
      const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts++), 10000);
      setTimeout(() => this.connect(), delay);
    };

    this.ws.onerror = (err) => {
      console.error('[WSClient] Error:', err);
    };
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  attach(sessionId, { onOutput, onHistory, onExit }) {
    this.handlers.set(sessionId, { onOutput, onHistory, onExit });
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.send({ type: 'attach', sessionId });
    } else {
      this.pendingAttachments.add(sessionId);
    }
  }

  detach(sessionId) {
    this.handlers.delete(sessionId);
    this.pendingAttachments.delete(sessionId);
    this.send({ type: 'detach', sessionId });
  }

  sendInput(sessionId, data) {
    this.send({ type: 'input', sessionId, data });
  }

  sendResize(sessionId, cols, rows) {
    this.send({ type: 'resize', sessionId, cols, rows });
  }
}

window.API = API;
window.wsClient = new WSClient();
