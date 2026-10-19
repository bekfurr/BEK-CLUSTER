#!/usr/bin/env node

const path = require('path');
const net = require('net');
const { program } = require('commander');
const { createServer } = require('../src/server');
const { detectAgents } = require('../src/agents');
const pkg = require('../package.json');

program
  .name('bek-cluster')
  .description('BEKFURR-AGENT-CLUSTER: Multi-Agent AI Terminal Orchestrator')
  .version(pkg.version, '-v, --version', 'Output the current version')
  .option('-p, --port <number>', 'Port to listen on', '3888')
  .option('-H, --host <host>', 'Host address to bind to', '127.0.0.1')
  .option('-d, --dir <path>', 'Workspace directory for agents', process.cwd())
  .option('--no-open', 'Do not open the browser automatically')
  .parse(process.argv);

const options = program.opts();
const requestedPort = parseInt(options.port, 10) || 3888;
const host = options.host || '127.0.0.1';
const cwd = path.resolve(options.dir || process.cwd());

/**
 * Find an available port starting from the requested port.
 */
function findAvailablePort(startPort, host) {
  return new Promise((resolve, reject) => {
    const testServer = net.createServer();
    testServer.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        // Try next port
        resolve(findAvailablePort(startPort + 1, host));
      } else {
        reject(err);
      }
    });

    testServer.once('listening', () => {
      testServer.close(() => {
        resolve(startPort);
      });
    });

    testServer.listen(startPort, host);
  });
}

/**
 * Safely open a browser URL.
 */
async function openBrowser(url) {
  try {
    const open = require('open');
    await open(url);
  } catch (err) {
    const { exec } = require('child_process');
    const platform = process.platform;
    const cmd = platform === 'win32' ? `start ${url}` :
                platform === 'darwin' ? `open ${url}` : `xdg-open ${url}`;
    exec(cmd, () => {});
  }
}

async function main() {
  try {
    const port = await findAvailablePort(requestedPort, host);
    const { httpServer, terminalManager } = createServer({ cwd });

    httpServer.listen(port, host, async () => {
      const url = `http://${host}:${port}`;
      const agents = detectAgents();
      const installedAgents = agents.filter(a => a.isInstalled);

      const cyan = '\x1b[36m';
      const green = '\x1b[32m';
      const yellow = '\x1b[33m';
      const magenta = '\x1b[35m';
      const blue = '\x1b[34m';
      const bold = '\x1b[1m';
      const dim = '\x1b[2m';
      const reset = '\x1b[0m';

      console.log('\n' + cyan + bold + `
  ██████╗ ███████╗██╗  ██╗       ██████╗██╗     ██╗   ██╗███████╗████████╗███████╗██████╗
  ██╔══██╗██╔════╝██║ ██╔╝      ██╔════╝██║     ██║   ██║██╔════╝╚══██╔══╝██╔════╝██╔══██╗
  ██████╔╝█████╗  █████╔╝       ██║     ██║     ██║   ██║███████╗   ██║   █████╗  ██████╔╝
  ██╔══██╗██╔══╝  ██╔═██╗       ██║     ██║     ██║   ██║╚════██║   ██║   ██╔══╝  ██╔══██╗
  ██████╔╝███████╗██║  ██╗██╗   ╚██████╗███████╗╚██████╔╝███████║   ██║   ███████╗██║  ██║
  ╚═════╝ ╚══════╝╚═╝  ╚═╝╚═╝    ╚═════╝╚══════╝ ╚═════╝ ╚══════╝   ╚═╝   ╚══════╝╚═╝  ╚═╝
      ` + reset);

      console.log(bold + `  ⚡ BEKFURR AGENT CLUSTER v${pkg.version}` + reset + dim + ' — Multi-Agent Web Orchestrator' + reset);
      console.log('  ' + '─'.repeat(65));
      console.log(`  ${green}●${reset} ${bold}Web Interface:${reset}   ${cyan}${underline(url)}${reset}`);
      console.log(`  ${yellow}📂${reset} ${bold}Workspace Dir:${reset}   ${blue}${cwd}${reset}`);

      const agentListStr = installedAgents.map(a => `${bold}${a.name}${reset}`).join(dim + ', ' + reset);
      console.log(`  ${magenta}🤖${reset} ${bold}Detected Agents:${reset} ${agentListStr || 'None (Custom commands available)'}`);

      console.log('  ' + '─'.repeat(65));
      console.log(`  ${dim}Press ${bold}Ctrl + C${reset}${dim} in this terminal to shut down the cluster.${reset}\n`);

      if (options.open !== false) {
        openBrowser(url);
      }
    });

    // Handle graceful shutdown
    const cleanup = () => {
      console.log('\n\x1b[33mShutting down BEK-CLUSTER and terminating active agent processes...\x1b[0m');
      terminalManager.killAll();
      httpServer.close(() => {
        console.log('\x1b[32mCluster successfully closed. Goodbye!\x1b[0m');
        process.exit(0);
      });
      // Force exit after 2s if still hanging
      setTimeout(() => process.exit(0), 2000);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);

  } catch (err) {
    console.error('\x1b[31mFatal error starting BEK-CLUSTER:\x1b[0m', err);
    process.exit(1);
  }
}

function underline(text) {
  return `\x1b[4m${text}\x1b[24m`;
}

main();
