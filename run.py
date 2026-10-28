#!/usr/bin/env python3
"""
LabPulse — Python Unified Runner
Course: CSE494 Intelligent NoSQL Databases

Runs both the Python Flask Backend and Vite React Frontend
concurrently with one single command.

Usage:
    python run.py
"""

import os
import sys
import subprocess
import signal
import time

# Ensure immediate unbuffered output even when piped
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(line_buffering=True)
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(line_buffering=True)

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")

# ANSI color styling
CYAN = "\033[36m"
MAGENTA = "\033[35m"
GREEN = "\033[32m"
YELLOW = "\033[33m"
RED = "\033[31m"
BOLD = "\033[1m"
DIM = "\033[2m"
RESET = "\033[0m"

processes = []
shutting_down = False


def print_banner():
    print(f"{CYAN}╔═══════════════════════════════════════════════════════════════════════╗{RESET}")
    print(f"{CYAN}║{RESET}  {BOLD}🚀 LabPulse — Smart Lab Equipment Monitoring & Failure Prediction{RESET}   {CYAN}║{RESET}")
    print(f"{CYAN}╠═══════════════════════════════════════════════════════════════════════╣{RESET}")
    print(f"{CYAN}║{RESET}  📡 {BOLD}Flask REST API{RESET}   : \033[34mhttp://localhost:5000\033[0m (Backend)                  {CYAN}║{RESET}")
    print(f"{CYAN}║{RESET}  💻 {BOLD}Vite React Web{RESET}   : \033[34mhttp://localhost:5173\033[0m (Frontend)                 {CYAN}║{RESET}")
    print(f"{CYAN}║{RESET}  🐍 {BOLD}Python Executable{RESET}: {DIM}{sys.executable[:50].ljust(52)}{RESET}{CYAN}║{RESET}")
    print(f"{CYAN}╠═══════════════════════════════════════════════════════════════════════╣{RESET}")
    print(f"{CYAN}║{RESET}  💡 {YELLOW}Press Ctrl+C at any time to gracefully stop all services.{RESET}         {CYAN}║{RESET}")
    print(f"{CYAN}╚═══════════════════════════════════════════════════════════════════════╝{RESET}\n")


def kill_proc_tree(pid):
    """Safely terminate process and all child processes."""
    if not pid:
        return
    try:
        if sys.platform == "win32":
            subprocess.run(
                ["taskkill", "/pid", str(pid), "/T", "/F"],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                check=False
            )
        else:
            os.killpg(os.getpgid(pid), signal.SIGTERM)
    except Exception:
        pass


def shutdown(signum=None, frame=None):
    global shutting_down
    if shutting_down:
        return
    shutting_down = True
    print(f"\n{GREEN}{BOLD}[LabPulse]{RESET} {YELLOW}Stopping all services...{RESET}")
    for proc in processes:
        if proc.poll() is None:
            kill_proc_tree(proc.pid)
    print(f"{GREEN}{BOLD}[LabPulse]{RESET} {GREEN}All services stopped successfully. Goodbye!{RESET}\n")
    sys.exit(0)


def stream_output(pipe, prefix):
    import threading
    def _reader():
        for line in iter(pipe.readline, ""):
            if line:
                print(f"{prefix}{line.rstrip()}")
        pipe.close()
    t = threading.Thread(target=_reader, daemon=True)
    t.start()
    return t


def main():
    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    print_banner()

    # 1. Start Backend
    print(f"{GREEN}{BOLD}[LabPulse]{RESET} Starting Flask REST API server on port 5000...")
    backend_env = os.environ.copy()
    backend_env["PYTHONUNBUFFERED"] = "1"
    backend_proc = subprocess.Popen(
        [sys.executable, "backend/app.py"],
        cwd=ROOT_DIR,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        bufsize=1,
        env=backend_env
    )
    processes.append(backend_proc)
    stream_output(backend_proc.stdout, f"{CYAN}{BOLD}[Backend]{RESET} ")
    stream_output(backend_proc.stderr, f"{CYAN}{BOLD}[Backend]{RESET} ")

    # 2. Start Frontend
    print(f"{GREEN}{BOLD}[LabPulse]{RESET} Starting Vite React development server on port 5173...")
    npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
    frontend_proc = subprocess.Popen(
        [npm_cmd, "run", "dev:frontend"],
        cwd=ROOT_DIR,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        bufsize=1,
        shell=(sys.platform == "win32")
    )
    processes.append(frontend_proc)
    stream_output(frontend_proc.stdout, f"{MAGENTA}{BOLD}[Frontend]{RESET} ")
    stream_output(frontend_proc.stderr, f"{MAGENTA}{BOLD}[Frontend]{RESET} ")

    # Keep main thread alive
    try:
        while not shutting_down:
            time.sleep(0.5)
            # Check if any process terminated prematurely
            for p in processes:
                if p.poll() is not None and not shutting_down:
                    # Let the user know
                    time.sleep(1)
    except KeyboardInterrupt:
        shutdown()


if __name__ == "__main__":
    main()
