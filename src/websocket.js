const { WebSocketServer } = require('ws');
const usageManager = require('./usage-manager');

/**
 * Setup WebSocket handling for real-time PTY communication.
 */
function setupWebSocketServer(httpServer, terminalManager) {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws, req) => {
    // Map of sessionIds this specific connection is attached to
    const attachedSessions = new Set();

    // Heartbeat setup
    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    const send = (msg) => {
      if (ws.readyState === ws.OPEN) {
        try {
          ws.send(JSON.stringify(msg));
        } catch (err) {
          console.error('[WebSocket] Send error:', err);
        }
      }
    };

    ws.on('message', (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch (e) {
        return;
      }

      switch (msg.type) {
        case 'ping': {
          send({ type: 'pong', timestamp: Date.now() });
          break;
        }

        case 'attach': {
          const { sessionId } = msg;
          if (!sessionId) return;

          const session = terminalManager.getSession(sessionId);
          if (!session) {
            send({ type: 'error', sessionId, message: 'Session not found' });
            return;
          }

          // If already attached, ignore or refresh
          if (attachedSessions.has(sessionId)) {
            // Already attached
            return;
          }

          attachedSessions.add(sessionId);

          // Stream output from PTY to this WebSocket
          const onData = (chunk) => {
            usageManager.sniffOutput(sessionId, session, chunk);
            send({
              type: 'output',
              sessionId,
              data: chunk
            });
          };

          const onExit = (code) => {
            send({
              type: 'exit',
              sessionId,
              exitCode: code
            });
          };

          terminalManager.subscribe(sessionId, onData, onExit);

          // Store reference for clean detachment
          ws[`_cleanup_${sessionId}`] = () => {
            terminalManager.unsubscribe(sessionId, onData, onExit);
          };

          // Send back history immediately so terminal renders current state
          send({
            type: 'history',
            sessionId,
            data: session.history || ''
          });

          // Also notify initial status
          if (session.status === 'exited') {
            send({
              type: 'exit',
              sessionId,
              exitCode: session.exitCode
            });
          }
          break;
        }

        case 'detach': {
          const { sessionId } = msg;
          if (sessionId && attachedSessions.has(sessionId)) {
            attachedSessions.delete(sessionId);
            if (typeof ws[`_cleanup_${sessionId}`] === 'function') {
              ws[`_cleanup_${sessionId}`]();
              delete ws[`_cleanup_${sessionId}`];
            }
          }
          break;
        }

        case 'input': {
          const { sessionId, data } = msg;
          if (sessionId && typeof data === 'string') {
            const session = terminalManager.getSession(sessionId);
            if (session) {
              usageManager.sniffInput(sessionId, session, data);
            }
            terminalManager.write(sessionId, data);
          }
          break;
        }

        case 'resize': {
          const { sessionId, cols, rows } = msg;
          if (sessionId && cols && rows) {
            terminalManager.resize(sessionId, cols, rows);
          }
          break;
        }
      }
    });

    ws.on('close', () => {
      // Clean up subscriptions for this connection
      for (const sessionId of attachedSessions) {
        if (typeof ws[`_cleanup_${sessionId}`] === 'function') {
          ws[`_cleanup_${sessionId}`]();
          delete ws[`_cleanup_${sessionId}`];
        }
      }
      attachedSessions.clear();
    });

    ws.on('error', (err) => {
      console.error('[WebSocket] Client error:', err);
    });
  });

  // Interval ping-pong to detect dead sockets
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(interval);
  });

  return wss;
}

module.exports = { setupWebSocketServer };
