/**
 * TerminalView: Wrapper around xterm.js for BEKFURR-AGENT-CLUSTER
 */
class TerminalView {
  constructor(containerEl, session, options = {}) {
    this.containerEl = containerEl;
    this.session = session;
    this.id = session.id;
    this.options = options;

    // Terminal theme (Minimal Apple Dark + Red Accent)
    const terminalTheme = {
      background: '#0A0A0B',
      foreground: '#F5F5F7',
      cursor: '#E5383B',
      cursorAccent: '#0A0A0B',
      selectionBackground: 'rgba(229, 56, 59, 0.25)',
      black: '#121214',
      red: '#FF5A5F',
      green: '#7FD1A0',
      yellow: '#E8C07D',
      blue: '#7AA2F7',
      magenta: '#C792EA',
      cyan: '#7DCFE0',
      white: '#F5F5F7',
      brightBlack: '#636366',
      brightRed: '#FF6E72',
      brightGreen: '#95E2B3',
      brightYellow: '#F2D399',
      brightBlue: '#93B8FF',
      brightMagenta: '#D8ABFF',
      brightCyan: '#96E0EF',
      brightWhite: '#FFFFFF'
    };

    // Instantiate xterm
    this.term = new window.Terminal({
      cursorBlink: true,
      cursorStyle: 'block',
      fontFamily: '"SF Mono", "JetBrains Mono", Menlo, Monaco, Consolas, monospace',
      fontSize: 13,
      lineHeight: 1.35,
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
      if (this.options.onInput) {
        this.options.onInput(data);
      }
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
        if (this.options.onOutput) {
          this.options.onOutput(chunk);
        }
      },
      onHistory: (historyData) => {
        if (historyData) {
          this.term.write(historyData);
          if (this.options.onHistory) {
            this.options.onHistory(historyData);
          }
        }
      },
      onExit: (code) => {
        this.term.writeln(`\r\n\x1b[90m[Process exited with code ${code}]\x1b[0m`);
        if (this.options.onExit) {
          this.options.onExit(code);
        }
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
