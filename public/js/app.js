/**
 * Main Application Orchestrator for BEKFURR-AGENT-CLUSTER
 * Apple visionOS / macOS Dark Design & Virtual Desktop Window Manager
 */
(function () {
  const state = {
    info: null,
    detectedAgents: [],
    sessions: new Map(), // sessionId -> { session, view, cardEl, tabEl, statusTimer }
    activeLayout: 'vertical', // 'vertical' | 'horizontal' | 'desktop' | 'tabs'
    activeTabId: null,
    focusedId: null,
    maximizedId: null,
    minimizedSessions: new Set(),
    sessionStatuses: new Map(), // sessionId -> 'thinking' | 'done' | 'error' | 'waiting'
    desktopBounds: new Map(),   // sessionId -> { x, y, w, h }
    desktopIconPositions: new Map(), // sessionId -> { x, y } (Draggable Minimized Icons)
    customAgents: [],           // User-defined saved custom agents from localStorage
    topZIndex: 10,
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
    emptyLaunchPrimaryBtn: document.getElementById('emptyLaunchPrimaryBtn'),
    terminalsContainer: document.getElementById('terminalsContainer'),
    minimizedDock: document.getElementById('minimizedDock'),
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
    saveOnlyCustomModalBtn: document.getElementById('saveOnlyCustomModalBtn'),
    launchCustomModalBtn: document.getElementById('launchCustomModalBtn'),
    customSavePreset: document.getElementById('customSavePreset'),
    customCommandInput: document.getElementById('customCommandInput'),
    customArgsInput: document.getElementById('customArgsInput'),
    customNameInput: document.getElementById('customNameInput'),
    customCwdInput: document.getElementById('customCwdInput'),

    // Usage Modal Elements
    btnUsageModal: document.getElementById('btnUsageModal'),
    navTotalTokensBadge: document.getElementById('navTotalTokensBadge'),
    usageModal: document.getElementById('usageModal'),
    closeUsageModalBtn: document.getElementById('closeUsageModalBtn'),
    btnCloseUsageModalBottom: document.getElementById('btnCloseUsageModalBottom'),
    btnResetUsageStats: document.getElementById('btnResetUsageStats'),
    usageTotalTokens: document.getElementById('usageTotalTokens'),
    usagePromptCompSub: document.getElementById('usagePromptCompSub'),
    usageModelsCount: document.getElementById('usageModelsCount'),
    usageSessionsCount: document.getElementById('usageSessionsCount'),
    usageModelsList: document.getElementById('usageModelsList'),
    usageAgentsList: document.getElementById('usageAgentsList'),
    usageSessionsTableBody: document.getElementById('usageSessionsTableBody'),

    // Switch Directory Elements
    switchDirModal: document.getElementById('switchDirModal'),
    closeSwitchDirModalBtn: document.getElementById('closeSwitchDirModalBtn'),
    cancelSwitchDirModalBtn: document.getElementById('cancelSwitchDirModalBtn'),
    confirmSwitchDirBtn: document.getElementById('confirmSwitchDirBtn'),
    switchDirForm: document.getElementById('switchDirForm'),
    switchDirSessionId: document.getElementById('switchDirSessionId'),
    switchDirAgentName: document.getElementById('switchDirAgentName'),
    switchDirInput: document.getElementById('switchDirInput')
  };

  /**
   * Initialize App
   */
  async function init() {
    loadCustomAgents();
    setupEventListeners();
    setupKeyboardShortcuts();
    setupContainerScrollHandling();
    await loadInfo();
    await loadAgents();
    await loadExistingSessions();
    await loadUsageSummary();
    setInterval(() => loadUsageSummary(), 10000);
    setLayout(state.activeLayout);
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
   * Load User Saved Custom Agents from localStorage
   */
  function loadCustomAgents() {
    try {
      const stored = localStorage.getItem('bek_cluster_custom_agents');
      if (stored) {
        state.customAgents = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to parse custom agents from localStorage:', e);
      state.customAgents = [];
    }
  }

  /**
   * Save a Custom Agent to Presets
   */
  function saveCustomAgent(agentData) {
    const existingIndex = state.customAgents.findIndex(a => a.id === agentData.id);
    if (existingIndex >= 0) {
      state.customAgents[existingIndex] = agentData;
    } else {
      state.customAgents.push(agentData);
    }
    try {
      localStorage.setItem('bek_cluster_custom_agents', JSON.stringify(state.customAgents));
    } catch (e) {
      console.error('Failed to save custom agent to localStorage:', e);
    }
    renderAgentMenus();
  }

  /**
   * Delete a Custom Agent from Presets
   */
  function deleteCustomAgent(agentId, e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    state.customAgents = state.customAgents.filter(a => a.id !== agentId);
    try {
      localStorage.setItem('bek_cluster_custom_agents', JSON.stringify(state.customAgents));
    } catch (e) {
      console.error('Failed to update localStorage:', e);
    }
    renderAgentMenus();
    showToast('Custom agent removed');
  }

  /**
   * Render Launch Menus & Empty State Cards
   */
  function renderAgentMenus() {
    // 1. Quick Dropdown Menu
    if (elements.quickAgentList) {
      elements.quickAgentList.innerHTML = '';

      // Standard detected agents
      state.detectedAgents.forEach(agent => {
        const item = document.createElement('button');
        item.className = 'dropdown-item';
        item.type = 'button';
        item.innerHTML = `
          <span class="agent-icon-badge" style="background: ${agent.gradient || 'rgba(255,255,255,0.06)'}; color: ${agent.color || 'var(--text)'};">
            ${agent.icon || ''}
          </span>
          <span class="dropdown-item-name">${agent.name}</span>
          <span class="badge ${agent.isInstalled ? 'badge-ready' : 'badge-dim'}">
            ${agent.isInstalled ? 'Ready' : 'Not found'}
          </span>
        `;
        item.addEventListener('click', () => {
          elements.launchDropdown.classList.remove('open');
          launchAgent(agent.id);
        });
        elements.quickAgentList.appendChild(item);
      });

      // User Saved Custom Agents in Dropdown
      if (state.customAgents && state.customAgents.length > 0) {
        const sep = document.createElement('div');
        sep.className = 'dropdown-header';
        sep.textContent = 'SAVED CUSTOM AGENTS';
        elements.quickAgentList.appendChild(sep);

        state.customAgents.forEach(cAgent => {
          const item = document.createElement('button');
          item.className = 'dropdown-item';
          item.type = 'button';
          item.innerHTML = `
            <span class="agent-icon-badge" style="background: rgba(139, 92, 246, 0.15); color: #A78BFA;">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="4 17 10 11 4 5"/>
                <line x1="12" y1="19" x2="20" y2="19"/>
              </svg>
            </span>
            <span class="dropdown-item-name">${cAgent.name}</span>
            <span class="badge" style="background: rgba(139, 92, 246, 0.15); color: #A78BFA;">Custom</span>
          `;
          item.addEventListener('click', () => {
            elements.launchDropdown.classList.remove('open');
            launchAgent(cAgent.command, {
              command: cAgent.command,
              args: cAgent.args,
              name: cAgent.name,
              cwd: cAgent.cwd
            });
          });
          elements.quickAgentList.appendChild(item);
        });
      }
    }

    // 2. Empty State Cards (Horizontal 3-row grid expanding horizontally)
    if (elements.emptyAgentCards) {
      elements.emptyAgentCards.innerHTML = '';

      // A. Standard detected agents
      state.detectedAgents.forEach(agent => {
        const card = document.createElement('div');
        card.className = 'agent-card-item';
        card.setAttribute('role', 'button');
        card.tabIndex = 0;
        card.title = `${agent.name}: ${agent.description || ''}`;
        card.innerHTML = `
          <div class="agent-card-icon" style="background: ${agent.gradient || 'rgba(255,255,255,0.06)'}; color: ${agent.color || 'var(--text)'};">
            ${agent.icon || ''}
          </div>
          <div class="agent-card-content">
            <div class="agent-card-header-line">
              <span class="agent-card-name">${agent.name}</span>
              <span class="agent-installed-badge ${agent.isInstalled ? 'installed' : 'uninstalled'}">
                ${agent.isInstalled ? 'Installed' : 'Custom'}
              </span>
            </div>
            <span class="agent-card-desc">${agent.description || ''}</span>
          </div>
          <div class="agent-card-action" title="Launch ${agent.name}">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
          </div>
        `;

        const triggerLaunch = () => launchAgent(agent.id);
        card.addEventListener('click', triggerLaunch);
        card.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            triggerLaunch();
          }
        });

        elements.emptyAgentCards.appendChild(card);
      });

      // B. User Saved Custom Agents
      if (state.customAgents && state.customAgents.length > 0) {
        state.customAgents.forEach(cAgent => {
          const card = document.createElement('div');
          card.className = 'agent-card-item';
          card.setAttribute('role', 'button');
          card.tabIndex = 0;
          card.title = `Custom: ${cAgent.name} (${cAgent.command})`;
          card.innerHTML = `
            <div class="agent-card-icon" style="background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(109, 40, 217, 0.1)); color: #A78BFA;">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="4 17 10 11 4 5"/>
                <line x1="12" y1="19" x2="20" y2="19"/>
              </svg>
            </div>
            <div class="agent-card-content">
              <div class="agent-card-header-line">
                <span class="agent-card-name">${cAgent.name}</span>
                <span class="agent-installed-badge custom">Custom</span>
              </div>
              <span class="agent-card-desc">${cAgent.command}${cAgent.args?.length ? ' ' + cAgent.args.join(' ') : ''}</span>
            </div>
            <div class="agent-card-action" title="Launch ${cAgent.name}">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
            </div>
            <button class="agent-card-delete-btn" type="button" title="Remove custom agent">
              <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          `;

          const triggerLaunch = () => launchAgent(cAgent.command, {
            command: cAgent.command,
            args: cAgent.args,
            name: cAgent.name,
            cwd: cAgent.cwd
          });

          card.addEventListener('click', (e) => {
            if (e.target.closest('.agent-card-delete-btn')) return;
            triggerLaunch();
          });

          card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              triggerLaunch();
            }
          });

          const delBtn = card.querySelector('.agent-card-delete-btn');
          if (delBtn) {
            delBtn.addEventListener('click', (e) => {
              deleteCustomAgent(cAgent.id, e);
            });
          }

          elements.emptyAgentCards.appendChild(card);
        });
      }

      // C. "+ Add Custom Agent" Card
      const addCard = document.createElement('div');
      addCard.className = 'agent-card-item card-add-custom';
      addCard.setAttribute('role', 'button');
      addCard.tabIndex = 0;
      addCard.title = 'Add a new custom CLI agent to available list';
      addCard.innerHTML = `
        <div class="agent-card-icon">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </div>
        <div class="agent-card-content">
          <div class="agent-card-header-line">
            <span class="agent-card-name">Add Custom Agent</span>
            <span class="agent-installed-badge" style="background: rgba(229, 56, 59, 0.15); color: var(--accent);">+ Add</span>
          </div>
          <span class="agent-card-desc">Add any CLI binary or prompt tool</span>
        </div>
        <div class="agent-card-action">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 12h14m-7-7 7 7-7 7"/>
          </svg>
        </div>
      `;

      const openAddModal = () => {
        elements.customAgentModal.style.display = 'flex';
        elements.customCommandInput.focus();
      };

      addCard.addEventListener('click', openAddModal);
      addCard.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openAddModal();
        }
      });

      elements.emptyAgentCards.appendChild(addCard);
    }
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
        showToast(`${result.session.agentName} started`, 'success');
      } else if (result.error) {
        showToast(`Failed: ${result.error}`, 'error');
      }
    } catch (err) {
      console.error('Launch agent error:', err);
      showToast('Error launching agent', 'error');
    }
  }

  /**
   * Status Detection & Update (Thinking / Done / Error / Waiting)
   * sariq: o'ylayapti, yashil: bo'ldi, qizil: muammo, ko'k: tasdiqlashni kutyapti
   */
  function setSessionStatus(sessionId, status) {
    state.sessionStatuses.set(sessionId, status);

    const labels = {
      thinking: "O'ylayapti...",
      done: "Bo'ldi (Tayyor)",
      error: "Muammo (Xatolik)",
      waiting: "Tasdiqlashni kutyapti"
    };

    // Update status dot on terminal card
    const cardDot = document.getElementById(`status-dot-${sessionId}`);
    if (cardDot) {
      cardDot.className = `agent-status-dot state-${status}`;
      cardDot.title = `${labels[status] || status}`;
    }

    // Update desktop minimized icon status dot
    const desktopDot = document.getElementById(`desktop-status-${sessionId}`);
    if (desktopDot) {
      desktopDot.className = `desktop-icon-status state-${status}`;
    }

    // Update dock status dot if minimized
    const dockDot = document.getElementById(`dock-status-${sessionId}`);
    if (dockDot) {
      dockDot.className = `dock-status-dot state-${status}`;
      const tooltip = dockDot.parentElement?.querySelector('.dock-item-tooltip');
      const item = state.sessions.get(sessionId);
      if (tooltip && item) {
        tooltip.textContent = `${item.session.agentName} • ${labels[status] || status}`;
      }
    }
  }

  /**
   * Set active focused session pane
   */
  function setFocus(sessionId) {
    state.focusedId = sessionId;
    for (const [id, item] of state.sessions.entries()) {
      const isFocused = id === sessionId;
      item.cardEl.classList.toggle('focused', isFocused);
    }
    bringToFront(sessionId);
  }

  /**
   * Bring window to front in Virtual Desktop
   */
  function bringToFront(sessionId) {
    const item = state.sessions.get(sessionId);
    if (!item) return;
    state.topZIndex += 1;
    // Cap at 850 so windows never occlude top-nav (1000) or launch menu (1100)
    if (state.topZIndex > 850) {
      state.topZIndex = 11;
      for (const [id, s] of state.sessions.entries()) {
        if (id !== sessionId) {
          s.cardEl.style.zIndex = '10';
        }
      }
    }
    item.cardEl.style.zIndex = String(state.topZIndex);
  }

  /**
   * Update pane numbers (1..6) badges
   */
  function updatePaneBadges() {
    let index = 1;
    for (const [id, item] of state.sessions.entries()) {
      const badge = item.cardEl.querySelector('.pane-shortcut-badge');
      if (badge) {
        badge.textContent = index <= 6 ? `⌘${index}` : '';
        badge.style.display = index <= 6 ? 'inline-flex' : 'none';
      }
      index++;
    }
  }

  /**
   * Update container active count classes for responsive split sizing
   */
  function updateContainerCounts() {
    const visibleCount = Array.from(state.sessions.keys())
      .filter(id => !state.minimizedSessions.has(id)).length;

    elements.terminalsContainer.classList.remove('count-1', 'count-2', 'count-3', 'count-more');
    if (visibleCount === 1) {
      elements.terminalsContainer.classList.add('count-1');
    } else if (visibleCount === 2) {
      elements.terminalsContainer.classList.add('count-2');
    } else if (visibleCount === 3) {
      elements.terminalsContainer.classList.add('count-3');
    } else if (visibleCount > 3) {
      elements.terminalsContainer.classList.add('count-more');
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
    const iconSvg = profile.icon || '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="9"/></svg>';
    const color = profile.color || 'var(--text-dim)';
    const gradient = profile.gradient || 'rgba(255,255,255,0.06)';

    cardEl.innerHTML = `
      <div class="card-header" id="header-${session.id}">
        <div class="card-title-group">
          <div class="agent-icon-badge" style="background: ${gradient}; color: ${color};">
            ${iconSvg}
          </div>
          <span class="card-title" title="${session.command || session.agentName}">${session.agentName}</span>
          <button class="pane-cwd-pill" type="button" title="Directory: ${session.cwd || 'Workspace'}. Click to change & restart" data-session-id="${session.id}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
            <span class="pane-cwd-text">${formatCwdShort(session.cwd)}</span>
          </button>
          <span class="agent-status-dot state-done" id="status-dot-${session.id}" title="Ready"></span>
          <span class="pane-shortcut-badge" title="Focus: ⌘+Number"></span>
        </div>
        <div class="card-actions">
          <button class="action-btn btn-minimize" title="Minimize to Dock (-)" aria-label="Minimize">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
          <button class="action-btn btn-maximize" title="Maximize Pane (+)" aria-label="Maximize">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M15 3h6v6m-6 5 6 6M9 21H3v-6m6-5L3 3"/>
            </svg>
          </button>
          <button class="action-btn btn-restart" title="Restart Agent" aria-label="Restart">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5"/>
              <path d="M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/>
            </svg>
          </button>
          <button class="action-btn btn-clear" title="Clear Screen" aria-label="Clear">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
          <button class="action-btn btn-close" title="Terminate Agent" aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="card-body">
        <div class="terminal-wrapper" id="term-wrap-${session.id}"></div>
      </div>
      <!-- Virtual Desktop Minimized Draggable Icon View -->
      <div class="desktop-icon-widget" id="desktop-icon-${session.id}" title="${session.agentName} (Click to Restore, Drag to Reposition)">
        <span class="desktop-icon-status state-done" id="desktop-status-${session.id}"></span>
        <div class="desktop-icon-glyph" style="color: ${color};">
          ${iconSvg}
        </div>
        <span class="desktop-icon-label">${session.agentName}</span>
      </div>
      <!-- Virtual Desktop Resize Handles (8 Directions) -->
      <div class="resize-handle rh-e" data-dir="e"></div>
      <div class="resize-handle rh-w" data-dir="w"></div>
      <div class="resize-handle rh-s" data-dir="s"></div>
      <div class="resize-handle rh-n" data-dir="n"></div>
      <div class="resize-handle rh-se" data-dir="se"></div>
      <div class="resize-handle rh-sw" data-dir="sw"></div>
      <div class="resize-handle rh-ne" data-dir="ne"></div>
      <div class="resize-handle rh-nw" data-dir="nw"></div>
    `;

    elements.terminalsContainer.appendChild(cardEl);

    // 2. Create tab DOM
    const tabEl = document.createElement('button');
    tabEl.className = 'tab-btn';
    tabEl.id = `tab-${session.id}`;
    tabEl.type = 'button';
    tabEl.innerHTML = `
      <span class="agent-icon-badge" style="background: ${gradient}; color: ${color}; width: 18px; height: 18px;">
        ${iconSvg}
      </span>
      <span class="tab-label">${session.agentName}</span>
      <span class="tab-close" title="Close" aria-label="Close tab">&times;</span>
    `;

    tabEl.addEventListener('click', (e) => {
      if (e.target.classList.contains('tab-close')) {
        terminateSession(session.id);
      } else {
        switchTab(session.id);
      }
    });

    elements.tabsList.appendChild(tabEl);

    // 3. Instantiate TerminalView with Stream Analyzer for real-time status
    const wrapperEl = cardEl.querySelector(`#term-wrap-${session.id}`);
    let statusTimer = null;

    const view = new window.TerminalView(wrapperEl, session, {
      onInput: () => {
        // User sent keyboard input, switch to thinking
        setSessionStatus(session.id, 'thinking');
      },
      onOutput: (chunk) => {
        if (!chunk) return;

        // Heuristic analysis of stream chunks
        const hasPrompt = /(\?|\[y\/n\]|\(y\/n\)|❯|confirm|allow\?|proceed\?|select|choice:|input:)/i.test(chunk);
        const hasError = /(error:|fatal:|exception:|failed with code)/i.test(chunk);

        if (hasError) {
          setSessionStatus(session.id, 'error');
        } else if (hasPrompt) {
          setSessionStatus(session.id, 'waiting');
        } else {
          setSessionStatus(session.id, 'thinking');
        }

        // Auto-revert thinking to done after stream goes idle for 1.4s
        clearTimeout(statusTimer);
        statusTimer = setTimeout(() => {
          const current = state.sessionStatuses.get(session.id);
          if (current === 'thinking') {
            setSessionStatus(session.id, 'done');
          }
        }, 1400);
      },
      onHistory: (historyData) => {
        if (historyData) {
          setSessionStatus(session.id, 'done');
        }
      },
      onExit: (code) => {
        setSessionStatus(session.id, code === 0 ? 'done' : 'error');
      }
    });

    // 4. Bind card action buttons
    const btnMinimize = cardEl.querySelector('.btn-minimize');
    const btnMax = cardEl.querySelector('.btn-maximize');
    const btnRestart = cardEl.querySelector('.btn-restart');
    const btnClear = cardEl.querySelector('.btn-clear');
    const btnClose = cardEl.querySelector('.btn-close');

    btnMinimize.addEventListener('click', (e) => {
      e.stopPropagation();
      minimizeSession(session.id);
    });
    btnMax.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMaximize(session.id);
    });
    btnRestart.addEventListener('click', (e) => {
      e.stopPropagation();
      restartSession(session.id);
    });

    const cwdPill = cardEl.querySelector('.pane-cwd-pill');
    if (cwdPill) {
      cwdPill.addEventListener('click', (e) => {
        e.stopPropagation();
        openSwitchDirModal(session.id);
      });
    }

    btnClear.addEventListener('click', (e) => {
      e.stopPropagation();
      view.clear();
    });
    btnClose.addEventListener('click', (e) => {
      e.stopPropagation();
      terminateSession(session.id);
    });

    // Focus on mousedown
    cardEl.addEventListener('mousedown', () => {
      setFocus(session.id);
      view.focus();
    });

    // 6. Setup Desktop Window Drag & Pinch-Resize + Minimized Desktop Icon Drag
    setupDesktopWindowControls(cardEl, session.id, view);
    setupDesktopIconControls(cardEl, session.id);

    // Initial status: done/ready
    setSessionStatus(session.id, 'done');

    // Store in state
    state.sessions.set(session.id, {
      session,
      view,
      cardEl,
      tabEl,
      statusTimer
    });

    // Set initial bounds for Desktop mode
    const count = state.sessions.size;
    const offset = (count - 1) * 32;
    state.desktopBounds.set(session.id, {
      x: 30 + (offset % 180),
      y: 20 + (offset % 150),
      w: Math.min(620, Math.max(380, window.innerWidth - 100)),
      h: Math.min(440, Math.max(260, window.innerHeight - 200))
    });

    if (state.activeLayout === 'desktop') {
      applyDesktopBounds(sessionIdOrCard(cardEl), session.id);
    }

    setFocus(session.id);
    updatePaneBadges();
    updateContainerCounts();

    if (state.activeLayout === 'tabs') {
      switchTab(session.id);
    }

    updateUIState();
    setTimeout(() => {
      view.fit();
      view.focus();
    }, 80);
  }

  function sessionIdOrCard(cardEl) {
    return cardEl;
  }

  /**
   * Setup Desktop Window Dragging & Pinch-Resizing
   */
  function setupDesktopWindowControls(cardEl, sessionId, view) {
    const header = cardEl.querySelector('.card-header');

    // Drag Window by Header
    header.addEventListener('mousedown', (e) => {
      if (state.activeLayout !== 'desktop' || state.maximizedId === sessionId) return;
      if (e.target.closest('.card-actions')) return; // Ignore action buttons

      e.preventDefault();
      bringToFront(sessionId);
      setFocus(sessionId);

      const startMouseX = e.clientX;
      const startMouseY = e.clientY;
      const rect = cardEl.getBoundingClientRect();
      const parentRect = elements.terminalsContainer.getBoundingClientRect();

      const startLeft = rect.left - parentRect.left;
      const startTop = rect.top - parentRect.top;

      function onMouseMove(moveEvent) {
        const dx = moveEvent.clientX - startMouseX;
        const dy = moveEvent.clientY - startMouseY;

        const newLeft = Math.max(0, Math.min(parentRect.width - 120, startLeft + dx));
        const newTop = Math.max(0, Math.min(parentRect.height - 40, startTop + dy));

        cardEl.style.left = `${newLeft}px`;
        cardEl.style.top = `${newTop}px`;

        const bounds = state.desktopBounds.get(sessionId) || {};
        bounds.x = newLeft;
        bounds.y = newTop;
        state.desktopBounds.set(sessionId, bounds);
      }

      function onMouseUp() {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        view.fit();
      }

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    });

    // Resize Window by 8 Resize Handles (Chimdib o'lcham o'zgartirish)
    cardEl.querySelectorAll('.resize-handle').forEach(handle => {
      handle.addEventListener('mousedown', (e) => {
        if (state.activeLayout !== 'desktop' || state.maximizedId === sessionId) return;
        e.preventDefault();
        e.stopPropagation();

        bringToFront(sessionId);
        setFocus(sessionId);

        const dir = handle.dataset.dir;
        const startMouseX = e.clientX;
        const startMouseY = e.clientY;
        const rect = cardEl.getBoundingClientRect();
        const parentRect = elements.terminalsContainer.getBoundingClientRect();

        const startLeft = rect.left - parentRect.left;
        const startTop = rect.top - parentRect.top;
        const startWidth = rect.width;
        const startHeight = rect.height;

        function onMouseMove(moveEvent) {
          const dx = moveEvent.clientX - startMouseX;
          const dy = moveEvent.clientY - startMouseY;

          let newWidth = startWidth;
          let newHeight = startHeight;
          let newLeft = startLeft;
          let newTop = startTop;

          if (dir.includes('e')) {
            newWidth = Math.max(340, Math.min(parentRect.width - startLeft, startWidth + dx));
          }
          if (dir.includes('s')) {
            newHeight = Math.max(220, Math.min(parentRect.height - startTop, startHeight + dy));
          }
          if (dir.includes('w')) {
            const potentialWidth = startWidth - dx;
            if (potentialWidth >= 340 && startLeft + dx >= 0) {
              newWidth = potentialWidth;
              newLeft = startLeft + dx;
            }
          }
          if (dir.includes('n')) {
            const potentialHeight = startHeight - dy;
            if (potentialHeight >= 220 && startTop + dy >= 0) {
              newHeight = potentialHeight;
              newTop = startTop + dy;
            }
          }

          cardEl.style.width = `${newWidth}px`;
          cardEl.style.height = `${newHeight}px`;
          cardEl.style.left = `${newLeft}px`;
          cardEl.style.top = `${newTop}px`;

          state.desktopBounds.set(sessionId, {
            x: newLeft,
            y: newTop,
            w: newWidth,
            h: newHeight
          });

          view.fit();
        }

        function onMouseUp() {
          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('mouseup', onMouseUp);
          view.fit();
        }

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
      });
    });
  }

  /**
   * Setup Dragging & Restoring for Minimized Desktop Icon Widget
   */
  function setupDesktopIconControls(cardEl, sessionId) {
    const iconWidget = cardEl.querySelector('.desktop-icon-widget');
    if (!iconWidget) return;

    iconWidget.addEventListener('mousedown', (e) => {
      if (state.activeLayout !== 'desktop' || !cardEl.classList.contains('minimized')) return;
      e.preventDefault();
      e.stopPropagation();

      bringToFront(sessionId);

      const startMouseX = e.clientX;
      const startMouseY = e.clientY;
      const rect = cardEl.getBoundingClientRect();
      const parentRect = elements.terminalsContainer.getBoundingClientRect();

      const startLeft = rect.left - parentRect.left;
      const startTop = rect.top - parentRect.top;

      let hasMoved = false;

      function onMouseMove(moveEvent) {
        const dx = moveEvent.clientX - startMouseX;
        const dy = moveEvent.clientY - startMouseY;

        if (Math.hypot(dx, dy) > 4) {
          hasMoved = true;
        }

        const newLeft = Math.max(8, Math.min(parentRect.width - 86, startLeft + dx));
        const newTop = Math.max(8, Math.min(parentRect.height - 92, startTop + dy));

        cardEl.style.left = `${newLeft}px`;
        cardEl.style.top = `${newTop}px`;

        state.desktopIconPositions.set(sessionId, { x: newLeft, y: newTop });
      }

      function onMouseUp() {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);

        if (!hasMoved) {
          // Simple click on icon restores window back to normal size
          restoreSession(sessionId);
        }
      }

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    });
  }

  /**
   * Apply desktop positioning to card
   */
  function applyDesktopBounds(cardEl, sessionId) {
    const bounds = state.desktopBounds.get(sessionId);
    if (!bounds) return;
    cardEl.style.left = `${bounds.x}px`;
    cardEl.style.top = `${bounds.y}px`;
    cardEl.style.width = `${bounds.w}px`;
    cardEl.style.height = `${bounds.h}px`;
  }

  /**
   * Reset inline position styles when leaving desktop layout
   */
  function clearDesktopBounds(cardEl) {
    cardEl.style.left = '';
    cardEl.style.top = '';
    cardEl.style.width = '';
    cardEl.style.height = '';
  }

  /**
   * Minimize session to Dock or Desktop Draggable Icon ("-" function)
   */
  function minimizeSession(sessionId) {
    const item = state.sessions.get(sessionId);
    if (!item) return;

    item.cardEl.classList.add('minimized');
    state.minimizedSessions.add(sessionId);

    // If maximized, restore
    if (state.maximizedId === sessionId) {
      item.cardEl.classList.remove('maximized');
      state.maximizedId = null;
    }

    if (state.activeLayout === 'desktop') {
      // In Desktop mode, position the minimized icon widget directly on desktop
      const currentBounds = state.desktopBounds.get(sessionId) || { x: 30, y: 20 };
      const iconPos = state.desktopIconPositions.get(sessionId) || { x: currentBounds.x, y: currentBounds.y };
      item.cardEl.style.left = `${iconPos.x}px`;
      item.cardEl.style.top = `${iconPos.y}px`;
      item.cardEl.style.width = '';
      item.cardEl.style.height = '';
      state.desktopIconPositions.set(sessionId, iconPos);
      bringToFront(sessionId);
      showToast(`${item.session.agentName} minimized to desktop`);
    } else {
      showToast(`${item.session.agentName} minimized to dock`);
    }

    renderMinimizedDock();
    updateContainerCounts();

    // If active tab was minimized, switch to another visible tab
    if (state.activeLayout === 'tabs' && state.activeTabId === sessionId) {
      const visible = Array.from(state.sessions.keys()).filter(id => !state.minimizedSessions.has(id));
      if (visible.length > 0) {
        switchTab(visible[0]);
      } else {
        state.activeTabId = null;
      }
    }

    refitAll();
  }

  /**
   * Restore session from Dock or Desktop Icon
   */
  function restoreSession(sessionId) {
    const item = state.sessions.get(sessionId);
    if (!item) return;

    item.cardEl.classList.remove('minimized');
    state.minimizedSessions.delete(sessionId);

    renderMinimizedDock();
    updateContainerCounts();

    if (state.activeLayout === 'desktop') {
      applyDesktopBounds(item.cardEl, sessionId);
      bringToFront(sessionId);
    } else if (state.activeLayout === 'tabs') {
      switchTab(sessionId);
    }

    setFocus(sessionId);
    setTimeout(() => {
      item.view.fit();
      item.view.focus();
    }, 60);

    refitAll();
  }

  /**
   * Render Minimized Agents in Bottom Dock
   */
  function renderMinimizedDock() {
    if (!elements.minimizedDock) return;
    elements.minimizedDock.innerHTML = '';

    if (state.minimizedSessions.size === 0) {
      elements.minimizedDock.style.display = 'none';
      return;
    }

    elements.minimizedDock.style.display = 'flex';

    for (const sessionId of state.minimizedSessions) {
      const item = state.sessions.get(sessionId);
      if (!item) continue;

      const profile = item.session.profile || {};
      const iconSvg = profile.icon || '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="9"/></svg>';
      const color = profile.color || 'var(--text-dim)';
      const status = state.sessionStatuses.get(sessionId) || 'done';

      const labels = {
        thinking: "O'ylayapti...",
        done: "Bo'ldi (Tayyor)",
        error: "Muammo",
        waiting: "Tasdiqlashni kutyapti"
      };

      const tile = document.createElement('div');
      tile.className = 'dock-item';
      tile.title = `${item.session.agentName} (Click to Restore)`;
      tile.innerHTML = `
        <div style="color: ${color}; display: flex; align-items: center; justify-content: center;">
          ${iconSvg}
        </div>
        <span class="dock-status-dot state-${status}" id="dock-status-${sessionId}"></span>
        <div class="dock-item-tooltip">${item.session.agentName} • ${labels[status] || status}</div>
      `;

      tile.addEventListener('click', () => {
        restoreSession(sessionId);
      });

      elements.minimizedDock.appendChild(tile);
    }
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
      state.minimizedSessions.delete(sessionId);
      state.sessionStatuses.delete(sessionId);
      state.desktopBounds.delete(sessionId);

      if (state.maximizedId === sessionId) {
        state.maximizedId = null;
      }

      if (state.focusedId === sessionId) {
        const remaining = Array.from(state.sessions.keys());
        state.focusedId = remaining.length > 0 ? remaining[remaining.length - 1] : null;
        if (state.focusedId) {
          setFocus(state.focusedId);
        }
      }

      if (state.activeTabId === sessionId) {
        const remaining = Array.from(state.sessions.keys()).filter(id => !state.minimizedSessions.has(id));
        if (remaining.length > 0) {
          switchTab(remaining[remaining.length - 1]);
        } else {
          state.activeTabId = null;
        }
      }

      renderMinimizedDock();
      updatePaneBadges();
      updateContainerCounts();
      updateUIState();
      refitAll();
      showToast('Agent terminated');
    } catch (e) {
      console.error('Error terminating session:', e);
    }
  }

  /**
   * Helper formatting functions
   */
  function formatCwdShort(cwd) {
    if (!cwd) return 'Workspace';
    const clean = cwd.replace(/\\/g, '/');
    const parts = clean.split('/').filter(Boolean);
    if (parts.length <= 2) return '/' + parts.join('/');
    return '.../' + parts.slice(-2).join('/');
  }

  function formatTokens(num) {
    if (num === undefined || num === null) return '0';
    return Number(num).toLocaleString();
  }

  function formatTokensShort(num) {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return String(num);
  }

  /**
   * Switch Working Directory Modal Controls
   */
  function openSwitchDirModal(sessionId) {
    const item = state.sessions.get(sessionId);
    if (!item) return;

    elements.switchDirSessionId.value = sessionId;
    elements.switchDirAgentName.innerHTML = `Agent: <strong>${item.session.agentName}</strong> &bull; Current: <span style="font-family:var(--font-mono);font-size:11px;">${item.session.cwd || state.info?.cwd || ''}</span>`;
    elements.switchDirInput.value = item.session.cwd || state.info?.cwd || '';
    elements.switchDirModal.style.display = 'flex';
    elements.switchDirInput.focus();
    elements.switchDirInput.select();
  }

  function closeSwitchDirModal() {
    elements.switchDirModal.style.display = 'none';
    elements.switchDirForm.reset();
  }

  async function handleSwitchDirSubmit(e) {
    e.preventDefault();
    const sessionId = elements.switchDirSessionId.value;
    const newCwd = elements.switchDirInput.value.trim();
    if (!sessionId || !newCwd) return;

    const item = state.sessions.get(sessionId);
    if (!item) return;

    closeSwitchDirModal();
    showToast(`Restarting ${item.session.agentName} in new directory...`);

    try {
      const res = await window.API.restartSession(sessionId, newCwd);
      if (res.session) {
        item.session = res.session;
        const pill = item.cardEl.querySelector('.pane-cwd-pill');
        if (pill) {
          pill.title = `Directory: ${res.session.cwd}. Click to change & restart`;
          const textEl = pill.querySelector('.pane-cwd-text');
          if (textEl) textEl.textContent = formatCwdShort(res.session.cwd);
        }
        setSessionStatus(sessionId, 'thinking');
        setTimeout(() => setSessionStatus(sessionId, 'done'), 1500);
        setFocus(sessionId);
        item.view.focus();
        showToast(`Directory updated & ${item.session.agentName} restarted`, 'success');
      }
    } catch (err) {
      console.error('Failed to change directory:', err);
      showToast('Directory switch failed', 'error');
    }
  }

  /**
   * Token & Model Usage Analytics Controls
   */
  async function loadUsageSummary(renderModalContent = false) {
    try {
      const summary = await window.API.getUsage();
      if (!summary) return;

      // Update Top Nav Live Badge
      if (elements.navTotalTokensBadge) {
        elements.navTotalTokensBadge.textContent = `${formatTokensShort(summary.totalTokens)} tkn`;
        elements.navTotalTokensBadge.title = `Total: ${formatTokens(summary.totalTokens)} tokens (Prompt: ${formatTokens(summary.totalPromptTokens)}, Completion: ${formatTokens(summary.totalCompletionTokens)})`;
      }

      // If modal is open or explicitly requested, populate modal content
      if (renderModalContent || (elements.usageModal && elements.usageModal.style.display !== 'none')) {
        renderUsageModalData(summary);
      }
    } catch (e) {
      console.warn('Failed to load usage summary:', e);
    }
  }

  function renderUsageModalData(summary) {
    if (!summary) return;

    // 1. KPI Cards
    if (elements.usageTotalTokens) {
      elements.usageTotalTokens.textContent = formatTokens(summary.totalTokens);
    }
    if (elements.usagePromptCompSub) {
      elements.usagePromptCompSub.textContent = `Prompt: ${formatTokens(summary.totalPromptTokens)} • Completion: ${formatTokens(summary.totalCompletionTokens)}`;
    }
    const modelKeys = Object.keys(summary.models || {});
    if (elements.usageModelsCount) {
      elements.usageModelsCount.textContent = String(modelKeys.length);
    }
    const sessionsList = summary.sessions || [];
    if (elements.usageSessionsCount) {
      elements.usageSessionsCount.textContent = String(sessionsList.length);
    }

    // 2. Models Breakdown
    if (elements.usageModelsList) {
      elements.usageModelsList.innerHTML = '';
      if (modelKeys.length === 0) {
        elements.usageModelsList.innerHTML = '<div style="font-size:12px;color:var(--text-muted);padding:8px 0;">No model activity recorded yet. Run prompts or interact with agents to track tokens.</div>';
      } else {
        const sortedModels = modelKeys.sort((a, b) => (summary.models[b].totalTokens || 0) - (summary.models[a].totalTokens || 0));
        const maxTokens = Math.max(1, ...sortedModels.map(k => summary.models[k].totalTokens || 0));

        sortedModels.forEach(modelKey => {
          const m = summary.models[modelKey];
          const pct = Math.min(100, Math.max(5, Math.round((m.totalTokens / maxTokens) * 100)));
          const itemEl = document.createElement('div');
          itemEl.className = 'usage-model-item';
          itemEl.innerHTML = `
            <div class="usage-model-top">
              <span class="usage-model-name">${modelKey}</span>
              <span class="usage-model-tokens">${formatTokens(m.totalTokens)} tokens
                <span class="usage-model-tokens-sub">(Prompt: ${formatTokens(m.promptTokens)} / Comp: ${formatTokens(m.completionTokens)})</span>
              </span>
            </div>
            <div class="usage-progress-track">
              <div class="usage-progress-bar" style="width: ${pct}%"></div>
            </div>
          `;
          elements.usageModelsList.appendChild(itemEl);
        });
      }
    }

    // 3. Per-Agent Breakdown
    if (elements.usageAgentsList) {
      elements.usageAgentsList.innerHTML = '';
      const agentKeys = Object.keys(summary.agents || {});
      if (agentKeys.length === 0) {
        elements.usageAgentsList.innerHTML = '<div style="font-size:12px;color:var(--text-muted);padding:8px 0;">No agent activity logged.</div>';
      } else {
        agentKeys.forEach(agentKey => {
          const ag = summary.agents[agentKey];
          const card = document.createElement('div');
          card.className = 'usage-agent-card';
          card.innerHTML = `
            <span class="usage-agent-name" title="${ag.name}">${ag.name}</span>
            <span class="usage-agent-count">${formatTokens(ag.totalTokens)} tkn (${ag.count}x)</span>
          `;
          elements.usageAgentsList.appendChild(card);
        });
      }
    }

    // 4. Consolidated Sessions Table (One Row Per Agent Window)
    if (elements.usageSessionsTableBody) {
      elements.usageSessionsTableBody.innerHTML = '';
      if (sessionsList.length === 0) {
        elements.usageSessionsTableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:14px;">No agent window activity recorded yet</td></tr>';
      } else {
        sessionsList.forEach(sess => {
          const tr = document.createElement('tr');
          const isCurrentlyActive = state.sessions.has(sess.id) && sess.status === 'running';
          const timeStr = sess.lastActiveAt ? new Date(sess.lastActiveAt).toLocaleTimeString() : (sess.startedAt ? new Date(sess.startedAt).toLocaleTimeString() : '-');

          const statusBadge = isCurrentlyActive
            ? `<span class="usage-tag-explicit" style="background:rgba(127,209,160,0.15);color:#7FD1A0;display:inline-flex;align-items:center;gap:4px;"><span style="width:6px;height:6px;border-radius:50%;background:#7FD1A0;"></span>Active</span>`
            : `<span class="usage-tag-heuristic" style="background:rgba(255,255,255,0.06);color:var(--text-muted);">Exited</span>`;

          tr.innerHTML = `
            <td>
              <div style="display:flex;align-items:center;gap:6px;">
                <strong>${sess.agentName || 'Agent'}</strong>
              </div>
            </td>
            <td><span style="color:#C084FC;font-weight:600;font-family:var(--font-mono);">${sess.model || 'Unknown'}</span></td>
            <td><span title="${sess.cwd || ''}" style="color:var(--text-dim);font-size:11px;">${formatCwdShort(sess.cwd)}</span></td>
            <td>${formatTokens(sess.promptTokens)}</td>
            <td>${formatTokens(sess.completionTokens)}</td>
            <td style="color:#FFF;font-weight:700;">${formatTokens(sess.totalTokens)}</td>
            <td>
              <div style="display:flex;align-items:center;gap:6px;">
                ${statusBadge}
                <span style="color:var(--text-muted);font-size:10px;">${timeStr}</span>
              </div>
            </td>
          `;
          elements.usageSessionsTableBody.appendChild(tr);
        });
      }
    }
  }

  function openUsageModal() {
    elements.usageModal.style.display = 'flex';
    loadUsageSummary(true);
  }

  function closeUsageModal() {
    elements.usageModal.style.display = 'none';
  }

  async function handleResetUsage() {
    if (!confirm('Are you sure you want to reset all token and model usage history?')) return;
    try {
      await window.API.resetUsage();
      await loadUsageSummary(true);
      showToast('Usage statistics reset', 'success');
    } catch (e) {
      console.error('Reset usage error:', e);
      showToast('Failed to reset usage', 'error');
    }
  }

  /**
   * Restart a session
   */
  async function restartSession(sessionId, newCwd = null) {
    const item = state.sessions.get(sessionId);
    if (!item) return;

    try {
      showToast(`Restarting ${item.session.agentName}...`);
      const res = await window.API.restartSession(sessionId, newCwd);
      if (res.session) {
        item.session = res.session;
        const pill = item.cardEl.querySelector('.pane-cwd-pill');
        if (pill) {
          pill.title = `Directory: ${res.session.cwd}. Click to change & restart`;
          const textEl = pill.querySelector('.pane-cwd-text');
          if (textEl) textEl.textContent = formatCwdShort(res.session.cwd);
        }
        setSessionStatus(sessionId, 'thinking');
        setTimeout(() => setSessionStatus(sessionId, 'done'), 1500);
        setFocus(sessionId);
        item.view.focus();
        showToast('Restarted', 'success');
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
    if (!confirm('Terminate all active agents?')) return;

    try {
      await window.API.killAll();
      for (const item of state.sessions.values()) {
        item.view.destroy();
        item.cardEl.remove();
        item.tabEl.remove();
      }
      state.sessions.clear();
      state.minimizedSessions.clear();
      state.sessionStatuses.clear();
      state.desktopBounds.clear();
      state.activeTabId = null;
      state.focusedId = null;
      state.maximizedId = null;
      renderMinimizedDock();
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
      if (state.activeLayout === 'desktop') {
        applyDesktopBounds(item.cardEl, sessionId);
      }
    } else {
      if (state.maximizedId) {
        const old = state.sessions.get(state.maximizedId);
        if (old) old.cardEl.classList.remove('maximized');
      }
      item.cardEl.classList.add('maximized');
      state.maximizedId = sessionId;
      setFocus(sessionId);
    }

    setTimeout(() => {
      item.view.fit();
      item.view.focus();
    }, 120);
  }

  /**
   * Set Layout Mode (Vertical, Horizontal, Desktop, Tabs)
   */
  function setLayout(layout) {
    state.activeLayout = layout;

    // Reset container class
    elements.workspaceContainer.className = `workspace-grid layout-${layout}`;

    // Update active layout button
    document.querySelectorAll('.layout-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.layout === layout);
    });

    // Reset or Apply Bounds
    for (const [id, item] of state.sessions.entries()) {
      if (layout === 'desktop') {
        if (state.minimizedSessions.has(id)) {
          const currentBounds = state.desktopBounds.get(id) || { x: 30, y: 20 };
          const iconPos = state.desktopIconPositions.get(id) || { x: currentBounds.x, y: currentBounds.y };
          item.cardEl.style.left = `${iconPos.x}px`;
          item.cardEl.style.top = `${iconPos.y}px`;
          item.cardEl.style.width = '';
          item.cardEl.style.height = '';
        } else {
          applyDesktopBounds(item.cardEl, id);
        }
      } else {
        clearDesktopBounds(item.cardEl);
      }
    }

    // Toggle tabs strip
    if (layout === 'tabs') {
      elements.tabsStrip.style.display = 'flex';
      const visible = Array.from(state.sessions.keys()).filter(id => !state.minimizedSessions.has(id));
      if (!state.activeTabId && visible.length > 0) {
        state.activeTabId = visible[0];
      }
      if (state.activeTabId) {
        switchTab(state.activeTabId);
      }
    } else {
      elements.tabsStrip.style.display = 'none';
      for (const item of state.sessions.values()) {
        item.cardEl.classList.remove('active-tab-card');
      }
    }

    updateContainerCounts();
    refitAll();
  }

  /**
   * Switch Active Tab
   */
  function switchTab(sessionId) {
    state.activeTabId = sessionId;
    setFocus(sessionId);

    for (const [id, item] of state.sessions.entries()) {
      const isTarget = id === sessionId;
      item.tabEl.classList.toggle('active', isTarget);
      item.cardEl.classList.toggle('active-tab-card', isTarget);
      if (isTarget) {
        setTimeout(() => {
          item.view.fit();
          item.view.focus();
        }, 50);
      }
    }
  }

  /**
   * Refit all terminal views to their container dimensions
   */
  function refitAll() {
    requestAnimationFrame(() => {
      for (const item of state.sessions.values()) {
        if (!state.minimizedSessions.has(item.id)) {
          item.view.fit();
        }
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
      showToast('No active agents', 'error');
      return;
    }

    const targetVal = elements.broadcastTargetSelect.value;
    const sessionIds = targetVal === 'all' ? null : [targetVal];

    try {
      showToast('Transmitting prompt...');
      const res = await window.API.broadcast(text, sessionIds);
      if (res.broadcastedTo) {
        const count = res.broadcastedTo.length;
        showToast(`Transmitted to ${count} agent(s)`, 'success');
        elements.broadcastInput.value = '';

        // Set status to thinking for all broadcasted
        for (const sid of res.broadcastedTo) {
          setSessionStatus(sid, 'thinking');
        }
      }
    } catch (e) {
      console.error('Broadcast error:', e);
      showToast('Transmission failed', 'error');
    }
  }

  /**
   * Toggle Broadcast Floating Bar
   */
  function toggleBroadcast(forceState = null) {
    state.broadcastOpen = forceState !== null ? forceState : !state.broadcastOpen;
    elements.broadcastBar.classList.toggle('collapsed', !state.broadcastOpen);
    elements.toggleBroadcastBtn.classList.toggle('active', state.broadcastOpen);
    if (state.broadcastOpen) {
      elements.broadcastInput.focus();
    }
    refitAll();
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
    elements.terminalsContainer.style.display = count === 0 ? 'none' : (state.activeLayout === 'tabs' ? 'block' : (state.activeLayout === 'desktop' ? 'block' : 'flex'));

    // Update broadcast target dropdown
    elements.broadcastTargetSelect.innerHTML = '<option value="all">All Agents</option>';
    for (const [id, item] of state.sessions.entries()) {
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = item.session.agentName;
      elements.broadcastTargetSelect.appendChild(opt);
    }

    updateContainerCounts();
  }

  /**
   * Mouse Wheel & Arrow Key Navigation for Horizontal & Vertical Flow
   */
  function setupContainerScrollHandling() {
    // Convert vertical mouse wheel into horizontal scroll when in Horizontal mode
    elements.terminalsContainer.addEventListener('wheel', (e) => {
      if (state.activeLayout === 'horizontal') {
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
          e.preventDefault();
          elements.terminalsContainer.scrollLeft += e.deltaY * 0.9;
        }
      }
    }, { passive: false });
  }

  /**
   * Setup Keyboard Shortcuts:
   * - Cmd/Ctrl + K: Toggle & focus broadcast bar
   * - Cmd/Ctrl + 1..6: Switch/Focus pane 1 through 6
   * - Arrow Keys: Navigate windows in vertical/horizontal layout (when container or card focused)
   * - Escape: Close modal / dropdown
   */
  function setupKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;

      // Cmd/Ctrl + K: Broadcast
      if (isCmdOrCtrl && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        toggleBroadcast(true);
        elements.broadcastInput.focus();
        elements.broadcastInput.select();
        return;
      }

      // Cmd/Ctrl + 1..6: Switch to pane
      if (isCmdOrCtrl && e.key >= '1' && e.key <= '6') {
        const index = parseInt(e.key, 10) - 1;
        const sessionIds = Array.from(state.sessions.keys()).filter(id => !state.minimizedSessions.has(id));
        if (sessionIds[index]) {
          e.preventDefault();
          const targetId = sessionIds[index];
          if (state.activeLayout === 'tabs') {
            switchTab(targetId);
          } else {
            setFocus(targetId);
            const item = state.sessions.get(targetId);
            if (item) {
              item.cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
              item.view.focus();
            }
          }
        }
        return;
      }

      // Arrow navigation for Vertical & Horizontal flows (when Ctrl/Alt or not inside an input)
      const isInputFocused = document.activeElement && (
        document.activeElement.tagName === 'INPUT' ||
        document.activeElement.tagName === 'TEXTAREA' ||
        document.activeElement.isContentEditable
      );

      if (!isInputFocused && (e.altKey || document.activeElement === document.body)) {
        const visibleIds = Array.from(state.sessions.keys()).filter(id => !state.minimizedSessions.has(id));
        if (visibleIds.length > 1) {
          const currentIndex = visibleIds.indexOf(state.focusedId);
          let nextIndex = -1;

          if (state.activeLayout === 'vertical' && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            e.preventDefault();
            nextIndex = e.key === 'ArrowDown' ? (currentIndex + 1) % visibleIds.length : (currentIndex - 1 + visibleIds.length) % visibleIds.length;
          } else if (state.activeLayout === 'horizontal' && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
            e.preventDefault();
            nextIndex = e.key === 'ArrowRight' ? (currentIndex + 1) % visibleIds.length : (currentIndex - 1 + visibleIds.length) % visibleIds.length;
          }

          if (nextIndex !== -1 && visibleIds[nextIndex]) {
            const nextId = visibleIds[nextIndex];
            setFocus(nextId);
            const item = state.sessions.get(nextId);
            if (item) {
              item.cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
              item.view.focus();
            }
          }
        }
      }

      // Escape: Dismiss overlays or collapse broadcast
      if (e.key === 'Escape') {
        if (elements.switchDirModal && elements.switchDirModal.style.display !== 'none') {
          closeSwitchDirModal();
          return;
        }
        if (elements.usageModal && elements.usageModal.style.display !== 'none') {
          closeUsageModal();
          return;
        }
        if (elements.customAgentModal.style.display !== 'none') {
          elements.customAgentModal.style.display = 'none';
          elements.customAgentForm.reset();
          return;
        }
        if (elements.launchDropdown.classList.contains('open')) {
          elements.launchDropdown.classList.remove('open');
          return;
        }
      }
    });
  }

  /**
   * Setup Event Listeners
   */
  function setupEventListeners() {
    // Launch Dropdown Toggle
    elements.launchDropdownBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      elements.launchDropdown.classList.toggle('open');
      const isOpen = elements.launchDropdown.classList.contains('open');
      elements.launchDropdownBtn.setAttribute('aria-expanded', String(isOpen));
    });

    document.addEventListener('click', (e) => {
      if (!elements.launchDropdown.contains(e.target)) {
        elements.launchDropdown.classList.remove('open');
        elements.launchDropdownBtn.setAttribute('aria-expanded', 'false');
      }
    });

    // Empty State Primary Launch Button
    if (elements.emptyLaunchPrimaryBtn) {
      elements.emptyLaunchPrimaryBtn.addEventListener('click', () => {
        const readyAgent = state.detectedAgents.find(a => a.isInstalled);
        if (readyAgent) {
          launchAgent(readyAgent.id);
        } else if (state.detectedAgents.length > 0) {
          launchAgent(state.detectedAgents[0].id);
        } else {
          elements.customAgentModal.style.display = 'flex';
          elements.customCommandInput.focus();
        }
      });
    }

    // Layout switcher buttons
    document.querySelectorAll('.layout-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        setLayout(btn.dataset.layout);
      });
    });

    // Broadcast bar toggle
    elements.toggleBroadcastBtn.addEventListener('click', () => {
      toggleBroadcast();
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
      if (elements.customSavePreset) elements.customSavePreset.checked = true;
    };

    elements.closeCustomModalBtn.addEventListener('click', closeModal);
    elements.cancelCustomModalBtn.addEventListener('click', closeModal);

    // Save to List Only Button
    if (elements.saveOnlyCustomModalBtn) {
      elements.saveOnlyCustomModalBtn.addEventListener('click', () => {
        const command = elements.customCommandInput.value.trim();
        if (!command) {
          elements.customCommandInput.focus();
          showToast('Please enter an executable command', 'error');
          return;
        }

        const argsStr = elements.customArgsInput.value.trim();
        const args = argsStr ? argsStr.split(/\s+/) : [];
        const name = elements.customNameInput.value.trim() || command;
        const cwd = elements.customCwdInput.value.trim() || state.info?.cwd;

        saveCustomAgent({
          id: 'custom-' + Date.now(),
          name,
          command,
          args,
          cwd
        });

        closeModal();
        showToast(`Saved "${name}" to Available Agents`, 'success');
      });
    }

    elements.customAgentModal.addEventListener('click', (e) => {
      if (e.target === elements.customAgentModal) {
        closeModal();
      }
    });

    elements.customAgentForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const command = elements.customCommandInput.value.trim();
      if (!command) return;

      const argsStr = elements.customArgsInput.value.trim();
      const args = argsStr ? argsStr.split(/\s+/) : [];
      const name = elements.customNameInput.value.trim() || command;
      const cwd = elements.customCwdInput.value.trim() || state.info?.cwd;

      if (elements.customSavePreset && elements.customSavePreset.checked) {
        saveCustomAgent({
          id: 'custom-' + Date.now(),
          name,
          command,
          args,
          cwd
        });
      }

      closeModal();
      launchAgent(command, { command, args, name, cwd });
    });

    // Switch Directory Modal Listeners
    if (elements.closeSwitchDirModalBtn) {
      elements.closeSwitchDirModalBtn.addEventListener('click', closeSwitchDirModal);
    }
    if (elements.cancelSwitchDirModalBtn) {
      elements.cancelSwitchDirModalBtn.addEventListener('click', closeSwitchDirModal);
    }
    if (elements.switchDirModal) {
      elements.switchDirModal.addEventListener('click', (e) => {
        if (e.target === elements.switchDirModal) {
          closeSwitchDirModal();
        }
      });
    }
    if (elements.switchDirForm) {
      elements.switchDirForm.addEventListener('submit', handleSwitchDirSubmit);
    }

    // Usage Analytics Modal Listeners
    if (elements.btnUsageModal) {
      elements.btnUsageModal.addEventListener('click', openUsageModal);
    }
    if (elements.closeUsageModalBtn) {
      elements.closeUsageModalBtn.addEventListener('click', closeUsageModal);
    }
    if (elements.btnCloseUsageModalBottom) {
      elements.btnCloseUsageModalBottom.addEventListener('click', closeUsageModal);
    }
    if (elements.btnResetUsageStats) {
      elements.btnResetUsageStats.addEventListener('click', handleResetUsage);
    }
    if (elements.usageModal) {
      elements.usageModal.addEventListener('click', (e) => {
        if (e.target === elements.usageModal) {
          closeUsageModal();
        }
      });
    }

    // Horizontal wheel navigation on Empty State cards
    if (elements.emptyAgentCards) {
      elements.emptyAgentCards.addEventListener('wheel', (e) => {
        if (e.deltaY !== 0) {
          e.preventDefault();
          elements.emptyAgentCards.scrollLeft += e.deltaY;
        }
      }, { passive: false });
    }

    // Window resize refit
    window.addEventListener('resize', () => {
      refitAll();
    });

    // Setup Draggable Floating Dock
    setupDockDraggable();
  }

  /**
   * Allow dragging the minimized dock anywhere on the screen
   */
  function setupDockDraggable() {
    if (!elements.minimizedDock) return;

    elements.minimizedDock.addEventListener('mousedown', (e) => {
      // If clicking directly on a dock item without moving, don't drag dock
      if (e.target.closest('.dock-item')) return;

      const rect = elements.minimizedDock.getBoundingClientRect();
      const startX = e.clientX;
      const startY = e.clientY;
      const startLeft = rect.left;
      const startTop = rect.top;

      function onMouseMove(moveEvent) {
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;

        if (Math.hypot(dx, dy) > 4) {
          elements.minimizedDock.style.left = `${Math.max(10, Math.min(window.innerWidth - rect.width - 10, startLeft + dx))}px`;
          elements.minimizedDock.style.bottom = 'auto';
          elements.minimizedDock.style.top = `${Math.max(60, Math.min(window.innerHeight - rect.height - 10, startTop + dy))}px`;
        }
      }

      function onMouseUp() {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      }

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    });
  }

  /**
   * Minimalist Toast notification
   */
  function showToast(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-exit');
      setTimeout(() => toast.remove(), 260);
    }, 2400);
  }

  // Run on page load
  window.addEventListener('DOMContentLoaded', init);
})();
