# Hidden Agenda - Automated Multi-Player Testing Suite

This folder contains a complete, self-contained Python test suite designed to perform automated end-to-end testing, multi-player simulation, uncached first-time user load testing, and scalability bug detection for the web game hosted at:
**[https://bhavyajangid.com/projects/hidden-agenda/](https://bhavyajangid.com/projects/hidden-agenda/)**

---

## 📁 What's Included

- `test_hidden_agenda.py`: Smart Python test script powered by Playwright.
- `requirements.txt`: Python package dependencies (`playwright`).
- `run_tests.bat`: One-click Windows batch file to set up environment & execute tests.
- `README.md`: This documentation.
- `logs/`: Directory generated upon test execution containing:
  - `game_test_run.log`: Timestamped line-by-line execution logs.
  - `test_summary.md`: Human-readable bug report and performance summary.
  - `metrics.json`: Detailed network latency and connection metrics.

---

## 🚀 Quick Start Instructions

### Option 1: Using the Batch Script (Recommended for Windows)
Simply double-click or run from command prompt:
```cmd
run_tests.bat
```
*(This script automatically installs Playwright and browser binaries if needed, then starts the test run).*

### Option 2: Running Manually via Python

1. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   playwright install chromium
   ```

2. **Run the Test Suite**:
   ```bash
   python test_hidden_agenda.py
   ```

---

## ⚙️ Customizing Test Configuration

Inside `test_hidden_agenda.py`, you can modify constants at the top of the file:

```python
TARGET_URL = "https://bhavyajangid.com/projects/hidden-agenda/"
NUM_PLAYERS = 4          # Number of players (1 Host + (NUM_PLAYERS - 1) Guests)
NUM_GAMES = 2            # Number of sequential game rounds to play
HEADLESS = True          # Set to False to watch the browsers live!
SLOW_MO_MS = 200         # Delay in ms between actions for visual inspection
TEST_UNCACHED = True     # Simulate 100% cold cache / fresh user sessions
```

---

## 🔍 Key Features Tested

1. **Uncached New User Load**:
   Simulates first-time visitors with no cached JS, CSS, or local storage to measure free-hosting response times and asset loading reliability.

2. **Multi-Player P2P & Socket Lifecycle**:
   Creates isolated browser contexts for Host and 3+ Guest players, tests room creation, code generation, guest joins, and WebRTC / P2P signaling reliability.

3. **Full Game Flow Automation**:
   - **Lobby**: Room code extraction & invite link joining.
   - **Night Phase**: Detects assigned roles (Director, Shadow, Guardian, Investigator, Citizen) and submits role actions.
   - **Day Phase**: Sends chat messages & tests phase transitions.
   - **Voting Phase**: Votes on players, tests tie handling & eliminations.
   - **Game Over**: Validates win screens and lobby reset capability.

4. **Bug & Crash Detection**:
   Captures JavaScript console errors, broken WebSocket / PeerJS connections, network timeouts, and stuck timers.

---

## 🗑️ How to Uninstall / Delete

This entire folder (`all testing/`) is 100% self-contained. You can delete the `all testing` folder at any time without leaving behind any leftover files in your workspace!
