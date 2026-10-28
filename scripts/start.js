#!/usr/bin/env node
/**
 * LabPulse — Unified Application Launcher
 * Course: CSE494 Intelligent NoSQL Databases
 * 
 * Runs both the Python Flask Backend and Vite React Frontend
 * concurrently with one single command.
 * 
 * Usage:
 *   npm start
 *   npm run dev
 *   node scripts/start.js
 */

import { spawn, execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const BACKEND_DIR = path.resolve(ROOT_DIR, 'backend');

// ANSI Color Codes
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const MAGENTA = '\x1b[35m';
const RED = '\x1b[31m';
const BLUE = '\x1b[34m';

const BACKEND_TAG = `${CYAN}${BOLD}[Backend]${RESET} `;
const FRONTEND_TAG = `${MAGENTA}${BOLD}[Frontend]${RESET} `;
const SYSTEM_TAG = `${GREEN}${BOLD}[LabPulse]${RESET} `;

// Active child processes to kill on exit
const runningChildren = [];
let isShuttingDown = false;

/**
 * Determine which Python executable to use
 */
function findPythonExecutable() {
  const isWindows = process.platform === 'win32';
  const venvCandidates = [
    path.join(BACKEND_DIR, 'venv', isWindows ? 'Scripts/python.exe' : 'bin/python'),
    path.join(ROOT_DIR, 'venv', isWindows ? 'Scripts/python.exe' : 'bin/python'),
    path.join(BACKEND_DIR, '.venv', isWindows ? 'Scripts/python.exe' : 'bin/python'),
    path.join(ROOT_DIR, '.venv', isWindows ? 'Scripts/python.exe' : 'bin/python'),
  ];

  for (const candidate of venvCandidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  // Fallback to system Python
  if (isWindows) {
    try {
      execSync('python --version', { stdio: 'ignore' });
      return 'python';
    } catch (e) {
      try {
        execSync('py -3 --version', { stdio: 'ignore' });
        return 'py';
      } catch (e2) {
        return 'python';
      }
    }
  } else {
    try {
      execSync('python3 --version', { stdio: 'ignore' });
      return 'python3';
    } catch (e) {
      return 'python';
    }
  }
}

/**
 * Cleanly terminate a process tree (especially critical on Windows)
 */
function killProcess(pid) {
  if (!pid) return;
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' });
    } else {
      process.kill(-pid, 'SIGTERM');
    }
  } catch (err) {
    // Process might have already terminated
    try {
      process.kill(pid, 'SIGKILL');
    } catch (e) {}
  }
}

/**
 * Graceful shutdown for all services
 */
function shutdown(exitCode = 0) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`\n${SYSTEM_TAG}${YELLOW}Shutting down all running services...${RESET}`);

  for (const child of runningChildren) {
    if (child && child.pid) {
      killProcess(child.pid);
    }
  }

  console.log(`${SYSTEM_TAG}${GREEN}All services successfully stopped. Goodbye!${RESET}\n`);
  process.exit(exitCode);
}

// Hook termination signals
process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
process.on('SIGHUP', () => shutdown(0));
process.on('exit', () => {
  for (const child of runningChildren) {
    if (child && child.pid) killProcess(child.pid);
  }
});

/**
 * Prefix stream output with a colored tag
 */
function attachPrefix(stream, prefix) {
  if (!stream) return;
  let buffer = '';

  stream.on('data', (data) => {
    buffer += data.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop(); // Keep incomplete trailing fragment in buffer

    for (const line of lines) {
      if (line.trim().length > 0) {
        console.log(`${prefix}${line}`);
      }
    }
  });

  stream.on('end', () => {
    if (buffer.trim().length > 0) {
      console.log(`${prefix}${buffer}`);
    }
  });
}

/**
 * Main launcher function
 */
function main() {
  const args = process.argv.slice(2);
  const backendOnly = args.includes('--backend-only') || args.includes('-b');
  const frontendOnly = args.includes('--frontend-only') || args.includes('-f');

  const pythonExec = findPythonExecutable();
  const isWindows = process.platform === 'win32';
  const npmCmd = isWindows ? 'npm.cmd' : 'npm';

  // Display startup banner
  console.log(`${CYAN}╔═══════════════════════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${CYAN}║${RESET}  ${BOLD}🚀 LabPulse — Smart Lab Equipment Monitoring & Failure Prediction${RESET}   ${CYAN}║${RESET}`);
  console.log(`${CYAN}╠═══════════════════════════════════════════════════════════════════════╣${RESET}`);
  if (!frontendOnly) {
    console.log(`${CYAN}║${RESET}  📡 ${BOLD}Flask REST API${RESET}   : ${BLUE}http://localhost:5000${RESET} (Backend)                  ${CYAN}║${RESET}`);
  }
  if (!backendOnly) {
    console.log(`${CYAN}║${RESET}  💻 ${BOLD}Vite React Web${RESET}   : ${BLUE}http://localhost:5173${RESET} (Frontend)                 ${CYAN}║${RESET}`);
  }
  console.log(`${CYAN}║${RESET}  🐍 ${BOLD}Python Executable${RESET}: ${DIM}${pythonExec.padEnd(52)}${RESET}${CYAN}║${RESET}`);
  console.log(`${CYAN}╠═══════════════════════════════════════════════════════════════════════╣${RESET}`);
  console.log(`${CYAN}║${RESET}  💡 ${YELLOW}Press Ctrl+C at any time to gracefully stop all services.${RESET}         ${CYAN}║${RESET}`);
  console.log(`${CYAN}╚═══════════════════════════════════════════════════════════════════════╝${RESET}\n`);

  // 1. Start Python Flask Backend
  if (!frontendOnly) {
    console.log(`${SYSTEM_TAG}Starting Flask REST API server on port 5000...`);
    const backendProc = spawn(pythonExec, ['backend/app.py'], {
      cwd: ROOT_DIR,
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    runningChildren.push(backendProc);
    attachPrefix(backendProc.stdout, BACKEND_TAG);
    attachPrefix(backendProc.stderr, BACKEND_TAG);

    backendProc.on('error', (err) => {
      console.error(`${BACKEND_TAG}${RED}Failed to start Flask backend: ${err.message}${RESET}`);
    });

    backendProc.on('exit', (code, signal) => {
      if (!isShuttingDown) {
        console.log(`${BACKEND_TAG}${YELLOW}Backend process exited with code ${code ?? signal}.${RESET}`);
      }
    });
  }

  // 2. Start Vite React Frontend
  if (!backendOnly) {
    console.log(`${SYSTEM_TAG}Starting Vite React development server on port 5173...`);
    const frontendProc = spawn(npmCmd, ['run', 'dev:frontend'], {
      cwd: ROOT_DIR,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    });

    runningChildren.push(frontendProc);
    attachPrefix(frontendProc.stdout, FRONTEND_TAG);
    attachPrefix(frontendProc.stderr, FRONTEND_TAG);

    frontendProc.on('error', (err) => {
      console.error(`${FRONTEND_TAG}${RED}Failed to start Vite frontend: ${err.message}${RESET}`);
    });

    frontendProc.on('exit', (code, signal) => {
      if (!isShuttingDown) {
        console.log(`${FRONTEND_TAG}${YELLOW}Frontend process exited with code ${code ?? signal}.${RESET}`);
      }
    });
  }
}

main();

