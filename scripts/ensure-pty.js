#!/usr/bin/env node

/**
 * Cross-platform verification and automatic rebuild script for node-pty.
 * Ensures that pty.node is available and compatible with the running Node.js runtime.
 */

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

function checkPty() {
  try {
    const pty = require('node-pty');
    if (typeof pty.spawn === 'function') {
      return { ok: true };
    }
    return { ok: false, error: new Error('node-pty.spawn is not a function') };
  } catch (err) {
    return { ok: false, error: err };
  }
}

function rebuildPty() {
  console.log('[bek-cluster] Compiling/rebuilding node-pty native module for platform:', process.platform, process.arch);

  // Try npm rebuild node-pty first
  const isWindows = process.platform === 'win32';
  const npmCmd = isWindows ? 'npm.cmd' : 'npm';

  const rebuildRes = spawnSync(npmCmd, ['rebuild', 'node-pty'], {
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '..'),
    shell: isWindows
  });

  if (rebuildRes.status === 0) {
    const recheck = checkPty();
    if (recheck.ok) {
      console.log('[bek-cluster] ✓ node-pty rebuilt successfully!');
      return true;
    }
  }

  // Fallback: direct node-gyp rebuild inside node-pty directory if it exists
  try {
    const ptyPkgDir = path.dirname(require.resolve('node-pty/package.json'));
    console.log('[bek-cluster] Running fallback node-gyp rebuild in:', ptyPkgDir);
    const npxCmd = isWindows ? 'npx.cmd' : 'npx';
    const gypRes = spawnSync(npxCmd, ['--no-install', 'node-gyp', 'rebuild'], {
      stdio: 'inherit',
      cwd: ptyPkgDir,
      shell: isWindows
    });
    if (gypRes.status === 0) {
      const recheck = checkPty();
      if (recheck.ok) {
        console.log('[bek-cluster] ✓ node-pty rebuilt successfully via node-gyp!');
        return true;
      }
    }
  } catch (e) {
    // ignore
  }

  return false;
}

function main() {
  const initialCheck = checkPty();
  if (initialCheck.ok) {
    console.log('[bek-cluster] ✓ node-pty native binding verified and operational.');
    process.exit(0);
  }

  console.warn('[bek-cluster] Notice: node-pty binary is missing or incompatible. Attempting automatic build...');
  const rebuilt = rebuildPty();

  if (rebuilt) {
    process.exit(0);
  }

  // Diagnostic output for the host operating system
  console.error('\n' + '='.repeat(68));
  console.error('[bek-cluster] ⚠️ WARNING: node-pty native compilation requires build tools.');
  console.error('Please ensure the following tools are installed on your machine:\n');

  if (process.platform === 'linux') {
    console.error('  • Debian/Ubuntu/Mint:  sudo apt-get install build-essential python3 make gcc g++');
    console.error('  • Arch Linux/Manjaro:  sudo pacman -S base-devel python');
    console.error('  • Fedora/RHEL:         sudo dnf groupinstall "Development Tools" && sudo dnf install python3');
  } else if (process.platform === 'darwin') {
    console.error('  • macOS:               xcode-select --install');
  } else if (process.platform === 'win32') {
    console.error('  • Windows:             npm install --global --production windows-build-tools');
    console.error('                         Or install Visual Studio with "Desktop development with C++"');
  }
  console.error('='.repeat(68) + '\n');

  // We don't fail hard with exit code 1 to allow npm install to finish if user builds tools later,
  // but we warn loudly.
  process.exit(0);
}

main();
