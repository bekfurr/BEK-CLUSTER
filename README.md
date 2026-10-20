# BEKFURR AGENT CLUSTER (`bek-cluster`)

> Multi-Agent AI Terminal Orchestrator & Virtual Workspace  
> Run and orchestrate multiple CLI AI agents (Claude Code, Antigravity CLI, OpenAI Codex, OpenCode, Copilot, etc.) simultaneously in an Apple visionOS / macOS inspired web environment.

---

![Version](https://img.shields.io/badge/BEK--CLUSTER-v1.0.0-E5383B?style=flat-square&logo=terminal)
![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=flat-square&logo=node.js)
![License](https://img.shields.io/badge/License-MIT-gray?style=flat-square)

---

## Overview

**BEKFURR AGENT CLUSTER** is a minimalist, local developer workspace designed for running, comparing, and broadcasting commands across multiple AI coding agents side-by-side.

Instead of managing cluttered tmux panes or detached terminal windows, `bek-cluster` unifies your command-line workflow inside a dark, hardware-accelerated web terminal interface.

### Highlights

- **Auto-Detection**: Scans your system environment and provides one-click launching for detected tools (`claude`, `agy`, `codex`, `opencode`, `copilot`, `crush`, `pi`, `bash`, or custom binaries).
- **Simultaneous Multi-Agent Execution**: Run multiple independent agent sessions in parallel on the same project repository.
- **Working Directory Switcher & Safety Restart**: View each agent's active folder path directly in the pane header. Click to re-target the agent to a different directory with instant process re-spawning and safety confirmation.
- **Token & Model Usage Analytics**: Real-time stream sniffing for token consumption (prompt, completion, total) and AI model tracking with visionOS-styled breakdown KPIs, progress bars, and historical logs.
- **Spotlight Broadcast Bar**: Floating capsule (`Cmd/Ctrl + K`) allowing you to transmit a prompt to all active agents simultaneously for benchmark comparison or collaborative work.
- **Dynamic Layout Engine**:
  - **Vertikal**: Displays up to 3 agents vertically with smooth wheel / arrow navigation.
  - **Gorizontal**: Displays up to 3 agents side-by-side with mouse wheel horizontal translation.
  - **Virtual Desktop**: Drag, float, and pinch-resize terminal windows in freeform 2D space.
  - **Tabs**: Fullscreen single-agent tab switching.
- **Background Execution & Minimize to Dock**: Collapse any active pane into a compact status icon with the `-` control. Background PTY processes continue executing without interruption.
- **4-Color Real-Time Status Engine**:
  - Yellow: Thinking / processing stream
  - Green: Done / ready / idle
  - Red: Error / non-zero exit
  - Blue: Waiting for user confirmation or interactive input
- **xterm.js + node-pty**: TrueColor, desaturated ANSI palette, cursor blink, resize handling, mouse interactions, and hyperlink support.

---

## Interface Previews

Place your workspace screenshots in `docs/screenshots/`:

| Overview (Desktop Mode) | Spotlight Broadcast & Dynamic Flow |
| :---: | :---: |
| ![Desktop Layout](docs/screenshots/overview.png) | ![Broadcast View](docs/screenshots/broadcast.png) |

---

## Installation & Setup

`bek-cluster` utilizes high-performance native pseudo-terminal bindings (`node-pty`) for responsive, low-latency streaming between web browsers and AI CLI processes. 

Thanks to our built-in `.npmrc` configuration and self-healing `scripts/ensure-pty.js`, installation runs out-of-the-box on Linux, macOS, and Windows.

---

### Prerequisites by Platform

Ensure **Node.js (v18.0.0 or higher)** and a standard C++ compiler toolchain are present on your machine:

#### 🐧 Linux (Ubuntu, Debian, Fedora, Arch)
```bash
# Ubuntu / Debian / Pop!_OS:
sudo apt update && sudo apt install -y build-essential python3 make g++

# Fedora / RHEL:
sudo dnf groupinstall "Development Tools" && sudo dnf install -y python3

# Arch Linux / Manjaro:
sudo pacman -S --needed base-devel python
```

#### 🍏 macOS (Intel & Apple Silicon M1/M2/M3/M4)
Ensure Xcode Command Line Tools are active:
```bash
xcode-select --install
```

#### 🪟 Windows (10 / 11)
Run PowerShell as Administrator and verify build tools are installed:
```powershell
# Option 1 (Winget - Recommended):
winget install Microsoft.VisualStudio.2022.BuildTools --override "--passive --config DesktopCpp"

# Option 2 (via npm in admin PowerShell):
npm install --global --production windows-build-tools
```

---

### Step-by-Step Installation

#### 1. Clone the repository
```bash
git clone https://github.com/BEKFURR/BEK-CLUSTER.git
cd BEK-CLUSTER
```

#### 2. Install dependencies
```bash
npm install
```
> **Note**: Our configured `.npmrc` (`allow-scripts=node-pty`) permits `node-pty` to compile automatically. Our automated postinstall self-healing script (`ensure-pty.js`) verifies and binds the native PTY engine without requiring manual confirmation prompts.

#### 3. Link globally as a system CLI
Choose either option to make the `bek-cluster` command available in any directory:

```bash
# Option A: Standard npm link (Recommended for developers)
npm link

# Option B: Global install from repository source
npm install -g .
```

#### 4. Launch in any project
Navigate to any repository or directory where you want your AI agents to operate, then launch:
```bash
cd /path/to/your/project
bek-cluster
```
Your default browser will immediately open `http://127.0.0.1:3888` connected to your workspace.

---

### Troubleshooting & Common Fixes

<details>
<summary><b>1. EACCES / Permission denied during global install on Linux/macOS</b></summary>

Avoid running `sudo npm install -g`. Instead, configure npm's default global directory to your user home:
```bash
mkdir -p ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc # or ~/.zshrc
source ~/.bashrc # or source ~/.zshrc
npm link
```
</details>

<details>
<summary><b>2. Windows PowerShell script execution policy error</b></summary>

If Windows blocks running `bek-cluster`, run PowerShell as Administrator and enable local scripts:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```
</details>

<details>
<summary><b>3. Native binding mismatch after Node.js version upgrade</b></summary>

If you switch Node.js versions (e.g. via `nvm`, `mise`, or `fnm`), trigger a clean rebuild:
```bash
npm run postinstall
# or manually:
npm rebuild node-pty
```
</details>

---

## CLI Usage & Flags

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

### Examples

```bash
# Standard launch:
bek-cluster

# Run on a custom port:
bek-cluster -p 4200

# Open targeted project repository:
bek-cluster -d ~/projects/my-web-app

# Headless server mode (e.g. over SSH port-forwarding):
bek-cluster --no-open
```

---

## Keyboard Shortcuts

- `Cmd/Ctrl + K`: Toggle floating Spotlight broadcast capsule and focus input
- `Cmd/Ctrl + 1..6`: Quickly switch focus to window 1 through 6
- `Arrow Keys` (or `Alt + Arrow`): Smoothly scroll between agents in Vertikal or Gorizontal modes
- `Mouse Wheel`: Automatically converted to horizontal scrolling in Gorizontal layout
- `Escape`: Close menus and popover modals

---

## Supported Agents

| Agent | Executable | Description |
|---|---|---|
| **Claude Code** | `claude` | Anthropic official CLI coding agent |
| **Antigravity CLI** | `agy` | Google DeepMind Antigravity CLI coding assistant |
| **Codex CLI** | `codex` | OpenAI terminal assistant |
| **OpenCode** | `opencode` | Autonomous open-source AI software engineer |
| **GitHub Copilot** | `copilot` | GitHub Copilot CLI |
| **Crush CLI** | `crush` | Terminal code assistant |
| **Pi CLI** | `pi` | Personal AI assistant |
| **Bash Terminal** | `bash` | Standard system shell session |
| **Custom Binary** | *custom* | Any command, interpreter, or flags |

---

## Architecture

- **Backend**: Node.js, Express, WebSocket (`ws`), `node-pty` pseudo-terminal manager.
- **Frontend**: Vanilla ES6+, `xterm.js`, `xterm-addon-fit`, `xterm-addon-web-links`, CSS visionOS Glassmorphism design system.
- **Window Management**: Custom virtual desktop manager supporting freeform dragging, 8-way directional resize handles, z-index elevation, and persistent background execution via CSS minimization.

---

## License

MIT License © 2026 bekfurr
