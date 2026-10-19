# ⚡ BEKFURR AGENT CLUSTER (`bek-cluster`)

> **Multi-Agent AI Terminal Orchestrator & Web Cluster**  
> Bir vaqtning o'zida bir nechta AI agentlarini (Claude Code, Codex, Antigravity, OpenCode, Gemini, Copilot va h.k.) bitta zamonaviy veb-interfeysda parallel ishlatish vositasi.

---

![BEK-CLUSTER](https://img.shields.io/badge/BEK--CLUSTER-v1.0.0-06B6D4?style=for-the-badge&logo=terminal)
![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=for-the-badge&logo=node.js)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)

---

## 🌟 English Overview

**BEKFURR AGENT CLUSTER** (`bek-cluster`) is a developer workspace that lets you run and interact with multiple CLI AI agents side-by-side in a unified web window. Instead of juggling dozens of terminal windows or tmux panes, `bek-cluster` provides:

- 🤖 **Auto-Detected AI Agents**: Automatically detects installed agents in your environment (`claude`, `codex`, `antigravity`, `opencode`, `gemini`, `copilot`, `crush`, `pi`, `bash`, etc.).
- ⚡ **Simultaneous Multi-Agent Execution**: Launch multiple instances of different or identical agents side-by-side.
- 📡 **Broadcast Prompting**: Send a single prompt or command to **all active agents at once** to benchmark their responses, compare architectures, or parallelize tasks.
- 🖥️ **Full Interactive PTY Terminals**: Powered by `xterm.js` and `node-pty` with truecolor support, full ANSI colors, cursor blink, resize handling, mouse interaction, and link clicking.
- 📐 **Dynamic Layouts**: Switch effortlessly between:
  - **Auto Responsive Grid** (1, 2, 3, 4, 6+ panes)
  - **1x2 Vertical Split** (2 agents side-by-side)
  - **2x1 Horizontal Split** (stacked agents)
  - **1x3 Triple Split** (3 agents side-by-side)
  - **Tabs Mode** (Full-screen tabs)
  - **Focus / Maximize Mode** (Click any pane to expand 100%)
- 📂 **Workspace Aware**: Launches in whichever directory you run `bek-cluster` from, pointing all agents to your current project.
- 🚀 **One-Command CLI**: Install once via npm, then invoke `bek-cluster` from any terminal or project folder anytime!

---

## 🇺🇿 O'zbekcha Tavsif

**BEKFURR AGENT CLUSTER** — kompyuteringizda o'rnatilgan sun'iy intellekt agentlarini (Claude Code, OpenAI Codex, Google Antigravity, OpenCode va boshqalar) bitta oynada, bo'lingan ekran (split-screen / grid / tabs) ko'rinishida parallel ishlatish imkonini beruvchi mahalliy veb-interfeys.

### Asosiy imkoniyatlar:
1. **Barcha agentlar bitta oynada**: Terminal oynalari o'rtasida sarson bo'lmasdan Claude Code, Codex, Antigravity va OpenCode kabilarni bitta ekranda boshqarasiz.
2. **Broadcast Prompt (Barcha agentlarga bir vaqtda topshiriq yuborish)**: Topshiriq yozasiz va "Transmit" tugmasini bosishingiz bilan hamma faol agentlarga birdaniga yuboriladi. Agentlarning qaysi biri yaxshiroq yechim berishini taqqoslash juda qulay!
3. **To'liq interaktiv PTY Terminal**: Ranglar (TrueColor), kursor harakatlari, buyruqlar tarixi va klaviatura kombinatsiyalari xuddi odatiy konsoldagidek ishlaydi.
4. **Moslashuvchan Layoutlar**: Split (2 talik, 3 talik), Grid (to'rsimon), Tabs (tablar ko'rinishida) yoki bitta agentni kattalashtirib (maximize) ishlash.
5. **Ixtiyoriy buyruq/agent ishga tushirish**: O'zingiz xohlagan har qanday CLI agent yoki skriptni custom argumentlar bilan ishga tushirish imkoniyati.
6. **Istalgan papkadan chaqirish**: `bek-cluster` komandasi orqali qaysi papkada bo'lsangiz, barcha agentlar avtomatik tarzda o'sha papka ichida ish boshlaydi.

---

## 🚀 O'rnatish va Ishga Tushirish (Installation)

### 1. Proyektni o'rnatish:
```bash
cd /home/bekfurr/BEK-CLUSTER
npm install
```

### 2. Global CLI komanda sifatida ro'yxatdan o'tkazish:
Global tarzda har qanday papkadan `bek-cluster` deb chaqirish uchun quyidagi komandalardan birini bajaring:

```bash
# Variant A (npm link orqali):
npm link

# Yoki Variant B (npm install -g orqali):
npm install -g .
```

### 3. Istalgan papkadan ishga tushirish:
Endi xohlagan loyihangiz papkasiga o'tib, konsolda:
```bash
cd /path/to/any/project
bek-cluster
```
Buyrug'ini bersangiz kifoya! Brauzeringiz avtomatik tarzda ochiladi (`http://127.0.0.1:3888`) va barcha agentlar o'sha loyiha papkasida ishlaydi.

---

## ⚙️ CLI Buyruqlari va Parametrlari (CLI Options)

```bash
Usage: bek-cluster [options]

BEKFURR-AGENT-CLUSTER: Multi-Agent AI Terminal Orchestrator

Options:
  -v, --version           Joriy versiyani ko'rish
  -p, --port <number>     Server porti (standart: 3888, agar band bo'lsa avtomatik keyingisiga o'tadi)
  -H, --host <host>       Bog'lanadigan host (standart: 127.0.0.1)
  -d, --dir <path>        Agentlar ishlaydigan ishchi papka (standart: joriy papka)
  --no-open               Brauzerni avtomatik ochmaslik
  -h, --help              Yordam xabarini ko'rsatish
```

### Misollar:
```bash
# Standart ishga tushirish (port 3888, brauzer ochiladi):
bek-cluster

# Boshqa portda ishga tushirish:
bek-cluster -p 4200

# Aniq bir papka uchun ishga tushirish:
bek-cluster -d ~/my-react-app

# Brauzersiz fon serveri sifatida ishga tushirish:
bek-cluster --no-open
```

---

## 🤖 Qo'llab-quvvatlanadigan Agentlar (Supported Agents)

| Agent | Komanda | Tavsif |
|---|---|---|
| **Claude Code** | `claude` | Anthropic rasmiy CLI agenti |
| **Antigravity** | `antigravity` | Google DeepMind agentic coding vositasi |
| **Codex CLI** | `codex` | OpenAI terminal yordamchisi |
| **OpenCode** | `opencode` | Open-source avtonom AI coding agenti |
| **Gemini CLI** | `gemini` | Google Gemini CLI terminal vositasi |
| **GitHub Copilot** | `copilot` | GitHub Copilot CLI |
| **Crush CLI** | `crush` | Crush coding yordamchisi |
| **Pi CLI** | `pi` | Personal AI assistant |
| **Bash Terminal** | `bash` | Standart tizim konsoli |
| **Custom Command** | *ixtiyoriy* | Istalgan buyruq va argumentlar |

---

## 💡 Maslahatlar va Klaviaturadagi Qulayliklar

- **Broadcast Prompt**: Yuqoridagi "Broadcast" tugmasi orqali barcha faol agentlarga bir vaqtda topshiriq yuborishingiz mumkin.
- **Tezkor Promtlar**: Broadcast panelidagi tayyor tugmalar (Review & Find Bugs, Generate Tests, Architecture Overview) orqali 1-klikda barcha agentlarga topshiriq berish mumkin.
- **Maximize / Focus**: Har bir agent kartasidagi kengaytirish tugmasini bossangiz, o'sha agent butun ekranga kattalashadi; yana bosganda avvalgi holatga qaytadi.
- **To'xtatish**: Terminalda `Ctrl + C` bosilganda barcha ishlayotgan agentlar va server toza yopiladi.

---

## 📄 Litsenziya

MIT License © 2026 bekfurr
