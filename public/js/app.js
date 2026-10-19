/**
 * Main Application Orchestrator for BEKFURR-AGENT-CLUSTER
 */
(function () {
  const state = {
    info: null,
    detectedAgents: [],
    sessions: new Map(), // sessionId -> { session, view, cardEl, tabEl }
    activeLayout: 'grid',
    activeTabId: null,
    maximizedId: null,
    broadcastOpen: true
  };

  // DOM Elements
  const elements = {
    workspaceDisplay: document.getElementById('workspaceDisplay'),
    cwdPath: document.getElementById('cwdPath'),
    clusterStatusPill: document.getElementById('clusterStatusPill'),
    activeSessionsCount: document.getElementById('activeSessionsCount'),
    toggleBroadcastBtn: document.getElementById('toggleBroadcastBtn'),
    broadcastBar: document.getElementById('broadcastBar'),
    broadcastInput: document.getElementById('broadcastInput'),
    broadcastTargetSelect: document.getElementById('broadcastTargetSelect'),
    btnSendBroadcast: document.getElementById('btnSendBroadcast'),
    tabsStrip: document.getElementById('tabsStrip'),
    tabsList: document.getElementById('tabsList'),
    tabAddAgentBtn: document.getElementById('tabAddAgentBtn'),
    workspaceContainer: document.getElementById('workspaceContainer'),
    emptyState: document.getElementById('emptyState'),
    emptyAgentCards: document.getElementById('emptyAgentCards'),
    terminalsContainer: document.getElementById('terminalsContainer'),
    launchDropdown: document.getElementById('launchDropdown'),
    launchDropdownBtn: document.getElementById('launchDropdownBtn'),
    quickAgentList: document.getElementById('quickAgentList'),
    btnCustomAgent: document.getElementById('btnCustomAgent'),
    btnKillAll: document.getElementById('btnKillAll'),
    btnFullscreen: document.getElementById('btnFullscreen'),
    customAgentModal: document.getElementById('customAgentModal'),
    customAgentForm: document.getElementById('customAgentForm'),
    closeCustomModalBtn: document.getElementById('closeCustomModalBtn'),
    cancelCustomModalBtn: document.getElementById('cancelCustomModalBtn'),
    customCommandInput: document.getElementById('customCommandInput'),
    customArgsInput: document.getElementById('customArgsInput'),
    customNameInput: document.getElementById('customNameInput'),
    customCwdInput: document.getElementById('customCwdInput')
  };

  /**
   * Initialize App
   */
  async function init() {
    setupEventListeners();
    await loadInfo();
    await loadAgents();
    await loadExistingSessions();
    updateUIState();
  }

  /**
   * Load System Info
   */
  async function loadInfo() {
    try {
      state.info = await window.API.getInfo();
      if (elements.cwdPath) {
        elements.cwdPath.textContent = state.info.cwd || 'Workspace';
        elements.cwdPath.title = state.info.cwd || '';
      }
      if (elements.customCwdInput) {
        elements.customCwdInput.value = state.info.cwd || '';
      }
    } catch (e) {
      console.error('Failed to load system info:', e);
    }
  }

  /**
   * Load Detected Agents
   */
  async function loadAgents() {
    try {
      const data = await window.API.getAgents();
      state.detectedAgents = data.agents || [];
      renderAgentMenus();
    } catch (e) {
      console.error('Failed to load agents:', e);
    }
  }

  /**
   * Load existing sessions on server
   */
  async function loadExistingSessions() {
    try {
      const data = await window.API.getSessions();
      if (data.sessions && data.sessions.length > 0) {
        for (const sess of data.sessions) {
          attachSession(sess);
        }
      }
    } catch (e) {
      console.error('Failed to load existing sessions:', e);
    }
  }

  /**
   * Render Launch Menus & Empty State Cards
   */
  function renderAgentMenus() {
    // 1. Quick Dropdown Menu
    elements.quickAgentList.innerHTML = '';
    state.detectedAgents.forEach(agent => {
      const item = document.createElement('button');
      item.className = 'dropdown-item';
      item.innerHTML = `
        <span class="agent-icon-badge" style="background: ${agent.color || '#06b6d4'};">
          ${agent.icon || ''}
        </span>
        <span>${agent.name}</span>
        <span class="badge ${agent.isInstalled ? '' : 'badge-dim'}">
          ${agent.isInstalled ? 'Ready' : 'Not found'}
        </span>
      `;
      item.addEventListener('click', () => {
        elements.launchDropdown.classList.remove('open');
        launchAgent(agent.id);
      });
      elements.quickAgentList.appendChild(item);
    });

    // 2. Empty State Cards
    elements.emptyAgentCards.innerHTML = '';
    state.detectedAgents.forEach(agent => {
      const card = document.createElement('div');
      card.className = 'agent-card-item';
      card.innerHTML = `
        <div class="agent-card-header">
          <div class="agent-card-icon" style="background: ${agent.gradient || agent.color};">
            ${agent.icon || ''}
          </div>
          <span class="agent-installed-badge" style="${agent.isInstalled ? '' : 'background: rgba(255,255,255,0.06); color: #94a3b8;'}">
            ${agent.isInstalled ? 'Installed' : 'Custom binary'}
          </span>
        </div>
        <div class="agent-card-name">${agent.name}</div>
        <div class="agent-card-desc">${agent.description}</div>
        <button class="btn btn-primary agent-card-btn">
          Launch ${agent.name}
        </button>
      `;

      card.addEventListener('click', () => {
        launchAgent(agent.id);
      });

      elements.emptyAgentCards.appendChild(card);
    });
  }

  /**
   * Launch a new agent session
   */
  async function launchAgent(agentId, customOptions = {}) {
    try {
      showToast(`Launching ${agentId}...`);
      const payload = {
        agentId,
        cwd: customOptions.cwd || state.info?.cwd,
        customCommand: customOptions.command || null,
        customArgs: customOptions.args || [],
        customName: customOptions.name || null
      };

      const result = await window.API.createSession(payload);
      if (result.session) {
        attachSession(result.session);
        showToast(`${result.session.agentName} started!`, 'success');
      } else if (result.error) {
        showToast(`Failed: ${result.error}`, 'error');
      }
    } catch (err) {
      console.error('Launch agent error:', err);
      showToast('Error launching agent', 'error');
    }
  }

  /**
   * Attach a session into the DOM and instantiate xterm view
   */
  function attachSession(session) {
    if (state.sessions.has(session.id)) return;

    // 1. Create card DOM
    const cardEl = document.createElement('div');
    cardEl.className = 'terminal-card';
    cardEl.id = `card-${session.id}`;

    const profile = session.profile || {};
    const iconSvg = profile.icon || '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"/></svg>';
    const color = profile.color || '#06b6d4';

    cardEl.innerHTML = `
      <div class="card-header">
        <div class="card-title-group">
          <div class="agent-icon-badge" style="background: ${color};">
            ${iconSvg}
          </div>
          <span class="card-title" title="${session.command}">${session.agentName}</span>
          <span class="card-status-badge status-${session.status}" id="status-badge-${session.id}">
            ${session.status.toUpperCase()}
          </span>
        </div>
        <div class="card-actions">
          <button class="action-btn btn-maximize" title="Maximize/Restore Pane">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M15 3h6v6m-6 5 6 6M9 21H3v-6m6-5L3 3"/>
            </svg>
          </button>
          <button class="action-btn btn-restart" title="Restart Agent">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5"/>
              <path d="M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/>
            </svg>
          </button>
          <button class="action-btn btn-clear" title="Clear Screen">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
          <button class="action-btn btn-close" title="Terminate Agent">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="card-body">
        <div class="terminal-wrapper" id="term-wrap-${session.id}"></div>
      </div>
    `;

    elements.terminalsContainer.appendChild(cardEl);

    // 2. Create tab DOM
    const tabEl = document.createElement('button');
    tabEl.className = 'tab-btn';
    tabEl.id = `tab-${session.id}`;
    tabEl.innerHTML = `
      <span class="agent-icon-badge" style="background: ${color}; width: 16px; height: 16px;">
        ${iconSvg}
      </span>
      <span>${session.agentName}</span>
      <span class="tab-close" title="Close">&times;</span>
    `;

    tabEl.addEventListener('click', (e) => {
      if (e.target.classList.contains('tab-close')) {
        terminateSession(session.id);
      } else {
        switchTab(session.id);
      }
    });

    elements.tabsList.appendChild(tabEl);

    // 3. Instantiate TerminalView
    const wrapperEl = cardEl.querySelector(`#term-wrap-${session.id}`);
    const view = new window.TerminalView(wrapperEl, session, {
      onExit: (code) => {
        const badge = document.getElementById(`status-badge-${session.id}`);
        if (badge) {
          badge.className = 'card-status-badge status-exited';
          badge.textContent = `EXIT (${code})`;
        }
      }
    });

    // 4. Bind card action buttons
    const btnMax = cardEl.querySelector('.btn-maximize');
    const btnRestart = cardEl.querySelector('.btn-restart');
    const btnClear = cardEl.querySelector('.btn-clear');
    const btnClose = cardEl.querySelector('.btn-close');

    btnMax.addEventListener('click', () => toggleMaximize(session.id));
    btnRestart.addEventListener('click', () => restartSession(session.id));
    btnClear.addEventListener('click', () => view.clear());
    btnClose.addEventListener('click', () => terminateSession(session.id));

    // Focus on click
    cardEl.addEventListener('click', () => {
      view.focus();
    });

    // Store in state
    state.sessions.set(session.id, {
      session,
      view,
      cardEl,
      tabEl
    });

    // If tabs mode, switch to new tab
    if (state.activeLayout === 'tabs') {
      switchTab(session.id);
    }

    updateUIState();
    setTimeout(() => view.fit(), 50);
  }

  /**
   * Terminate a session
   */
  async function terminateSession(sessionId) {
    const item = state.sessions.get(sessionId);
    if (!item) return;

    try {
      await window.API.killSession(sessionId);
      item.view.destroy();
      item.cardEl.remove();
      item.tabEl.remove();
      state.sessions.delete(sessionId);

      if (state.maximizedId === sessionId) {
        state.maximizedId = null;
      }

      if (state.activeTabId === sessionId) {
        const remaining = Array.from(state.sessions.keys());
        if (remaining.length > 0) {
          switchTab(remaining[remaining.length - 1]);
        } else {
          state.activeTabId = null;
        }
      }

      updateUIState();
      refitAll();
      showToast('Agent terminated');
    } catch (e) {
      console.error('Error terminating session:', e);
    }
  }

  /**
   * Restart a session
   */
  async function restartSession(sessionId) {
    const item = state.sessions.get(sessionId);
    if (!item) return;

    try {
      showToast(`Restarting ${item.session.agentName}...`);
      const res = await window.API.restartSession(sessionId);
      if (res.session) {
        item.session = res.session;
        const badge = document.getElementById(`status-badge-${sessionId}`);
        if (badge) {
          badge.className = 'card-status-badge status-running';
          badge.textContent = 'RUNNING';
        }
        item.view.focus();
        showToast('Restarted!', 'success');
      }
    } catch (e) {
      console.error('Restart session error:', e);
    }
  }

  /**
   * Terminate all sessions
   */
  async function killAllSessions() {
    if (state.sessions.size === 0) return;
    if (!confirm('Are you sure you want to terminate ALL running agents?')) return;

    try {
      await window.API.killAll();
      for (const item of state.sessions.values()) {
        item.view.destroy();
        item.cardEl.remove();
        item.tabEl.remove();
      }
      state.sessions.clear();
      state.activeTabId = null;
      state.maximizedId = null;
      updateUIState();
      showToast('All agents stopped');
    } catch (e) {
      console.error('Kill all error:', e);
    }
  }

  /**
   * Toggle Maximize Pane
   */
  function toggleMaximize(sessionId) {
    const item = state.sessions.get(sessionId);
    if (!item) return;

    if (state.maximizedId === sessionId) {
      item.cardEl.classList.remove('maximized');
      state.maximizedId = null;
    } else {
      // Remove other maximized
      if (state.maximizedId) {
        const old = state.sessions.get(state.maximizedId);
        if (old) old.cardEl.classList.remove('maximized');
      }
      item.cardEl.classList.add('maximized');
      state.maximizedId = sessionId;
    }

    setTimeout(() => {
      item.view.fit();
      item.view.focus();
    }, 100);
  }

  /**
   * Set Layout Mode
   */
  function setLayout(layout) {
    state.activeLayout = layout;

    // Reset container class
    elements.workspaceContainer.className = `workspace-grid layout-${layout}`;

    // Update active layout button
    document.querySelectorAll('.layout-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.layout === layout);
    });

    // Toggle tabs strip
    if (layout === 'tabs') {
      elements.tabsStrip.style.display = 'flex';
      if (!state.activeTabId && state.sessions.size > 0) {
        state.activeTabId = Array.from(state.sessions.keys())[0];
      }
      if (state.activeTabId) {
        switchTab(state.activeTabId);
      }
    } else {
      elements.tabsStrip.style.display = 'none';
      // Reset cards visibility
      for (const item of state.sessions.values()) {
        item.cardEl.classList.remove('active-tab-card');
      }
    }

    refitAll();
  }

  /**
   * Switch Active Tab
   */
  function switchTab(sessionId) {
    state.activeTabId = sessionId;

    for (const [id, item] of state.sessions.entries()) {
      const isTarget = id === sessionId;
      item.tabEl.classList.toggle('active', isTarget);
      item.cardEl.classList.toggle('active-tab-card', isTarget);
      if (isTarget) {
        setTimeout(() => {
          item.view.fit();
          item.view.focus();
        }, 30);
      }
    }
  }

  /**
   * Refit all terminal views to their container dimensions
   */
  function refitAll() {
    requestAnimationFrame(() => {
      for (const item of state.sessions.values()) {
        item.view.fit();
      }
    });
  }

  /**
   * Transmit broadcast prompt
   */
  async function sendBroadcast() {
    const text = elements.broadcastInput.value.trim();
    if (!text) return;

    if (state.sessions.size === 0) {
      showToast('No active agents to broadcast to!', 'error');
      return;
    }

    const targetVal = elements.broadcastTargetSelect.value;
    const sessionIds = targetVal === 'all' ? null : [targetVal];

    try {
      showToast('Broadcasting prompt to agents...');
      const res = await window.API.broadcast(text, sessionIds);
      if (res.broadcastedTo) {
        const count = res.broadcastedTo.length;
        showToast(`Prompt transmitted to ${count} agent(s)!`, 'success');
        elements.broadcastInput.value = '';
      }
    } catch (e) {
      console.error('Broadcast error:', e);
      showToast('Failed to broadcast prompt', 'error');
    }
  }

  /**
   * Update UI Badges, Empty state, and Target selector
   */
  function updateUIState() {
    const count = state.sessions.size;

    // Status pill
    elements.activeSessionsCount.textContent = `${count} Active`;

    // Empty state toggle
    elements.emptyState.style.display = count === 0 ? 'flex' : 'none';
    elements.terminalsContainer.style.display = count === 0 ? 'none' : (state.activeLayout === 'tabs' ? 'block' : 'grid');

    // Update broadcast target dropdown
    elements.broadcastTargetSelect.innerHTML = '<option value="all">Target: All Active Agents</option>';
    for (const [id, item] of state.sessions.entries()) {
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = `Target: ${item.session.agentName}`;
      elements.broadcastTargetSelect.appendChild(opt);
    }
  }

  /**
   * Setup Event Listeners
   */
  function setupEventListeners() {
    // Launch Dropdown Toggle
    elements.launchDropdownBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      elements.launchDropdown.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
      if (!elements.launchDropdown.contains(e.target)) {
        elements.launchDropdown.classList.remove('open');
      }
    });

    // Layout switcher buttons
    document.querySelectorAll('.layout-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        setLayout(btn.dataset.layout);
      });
    });

    // Broadcast bar toggle
    elements.toggleBroadcastBtn.addEventListener('click', () => {
      state.broadcastOpen = !state.broadcastOpen;
      elements.broadcastBar.classList.toggle('collapsed', !state.broadcastOpen);
      refitAll();
    });

    // Send Broadcast
    elements.btnSendBroadcast.addEventListener('click', sendBroadcast);
    elements.broadcastInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        sendBroadcast();
      }
    });

    // Quick prompt chips
    document.querySelectorAll('.prompt-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        elements.broadcastInput.value = chip.dataset.prompt || '';
        elements.broadcastInput.focus();
      });
    });

    // Kill All
    elements.btnKillAll.addEventListener('click', killAllSessions);

    // Fullscreen toggle
    elements.btnFullscreen.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    });

    // Custom Command Modal
    elements.btnCustomAgent.addEventListener('click', () => {
      elements.launchDropdown.classList.remove('open');
      elements.customAgentModal.style.display = 'flex';
      elements.customCommandInput.focus();
    });

    elements.tabAddAgentBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      elements.launchDropdown.classList.toggle('open');
    });

    const closeModal = () => {
      elements.customAgentModal.style.display = 'none';
      elements.customAgentForm.reset();
    };

    elements.closeCustomModalBtn.addEventListener('click', closeModal);
    elements.cancelCustomModalBtn.addEventListener('click', closeModal);

    elements.customAgentForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const command = elements.customCommandInput.value.trim();
      if (!command) return;

      const argsStr = elements.customArgsInput.value.trim();
      const args = argsStr ? argsStr.split(/\s+/) : [];
      const name = elements.customNameInput.value.trim() || command;
      const cwd = elements.customCwdInput.value.trim() || state.info?.cwd;

      closeModal();
      launchAgent(command, { command, args, name, cwd });
    });

    // Window resize refit
    window.addEventListener('resize', () => {
      refitAll();
    });
  }

  /**
   * Lightweight toast notification
   */
  function showToast(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    if (type === 'success') toast.style.borderLeftColor = 'var(--status-running)';
    if (type === 'error') toast.style.borderLeftColor = 'var(--accent-rose)';

    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, 2800);
  }

  // Run on page load
  window.addEventListener('DOMContentLoaded', init);
})();
