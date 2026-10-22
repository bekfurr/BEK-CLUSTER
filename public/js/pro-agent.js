/**
 * BEK-CLUSTER - PRO AGENT CLUSTER (Hierarchical Multi-Agent Orchestrator)
 *
 * Handles Pro Projects, Lead Director Agent (OTA), Worker Sub-Agents,
 * Task assignment, and Human-in-the-loop intervention.
 */
(function() {
  'use strict';

  const proState = {
    activeMode: 'terminals', // 'terminals' | 'pro'
    activeProject: null,
    availableAgents: [],
    installedLeadAgents: [],
    installedWorkerAgents: [],
    isSpawningWorker: false
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
    await checkInitialProStatus();
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
      // Trigger layout refit
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
   * 1. Render Project Creation Wizard
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
              <input type="text" id="proProjectCwdInput" value="${defaultCwd}" spellcheck="false">
              <span class="form-hint">Bo'sh qoldirilsa avtomatik projects/nomi papkasi ochiladi.</span>
            </div>

            <div class="form-group">
              <label for="proLeadAgentSelect">OTA (Boshliq / Director) Agentni Tanlang</label>
              <select id="proLeadAgentSelect" class="form-select">
                ${leads.length > 0
                  ? leads.map(a => `<option value="${a.id}" ${a.id === 'claude' ? 'selected' : ''}>👑 ${a.name} (${a.tier === 'lead' ? 'Tavsiya etiladi' : 'AI Agent'})</option>`).join('')
                  : `<option value="bash">Bash Shell (AI Agent o'rnatilmagan)</option>`
                }
              </select>
              <span class="form-hint">Ota agent butun arxitekturaga va bola agentlar ishiga javobgar bo'ladi.</span>
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

    const form = document.getElementById('proProjectCreateForm');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nameInput = document.getElementById('proProjectNameInput');
        const cwdInput = document.getElementById('proProjectCwdInput');
        const leadSelect = document.getElementById('proLeadAgentSelect');
        const submitBtn = document.getElementById('btnSubmitCreateProject');

        if (!nameInput.value.trim()) return;

        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span>⏳ Loyiha yaratilmoqda va Ota Agent ishga tushirilmoqda...</span>`;

        try {
          const res = await window.API.createProProject({
            name: nameInput.value.trim(),
            customCwd: cwdInput.value.trim() || null,
            leadAgentId: leadSelect.value
          });

          if (res.project) {
            proState.activeProject = res.project;
            if (window.showToast) window.showToast(`👑 Proyekt yaratildi: ${res.project.name}!`);
            renderActiveOrchestrationDashboard();
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
   * 2. Render Active Orchestration Dashboard
   */
  function renderActiveOrchestrationDashboard() {
    const proj = proState.activeProject;
    if (!proj) return;

    const workers = proj.workers || [];

    proElements.proAgentContainer.innerHTML = `
      <div class="pro-dashboard">
        <!-- Top Pro Control Bar -->
        <header class="pro-top-bar">
          <div class="pro-top-project-meta">
            <div class="pro-crown-badge">👑</div>
            <div class="pro-project-titles">
              <div class="pro-project-name">${proj.name}</div>
              <div class="pro-project-dir" title="${proj.dir}">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.8">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                </svg>
                <span>${proj.dir}</span>
              </div>
            </div>
            <span class="badge badge-ready">FAOL LOYIHA</span>
          </div>

          <div class="pro-top-stats">
            <div class="pro-stat-pill">
              <span class="stat-pill-label">DIREKTOR:</span>
              <strong class="stat-pill-val">${proj.leadAgent ? proj.leadAgent.name : 'Lead'}</strong>
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

        <!-- Main Orchestration Grid Area -->
        <div class="pro-orchestration-body">
          <!-- Lead Director Agent Card & Terminal Pane -->
          <div class="pro-lead-card">
            <div class="pro-lead-card-header">
              <div class="pro-lead-badge">
                <span class="crown-icon">👑</span>
                <span>OTA AGENT (DIREKTOR): ${proj.leadAgent ? proj.leadAgent.name : ''}</span>
              </div>
              <div class="pro-lead-status-pill">
                <span class="status-dot"></span>
                <span>Vazifalar & Ko'rsatmalarni Kutmoqda</span>
              </div>
            </div>
            <div class="pro-lead-terminal-wrap" id="proLeadTerminalPane">
              <!-- Lead Session Terminal Attached Here -->
            </div>
          </div>

          <!-- Workers (Sub-Agents) Container -->
          <div class="pro-workers-card">
            <div class="pro-workers-header">
              <div class="pro-workers-title">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8">
                  <circle cx="12" cy="7" r="4"/>
                  <path d="M5.5 21a6.5 6.5 0 0 1 13 0"/>
                </svg>
                <span>BOLA AGENTLAR (WORKERS KLASTERI)</span>
              </div>
              <span class="workers-count-tag">${workers.length} agent</span>
            </div>

            <div class="pro-workers-grid" id="proWorkersGrid">
              ${workers.length === 0 ? `
                <div class="pro-workers-empty">
                  <div class="workers-empty-icon">🤖</div>
                  <h4>Hozircha bola agentlar biriktirilmagan</h4>
                  <p>Ota agent buyruqni qabul qilgach, yoki yuqoridagi <strong>"+ Bola Agent"</strong> tugmasi orqali Frontend, Backend yoki Test uchun maxsus agentlarni ishga tushiring.</p>
                </div>
              ` : ''}
            </div>
          </div>
        </div>

        <!-- Human-in-the-loop Intervention Bar (Foydalanuvchi Aralashuvi) -->
        <div class="pro-intervention-bar">
          <div class="intervention-prefix">
            <div class="intervention-icon">🎯</div>
            <div class="intervention-meta">
              <span class="intervention-title">OTA ORQALI TUZATISH (INTERVENTION)</span>
              <span class="intervention-desc">Bola agent adashsa, to'g'ridan-to'g'ri Ota agentga ko'rsatma bering:</span>
            </div>
          </div>

          <div class="intervention-target-wrap">
            <select id="interventionTargetSelect" class="form-select select-sm">
              ${workers.length > 0
                ? workers.map(w => `<option value="${w.id}">🤖 ${w.name} (${w.role})</option>`).join('')
                : `<option value="">Avval bola agent qo'shing</option>`
              }
            </select>
          </div>

          <div class="intervention-input-wrap">
            <input type="text" id="interventionTextInput" placeholder="Masalan: Worker 1 tugmalar rangini o'zgartirsin, router faylini to'g'rilasin... (Enter)" autocomplete="off">
          </div>

          <div class="intervention-actions">
            <button class="btn btn-warning-solid btn-sm" id="btnSendIntervention" ${workers.length === 0 ? 'disabled' : ''}>
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
              </svg>
              <span>Ota orqali Tuzatish</span>
            </button>
          </div>
        </div>
      </div>
    `;

    // Attach Lead terminal into #proLeadTerminalPane
    if (proj.leadAgent && proj.leadAgent.sessionId) {
      attachLeadTerminal(proj.leadAgent.sessionId);
    }

    // Attach Worker terminals
    if (workers.length > 0) {
      attachWorkerTerminals(workers);
    }

    // Bind Dashboard Events
    bindDashboardEvents();
  }

  /**
   * Attach Lead Terminal Session into Pro Dashboard
   */
  function attachLeadTerminal(sessionId) {
    const container = document.getElementById('proLeadTerminalPane');
    if (!container) return;

    // Check if terminal view already created in global window.appState
    if (window.appState && window.appState.sessions && window.appState.sessions.has(sessionId)) {
      const sess = window.appState.sessions.get(sessionId);
      if (sess && sess.terminalCard) {
        container.appendChild(sess.terminalCard);
        sess.terminalCard.classList.add('pro-embedded-card');
        if (sess.view && sess.view.fit) {
          setTimeout(() => sess.view.fit(), 200);
        }
      }
    } else {
      // Re-fetch sessions from server and attach
      if (window.API) {
        window.API.getSessions().then(data => {
          if (data.sessions) {
            const found = data.sessions.find(s => s.id === sessionId);
            if (found && window.attachSession) {
              window.attachSession(found);
              setTimeout(() => attachLeadTerminal(sessionId), 300);
            }
          }
        });
      }
    }
  }

  /**
   * Attach Worker Terminals into #proWorkersGrid
   */
  function attachWorkerTerminals(workers) {
    const grid = document.getElementById('proWorkersGrid');
    if (!grid) return;
    grid.innerHTML = '';

    workers.forEach(w => {
      const card = document.createElement('div');
      card.className = 'pro-worker-pane';
      card.innerHTML = `
        <div class="pro-worker-pane-header">
          <div class="worker-pane-info">
            <span class="worker-pane-icon">🤖</span>
            <strong class="worker-pane-name">${w.name}</strong>
            <span class="worker-pane-role">${w.role}</span>
          </div>
          <div class="worker-pane-task" title="${w.taskTitle}">${w.taskTitle}</div>
        </div>
        <div class="pro-worker-term-slot" id="slot_${w.sessionId}">
          <!-- Terminal view attaches here -->
        </div>
      `;
      grid.appendChild(card);

      // Attach terminal into slot
      const slot = card.querySelector(`#slot_${w.sessionId}`);
      if (slot && window.appState && window.appState.sessions && window.appState.sessions.has(w.sessionId)) {
        const sess = window.appState.sessions.get(w.sessionId);
        if (sess && sess.terminalCard) {
          slot.appendChild(sess.terminalCard);
          sess.terminalCard.classList.add('pro-embedded-card');
          if (sess.view && sess.view.fit) {
            setTimeout(() => sess.view.fit(), 200);
          }
        }
      } else if (window.API) {
        window.API.getSessions().then(data => {
          if (data.sessions) {
            const found = data.sessions.find(s => s.id === w.sessionId);
            if (found && window.attachSession) {
              window.attachSession(found);
              setTimeout(() => {
                const s = window.appState && window.appState.sessions.get(w.sessionId);
                if (s && s.terminalCard && slot) {
                  slot.appendChild(s.terminalCard);
                  s.terminalCard.classList.add('pro-embedded-card');
                  if (s.view && s.view.fit) s.view.fit();
                }
              }, 300);
            }
          }
        });
      }
    });
  }

  /**
   * Bind Pro Dashboard Button Events
   */
  function bindDashboardEvents() {
    const btnSpawn = document.getElementById('btnOpenSpawnWorkerModal');
    if (btnSpawn) {
      btnSpawn.addEventListener('click', openSpawnWorkerModal);
    }

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

    const btnIntervene = document.getElementById('btnSendIntervention');
    const inputIntervene = document.getElementById('interventionTextInput');
    const selectTarget = document.getElementById('interventionTargetSelect');

    const handleIntervention = async () => {
      const text = inputIntervene ? inputIntervene.value.trim() : '';
      const workerId = selectTarget ? selectTarget.value : null;

      if (!text) return;
      if (!proState.activeProject) return;

      btnIntervene.disabled = true;

      try {
        const res = await window.API.intervenePro({
          projectId: proState.activeProject.id,
          workerId,
          feedbackMessage: text,
          directWorker: true
        });

        if (window.showToast) {
          window.showToast(`🎯 Ko'rsatma Ota agentga yuborildi!`);
        }
        if (inputIntervene) inputIntervene.value = '';
      } catch (err) {
        alert('Tuzatish yuborishda xatolik: ' + err.message);
      } finally {
        btnIntervene.disabled = false;
      }
    };

    if (btnIntervene) {
      btnIntervene.addEventListener('click', handleIntervention);
    }
    if (inputIntervene) {
      inputIntervene.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          handleIntervention();
        }
      });
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
                    ${a.name} [Tier: ${a.tier || 'worker'}, Token: ${a.tokenTier || 'balanced'}]
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
    getState: () => proState
  };

  // Auto-init when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProAgent);
  } else {
    initProAgent();
  }
})();
