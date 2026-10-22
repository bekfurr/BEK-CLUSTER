# BEKFURR AGENT CLUSTER (`bek-cluster`)

> Hierarchical Multi-Agent AI Terminal Orchestrator & Virtual Workspace  
> Orchestrate multiple AI coding agents (Claude Code, Antigravity CLI, OpenAI Codex, OpenCode, Copilot, Aider, etc.) concurrently in an Apple visionOS & macOS inspired interface.

---

![Version](https://img.shields.io/badge/BEK--CLUSTER-v1.1.0-E5383B?style=flat-square&logo=terminal)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js)
![npm](https://img.shields.io/badge/npm-bek--cluster-CB3837?style=flat-square&logo=npm)
![License](https://img.shields.io/badge/License-MIT-gray?style=flat-square)

---

## ⚡ Quick Start via NPM (No Git Clone Required)

Install directly from npm registry to use `bek-cluster` in any project:

```bash
# Install globally
npm install -g bek-cluster

# Launch in your repository or project folder
cd /path/to/your/project
bek-cluster
```

Your default browser will immediately open `http://127.0.0.1:3888` connected to your workspace.

---

## What's New in Version 1.1.0

### 👑 PRO AGENT Mode (Hierarchical Lead / Worker Orchestrator)
Transform individual AI tools into a coordinated autonomous team:
- **Project Setup Wizard**: Create dedicated project workspaces with isolated directories and configuration.
- **OTA (Director / Lead) Agent**: Assign an authoritative supervisor (e.g. Claude Code, Antigravity CLI, Codex CLI) to lead your project.
- **Automated Director Directive (`.bek-cluster/DIRECTOR_DIRECTIVE.md`)**: Automatically injected upon launch, equipping the Lead Agent with full architectural authority and a live inventory of all installed worker models.
- **Intelligent Token Economy Policy**: The Director agent synthesizes incoming user goals, decomposes them into modular milestones, and assigns routine tasks to lightweight/balanced sub-agents while reserving high-intelligence models for core architectural logic.
- **Worker Sub-Agents Klaster**: Launch specialized sub-agents (Frontend Developer, Backend API, Unit Tester, DevOps) executing in parallel within the shared workspace.
- **Human-in-the-Loop Intervention Bar**: Monitor execution and intervene at any moment. Instruct the Director agent to redirect or course-correct any sub-agent that makes a mistake or deviates from instructions.

### 🛠️ Agent Detection & Installer Hub
- **Strict Host Detection**: Displays only genuinely installed CLI agents on your machine to eliminate interface confusion.
- **AI Agent Onboarding Banner**: Prompts users when zero AI agents are detected and provides a direct path to installation.
- **Dual Installation Methods**:
  - **⚡ Automatic**: Spawns an interactive live PTY terminal session to execute package manager commands (`npm install -g ...`, `pip install ...`) in real-time.
  - **📖 Step-by-Step Manual Guide**: Clear sequential steps with one-click **Copy-to-Clipboard** commands, prerequisites, and authentication instructions.

### 🧭 Collapsible Sleek Sidebar Navigation
- Apple visionOS inspired glassmorphic sidebar grouping modes, layouts, and tools.
- Quick collapse/expand toggle button or **`Cmd/Ctrl + B`** keyboard shortcut with animated width transition and automated terminal refit.
- Floating tooltips in collapsed icon mode.

---

## Core Features

- **Multi-Agent Side-by-Side Execution**: Run multiple independent agent sessions in parallel on the same project repository.
- **Dynamic Layout Engine**:
  - **Vertikal**: Displays up to 3 agents vertically with smooth wheel / arrow navigation.
  - **Gorizontal**: Displays up to 3 agents side-by-side with mouse wheel horizontal translation.
  - **Virtual Desktop**: Drag, float, and pinch-resize terminal windows in freeform 2D space.
  - **Tabs**: Fullscreen single-agent tab switching.
- **Spotlight Broadcast Bar**: Floating capsule (`Cmd/Ctrl + K`) allowing you to transmit prompts to all or selected agents simultaneously for benchmark comparison or collaborative work.
- **Working Directory Switcher & Safety Restart**: Re-target any agent to a different directory directly from the pane header.
- **Token & Model Usage Analytics**: Real-time stream sniffing for token consumption (prompt, completion, total) and AI model tracking with visionOS-styled breakdown KPIs, progress bars, and historical logs.
- **4-Color Real-Time Status Engine**:
  - 🟡 Yellow: Thinking / processing stream
  - 🟢 Green: Done / ready / idle
  - 🔴 Red: Error / non-zero exit
  - 🔵 Blue: Waiting for user confirmation or interactive input
- **xterm.js + node-pty**: TrueColor, desaturated ANSI palette, cursor blink, resize handling, mouse interactions, and hyperlink support.

---

## Supported Agents & Classification

| Agent | Executable | Tier | Token Tier | Primary Specialty |
|---|---|---|---|---|
| **Claude Code** | `claude` | `lead` | `high-power` | System architecture, complex orchestration, full system design |
| **Antigravity CLI** | `agy` | `lead` | `high-power` | Deep reasoning, autonomous workflows, full-stack development |
| **Codex CLI** | `codex` | `lead` | `high-power` | Backend modules, API endpoints, code refactoring |
| **OpenCode** | `opencode` | `worker` | `balanced` | UI components, fast feature generation, unit tests |
| **GitHub Copilot** | `copilot` | `worker` | `balanced` | CLI commands, GitHub workflows, scripts |
| **Aider AI** | `aider` | `worker` | `balanced` | Git pair programming, automated commit integration |
| **Cursor Agent** | `cursor` | `worker` | `balanced` | Fast file edits, structural code changes |
| **DeepSeek CLI** | `deepseek` | `worker` | `balanced` | Algorithmic logic, data analysis, microservices |
| **Crush CLI** | `crush` | `worker` | `balanced` | Fast terminal coding assistant |
| **Pi CLI** | `pi` | `worker` | `balanced` | Personal AI assistant |
| **Bash Shell** | `bash` | `shell` | `zero-token` | Native system commands, build scripts, git operations |
| **PowerShell** | `powershell` / `pwsh` | `shell` | `zero-token` | Windows PowerShell system automation |
| **Command Prompt**| `cmd` | `shell` | `zero-token` | Windows Command Prompt (`cmd.exe`) |
| **Custom Binary** | *custom* | `custom` | *custom* | Any executable, script, or CLI utility |

---

## Installation & Setup

### Option 1: Direct NPM Install (Recommended)

```bash
npm install -g bek-cluster
bek-cluster
```

### Option 2: Clone from GitHub Source

```bash
# 1. Clone repository
git clone https://github.com/bekfurr/BEK-CLUSTER.git
cd BEK-CLUSTER

# 2. Install dependencies (auto-builds native node-pty)
npm install

# 3. Link globally
npm link

# 4. Launch in any directory
bek-cluster
```

---

## Platform Prerequisites for Native PTY

Ensure **Node.js (v18.0.0 or higher)** and standard build tools are present:

### 🐧 Linux (Ubuntu, Debian, Fedora, Arch)
```bash
# Ubuntu / Debian:
sudo apt update && sudo apt install -y build-essential python3 make g++

# Fedora:
sudo dnf groupinstall "Development Tools" && sudo dnf install -y python3

# Arch Linux:
sudo pacman -S --needed base-devel python
```

### 🍏 macOS (Intel & Apple Silicon M1/M2/M3/M4)
```bash
xcode-select --install
```

### 🪟 Windows (10 / 11)
Run PowerShell as Administrator:
```powershell
winget install Microsoft.VisualStudio.2022.BuildTools --override "--passive --config DesktopCpp"
```

---

## CLI Options

```text
Usage: bek-cluster [options]

BEKFURR-AGENT-CLUSTER: Multi-Agent AI Terminal Orchestrator

Options:
  -v, --version           Show current version
  -p, --port <number>     Server port (default: 3888; auto-increments if busy)
  -H, --host <host>       Host to bind (default: 127.0.0.1)
  -d, --dir <path>        Workspace directory for agents (default: current directory)
  --no-open               Do not open default browser automatically
  -h, --help              Display help information
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Cmd/Ctrl + B` | Toggle left sidebar collapse / expand |
| `Cmd/Ctrl + K` | Toggle Spotlight broadcast capsule and focus input |
| `Cmd/Ctrl + 1..6` | Switch focus directly to window 1 through 6 |
| `Arrow Keys` / `Alt + Arrow` | Smoothly navigate between agents in Vertikal or Gorizontal modes |
| `Mouse Wheel` | Horizontal scroll translation in Gorizontal layout |
| `Escape` | Dismiss active modals, dropdowns, and flyout menus |

---

## Architecture

- **Backend**: Node.js, Express, WebSocket (`ws`), `node-pty` native pseudo-terminal engine, Pro Orchestration Engine (`src/pro-orchestrator.js`).
- **Frontend**: Vanilla ES6+, `xterm.js`, `xterm-addon-fit`, `xterm-addon-web-links`, visionOS Glassmorphic design system.
- **Process Isolation**: Independent PTY terminal instances per sub-agent under a unified project directory context.
- **Intervention Engine**: Bi-directional directive dispatch enabling human supervision through the Lead Director.

---

## License

MIT License © 2026 bekfurr
