/**
 * TerminalView: Wrapper around xterm.js for BEKFURR-AGENT-CLUSTER
 */
class TerminalView {
  constructor(containerEl, session, options = {}) {
    this.containerEl = containerEl;
    this.session = session;
    this.id = session.id;

    // Terminal theme (Tokyo Night / Cyberpunk Dark)
    const terminalTheme = {
      background: '#080b11',
      foreground: '#e2e8f0',
      cursor: '#06b6d4',
      cursorAccent: '#080b11',
      selectionBackground: 'rgba(6, 182, 212, 0.35)',
      black: '#0f172a',
      red: '#ef4444',
      green: '#10b981',
      yellow: '#f59e0b',
      blue: '#3b82f6',
      magenta: '#8b5cf6',
      cyan: '#06b6d4',
      white: '#f8fafc',
      brightBlack: '#475569',
      brightRed: '#f87171',
      brightGreen: '#34d399',
      brightYellow: '#fbbf24',
      brightBlue: '#60a5fa',
      brightMagenta: '#a78bfa',
      brightCyan: '#22d3ee',
      brightWhite: '#ffffff'
    };

    // Instantiate xterm
    this.term = new window.Terminal({
      cursorBlink: true,
      cursorStyle: 'block',
      fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", Menlo, monospace',
      fontSize: 13,
      lineHeight: 1.25,
      letterSpacing: 0,
      theme: terminalTheme,
      allowTransparency: true,
      scrollback: 5000,
      convertEol: true
    });

    // Load FitAddon
    if (window.FitAddon && window.FitAddon.FitAddon) {
      this.fitAddon = new window.FitAddon.FitAddon();
      this.term.loadAddon(this.fitAddon);
    }

    // Load WebLinksAddon
    if (window.WebLinksAddon && window.WebLinksAddon.WebLinksAddon) {
      this.webLinksAddon = new window.WebLinksAddon.WebLinksAddon();
      this.term.loadAddon(this.webLinksAddon);
    }

    // Open terminal inside container
    this.term.open(this.containerEl);

    // Initial fit
    requestAnimationFrame(() => {
      this.fit();
    });

    // Send input keystrokes to backend
    this.term.onData((data) => {
      window.wsClient.sendInput(this.id, data);
    });

    // Observe size changes
    this.resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => this.fit());
    });
    this.resizeObserver.observe(this.containerEl);

    // Attach to WebSocket
    window.wsClient.attach(this.id, {
      onOutput: (chunk) => {
        this.term.write(chunk);
      },
      onHistory: (historyData) => {
        if (historyData) {
          this.term.write(historyData);
        }
      },
      onExit: (code) => {
        this.term.writeln(`\r\n\x1b[90m[Process exited with code ${code}]\x1b[0m`);
        if (options.onExit) options.onExit(code);
      }
    });
  }

  fit() {
    if (!this.fitAddon || !this.containerEl.offsetParent) return;
    try {
      this.fitAddon.fit();
      if (this.term.cols && this.term.rows) {
        window.wsClient.sendResize(this.id, this.term.cols, this.term.rows);
      }
    } catch (e) {
      // Ignored if element is hidden
    }
  }

  write(data) {
    this.term.write(data);
  }

  clear() {
    this.term.clear();
  }

  focus() {
    this.term.focus();
  }

  destroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    window.wsClient.detach(this.id);
    if (this.term) {
      this.term.dispose();
    }
  }
}

window.TerminalView = TerminalView;
