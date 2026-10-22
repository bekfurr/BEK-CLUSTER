const path = require('path');
const fs = require('fs');
const { detectAgents, getAgentProfile } = require('./agents');

/**
 * PRO AGENT CLUSTER - Hierarchical Multi-Agent Orchestration Engine
 *
 * Manages project workspaces, Lead (OTA / Director) agents,
 * Worker sub-agents, token optimization directives, and human-in-the-loop interventions.
 */
class ProOrchestrator {
  constructor(terminalManager, defaultWorkspaceCwd) {
    this.terminalManager = terminalManager;
    this.defaultWorkspaceCwd = defaultWorkspaceCwd || process.cwd();
    this.activeProjects = new Map(); // projectId -> project object
    this.currentActiveProjectId = null;
  }

  /**
   * Get list of all installed agents formatted for director knowledge base
   */
  getAvailableAgentsKnowledge() {
    const detected = detectAgents();
    const installed = detected.filter(a => a.isInstalled);
    return installed.map(a => ({
      id: a.id,
      name: a.name,
      category: a.category,
      tier: a.tier,
      role: a.role,
      tokenTier: a.tokenTier,
      version: a.version || 'installed'
    }));
  }

  /**
   * Generate Director Directive Markdown file in the project folder
   */
  generateDirectorDirective(projectName, projectDir, leadAgentProfile, availableAgents) {
    const agentsListMd = availableAgents.map(a =>
      `- **${a.name}** (\`${a.id}\`) [Tier: ${a.tier}, Token: ${a.tokenTier}]\n  Qobiliyati: ${a.role}`
    ).join('\n');

    return `# 👑 BEK-CLUSTER PRO AGENT DIRECTIVE
# LOYIHA DIREKTORI (OTA AGENT) YO'RIQNOMASI

Loyiha: ${projectName}
Katalog: ${projectDir}
Direktor Agent: ${leadAgentProfile.name}
Vaqt: ${new Date().toLocaleString()}

---

## 🎯 SIZNING ASOSIY VAZIFANGIZ VA ROLINGIZ:
Siz ushbu "${projectName}" loyihasining **BOSH BOSHQARUVCHISI (OTA AGENT / LEAD DIRECTOR)** etib tayinlandingiz.
Siz to'liq loyiha arxitekturasi, kod sifati va boshqa bola agentlarni boshqarish uchun javobgarsiz.

### 📋 1. SIZNING MAJBURIYATLARINGIZ:
1. **Foydalanuvchi buyruqlarini sintez qilish**: Foydalanuvchi bergan har bir vazifani tahlil qiling va uning murakkablik darajasini aniqlang (Oddiy / O'rta / Murakkab / Kritik).
2. **Vazifalarni bo'lish (Task Decomposition)**: Katta vazifalarni mustaqil modullarga (Frontend, Backend, DB, Skriptlar, Testlar) ajrating.
3. **ORTIQCHA TOKEN SARFINI OLDINI OLISH (Token Economy Directive)**:
   - Oddiy vazifalar (fayllar qidirish, paket o'rnatish, formatlash, unit-testlarni yurgizish) uchun doimo yengil yoki tizim agentlarini (masalan, \`bash\`, \`opencode\`) tanlang.
   - Yuqori darajadagi mantiq, arxitektura va refaktoring uchun kuchli modellardan (\`claude\`, \`agy\`, \`codex\`) foydalaning.
4. **Bola agentlarni yo'naltirish**: Klasterdagi ishchi agentlarga vazifa berganda aniq fayl chegaralari, kiruvchi/chiquvchi ma'lumotlar va talablarni ko'rsating.
5. **Foydalanuvchi aralashuvi (Human Intervention)**: Agar foydalanuvchi biror bola agentning adashganini bildrsa, darhol o'sha agentga aniq tuzatish ko'rsatmasini bering.

---

## 🛠 KOMPYUTERDA MAVJUD BOLA AGENTLAR VA IMKONIYATLARI:
${agentsListMd}

---

## 💡 ISHNI BOSHLASH BO'YICHA BIRINCHI QADAM:
Foydalanuvchiga loyiha boshlanganini xushmuomalalik bilan bildiring va uning loyiha bo'yicha birinchi talab yoki texnik topshirig'ini (promtini) qabul qilishga tayyor ekanligingizni ayting.
`;
  }

  /**
   * Create a new Pro Agent Project
   */
  createProject(options = {}) {
    const {
      name,
      customCwd = null,
      leadAgentId = 'claude'
    } = options;

    if (!name || typeof name !== 'string' || !name.trim()) {
      throw new Error('Proyekt nomi kiritilishi shart');
    }

    const cleanName = name.trim().replace(/[^a-zA-Z0-9_\-\.]/g, '-');
    const projectDir = customCwd
      ? path.resolve(customCwd)
      : path.join(this.defaultWorkspaceCwd, 'projects', cleanName);

    // Ensure project directory exists
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }

    const bekClusterDir = path.join(projectDir, '.bek-cluster');
    if (!fs.existsSync(bekClusterDir)) {
      fs.mkdirSync(bekClusterDir, { recursive: true });
    }

    // Get Lead Agent Profile
    const leadProfile = getAgentProfile(leadAgentId);
    const availableAgents = this.getAvailableAgentsKnowledge();

    // Create Directive file
    const directiveContent = this.generateDirectorDirective(
      cleanName,
      projectDir,
      leadProfile,
      availableAgents
    );
    const directiveFilePath = path.join(bekClusterDir, 'DIRECTOR_DIRECTIVE.md');
    fs.writeFileSync(directiveFilePath, directiveContent, 'utf8');

    // Also write a friendly project README if not present
    const readmePath = path.join(projectDir, 'README.md');
    if (!fs.existsSync(readmePath)) {
      fs.writeFileSync(readmePath, `# ${cleanName}\n\nCreated with BEK-CLUSTER Pro Agent Orchestrator.\nDirector Agent: ${leadProfile.name}\n`, 'utf8');
    }

    // Spawn the Lead (OTA) Agent terminal session
    const leadSession = this.terminalManager.createSession({
      agentId: leadProfile.id,
      cwd: projectDir,
      customName: `👑 OTA: ${leadProfile.name} (Director)`
    });

    const projectId = 'proj_' + Date.now();
    const project = {
      id: projectId,
      name: cleanName,
      dir: projectDir,
      leadAgent: {
        agentId: leadProfile.id,
        name: leadProfile.name,
        sessionId: leadSession.id,
        status: 'active'
      },
      availableAgents,
      workers: [],
      status: 'active',
      createdAt: new Date().toISOString()
    };

    this.activeProjects.set(projectId, project);
    this.currentActiveProjectId = projectId;

    // Send initial introduction and directive hint to lead agent session after brief startup
    setTimeout(() => {
      try {
        const welcomePrompt = `Salom! Siz ushbu "${cleanName}" loyihasining OTA (Boshqaruvchi Direktor) agentisiz. Yo'riqnoma: .bek-cluster/DIRECTOR_DIRECTIVE.md faylida saqlandi. Foydalanuvchi buyrug'ini kutmoqdasiz.\r`;
        this.terminalManager.write(leadSession.id, welcomePrompt);
      } catch (err) {
        console.warn('[ProOrchestrator] Lead initial write notice error:', err.message);
      }
    }, 1200);

    return project;
  }

  /**
   * Get Active or Selected Project
   */
  getProject(projectId = null) {
    const id = projectId || this.currentActiveProjectId;
    if (!id) return null;
    return this.activeProjects.get(id) || null;
  }

  /**
   * List all projects
   */
  listProjects() {
    return Array.from(this.activeProjects.values());
  }

  /**
   * Spawn a Worker Sub-Agent under the Project
   */
  spawnWorker(projectId, options = {}) {
    const project = this.getProject(projectId);
    if (!project) {
      throw new Error('Faol proyekt topilmadi');
    }

    const {
      agentId = 'bash',
      role = 'Dasturchi',
      taskTitle = 'Yangi topshiriq',
      initialPrompt = ''
    } = options;

    const agentProfile = getAgentProfile(agentId);

    // Create session for worker
    const session = this.terminalManager.createSession({
      agentId: agentProfile.id,
      cwd: project.dir,
      customName: `🤖 ${role}: ${agentProfile.name}`
    });

    const workerId = 'worker_' + Date.now();
    const worker = {
      id: workerId,
      agentId: agentProfile.id,
      name: agentProfile.name,
      role,
      taskTitle,
      sessionId: session.id,
      tokenTier: agentProfile.tokenTier || 'balanced',
      status: 'working',
      createdAt: new Date().toISOString()
    };

    project.workers.push(worker);

    // If initial task prompt given, write to worker session
    if (initialPrompt && initialPrompt.trim()) {
      setTimeout(() => {
        try {
          this.terminalManager.write(session.id, initialPrompt.trim() + '\r');
        } catch (e) {
          console.warn('[ProOrchestrator] Worker initial prompt error:', e.message);
        }
      }, 1000);
    }

    // Notify Lead Agent that a worker was added
    if (project.leadAgent && project.leadAgent.sessionId) {
      setTimeout(() => {
        try {
          const notifyLead = `\r\n[TIZIM XABARI: Yangi bola agent qo'shildi -> ${agentProfile.name} (Rol: ${role}, Vazifa: ${taskTitle})]\r\n`;
          this.terminalManager.write(project.leadAgent.sessionId, notifyLead);
        } catch (e) {
          // ignore
        }
      }, 600);
    }

    return {
      worker,
      session
    };
  }

  /**
   * Human-in-the-loop Intervention:
   * User observes worker mistake and directs OTA (Lead) to correct it.
   */
  intervene(projectId, options = {}) {
    const project = this.getProject(projectId);
    if (!project) {
      throw new Error('Proyekt topilmadi');
    }

    const {
      workerId = null,
      feedbackMessage = '',
      directWorker = false
    } = options;

    if (!feedbackMessage || !feedbackMessage.trim()) {
      throw new Error('Tuzatish matni kiritilishi shart');
    }

    let worker = null;
    if (workerId) {
      worker = project.workers.find(w => w.id === workerId || w.sessionId === workerId);
    }

    const workerDesc = worker ? `${worker.name} (${worker.role})` : 'Bola agent';

    // 1. Send intervention directive to Lead Agent
    if (project.leadAgent && project.leadAgent.sessionId) {
      const leadInterventionPrompt = `\r\n⚠️ [FOYDALANUVCHI ARALASHUVI VA KO'RSATMASI]\r\nFoydalanuvchi ${workerDesc} ishida quyidagi tuzatishni talab qildi:\r\n"${feedbackMessage.trim()}"\r\nIltimos, ushbu holatni zudlik bilan tahlil qiling va zarur bo'lsa ishni to'g'ri o'zanga buring.\r\n`;
      try {
        this.terminalManager.write(project.leadAgent.sessionId, leadInterventionPrompt);
      } catch (e) {
        console.warn('[ProOrchestrator] Lead intervention write error:', e.message);
      }
    }

    // 2. If directWorker is requested or worker session exists, also prompt worker directly
    if (directWorker && worker && worker.sessionId) {
      try {
        const directPrompt = `\r\n[DIREKTOR VA FOYDALANUVCHI KO'RSATMASI]: ${feedbackMessage.trim()}\r\n`;
        this.terminalManager.write(worker.sessionId, directPrompt);
      } catch (e) {
        console.warn('[ProOrchestrator] Direct worker write error:', e.message);
      }
    }

    return {
      success: true,
      message: `Tuzatish Ota agent (${project.leadAgent.name})ga yetkazildi`,
      worker: worker ? worker.name : null
    };
  }

  /**
   * Close or remove project
   */
  closeProject(projectId) {
    const project = this.activeProjects.get(projectId);
    if (!project) return false;

    // Optional: kill workers or leave them running
    project.status = 'closed';
    this.activeProjects.delete(projectId);
    if (this.currentActiveProjectId === projectId) {
      const remaining = Array.from(this.activeProjects.keys());
      this.currentActiveProjectId = remaining.length > 0 ? remaining[0] : null;
    }
    return true;
  }
}

module.exports = ProOrchestrator;
