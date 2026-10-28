/**
 * BEK-CLUSTER - PRO AGENT CLUSTER (Hierarchical Multi-Agent Orchestrator)
 *
 * Implements the Interactive Tree Architecture (Shajara Daraxti) and
 * Live Agent Studio Drawer for Lead Director (OTA) and Sub-Agent Workers.
 */
(function() {
  'use strict';

  const proState = {
    activeMode: 'terminals', // 'terminals' | 'pro'
    activeProject: null,
    availableAgents: [],
    installedLeadAgents: [],
    installedWorkerAgents: [],
    isSpawningWorker: false,

    // Studio Drawer State
    studioOpen: false,
    studioFullscreen: false,
    studioActiveAgentId: null, // sessionId of active agent in studio

    // Tree View Zoom & Pan State
    treeZoom: 1.0,

    // Real-time statuses cache: sessionId -> { status, activity, label }
    nodeStatuses: new Map()
  };

  const proElements = {
    btnModeTerminals: document.getElementById('btnModeTerminals'),
    btnModePro: document.getElementById('btnModePro'),
    workspaceContainer: document.getElementById('workspaceContainer'),
    proAgentContainer: document.getElementById('proAgentContainer'),
    broadcastBar: document.getElementById('broadcastBar'),
    tabsStrip: document.getElementById('tabsStrip')
  };

  /**
   * Initialize Pro Agent Module
   */
  async function initProAgent() {
    setupModeToggle();
    setupGlobalStatusListener();
    await checkInitialProStatus();
  }

  /**
   * Listen to global session status events from stream analyzer in app.js
   */
  function setupGlobalStatusListener() {
    window.addEventListener('bek-session-status', (e) => {
      if (!e.detail) return;
      const { sessionId, status, activity, label } = e.detail;
      proState.nodeStatuses.set(sessionId, { status, activity, label });
      updateNodeStatusDom(sessionId, status, activity, label);
    });

    // Handle ESC key to close studio drawer
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && proState.studioOpen) {
        closeStudio();
      }
    });

    // Window resize handler to recalculate dynamic SVG branches
    window.addEventListener('resize', () => {
      if (proState.activeMode === 'pro' && proState.activeProject) {
        requestAnimationFrame(updateTreeConnectors);
      }
    });
  }

  /**
   * Update visual status of a tree node in real-time
   */
  function updateNodeStatusDom(sessionId, status, activity, label) {
    const pill = document.getElementById(`status_pill_${sessionId}`);
    if (pill) {
      pill.className = `pro-status-pill status-${status}`;
      const labelEl = pill.querySelector('.status-label-text');
      if (labelEl) labelEl.textContent = label || status;
    }

    if (activity) {
      const actEl = document.getElementById(`activity_text_${sessionId}`);
      if (actEl) {
        actEl.textContent = activity;
        actEl.title = activity;
      }
    }
  }

  /**
   * Setup Mode Toggle Events
   */
  function setupModeToggle() {
    if (proElements.btnModeTerminals) {
      proElements.btnModeTerminals.addEventListener('click', () => {
        switchClusterMode('terminals');
      });
    }

    if (proElements.btnModePro) {
      proElements.btnModePro.addEventListener('click', () => {
        switchClusterMode('pro');
      });
    }
  }

  /**
   * Switch between Standard Terminals Cluster and PRO AGENT Mode
   */
  function switchClusterMode(mode) {
    proState.activeMode = mode;

    if (proElements.btnModeTerminals) {
      proElements.btnModeTerminals.classList.toggle('active', mode === 'terminals');
    }
    if (proElements.btnModePro) {
      proElements.btnModePro.classList.toggle('active', mode === 'pro');
    }

    if (mode === 'pro') {
      if (proElements.workspaceContainer) proElements.workspaceContainer.style.display = 'none';
      if (proElements.broadcastBar) proElements.broadcastBar.style.display = 'none';
      if (proElements.tabsStrip) proElements.tabsStrip.style.display = 'none';
      if (proElements.proAgentContainer) {
        proElements.proAgentContainer.style.display = 'flex';
        renderProAgentWorkspace();
      }
    } else {
      if (proElements.workspaceContainer) proElements.workspaceContainer.style.display = '';
      if (proElements.broadcastBar) proElements.broadcastBar.style.display = '';
      if (proElements.proAgentContainer) proElements.proAgentContainer.style.display = 'none';

      // Trigger standard layout refit
      if (window.dispatchEvent) {
        window.dispatchEvent(new Event('resize'));
      }
    }
  }

  /**
   * Check initial pro agent status from backend
   */
  async function checkInitialProStatus() {
    try {
      const data = await window.API.getProStatus();
      proState.activeProject = data.activeProject || null;
      proState.availableAgents = data.availableAgents || [];
      filterAgentsForPro();
    } catch (e) {
      console.warn('[ProAgent] Failed to check pro status:', e);
    }
  }

  /**
   * Filter agents into Lead (OTA) and Worker candidates
   */
  function filterAgentsForPro() {
    const installed = (window.appState && window.appState.detectedAgents)
      ? window.appState.detectedAgents.filter(a => a.isInstalled)
      : [];

    proState.installedLeadAgents = installed.filter(a => a.tier === 'lead' || a.category === 'ai-agent');
    proState.installedWorkerAgents = installed;
  }

  /**
   * Helper: Escape HTML string safely
   */
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Helper: Generate markup for an agent icon
   */
  function getAgentIconMarkup(agent, isLead = false) {
    if (agent && agent.icon && agent.icon.includes('<svg')) {
      return `
        <div class="pro-node-icon" style="background: ${agent.gradient || 'rgba(255,255,255,0.06)'}; color: ${agent.color || '#fff'};">
          ${agent.icon}
        </div>
      `;
    }
    return `
      <div class="pro-node-icon" style="background: ${isLead ? 'rgba(245,158,11,0.2)' : 'rgba(167,139,250,0.2)'}; color: ${isLead ? '#FBBF24' : '#C084FC'};">
        <span style="font-size: 18px;">${isLead ? '👑' : '🤖'}</span>
      </div>
    `;
  }

  /**
   * Render Pro Agent Workspace (Wizard if empty, or Dashboard if active project)
   */
  async function renderProAgentWorkspace() {
    filterAgentsForPro();

    try {
      const data = await window.API.getProStatus();
      proState.activeProject = data.activeProject || null;
      proState.availableAgents = data.availableAgents || [];
    } catch (e) {
      console.error('[ProAgent] Error fetching status:', e);
    }

    if (!proState.activeProject) {
      renderProjectCreationWizard();
    } else {
      renderActiveOrchestrationDashboard();
    }
  }

  /**
   * 1. Render Project Creation Wizard with Initial Prompt Presets
   */
  function renderProjectCreationWizard() {
    const defaultCwd = (window.appState && window.appState.info && window.appState.info.cwd) || 'Workspace';
    const leads = proState.installedLeadAgents;

    proElements.proAgentContainer.innerHTML = `
      <div class="pro-wizard-wrapper">
        <div class="pro-wizard-card">
          <div class="pro-wizard-header">
            <div class="pro-badge-crown">👑</div>
            <h2 class="pro-wizard-title">PRO AGENT REJIMI</h2>
            <p class="pro-wizard-subtitle">
              Avtonom ierarxik multi-agent klasteri. Loyihaga <strong>OTA (Direktor)</strong> agent tayinlang,
              u vazifani tahlil qiladi, token sarfini tejash uchun mos bola agentlarni tanlaydi va boshqaradi.
            </p>
          </div>

          <form id="proProjectCreateForm" class="pro-wizard-form">
            <div class="form-group">
              <label for="proProjectNameInput">Loyiha Nomi (Project Name)</label>
              <input type="text" id="proProjectNameInput" placeholder="masalan: smart-ecom-platform" required autofocus autocomplete="off" spellcheck="false">
              <span class="form-hint">Loyiha uchun alohida katalog va yo'riqnoma (.bek-cluster) yaratiladi.</span>
            </div>

            <div class="form-group">
              <label for="proProjectCwdInput">Loyiha Joylashuvi (CWD Path)</label>
              <input type="text" id="proProjectCwdInput" value="${escapeHtml(defaultCwd)}" spellcheck="false">
              <span class="form-hint">Bo'sh qoldirilsa avtomatik projects/nomi papkasi ochiladi.</span>
            </div>

            <div class="form-group">
              <label for="proLeadAgentSelect">OTA (Boshliq / Director) Agentni Tanlang</label>
              <select id="proLeadAgentSelect" class="form-select">
                ${leads.length > 0
                  ? leads.map(a => `<option value="${a.id}" ${a.id === 'claude' ? 'selected' : ''}>👑 ${escapeHtml(a.name)} (${a.tier === 'lead' ? 'Tavsiya etiladi' : 'AI Agent'})</option>`).join('')
                  : `<option value="bash">Bash Shell (AI Agent o'rnatilmagan)</option>`
                }
              </select>
              <span class="form-hint">Ota agent butun arxitekturaga va bola agentlar ishiga javobgar bo'ladi.</span>
            </div>

            <div class="form-group">
              <label for="proInitialPromptInput">Boshlang'ich Topshiriq / Promt (Initial Mission)</label>
              <textarea id="proInitialPromptInput" class="pro-textarea" placeholder="Ota agentga beriladigan birinchi texnik topshiriqni yozing yoki quyidagi tayyor andozalardan birini bosing..."></textarea>
              <div class="pro-prompt-presets">
                <button type="button" class="pro-preset-chip" data-prompt="Fullstack E-commerce do'kon: Next.js frontend, Node.js API, PostgreSQL va Stripe to'lov tizimi integratsiyasi">🛒 Fullstack E-Commerce</button>
                <button type="button" class="pro-preset-chip" data-prompt="Zamonaviy SaaS Landing Page: Tailwind CSS, toza komponentlar, dark mode va silliq animatsiyalar">✨ SaaS Landing Page</button>
                <button type="button" class="pro-preset-chip" data-prompt="Loyihadagi mavjud kodlar bazasini to'liq tekshirish, xatolarni tuzatish va toza arxitekturaga refaktor qilish">🔍 Audit & Refactor</button>
                <button type="button" class="pro-preset-chip" data-prompt="RESTful Microservice backend tizimi: Express, JWT autentifikatsiya, Swagger docs va unit testlar">🚀 Backend Microservice</button>
              </div>
              <span class="form-hint">Ota agent bu topshiriqni tahlil qilib, loyiha arxitekturasini tuzadi va bola agentlarni safarbar etadi.</span>
            </div>

            <div class="pro-directive-preview">
              <div class="directive-preview-title">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
                <span>Avtomatik Ota Agent Yo'riqnomasi (Director Protocol)</span>
              </div>
              <ul class="directive-rules-list">
                <li>🎯 <strong>Vazifani sintez qilish</strong>: Murakkablik darajasini aniqlash va modullarga bo'lish.</li>
                <li>⚡ <strong>Token tejash siyosati</strong>: Kichik va oddiy ishlar uchun yengil bola agentlarni tanlash.</li>
                <li>🤖 <strong>Bola agentlar nazorati</strong>: Topshiriq berish va natijani qabul qilish.</li>
                <li>👤 <strong>Foydalanuvchi nazorati</strong>: Sizning ko'rsatmangiz bo'yicha bola agentlarga darhol tuzatish kiritish.</li>
              </ul>
            </div>

            <div class="pro-wizard-actions">
              <button type="submit" class="btn btn-primary btn-large btn-gold-glow" id="btnSubmitCreateProject">
                <span>👑 Loyihani Yaratish va Ota Agentni Ishga Tushirish</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    // Bind prompt preset chips
    const chips = proElements.proAgentContainer.querySelectorAll('.pro-preset-chip');
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        const promptText = chip.getAttribute('data-prompt');
        const promptInput = document.getElementById('proInitialPromptInput');
        if (promptInput) {
          promptInput.value = promptText;
          promptInput.focus();
        }
      });
    });

    const form = document.getElementById('proProjectCreateForm');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nameInput = document.getElementById('proProjectNameInput');
        const cwdInput = document.getElementById('proProjectCwdInput');
        const leadSelect = document.getElementById('proLeadAgentSelect');
        const promptInput = document.getElementById('proInitialPromptInput');
        const submitBtn = document.getElementById('btnSubmitCreateProject');

        if (!nameInput.value.trim()) return;

        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span>⏳ Loyiha yaratilmoqda va Ota Agent ishga tushirilmoqda...</span>`;

        try {
          const res = await window.API.createProProject({
            name: nameInput.value.trim(),
            customCwd: cwdInput.value.trim() || null,
            leadAgentId: leadSelect.value,
            initialPrompt: promptInput ? promptInput.value.trim() : ''
          });

          if (res.project) {
            proState.activeProject = res.project;
            if (window.showToast) window.showToast(`👑 Proyekt yaratildi: ${res.project.name}!`);
            renderActiveOrchestrationDashboard();

            // Automatically open studio for Lead Agent so user can immediately observe progress
            if (res.project.leadAgent && res.project.leadAgent.sessionId) {
              setTimeout(() => {
                openStudioForAgent(res.project.leadAgent.sessionId);
              }, 400);
            }
          } else {
            alert(res.error || 'Loyihani yaratishda xatolik yuz berdi');
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<span>👑 Loyihani Yaratish va Ota Agentni Ishga Tushirish</span>`;
          }
        } catch (err) {
          console.error('[ProAgent] Error creating project:', err);
          alert('Xatolik: ' + err.message);
          submitBtn.disabled = false;
          submitBtn.innerHTML = `<span>👑 Loyihani Yaratish va Ota Agentni Ishga Tushirish</span>`;
        }
      });
    }
  }

  /**
   * 2. Render Active Orchestration Dashboard with Tree View & Studio Drawer
   */
  function renderActiveOrchestrationDashboard() {
    const proj = proState.activeProject;
    if (!proj) return;

    const lead = proj.leadAgent || {};
    const workers = proj.workers || [];
    const leadSessionId = lead.sessionId;

    // Get current lead status from cache or default
    const leadCachedStatus = proState.nodeStatuses.get(leadSessionId) || {
      status: 'thinking',
      activity: lead.initialPrompt ? "Topshiriq tahlil qilinmoqda..." : "Buyruq kutmoqda",
      label: "O'ylayapti..."
    };

    const leadIconHtml = getAgentIconMarkup(lead, true);

    proElements.proAgentContainer.innerHTML = `
      <div class="pro-dashboard">
        <!-- Top Pro Control Bar -->
        <header class="pro-top-bar">
          <div class="pro-top-project-meta">
            <div class="pro-crown-badge">👑</div>
            <div class="pro-project-titles">
              <div class="pro-project-name">${escapeHtml(proj.name)}</div>
              <div class="pro-project-dir" title="${escapeHtml(proj.dir)}">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.8">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                </svg>
                <span>${escapeHtml(proj.dir)}</span>
              </div>
            </div>
            <span class="badge badge-ready">FAOL LOYIHA</span>
          </div>

          <div class="pro-top-stats">
            <div class="pro-stat-pill">
              <span class="stat-pill-label">DIREKTOR:</span>
              <strong class="stat-pill-val">${escapeHtml(lead.name || 'Lead')}</strong>
            </div>
            <div class="pro-stat-pill">
              <span class="stat-pill-label">BOLA AGENTLAR:</span>
              <strong class="stat-pill-val">${workers.length} ta faol</strong>
            </div>
          </div>

          <div class="pro-top-actions">
            <button class="btn btn-primary btn-sm btn-gold-glow" id="btnOpenSpawnWorkerModal">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              <span>+ Bola Agent (Worker)</span>
            </button>
            <button class="btn btn-ghost btn-sm btn-danger-hover" id="btnCloseProProject">
              <span>Loyihani Yopish</span>
            </button>
          </div>
        </header>

        <!-- Dynamic Tree Architecture Wrapper -->
        <div class="pro-tree-wrapper" id="proTreeWrapper">
          <div class="pro-tree-canvas" id="proTreeCanvas" style="transform: scale(${proState.treeZoom});">

            <!-- LEVEL 1: ROOT OTA DIRECTOR NODE -->
            <div class="pro-tree-level pro-root-level">
              <div class="pro-agent-node pro-node-lead ${proState.studioActiveAgentId === leadSessionId ? 'active-node' : ''}" id="proLeadNode" data-session-id="${leadSessionId}">
                <div class="pro-node-top">
                  <div class="pro-node-identity">
                    ${leadIconHtml}
                    <div class="pro-node-meta">
                      <span class="pro-node-role-tag pro-role-lead">👑 OTA DIREKTOR (LEAD)</span>
                      <span class="pro-node-name" title="${escapeHtml(lead.name)}">${escapeHtml(lead.name)}</span>
                    </div>
                  </div>
                  <div class="pro-status-pill status-${leadCachedStatus.status}" id="status_pill_${leadSessionId}">
                    <span class="pulse-dot"></span>
                    <span class="status-label-text">${escapeHtml(leadCachedStatus.label)}</span>
                  </div>
                </div>

                <div class="pro-node-activity" id="activity_${leadSessionId}">
                  <span class="pro-activity-icon">⚡</span>
                  <span class="pro-activity-text" id="activity_text_${leadSessionId}" title="${escapeHtml(leadCachedStatus.activity)}">
                    ${escapeHtml(leadCachedStatus.activity)}
                  </span>
                </div>

                <div class="pro-node-bottom">
                  <span class="pro-node-tier-pill">Tier: Lead • High-Power</span>
                  <button class="btn-node-inspect" data-session-id="${leadSessionId}" title="Terminalni ochish">
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="4 17 10 11 4 5"/>
                      <line x1="12" y1="19" x2="20" y2="19"/>
                    </svg>
                    <span>Terminal / Studio</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- LEVEL 2: DYNAMIC SVG BRANCH CONNECTOR -->
            <div class="pro-tree-svg-container" id="proTreeSvgContainer">
              <svg class="pro-tree-svg" id="proTreeSvg" preserveAspectRatio="none">
                <g id="proTreeBranchesGroup"></g>
              </svg>
            </div>

            <!-- LEVEL 3: CHILDREN LEVEL (WORKERS & ADD SLOT) -->
            <div class="pro-tree-level">
              <div class="pro-children-level" id="proChildrenLevel">
                ${workers.map(w => {
                  const workerStatus = proState.nodeStatuses.get(w.sessionId) || {
                    status: 'working',
                    activity: w.taskTitle || "Ishlamoqda...",
                    label: "Ishlamoqda"
                  };
                  const workerIcon = getAgentIconMarkup(w, false);
                  const isNodeActive = proState.studioActiveAgentId === w.sessionId;

                  return `
                    <div class="pro-agent-node pro-node-worker ${isNodeActive ? 'active-node' : ''}" id="node_${w.id}" data-session-id="${w.sessionId}" data-worker-id="${w.id}">
                      <div class="pro-node-top">
                        <div class="pro-node-identity">
                          ${workerIcon}
                          <div class="pro-node-meta">
                            <span class="pro-node-role-tag pro-role-worker">🤖 WORKER: ${escapeHtml(w.role)}</span>
                            <span class="pro-node-name" title="${escapeHtml(w.name)}">${escapeHtml(w.name)}</span>
                          </div>
                        </div>
                        <div class="pro-status-pill status-${workerStatus.status}" id="status_pill_${w.sessionId}">
                          <span class="pulse-dot"></span>
                          <span class="status-label-text">${escapeHtml(workerStatus.label)}</span>
                        </div>
                      </div>

                      <div class="pro-node-activity" id="activity_${w.sessionId}">
                        <span class="pro-activity-icon">⚡</span>
                        <span class="pro-activity-text" id="activity_text_${w.sessionId}" title="${escapeHtml(workerStatus.activity)}">
                          ${escapeHtml(workerStatus.activity)}
                        </span>
                      </div>

                      <div class="pro-node-bottom">
                        <span class="pro-node-tier-pill">Token: ${escapeHtml(w.tokenTier || 'economy')}</span>
                        <button class="btn-node-inspect" data-session-id="${w.sessionId}" title="Terminalni ochish">
                          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="4 17 10 11 4 5"/>
                            <line x1="12" y1="19" x2="20" y2="19"/>
                          </svg>
                          <span>Terminal / Studio</span>
                        </button>
                      </div>
                    </div>
                  `;
                }).join('')}

                <!-- Add First/Next Worker Empty Card -->
                <div class="pro-empty-worker-card" id="proEmptyWorkerCard">
                  <div class="pro-empty-worker-icon">➕</div>
                  <div class="pro-empty-worker-title">+ Yangi Bola Agent (Worker)</div>
                  <div class="pro-empty-worker-desc">Frontend, Backend yoki Test uchun yengil agent qo'shing</div>
                </div>
              </div>
            </div>

          </div>

          <!-- Floating Tree Zoom Controls -->
          <div class="pro-tree-controls">
            <button class="pro-tree-ctrl-btn" id="btnTreeZoomOut" title="Zoom Out">-</button>
            <button class="pro-tree-ctrl-btn" id="btnTreeZoomReset" title="Reset Zoom">${Math.round(proState.treeZoom * 100)}%</button>
            <button class="pro-tree-ctrl-btn" id="btnTreeZoomIn" title="Zoom In">+</button>
          </div>
        </div>

        <!-- Interactive Agent Studio Drawer & Backdrop -->
        <div class="pro-studio-backdrop" id="proStudioBackdrop"></div>
        <aside class="pro-studio-drawer" id="proStudioDrawer" aria-label="Interactive Agent Studio Drawer">
          <header class="pro-studio-header">
            <div class="pro-studio-current-agent" id="proStudioCurrentAgent">
              <!-- Dynamically populated on agent select -->
            </div>

            <div class="pro-studio-switcher-tabs" id="proStudioSwitcherTabs">
              <!-- Switcher tabs populated dynamically -->
            </div>

            <div class="pro-studio-actions">
              <button class="pro-studio-btn-icon" id="btnStudioFullscreen" title="Butun ekranga yoyish">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="15 3 21 3 21 9"/>
                  <polyline points="9 21 3 21 3 15"/>
                  <line x1="21" y1="3" x2="14" y2="10"/>
                  <line x1="3" y1="21" x2="10" y2="14"/>
                </svg>
              </button>
              <button class="pro-studio-btn-icon" id="btnStudioClose" title="Yopish (Esc)">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          </header>

          <div class="pro-studio-body">
            <div class="pro-studio-terminal-slot" id="proStudioTerminalSlot">
              <!-- Live interactive terminal card is attached here -->
            </div>
          </div>

          <footer class="pro-studio-footer">
            <div class="pro-studio-input-wrap">
              <input type="text" id="proStudioCommandInput" class="pro-studio-input" placeholder="Agentga to'g'ridan-to'g'ri buyruq yoki topshiriq yozing... (Enter)" autocomplete="off">
            </div>
            <div class="pro-studio-actions-group">
              <button class="btn btn-primary btn-sm" id="btnStudioSendCommand">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
                <span>Yuborish</span>
              </button>
              <button class="btn btn-warning-solid btn-sm" id="btnStudioIntervene" style="display: none;" title="Ota Agentga bu agent bo'yicha yo'riqnoma berish">
                <span>🎯 Ota orqali tuzatish</span>
              </button>
            </div>
          </footer>
        </aside>

      </div>
    `;

    // Bind dashboard, tree, and studio events
    bindDashboardEvents();

    // Calculate dynamic SVG connecting branches after render
    setTimeout(updateTreeConnectors, 80);
    setTimeout(updateTreeConnectors, 260);
  }

  /**
   * Bind all Dashboard, Tree, and Studio Drawer Events
   */
  function bindDashboardEvents() {
    // 1. Spawn Worker Modal triggers
    const btnSpawn = document.getElementById('btnOpenSpawnWorkerModal');
    if (btnSpawn) btnSpawn.addEventListener('click', openSpawnWorkerModal);

    const emptyWorkerCard = document.getElementById('proEmptyWorkerCard');
    if (emptyWorkerCard) emptyWorkerCard.addEventListener('click', openSpawnWorkerModal);

    // 2. Close Project Button
    const btnCloseProj = document.getElementById('btnCloseProProject');
    if (btnCloseProj) {
      btnCloseProj.addEventListener('click', async () => {
        if (!confirm(`Haqiqatan ham ushbu "${proState.activeProject.name}" loyihasini yopmoqchimisiz?`)) return;
        try {
          await window.API.closeProProject(proState.activeProject.id);
          proState.activeProject = null;
          if (window.showToast) window.showToast('Loyiha yopildi');
          renderProjectCreationWizard();
        } catch (e) {
          alert('Xatolik: ' + e.message);
        }
      });
    }

    // 3. Tree Zoom Controls
    const btnZoomIn = document.getElementById('btnTreeZoomIn');
    const btnZoomOut = document.getElementById('btnTreeZoomOut');
    const btnZoomReset = document.getElementById('btnTreeZoomReset');
    const canvas = document.getElementById('proTreeCanvas');

    const applyZoom = (newZoom) => {
      proState.treeZoom = Math.min(1.4, Math.max(0.6, Number(newZoom.toFixed(2))));
      if (canvas) canvas.style.transform = `scale(${proState.treeZoom})`;
      if (btnZoomReset) btnZoomReset.textContent = `${Math.round(proState.treeZoom * 100)}%`;
      requestAnimationFrame(updateTreeConnectors);
    };

    if (btnZoomIn) btnZoomIn.addEventListener('click', () => applyZoom(proState.treeZoom + 0.1));
    if (btnZoomOut) btnZoomOut.addEventListener('click', () => applyZoom(proState.treeZoom - 0.1));
    if (btnZoomReset) btnZoomReset.addEventListener('click', () => applyZoom(1.0));

    // 4. Node click & Inspect buttons to open Studio
    const inspectBtns = proElements.proAgentContainer.querySelectorAll('.btn-node-inspect, .pro-agent-node');
    inspectBtns.forEach(el => {
      el.addEventListener('click', (e) => {
        // Prevent double trigger if clicking inspect button inside node
        e.stopPropagation();
        const sessionId = el.getAttribute('data-session-id') || el.closest('.pro-agent-node')?.getAttribute('data-session-id');
        if (sessionId) {
          openStudioForAgent(sessionId);
        }
      });
    });

    // 5. Studio Drawer Controls
    const backdrop = document.getElementById('proStudioBackdrop');
    if (backdrop) backdrop.addEventListener('click', closeStudio);

    const btnCloseStudio = document.getElementById('btnStudioClose');
    if (btnCloseStudio) btnCloseStudio.addEventListener('click', closeStudio);

    const btnFullscreen = document.getElementById('btnStudioFullscreen');
    if (btnFullscreen) btnFullscreen.addEventListener('click', toggleStudioFullscreen);

    // 6. Direct Studio Command Input
    const btnSendCmd = document.getElementById('btnStudioSendCommand');
    const inputCmd = document.getElementById('proStudioCommandInput');

    if (btnSendCmd) btnSendCmd.addEventListener('click', sendStudioCommand);
    if (inputCmd) {
      inputCmd.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          sendStudioCommand();
        }
      });
    }

    // 7. Human-in-the-loop Intervention from Studio
    const btnIntervene = document.getElementById('btnStudioIntervene');
    if (btnIntervene) {
      btnIntervene.addEventListener('click', openInterventionDialog);
    }
  }

  /**
   * Calculate and render dynamic SVG curved branches from Lead node to Worker nodes
   */
  function updateTreeConnectors() {
    const svgEl = document.getElementById('proTreeSvg');
    const svgGroup = document.getElementById('proTreeBranchesGroup');
    const leadNode = document.getElementById('proLeadNode');
    if (!svgEl || !svgGroup || !leadNode) return;

    const svgRect = svgEl.getBoundingClientRect();
    if (svgRect.width === 0 || svgRect.height === 0) return;

    // Synchronize SVG coordinate viewBox with client pixels
    svgEl.setAttribute('viewBox', `0 0 ${svgRect.width} ${svgRect.height}`);

    const leadRect = leadNode.getBoundingClientRect();
    // Anchor connection at bottom center of lead card
    const xLead = (leadRect.left + leadRect.right) / 2 - svgRect.left;
    const yLead = 0;

    // Collect child target cards (all worker nodes + empty slot card)
    const targetCards = Array.from(document.querySelectorAll('.pro-children-level .pro-agent-node, .pro-children-level .pro-empty-worker-card'));

    let pathsMarkup = '';
    const midY = svgRect.height * 0.5;

    targetCards.forEach(target => {
      const targetRect = target.getBoundingClientRect();
      // Anchor connection at top center of child card
      const xChild = (targetRect.left + targetRect.right) / 2 - svgRect.left;
      const yChild = svgRect.height;

      // Smooth Cubic Bezier curve
      const d = `M ${xLead} ${yLead} C ${xLead} ${midY}, ${xChild} ${midY}, ${xChild} ${yChild}`;
      pathsMarkup += `
        <path d="${d}" class="pro-tree-branch-glow"></path>
        <path d="${d}" class="pro-tree-branch-line"></path>
      `;
    });

    svgGroup.innerHTML = pathsMarkup;
  }

  /**
   * Open Studio Drawer for a specific Agent Session
   */
  function openStudioForAgent(sessionId) {
    if (!proState.activeProject) return;
    const proj = proState.activeProject;
    proState.studioActiveAgentId = sessionId;
    proState.studioOpen = true;

    const isLead = proj.leadAgent && proj.leadAgent.sessionId === sessionId;
    const worker = (proj.workers || []).find(w => w.sessionId === sessionId);
    const targetAgent = isLead ? proj.leadAgent : worker;

    // Update Header Identity
    const headerIdent = document.getElementById('proStudioCurrentAgent');
    if (headerIdent && targetAgent) {
      const roleBadge = isLead
        ? '<span class="pro-studio-agent-role pro-role-lead" style="background: rgba(245,158,11,0.15); color: #FBBF24;">👑 OTA DIREKTOR</span>'
        : `<span class="pro-studio-agent-role pro-role-worker" style="background: rgba(167,139,250,0.15); color: #C084FC;">🤖 WORKER: ${escapeHtml(targetAgent.role || 'Dasturchi')}</span>`;

      const iconMarkup = targetAgent.icon && targetAgent.icon.includes('<svg')
        ? `<div class="pro-studio-agent-icon" style="background: ${targetAgent.gradient || 'rgba(255,255,255,0.06)'}; color: ${targetAgent.color || '#fff'};">${targetAgent.icon}</div>`
        : `<div class="pro-studio-agent-icon">${isLead ? '👑' : '🤖'}</div>`;

      headerIdent.innerHTML = `
        ${iconMarkup}
        <span class="pro-studio-agent-title">${escapeHtml(targetAgent.name)}</span>
        ${roleBadge}
      `;
    }

    // Toggle Intervention button visibility (only applicable when worker is active)
    const btnIntervene = document.getElementById('btnStudioIntervene');
    if (btnIntervene) {
      btnIntervene.style.display = isLead ? 'none' : 'inline-flex';
    }

    // Render switcher tabs
    renderStudioSwitcherTabs();

    // Mark active node in the tree
    document.querySelectorAll('.pro-agent-node').forEach(node => {
      node.classList.toggle('active-node', node.getAttribute('data-session-id') === sessionId);
    });

    // Attach terminal card into slot
    attachStudioTerminal(sessionId);

    // Open drawer & backdrop
    const drawer = document.getElementById('proStudioDrawer');
    const backdrop = document.getElementById('proStudioBackdrop');
    if (drawer) drawer.classList.add('open');
    if (backdrop) backdrop.style.display = 'block';
  }

  /**
   * Render Switcher Tabs inside Studio Drawer
   */
  function renderStudioSwitcherTabs() {
    const tabsContainer = document.getElementById('proStudioSwitcherTabs');
    if (!tabsContainer || !proState.activeProject) return;

    const proj = proState.activeProject;
    const lead = proj.leadAgent;
    const workers = proj.workers || [];

    let tabsHtml = '';

    // Tab for Lead
    const isLeadActive = proState.studioActiveAgentId === lead.sessionId;
    tabsHtml += `
      <button class="pro-switch-tab ${isLeadActive ? 'active' : ''}" data-session-id="${lead.sessionId}" title="👑 Ota Agent: ${escapeHtml(lead.name)}">
        <span>👑 ${escapeHtml(lead.name)}</span>
      </button>
    `;

    // Tabs for Workers
    workers.forEach(w => {
      const isWorkerActive = proState.studioActiveAgentId === w.sessionId;
      tabsHtml += `
        <button class="pro-switch-tab ${isWorkerActive ? 'active' : ''}" data-session-id="${w.sessionId}" title="🤖 ${escapeHtml(w.name)} (${escapeHtml(w.role)})">
          <span>🤖 ${escapeHtml(w.role || w.name)}</span>
        </button>
      `;
    });

    tabsContainer.innerHTML = tabsHtml;

    // Bind tab clicks
    tabsContainer.querySelectorAll('.pro-switch-tab').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const sid = btn.getAttribute('data-session-id');
        if (sid) {
          openStudioForAgent(sid);
        }
      });
    });
  }

  /**
   * Attach terminal session into the Studio Drawer Slot
   */
  function attachStudioTerminal(sessionId) {
    const slot = document.getElementById('proStudioTerminalSlot');
    if (!slot) return;
    slot.innerHTML = '';

    const sessItem = window.appState && window.appState.sessions && window.appState.sessions.get(sessionId);
    if (sessItem && sessItem.terminalCard) {
      sessItem.terminalCard.classList.add('pro-embedded-card');
      slot.appendChild(sessItem.terminalCard);
      setTimeout(() => {
        if (sessItem.view && sessItem.view.fit) sessItem.view.fit();
        if (sessItem.view && sessItem.view.focus) sessItem.view.focus();
      }, 50);
    } else if (window.API) {
      // If not yet instantiated in appState, fetch sessions and attach
      window.API.getSessions().then(data => {
        const found = data.sessions && data.sessions.find(s => s.id === sessionId);
        if (found && window.attachSession) {
          window.attachSession(found);
          setTimeout(() => attachStudioTerminal(sessionId), 120);
        }
      });
    }
  }

  /**
   * Close Studio Drawer
   */
  function closeStudio() {
    proState.studioOpen = false;
    const drawer = document.getElementById('proStudioDrawer');
    const backdrop = document.getElementById('proStudioBackdrop');
    if (drawer) drawer.classList.remove('open');
    if (backdrop) backdrop.style.display = 'none';

    document.querySelectorAll('.pro-agent-node').forEach(node => {
      node.classList.remove('active-node');
    });
  }

  /**
   * Toggle Studio Drawer Fullscreen
   */
  function toggleStudioFullscreen() {
    proState.studioFullscreen = !proState.studioFullscreen;
    const drawer = document.getElementById('proStudioDrawer');
    if (drawer) {
      drawer.classList.toggle('fullscreen', proState.studioFullscreen);
    }

    // Refit terminal after layout animation
    if (proState.studioActiveAgentId && window.appState && window.appState.sessions) {
      const sess = window.appState.sessions.get(proState.studioActiveAgentId);
      setTimeout(() => {
        if (sess && sess.view && sess.view.fit) sess.view.fit();
      }, 220);
    }
  }

  /**
   * Send Direct Command from Studio Input to the Active Agent
   */
  function sendStudioCommand() {
    const input = document.getElementById('proStudioCommandInput');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;

    const sessionId = proState.studioActiveAgentId;
    if (!sessionId) return;

    if (window.wsClient && window.wsClient.sendInput) {
      window.wsClient.sendInput(sessionId, text + '\r');
      input.value = '';
      if (window.showToast) {
        window.showToast("Buyruq agentga yuborildi");
      }
      const sess = window.appState && window.appState.sessions && window.appState.sessions.get(sessionId);
      if (sess && sess.view && sess.view.focus) {
        sess.view.focus();
      }
    }
  }

  /**
   * Open Human-in-the-loop Intervention Dialog from Studio
   */
  async function openInterventionDialog() {
    const proj = proState.activeProject;
    if (!proj) return;
    const sessionId = proState.studioActiveAgentId;
    const worker = (proj.workers || []).find(w => w.sessionId === sessionId);
    const workerDesc = worker ? `${worker.name} (${worker.role})` : 'Ushbu agent';

    const feedback = prompt(`👑 Ota Agentga ko'rsatma bering (${workerDesc} ishini tuzatish va to'g'ri yo'naltirish uchun):`);
    if (!feedback || !feedback.trim()) return;

    try {
      await window.API.intervenePro({
        projectId: proj.id,
        workerId: worker ? worker.id : null,
        feedbackMessage: feedback.trim(),
        directWorker: true
      });

      if (window.showToast) {
        window.showToast(`🎯 Ko'rsatma Ota agentga yetkazildi!`);
      }
    } catch (err) {
      alert("Tuzatish yuborishda xatolik: " + err.message);
    }
  }

  /**
   * Open Modal to Spawn a Worker Sub-Agent
   */
  function openSpawnWorkerModal() {
    filterAgentsForPro();
    const installed = proState.installedWorkerAgents;

    // Check or create modal overlay
    let modal = document.getElementById('proSpawnWorkerModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'proSpawnWorkerModal';
      modal.className = 'modal-overlay';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="modal-content modal-content-sm" role="dialog" aria-modal="true">
        <div class="modal-header">
          <div class="modal-title">
            <span style="font-size: 18px;">🤖</span>
            <span>Yangi Bola Agent (Worker) Biriktirish</span>
          </div>
          <button class="modal-close" id="btnCloseSpawnWorkerModal">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <form id="spawnWorkerForm">
          <div class="modal-body">
            <div class="form-group">
              <label for="workerAgentSelect">Agentni Tanlang</label>
              <select id="workerAgentSelect" class="form-select" required>
                ${installed.map(a => `
                  <option value="${a.id}">
                    ${escapeHtml(a.name)} [Tier: ${escapeHtml(a.tier || 'worker')}, Token: ${escapeHtml(a.tokenTier || 'balanced')}]
                  </option>
                `).join('')}
              </select>
              <span class="form-hint">Ota agent bu agentning quvvatiga qarab vazifani taqsimlaydi.</span>
            </div>

            <div class="form-group">
              <label for="workerRoleInput">Vazifa Roli (Role)</label>
              <input type="text" id="workerRoleInput" placeholder="masalan: Frontend UI Dev, Backend API, Tester" value="Frontend Developer" required>
            </div>

            <div class="form-group">
              <label for="workerTaskInput">Topshiriq Sarlavhasi (Task Title)</label>
              <input type="text" id="workerTaskInput" placeholder="masalan: Login sahifasi komponentlarini yaratish" required>
            </div>

            <div class="form-group">
              <label for="workerPromptInput">Boshlang'ich Promt / Yo'riqnoma (Ixtiyoriy)</label>
              <textarea id="workerPromptInput" class="form-textarea" rows="3" placeholder="Ushbu agentga darhol beriladigan dastlabki vazifa promtini yozing..."></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-ghost" id="btnCancelSpawnWorker">Bekor qilish</button>
            <button type="submit" class="btn btn-primary" id="btnSubmitSpawnWorker">Biriktirish & Boshlash</button>
          </div>
        </form>
      </div>
    `;

    modal.style.display = 'flex';

    const closeBtn = document.getElementById('btnCloseSpawnWorkerModal');
    const cancelBtn = document.getElementById('btnCancelSpawnWorker');
    const closeModal = () => { modal.style.display = 'none'; };

    if (closeBtn) closeBtn.onclick = closeModal;
    if (cancelBtn) cancelBtn.onclick = closeModal;

    const form = document.getElementById('spawnWorkerForm');
    if (form) {
      form.onsubmit = async (e) => {
        e.preventDefault();
        const agentId = document.getElementById('workerAgentSelect').value;
        const role = document.getElementById('workerRoleInput').value.trim();
        const taskTitle = document.getElementById('workerTaskInput').value.trim();
        const initialPrompt = document.getElementById('workerPromptInput').value.trim();

        const submitBtn = document.getElementById('btnSubmitSpawnWorker');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Agent ishga tushirilmoqda...';

        try {
          const res = await window.API.spawnProWorker({
            projectId: proState.activeProject.id,
            agentId,
            role,
            taskTitle,
            initialPrompt
          });

          if (res.worker) {
            proState.activeProject.workers.push(res.worker);
            if (window.showToast) window.showToast(`🤖 Bola agent qo'shildi: ${role}!`);
            closeModal();
            renderActiveOrchestrationDashboard();

            // Automatically open studio for the new worker
            setTimeout(() => {
              openStudioForAgent(res.worker.sessionId);
            }, 300);
          }
        } catch (err) {
          alert('Xatolik: ' + err.message);
          submitBtn.disabled = false;
          submitBtn.textContent = 'Biriktirish & Boshlash';
        }
      };
    }
  }

  // Export to global scope
  window.ProAgent = {
    init: initProAgent,
    switchMode: switchClusterMode,
    refreshStatus: renderProAgentWorkspace,
    openStudio: openStudioForAgent,
    closeStudio: closeStudio,
    updateConnectors: updateTreeConnectors,
    getState: () => proState
  };

  // Auto-init when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProAgent);
  } else {
    initProAgent();
  }
})();
