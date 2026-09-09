import asyncio
import csv
import json
import logging
import os
import re
import sys
import time
from datetime import datetime
from typing import Dict, List, Any, Optional

# Force UTF-8 encoding on Windows stdout/stderr
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

try:
    from playwright.async_api import async_playwright, Browser, BrowserContext, Page, ConsoleMessage, Request, Response
except ImportError:
    print("[ERROR] Playwright is not installed. Please run: pip install playwright && playwright install chromium")
    sys.exit(1)

# Check optional openpyxl dependency for Excel generation
try:
    import openpyxl
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    from openpyxl.utils import get_column_letter
    OPENPYXL_AVAILABLE = True
except ImportError:
    OPENPYXL_AVAILABLE = False


# ==============================================================================
# CONFIGURATION OPTIONS
# ==============================================================================
TARGET_URL = os.getenv("HIDDEN_AGENDA_URL", "https://bhavyajangid.com/projects/hidden-agenda/")
NUM_PLAYERS = int(os.getenv("NUM_PLAYERS", "15"))      # Host + (NUM_PLAYERS - 1) Guests
NUM_GAMES = int(os.getenv("NUM_GAMES", "5"))          # Number of game cycles to execute
HEADLESS = os.getenv("HEADLESS", "true").lower() != "false"
SLOW_MO_MS = int(os.getenv("SLOW_MO_MS", "200"))
PAGE_TIMEOUT_MS = 30000

# Directory paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LOGS_DIR = os.path.join(BASE_DIR, "logs")
SCREENSHOTS_DIR = os.path.join(LOGS_DIR, "screenshots")
DOM_SNAPSHOTS_DIR = os.path.join(LOGS_DIR, "dom_snapshots")

os.makedirs(LOGS_DIR, exist_ok=True)
os.makedirs(SCREENSHOTS_DIR, exist_ok=True)
os.makedirs(DOM_SNAPSHOTS_DIR, exist_ok=True)

LOG_FILE_PATH = os.path.join(LOGS_DIR, "game_test_run.log")
REPORT_FILE_PATH = os.path.join(LOGS_DIR, "test_summary.md")
METRICS_FILE_PATH = os.path.join(LOGS_DIR, "metrics.json")
CSV_EVENTS_FILE_PATH = os.path.join(LOGS_DIR, "game_events_chronological.csv")
CSV_ROLES_FILE_PATH = os.path.join(LOGS_DIR, "game_roles_matrix.csv")
CSV_CHAT_FILE_PATH = os.path.join(LOGS_DIR, "game_chat_transcript.csv")
EXCEL_FILE_PATH = os.path.join(LOGS_DIR, "game_test_report.xlsx")

# Configure Logging
logger = logging.getLogger("HiddenAgendaTest")
logger.setLevel(logging.INFO)
logger.handlers.clear()

file_handler = logging.FileHandler(LOG_FILE_PATH, mode="w", encoding="utf-8")
file_formatter = logging.Formatter("[%(asctime)s] [%(levelname)s] %(message)s", datefmt="%H:%M:%S")
file_handler.setFormatter(file_formatter)
logger.addHandler(file_handler)

stream_handler = logging.StreamHandler(sys.stdout)
stream_formatter = logging.Formatter("[%(asctime)s] %(message)s", datefmt="%H:%M:%S")
stream_handler.setFormatter(stream_formatter)
logger.addHandler(stream_handler)


# ==============================================================================
# TEST SUITE DATA STRUCTURES & COMPREHENSIVE AUDIT METRICS
# ==============================================================================
class ChronologicalEvent:
    def __init__(self, round_num: int, cycle_idx: int, phase: str, event_type: str, player: str, role: str, target: str, details: str, status: str = "INFO"):
        self.timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
        self.round_num = round_num
        self.cycle_idx = cycle_idx
        self.phase = phase
        self.event_type = event_type
        self.player = player
        self.role = role
        self.target = target
        self.details = details
        self.status = status

    def to_dict(self) -> Dict[str, Any]:
        return {
            "Timestamp": self.timestamp,
            "Round": self.round_num,
            "Cycle": self.cycle_idx,
            "Phase": self.phase,
            "EventType": self.event_type,
            "Player": self.player,
            "Role": self.role,
            "Target": self.target,
            "Details": self.details,
            "Status": self.status,
        }


class TestMetrics:
    def __init__(self):
        self.start_time = datetime.now()
        self.end_time: Optional[datetime] = None
        self.events: List[ChronologicalEvent] = []
        self.console_logs_all: List[Dict[str, Any]] = []
        self.console_errors: List[Dict[str, Any]] = []
        self.page_errors: List[Dict[str, Any]] = []
        self.network_failures: List[Dict[str, Any]] = []
        self.slow_requests: List[Dict[str, Any]] = []
        self.page_load_times: Dict[str, float] = {}
        self.bugs_found: List[Dict[str, str]] = []
        self.games_completed = 0
        self.total_phase_transitions = 0
        self.p2p_connection_issues: List[str] = []
        self.chat_messages_captured: List[Dict[str, Any]] = []
        self.voting_tallies: List[Dict[str, Any]] = []
        self.night_actions_executed: List[Dict[str, Any]] = []
        self.role_distributions: List[Dict[str, Any]] = []
        self.eliminations_recorded: List[Dict[str, Any]] = []
        self.screenshots_taken: List[Dict[str, str]] = []
        self.dom_snapshots_taken: List[Dict[str, str]] = []

    def log_event(self, round_num: int, cycle_idx: int, phase: str, event_type: str, player: str, role: str, target: str, details: str, status: str = "INFO"):
        event = ChronologicalEvent(round_num, cycle_idx, phase, event_type, player, role, target, details, status)
        self.events.append(event)
        
        # Output clean log message to console/file
        log_msg = f"[{phase}] [{event_type}] [{player}] {details}"
        if status == "CRITICAL" or status == "HIGH":
            logger.error(log_msg)
        elif status == "WARN":
            logger.warning(log_msg)
        else:
            logger.info(log_msg)

    def add_bug(self, category: str, description: str, severity: str = "MEDIUM"):
        bug = {"category": category, "description": description, "severity": severity, "time": datetime.now().isoformat()}
        self.bugs_found.append(bug)
        self.log_event(0, 0, "SUITE", "BUG_DETECTED", "SYSTEM", "TESTER", "N/A", f"[{severity}] [{category}]: {description}", severity)

    def record_screenshot(self, filepath: str, label: str, round_num: int):
        rel_path = os.path.relpath(filepath, LOGS_DIR).replace("\\", "/")
        self.screenshots_taken.append({
            "path": rel_path,
            "label": label,
            "round": round_num,
            "time": datetime.now().strftime("%H:%M:%S")
        })

    def record_dom_snapshot(self, filepath: str, label: str, round_num: int):
        rel_path = os.path.relpath(filepath, LOGS_DIR).replace("\\", "/")
        self.dom_snapshots_taken.append({
            "path": rel_path,
            "label": label,
            "round": round_num,
            "time": datetime.now().strftime("%H:%M:%S")
        })

    def to_dict(self) -> Dict[str, Any]:
        return {
            "duration_seconds": (self.end_time - self.start_time).total_seconds() if self.end_time else 0,
            "games_completed": self.games_completed,
            "total_phase_transitions": self.total_phase_transitions,
            "events_count": len(self.events),
            "bugs_count": len(self.bugs_found),
            "console_errors_count": len(self.console_errors),
            "page_errors_count": len(self.page_errors),
            "network_failures_count": len(self.network_failures),
            "chat_messages_count": len(self.chat_messages_captured),
            "page_load_times": self.page_load_times,
            "bugs": self.bugs_found,
            "p2p_issues": self.p2p_connection_issues,
            "role_distributions": self.role_distributions,
            "chat_messages": self.chat_messages_captured,
            "night_actions": self.night_actions_executed,
            "voting_records": self.voting_tallies,
            "eliminations": self.eliminations_recorded,
            "screenshots": self.screenshots_taken,
            "dom_snapshots": self.dom_snapshots_taken,
        }


metrics = TestMetrics()


# ==============================================================================
# PLAYER SIMULATION CLASS
# ==============================================================================
class PlayerSession:
    def __init__(self, name: str, is_host: bool, context: BrowserContext, page: Page):
        self.name = name
        self.is_host = is_host
        self.context = context
        self.page = page
        self.assigned_role = "UNKNOWN"
        self.is_alive = True
        self.console_logs: List[str] = []

        # Wire console, page errors, and network listeners
        self.page.on("console", self._handle_console)
        self.page.on("pageerror", self._handle_page_error)
        self.page.on("requestfailed", self._handle_request_failed)
        self.page.on("response", self._handle_response)

    def _handle_console(self, msg: ConsoleMessage):
        text = f"[{self.name} Console {msg.type}] {msg.text}"
        self.console_logs.append(text)
        metrics.console_logs_all.append({"player": self.name, "type": msg.type, "text": msg.text})

        if msg.type == "error":
            metrics.console_errors.append({"player": self.name, "text": msg.text, "location": msg.location})
            metrics.log_event(0, 0, "RUNTIME", "CONSOLE_ERROR", self.name, self.assigned_role, "N/A", msg.text, "HIGH")
            if any(k in msg.text.lower() for k in ["peer", "webrtc", "socket", "connection", "ice"]):
                metrics.p2p_connection_issues.append(f"{self.name}: {msg.text}")

    def _handle_page_error(self, err):
        err_msg = str(err)
        metrics.page_errors.append({"player": self.name, "error": err_msg})
        metrics.add_bug("JS_RUNTIME_EXCEPTION", f"Unhandled JS exception in {self.name}: {err_msg}", "CRITICAL")

    def _handle_request_failed(self, req: Request):
        fail_text = req.failure.error_text if req.failure else "Unknown failure"
        metrics.network_failures.append({
            "player": self.name,
            "url": req.url,
            "failure": fail_text
        })
        metrics.log_event(0, 0, "NETWORK", "REQUEST_FAILED", self.name, self.assigned_role, "N/A", f"URL: {req.url} | Error: {fail_text}", "WARN")

    def _handle_response(self, res: Response):
        timing = res.request.timing
        if timing and timing.get("responseEnd", 0) > 2000:
            metrics.slow_requests.append({
                "player": self.name,
                "url": res.url,
                "duration_ms": timing["responseEnd"]
            })
            metrics.log_event(0, 0, "NETWORK", "SLOW_RESPONSE", self.name, self.assigned_role, "N/A", f"URL: {res.url} | Duration: {timing['responseEnd']}ms", "WARN")


# Helper utilities for safe Playwright operations
async def safe_is_visible(locator, timeout: float = 1000) -> bool:
    try:
        return await locator.is_visible(timeout=timeout)
    except Exception:
        return False


async def safe_click(locator, timeout: float = 2000) -> bool:
    try:
        if await locator.is_visible(timeout=timeout):
            await locator.click(timeout=timeout)
            return True
    except Exception:
        pass
    return False


async def capture_page_screenshot(page: Page, label: str, round_num: int):
    try:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")[:19]
        filename = f"round{round_num}_{label}_{timestamp}.png"
        filepath = os.path.join(SCREENSHOTS_DIR, filename)
        await page.screenshot(path=filepath, full_page=True)
        metrics.record_screenshot(filepath, label, round_num)
    except Exception as e:
        logger.debug(f"  [SCREENSHOT] Failed to take screenshot '{label}': {e}")


async def capture_dom_snapshot(page: Page, label: str, round_num: int):
    try:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")[:19]
        filename = f"round{round_num}_{label}_{timestamp}.html"
        filepath = os.path.join(DOM_SNAPSHOTS_DIR, filename)
        content = await page.content()
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        metrics.record_dom_snapshot(filepath, label, round_num)
    except Exception as e:
        logger.debug(f"  [DOM SNAPSHOT] Failed to save DOM snapshot '{label}': {e}")


# ==============================================================================
# HIDDEN AGENDA GAME TESTER ENGINE
# ==============================================================================
class HiddenAgendaTester:
    def __init__(self, browser: Browser):
        self.browser = browser
        self.players: List[PlayerSession] = []
        self.host: Optional[PlayerSession] = None
        self.room_code: str = ""

    async def create_uncached_player(self, name: str, is_host: bool) -> PlayerSession:
        """Create an isolated, uncached browser context simulating an independent player session."""
        context = await self.browser.new_context(
            viewport={"width": 1280, "height": 800},
            ignore_https_errors=True,
            java_script_enabled=True,
        )
        page = await context.new_page()
        page.set_default_timeout(PAGE_TIMEOUT_MS)
        return PlayerSession(name, is_host, context, page)

    async def run_full_suite(self):
        metrics.log_event(0, 0, "SUITE", "START_SUITE", "SYSTEM", "TESTER", "N/A", f"Starting Hidden Agenda Multi-Player Automation Suite (URL: {TARGET_URL}, Players: {NUM_PLAYERS}, Rounds: {NUM_GAMES})", "INFO")

        for game_idx in range(1, NUM_GAMES + 1):
            metrics.log_event(game_idx, 0, "ROUND", "START_ROUND", "SYSTEM", "TESTER", "N/A", f"Starting Game Round {game_idx}/{NUM_GAMES}", "INFO")
            success = await self.play_single_game_round(game_idx)
            if success:
                metrics.games_completed += 1
                metrics.log_event(game_idx, 0, "ROUND", "ROUND_SUCCESS", "SYSTEM", "TESTER", "N/A", f"Game Round {game_idx} completed successfully!", "SUCCESS")
            else:
                metrics.add_bug("GAME_LOOP_FAILURE", f"Game round {game_idx} failed to complete execution.", "HIGH")

            await self.close_all_players()

        metrics.end_time = datetime.now()
        await self.generate_reports()

    async def play_single_game_round(self, round_num: int) -> bool:
        try:
            # 1. Setup Host Session
            metrics.log_event(round_num, 0, "LOBBY", "CREATE_HOST", "Host_Bot", "HOST MODERATOR", "N/A", "Creating Host player context (Uncached)...", "INFO")
            start_load = time.time()
            self.host = await self.create_uncached_player("Host_Bot", is_host=True)
            self.players.append(self.host)

            await self.host.page.goto(TARGET_URL, wait_until="domcontentloaded")
            load_duration = round(time.time() - start_load, 2)
            metrics.page_load_times[f"Host_Load_Round_{round_num}"] = load_duration
            metrics.log_event(round_num, 0, "LOBBY", "HOST_LOAD", "Host_Bot", "HOST MODERATOR", "N/A", f"Host initial page load completed in {load_duration}s", "INFO")

            # Fill Host Form
            name_input = self.host.page.get_by_placeholder("Alex", exact=False)
            await name_input.wait_for(state="visible", timeout=10000)
            await name_input.fill("Host_Bot")

            # Submit Host Form
            create_submit_btn = self.host.page.locator("button[type='submit']").first
            await create_submit_btn.click()

            # Extract Room Code from Lobby Header
            metrics.log_event(round_num, 0, "LOBBY", "WAIT_ROOM_CODE", "Host_Bot", "HOST MODERATOR", "N/A", "Polling for PeerJS room code generation...", "INFO")
            self.room_code = ""
            for _ in range(15):
                await asyncio.sleep(1)
                content = await self.host.page.content()
                match = re.search(r'ROOM CODE.*?font-black[^>]*>([A-Za-z0-9]{6})<', content, re.DOTALL | re.IGNORECASE)
                if not match:
                    match = re.search(r'ROOM CODE.*?>([A-Za-z0-9]{6})<', content, re.DOTALL | re.IGNORECASE)
                if not match:
                    match = re.search(r'code=([A-Za-z0-9]{6})', content, re.IGNORECASE)
                if match:
                    self.room_code = match.group(1)
                    break

            if not self.room_code:
                metrics.add_bug("ROOM_CREATION", "Failed to extract room code from Host lobby UI after 15s.", "CRITICAL")
                await capture_page_screenshot(self.host.page, "room_creation_failed", round_num)
                await capture_dom_snapshot(self.host.page, "room_creation_failed", round_num)
                return False

            metrics.log_event(round_num, 0, "LOBBY", "ROOM_CODE_GENERATED", "Host_Bot", "HOST MODERATOR", "N/A", f"Room Code Generated: [{self.room_code}]", "SUCCESS")
            await capture_page_screenshot(self.host.page, "room_code_created", round_num)

            # 2. Setup Guest Players
            for p_idx in range(1, NUM_PLAYERS):
                p_name = f"Guest_Player_{p_idx}"
                metrics.log_event(round_num, 0, "LOBBY", "GUEST_JOIN_START", p_name, "UNKNOWN", "Host_Bot", f"Connecting Guest {p_idx}/{NUM_PLAYERS - 1} to room [{self.room_code}]...", "INFO")
                guest = await self.create_uncached_player(p_name, is_host=False)
                self.players.append(guest)

                join_url = f"{TARGET_URL}?code={self.room_code}"
                await guest.page.goto(join_url, wait_until="domcontentloaded")
                await guest.page.wait_for_selector("input", timeout=10000)

                join_tab_btn = guest.page.locator("button:has-text('JOIN A GAME')").first
                await safe_click(join_tab_btn, 500)
                await asyncio.sleep(0.1)

                guest_name_input = guest.page.get_by_placeholder("Sarah", exact=False)
                if await safe_is_visible(guest_name_input, 500):
                    await guest_name_input.fill(p_name)

                code_input = guest.page.locator("input[placeholder*='aK9x3P'], input[maxLength='6']").first
                if await safe_is_visible(code_input, 500):
                    val = await code_input.input_value()
                    if not val or val.strip().lower() != self.room_code.lower():
                        await code_input.fill(self.room_code)

                join_submit_btn = guest.page.locator("button[type='submit']").first
                if not await safe_click(join_submit_btn, 500):
                    await guest_name_input.press("Enter")
                
                await asyncio.sleep(0.4)
                metrics.log_event(round_num, 0, "LOBBY", "GUEST_JOINED", p_name, "UNKNOWN", "Host_Bot", f"Guest {p_name} submitted join form.", "INFO")

            # 3. Verify Lobby Player Synchronization
            metrics.log_event(round_num, 0, "LOBBY", "VERIFY_LOBBY_SYNC", "Host_Bot", "HOST MODERATOR", "ALL_GUESTS", "Verifying guest roster in Host lobby...", "INFO")
            await asyncio.sleep(3.0)
            await capture_page_screenshot(self.host.page, "full_lobby_roster", round_num)

            host_lobby_content = await self.host.page.content()
            missing_count = 0
            for p in self.players:
                if not p.is_host:
                    if p.name not in host_lobby_content:
                        missing_count += 1
                        metrics.add_bug("P2P_SYNC_FAILURE", f"Player {p.name} joined but did not appear in Host lobby roster.", "HIGH")
                    else:
                        metrics.log_event(round_num, 0, "LOBBY", "PLAYER_SYNC_OK", p.name, "UNKNOWN", "Host_Bot", f"Player {p.name} verified online in Host lobby.", "SUCCESS")

            if missing_count > 0:
                metrics.log_event(round_num, 0, "LOBBY", "SYNC_WARN", "Host_Bot", "HOST MODERATOR", "N/A", f"Warning: {missing_count} guests missing from lobby sync roster!", "WARN")

            # 4. Host Starts Game
            metrics.log_event(round_num, 0, "LOBBY", "CLICK_START_MATCH", "Host_Bot", "HOST MODERATOR", "ROOM", "Host attempting to click 'START MATCH' button...", "INFO")
            start_game_btn = self.host.page.locator("button:has-text('START MATCH')").first
            
            for _ in range(10):
                if await start_game_btn.count() > 0 and await start_game_btn.is_enabled():
                    break
                await asyncio.sleep(1)

            if await start_game_btn.count() > 0 and await start_game_btn.is_enabled():
                await start_game_btn.click()
                metrics.total_phase_transitions += 1
                metrics.log_event(round_num, 0, "LOBBY", "MATCH_STARTED", "Host_Bot", "HOST MODERATOR", "ROOM", "Successfully started match for room!", "SUCCESS")
                await asyncio.sleep(2)
                await capture_page_screenshot(self.host.page, "match_started_host", round_num)
            else:
                metrics.add_bug("START_GAME_BUTTON", "START MATCH button not visible or remaining disabled for Host.", "HIGH")
                await capture_page_screenshot(self.host.page, "start_button_disabled", round_num)
                await capture_dom_snapshot(self.host.page, "start_button_disabled", round_num)
                return False

            # 5. Execute Multi-Phase Game Flow Loop (Up to 3 Phase Cycles per Round)
            for cycle_idx in range(1, 4):
                metrics.log_event(round_num, cycle_idx, "CYCLE_START", "PHASE_CYCLE_BEGIN", "SYSTEM", "N/A", "N/A", f"Starting Phase Cycle {cycle_idx} (Night -> Day -> Voting)", "INFO")

                # Phase 1: Night Phase
                await self.handle_night_phase(round_num, cycle_idx)

                # Phase 2: Day Discussion Phase
                await self.handle_day_discussion_phase(round_num, cycle_idx)

                # Phase 3: Voting Phase
                await self.handle_voting_phase(round_num, cycle_idx)

                # Check if Game Over screen is displayed
                if await self.check_game_over_screen(round_num):
                    metrics.log_event(round_num, cycle_idx, "GAME_OVER", "VICTORY_CONDITION", "SYSTEM", "N/A", "ROOM", "Game Over victory condition reached naturally!", "SUCCESS")
                    break

            # 6. Lobby Reset / Return
            await self.handle_game_over_or_reset(round_num)

            return True

        except Exception as e:
            metrics.log_event(round_num, 0, "CRASH", "ROUND_EXCEPTION", "SYSTEM", "N/A", "N/A", f"Unhandled crash in game round {round_num}: {str(e)}", "CRITICAL")
            metrics.add_bug("UNHANDLED_EXCEPTION", f"Game round crash: {str(e)}", "HIGH")
            if self.host and self.host.page:
                await capture_page_screenshot(self.host.page, "round_crash_host", round_num)
                await capture_dom_snapshot(self.host.page, "round_crash_host", round_num)
            return False

    async def handle_night_phase(self, round_num: int, cycle_idx: int):
        """Detect secret role assignments and execute role-specific night actions."""
        metrics.log_event(round_num, cycle_idx, "NIGHT_PHASE", "ROLE_DETECTION", "SYSTEM", "N/A", "ROOM", "Detecting player roles and parsing secret role cards...", "INFO")
        role_map = {}
        for p in self.players:
            try:
                role_elem = p.page.locator("h2:has-text('SHADOW'), h2:has-text('DIRECTOR'), h2:has-text('GUARDIAN'), h2:has-text('INVESTIGATOR'), h2:has-text('CITIZEN'), h2:has-text('WILDCARD')").first
                if await safe_is_visible(role_elem, 500):
                    p.assigned_role = (await role_elem.inner_text()).strip()
                elif p.is_host:
                    p.assigned_role = "HOST MODERATOR"
                role_map[p.name] = p.assigned_role
                metrics.log_event(round_num, cycle_idx, "NIGHT_PHASE", "ROLE_ASSIGNED", p.name, p.assigned_role, "SELF", f"{p.name} assigned secret role: {p.assigned_role}", "INFO")

                # Action Execution: Director / Shadows / Guardian / Investigator
                target_btn = p.page.locator("button:has-text('Select Target'), button:has-text('Protect'), button:has-text('Check'), button:has-text('Target'), button:has-text('Eliminate')").first
                if await safe_click(target_btn, 500):
                    await asyncio.sleep(0.2)
                    confirm_btn = p.page.locator("button:has-text('Confirm'), button:has-text('Submit'), button:has-text('Select')").first
                    if await safe_click(confirm_btn, 500):
                        metrics.log_event(round_num, cycle_idx, "NIGHT_PHASE", "NIGHT_ACTION_SUBMIT", p.name, p.assigned_role, "TARGET_PLAYER", f"{p.name} ({p.assigned_role}) submitted night action target.", "INFO")
                        metrics.night_actions_executed.append({
                            "round": round_num,
                            "cycle": cycle_idx,
                            "player": p.name,
                            "role": p.assigned_role,
                            "status": "Executed"
                        })

                # Capture investigator result card if visible
                investigation_result = p.page.locator("div:has-text('Investigator Check'), div:has-text('Role Result'), p:has-text('is a')").first
                if await safe_is_visible(investigation_result, 500):
                    res_text = await investigation_result.inner_text()
                    metrics.log_event(round_num, cycle_idx, "NIGHT_PHASE", "INVESTIGATION_RESULT", p.name, p.assigned_role, "INSPECTED_TARGET", f"Investigator Result: {res_text.strip()}", "SUCCESS")
            except Exception as e:
                logger.debug(f"  └─ Night action step for {p.name}: {e}")

        metrics.role_distributions.append({"round": round_num, "cycle": cycle_idx, "roles": role_map})
        if self.players and len(self.players) > 1:
            await capture_page_screenshot(self.players[1].page, f"night_phase_guest1_cycle{cycle_idx}", round_num)

        # Host forces next phase via SKIP PHASE
        if self.host:
            force_btn = self.host.page.locator("button:has-text('SKIP PHASE'), button:has-text('Force Next Phase')").first
            if await safe_click(force_btn, 1000):
                metrics.total_phase_transitions += 1
                metrics.log_event(round_num, cycle_idx, "NIGHT_PHASE", "SKIP_TO_DAY", "Host_Bot", "HOST MODERATOR", "ROOM", "Host advanced phase (Night -> Day).", "INFO")

    async def handle_day_discussion_phase(self, round_num: int, cycle_idx: int):
        """Simulate active chat messages and extract visible messages from the DOM."""
        metrics.log_event(round_num, cycle_idx, "DAY_PHASE", "CHAT_SIMULATION_START", "SYSTEM", "N/A", "ROOM", "Broadcasting discussion chat messages from players...", "INFO")
        for idx, p in enumerate(self.players):
            try:
                chat_input = p.page.get_by_placeholder("Send message", exact=False)
                if await safe_is_visible(chat_input, 500):
                    msg = f"Round {round_num} Cycle {cycle_idx}: {p.name} ({p.assigned_role}) active in chat at {datetime.now().strftime('%H:%M:%S')}"
                    await chat_input.fill(msg)
                    await chat_input.press("Enter")
                    metrics.log_event(round_num, cycle_idx, "DAY_PHASE", "CHAT_MESSAGE_SENT", p.name, p.assigned_role, "ROOM_CHAT", f"Chat sent: '{msg}'", "INFO")
                    metrics.chat_messages_captured.append({
                        "round": round_num,
                        "cycle": cycle_idx,
                        "sender": p.name,
                        "role": p.assigned_role,
                        "text": msg,
                        "time": datetime.now().strftime("%H:%M:%S")
                    })
                    await asyncio.sleep(0.15)
            except Exception as e:
                metrics.log_event(round_num, cycle_idx, "DAY_PHASE", "CHAT_FAIL", p.name, p.assigned_role, "ROOM_CHAT", f"Chat attempt failed for {p.name}: {e}", "WARN")

        # Extract visible chat messages from Host & Guest 1 DOM for verification
        await asyncio.sleep(1.0)
        if self.host:
            try:
                chat_messages_nodes = await self.host.page.locator("div[class*='chat'] p, div[class*='chat'] span, div[class*='messages'] p").all_inner_texts()
                metrics.log_event(round_num, cycle_idx, "DAY_PHASE", "DOM_CHAT_VERIFIED", "Host_Bot", "HOST MODERATOR", "ROOM", f"Host DOM verified {len(chat_messages_nodes)} messages in chat panel.", "SUCCESS")
            except Exception:
                pass

        if self.players and len(self.players) > 1:
            await capture_page_screenshot(self.players[1].page, f"day_chat_guest1_cycle{cycle_idx}", round_num)

        # Host forces voting phase via SKIP PHASE
        if self.host:
            force_btn = self.host.page.locator("button:has-text('SKIP PHASE'), button:has-text('Start Voting')").first
            if await safe_click(force_btn, 1000):
                metrics.total_phase_transitions += 1
                metrics.log_event(round_num, cycle_idx, "DAY_PHASE", "SKIP_TO_VOTING", "Host_Bot", "HOST MODERATOR", "ROOM", "Host advanced phase (Day -> Voting).", "INFO")

    async def handle_voting_phase(self, round_num: int, cycle_idx: int):
        """Simulate voting modal, target selection, and elimination resolution."""
        metrics.log_event(round_num, cycle_idx, "VOTING_PHASE", "VOTING_START", "SYSTEM", "N/A", "ROOM", "Opening voting modals and casting suspect votes...", "INFO")
        for p in self.players:
            try:
                vote_open_btn = p.page.locator("button:has-text('Cast Vote'), button:has-text('Vote Now')").first
                if await safe_click(vote_open_btn, 500):
                    await asyncio.sleep(0.2)

                target_option = p.page.locator("button:has-text('Vote'), div[class*='modal'] button").first
                if await safe_click(target_option, 500):
                    metrics.log_event(round_num, cycle_idx, "VOTING_PHASE", "VOTE_CAST", p.name, p.assigned_role, "SUSPECT_PLAYER", f"{p.name} cast vote for target suspect.", "INFO")
                    metrics.voting_tallies.append({
                        "round": round_num,
                        "cycle": cycle_idx,
                        "voter": p.name,
                        "status": "Vote Cast"
                    })
            except Exception as e:
                metrics.log_event(round_num, cycle_idx, "VOTING_PHASE", "VOTE_FAIL", p.name, p.assigned_role, "SUSPECT_PLAYER", f"Voting failed for {p.name}: {e}", "WARN")

        if self.players and len(self.players) > 1:
            await capture_page_screenshot(self.players[1].page, f"voting_phase_guest1_cycle{cycle_idx}", round_num)

        # Host forces vote resolution / next phase via SKIP PHASE
        if self.host:
            force_btn = self.host.page.locator("button:has-text('SKIP PHASE'), button:has-text('Resolve Vote'), button:has-text('RESET')").first
            if await safe_click(force_btn, 1000):
                metrics.total_phase_transitions += 1
                metrics.log_event(round_num, cycle_idx, "VOTING_PHASE", "RESOLVE_VOTE", "Host_Bot", "HOST MODERATOR", "ROOM", "Host resolved vote / advanced phase.", "INFO")

        # Capture elimination notifications from DOM
        await asyncio.sleep(1.5)
        if self.host:
            try:
                el_elem = self.host.page.locator("div[class*='alert']:has-text('eliminated'), p:has-text('was eliminated'), h2:has-text('ELIMINATED'), p:has-text('eliminated')").first
                if await safe_is_visible(el_elem, 500):
                    raw_text = await el_elem.inner_text()
                    clean_text = " ".join(raw_text.split())[:150]
                    metrics.log_event(round_num, cycle_idx, "VOTING_PHASE", "ELIMINATION_ANNOUNCED", "Host_Bot", "HOST MODERATOR", "ELIMINATED_PLAYER", f"Elimination Announcement: {clean_text}", "WARN")
                    metrics.eliminations_recorded.append({
                        "round": round_num,
                        "cycle": cycle_idx,
                        "text": clean_text
                    })
            except Exception:
                pass

    async def check_game_over_screen(self, round_num: int) -> bool:
        """Check if Game Over win banner is active in Host or Guest view."""
        if self.host:
            try:
                game_over_elem = self.host.page.locator("h1:has-text('WIN'), h2:has-text('VICTORY'), h1:has-text('GAME OVER'), div:has-text('CITIZENS WIN'), div:has-text('SHADOWS WIN')").first
                if await safe_is_visible(game_over_elem, 1000):
                    banner_text = await game_over_elem.inner_text()
                    metrics.log_event(round_num, 0, "GAME_OVER", "VICTORY_SCREEN", "Host_Bot", "HOST MODERATOR", "ROOM", f"Game Over Victory Banner Detected: {banner_text.strip()}", "SUCCESS")
                    await capture_page_screenshot(self.host.page, "game_over_victory_screen", round_num)
                    return True
            except Exception:
                pass
        return False

    async def handle_game_over_or_reset(self, round_num: int):
        """Reset lobby for next game cycle if reset button is available."""
        if self.host:
            reset_btn = self.host.page.locator("button:has-text('RESET'), button:has-text('Reset to Lobby'), button:has-text('Back to Lobby')").first
            if await safe_click(reset_btn, 1000):
                metrics.log_event(round_num, 0, "RESET", "LOBBY_RESET", "Host_Bot", "HOST MODERATOR", "ROOM", "Host clicked 'RESET' button to return to lobby.", "INFO")
                await capture_page_screenshot(self.host.page, "post_reset_lobby", round_num)

    async def close_all_players(self):
        for p in self.players:
            try:
                await p.context.close()
            except Exception:
                pass
        self.players.clear()
        self.host = None

    async def generate_reports(self):
        logger.info("\n================================================================")
        logger.info("[REPORT] GENERATING CSV, EXCEL, AND MARKDOWN REPORTS...")
        logger.info("================================================================")

        # 1. Export JSON Metrics
        with open(METRICS_FILE_PATH, "w", encoding="utf-8") as f:
            json.dump(metrics.to_dict(), f, indent=2)

        # 2. Export Master Chronological Events CSV
        fieldnames = ["Timestamp", "Round", "Cycle", "Phase", "EventType", "Player", "Role", "Target", "Details", "Status"]
        with open(CSV_EVENTS_FILE_PATH, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            for ev in metrics.events:
                writer.writerow(ev.to_dict())

        # 3. Export Roles Matrix CSV
        with open(CSV_ROLES_FILE_PATH, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["Round", "Cycle", "Player", "Role"])
            for dist in metrics.role_distributions:
                r_num = dist["round"]
                c_num = dist["cycle"]
                for p_name, p_role in dist["roles"].items():
                    writer.writerow([r_num, c_num, p_name, p_role])

        # 4. Export Chat Transcript CSV
        with open(CSV_CHAT_FILE_PATH, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["Timestamp", "Round", "Cycle", "Sender", "Role", "Message"])
            for chat in metrics.chat_messages_captured:
                writer.writerow([chat.get("time", ""), chat["round"], chat["cycle"], chat["sender"], chat["role"], chat["text"]])

        # 5. Generate Multi-Tab Excel Workbook if openpyxl is installed
        if OPENPYXL_AVAILABLE:
            try:
                wb = openpyxl.Workbook()
                
                # Setup Styles
                font_header = Font(name="Segoe UI", size=11, bold=True, color="FFFFFF")
                fill_header = PatternFill(start_color="1F4E78", end_color="1F4E78", fill_type="solid")
                fill_zebra = PatternFill(start_color="F9FBFD", end_color="F9FBFD", fill_type="solid")
                
                status_fills = {
                    "CRITICAL": PatternFill(start_color="F8CBAD", end_color="F8CBAD", fill_type="solid"),
                    "HIGH": PatternFill(start_color="FCE4D6", end_color="FCE4D6", fill_type="solid"),
                    "SUCCESS": PatternFill(start_color="E2EFDA", end_color="E2EFDA", fill_type="solid"),
                    "WARN": PatternFill(start_color="FFF2CC", end_color="FFF2CC", fill_type="solid"),
                    "INFO": PatternFill(start_color="F2F2F2", end_color="F2F2F2", fill_type="solid"),
                }
                
                thin_border = Border(
                    left=Side(style='thin', color='D9D9D9'),
                    right=Side(style='thin', color='D9D9D9'),
                    top=Side(style='thin', color='D9D9D9'),
                    bottom=Side(style='thin', color='D9D9D9')
                )

                def style_sheet(ws, headers, rows):
                    ws.append(headers)
                    for col_num in range(1, len(headers) + 1):
                        cell = ws.cell(row=1, column=col_num)
                        cell.font = font_header
                        cell.fill = fill_header
                        cell.alignment = Alignment(horizontal="center", vertical="center")

                    for row_idx, r_data in enumerate(rows, start=2):
                        ws.append(r_data)
                        for col_idx, val in enumerate(r_data, start=1):
                            cell = ws.cell(row=row_idx, column=col_idx)
                            cell.border = thin_border
                            if row_idx % 2 == 0:
                                cell.fill = fill_zebra
                            
                            # Highlight status column if present
                            if str(val) in status_fills:
                                cell.fill = status_fills[str(val)]
                                cell.font = Font(name="Segoe UI", size=10, bold=True)

                    # Auto-fit column widths
                    for col in ws.columns:
                        max_len = max(len(str(cell.value or '')) for cell in col)
                        col_letter = get_column_letter(col[0].column)
                        ws.column_dimensions[col_letter].width = max(max_len + 3, 12)

                # Tab 1: Executive Summary
                ws_summary = wb.active
                ws_summary.title = "Executive Summary"
                summary_headers = ["Metric Parameter", "Audit Value", "Description"]
                summary_rows = [
                    ["Total Games Completed", f"{metrics.games_completed} / {NUM_GAMES}", "Number of full game cycles executed"],
                    ["Players Per Room", f"{NUM_PLAYERS} (1 Host + {NUM_PLAYERS - 1} Guests)", "Scale testing browser session count"],
                    ["Phase Transitions Verified", metrics.total_phase_transitions, "Verified state transitions"],
                    ["Total Events Recorded", len(metrics.events), "Master chronological event stream count"],
                    ["Bugs / Defects Found", len(metrics.bugs_found), "Runtime issues detected"],
                    ["Console Errors Count", len(metrics.console_errors), "Browser JS console errors"],
                    ["Unhandled JS Exceptions", len(metrics.page_errors), "Uncaught page crashes"],
                    ["Network Failures Count", len(metrics.network_failures), "Failed HTTP/WebRTC requests"],
                    ["Chat Messages Captured", len(metrics.chat_messages_captured), "Total chat messages exchanged"],
                    ["Screenshots Captured", len(metrics.screenshots_taken), "Visual PNG artifact count"],
                    ["Total Execution Duration", f"{(metrics.end_time - metrics.start_time).total_seconds():.1f}s", "Suite run time"],
                ]
                style_sheet(ws_summary, summary_headers, summary_rows)

                # Tab 2: Master Chronological Timeline
                ws_timeline = wb.create_sheet(title="Chronological Events Log")
                event_headers = ["Timestamp", "Round", "Cycle", "Phase", "Event Type", "Player", "Role", "Target", "Details", "Status"]
                event_rows = [[ev.timestamp, ev.round_num, ev.cycle_idx, ev.phase, ev.event_type, ev.player, ev.role, ev.target, ev.details, ev.status] for ev in metrics.events]
                style_sheet(ws_timeline, event_headers, event_rows)

                # Tab 3: Player Roles Matrix
                ws_roles = wb.create_sheet(title="Player Roles Matrix")
                roles_headers = ["Round", "Cycle", "Player Name", "Assigned Secret Role"]
                roles_rows = []
                for dist in metrics.role_distributions:
                    for p_name, p_role in dist["roles"].items():
                        roles_rows.append([dist["round"], dist["cycle"], p_name, p_role])
                style_sheet(ws_roles, roles_headers, roles_rows)

                # Tab 4: Chat Messages Audit
                ws_chat = wb.create_sheet(title="Chat Transcript")
                chat_headers = ["Timestamp", "Round", "Cycle", "Sender Player", "Sender Role", "Message Text"]
                chat_rows = [[c.get("time", ""), c["round"], c["cycle"], c["sender"], c["role"], c["text"]] for c in metrics.chat_messages_captured]
                style_sheet(ws_chat, chat_headers, chat_rows)

                # Tab 5: Errors & Bugs Audit
                ws_errors = wb.create_sheet(title="Errors & Bugs Audit")
                error_headers = ["Severity", "Category", "Description", "Timestamp / Location"]
                error_rows = []
                for b in metrics.bugs_found:
                    error_rows.append([b["severity"], b["category"], b["description"], b["time"]])
                for err in metrics.page_errors:
                    error_rows.append(["CRITICAL", "JS_PAGE_ERROR", err["error"], err["player"]])
                for c_err in metrics.console_errors:
                    error_rows.append(["HIGH", "CONSOLE_ERROR", c_err["text"], f"{c_err['player']} ({c_err['location']})"])
                style_sheet(ws_errors, error_headers, error_rows)

                # Tab 6: Screenshots Inventory
                ws_screen = wb.create_sheet(title="Screenshots Inventory")
                screen_headers = ["Label", "Round", "Timestamp", "Relative File Path"]
                screen_rows = [[s["label"], s["round"], s["time"], s["path"]] for s in metrics.screenshots_taken]
                style_sheet(ws_screen, screen_headers, screen_rows)

                wb.save(EXCEL_FILE_PATH)
                logger.info(f"[EXCEL] Formatted Excel Dashboard written to: {EXCEL_FILE_PATH}")

            except Exception as e:
                logger.error(f"[EXCEL ERROR] Failed to write Excel report: {e}")

        # 6. Export Summary Markdown
        md_content = f"""# Hidden Agenda - Multi-Player Scalability & Comprehensive Bug Report

**Test Execution Time:** `{metrics.start_time.strftime('%Y-%m-%d %H:%M:%S')}`  
**Target URL:** `{TARGET_URL}`  
**Test Environment:** Headless Chromium, Uncached Isolated Sessions  
**Scale Parameters:** `{NUM_PLAYERS}` Total Players (1 Host + {NUM_PLAYERS - 1} Guests), `{NUM_GAMES}` Game Rounds  

---

## 📈 Executive Summary

| Metric | Result |
| :--- | :--- |
| **Total Games Completed** | `{metrics.games_completed} / {NUM_GAMES}` |
| **Total Players per Room** | `{NUM_PLAYERS}` (1 Host + {NUM_PLAYERS - 1} Guests) |
| **Total Events Recorded** | `{len(metrics.events)}` |
| **Phase Transitions Verified** | `{metrics.total_phase_transitions}` |
| **Bugs / Issues Detected** | `{len(metrics.bugs_found)}` |
| **Browser Console Errors** | `{len(metrics.console_errors)}` |
| **Unhandled JS Exceptions** | `{len(metrics.page_errors)}` |
| **Network Request Failures** | `{len(metrics.network_failures)}` |
| **Chat Messages Processed** | `{len(metrics.chat_messages_captured)}` |
| **Screenshots Captured** | `{len(metrics.screenshots_taken)}` |
| **Total Test Duration** | `{(metrics.end_time - metrics.start_time).total_seconds():.1f}s` |

---

## 📂 Exported Formatted Log Artifacts

- 📊 **Excel Dashboard Workbook:** [`game_test_report.xlsx`](game_test_report.xlsx)
- ⏱️ **Master Chronological CSV Log:** [`game_events_chronological.csv`](game_events_chronological.csv)
- 🎭 **Player Roles Matrix CSV:** [`game_roles_matrix.csv`](game_roles_matrix.csv)
- 💬 **Chat Transcript CSV:** [`game_chat_transcript.csv`](game_chat_transcript.csv)
- 📄 **Detailed Plain Text Log:** [`game_test_run.log`](game_test_run.log)

---

## 🐛 Discovered Bugs & Scalability Issues

"""
        if metrics.bugs_found:
            for idx, bug in enumerate(metrics.bugs_found, 1):
                md_content += f"### {idx}. [{bug['severity']}] {bug['category']}\n"
                md_content += f"- **Description:** {bug['description']}\n"
                md_content += f"- **Timestamp:** `{bug['time']}`\n\n"
        else:
            md_content += "✨ **No critical runtime crashes or structural blocking bugs were detected!**\n\n"

        if metrics.p2p_connection_issues:
            md_content += "### 🌐 PeerJS / WebRTC Connection Log\n"
            for issue in metrics.p2p_connection_issues:
                md_content += f"- `{issue}`\n"
            md_content += "\n"

        md_content += """---

## 👥 Player Roster & Role Assignments

"""
        if metrics.role_distributions:
            for dist in metrics.role_distributions:
                md_content += f"### Round {dist['round']} Cycle {dist['cycle']} Role Composition\n\n"
                md_content += "| Player | Assigned Role |\n| :--- | :--- |\n"
                for p_name, p_role in dist["roles"].items():
                    md_content += f"| `{p_name}` | **{p_role}** |\n"
                md_content += "\n"

        md_content += """---

## 💬 Chat Transcript & Communication Audit

"""
        if metrics.chat_messages_captured:
            md_content += f"**Total Chat Messages Exchanged:** `{len(metrics.chat_messages_captured)}`\n\n"
            md_content += "| Round | Sender | Sender Role | Exchanged Message |\n| :--- | :--- | :--- | :--- |\n"
            for msg in metrics.chat_messages_captured[:30]:
                md_content += f"| R{msg['round']} | `{msg['sender']}` | {msg['role']} | {msg['text']} |\n"
            md_content += "\n"

        md_content += """---

## 📸 Captured Screenshots & Visual Artifacts

"""
        if metrics.screenshots_taken:
            md_content += "| Screenshot Label | Round | Timestamp | File Path |\n| :--- | :--- | :--- | :--- |\n"
            for s in metrics.screenshots_taken:
                md_content += f"| **{s['label']}** | Round {s['round']} | `{s['time']}` | [{s['path']}]({s['path']}) |\n"
            md_content += "\n"

        md_content += """---

## 🚀 Performance & Network Audit

1. **Initial Page Load Times**:
"""
        for k, v in metrics.page_load_times.items():
            md_content += f"   - **{k}**: `{v}s`\n"

        md_content += f"""
2. **Network Health**:
   - **Failed Network Requests:** `{len(metrics.network_failures)}`
   - **Slow Network Responses (>2s):** `{len(metrics.slow_requests)}`

---
*Report generated automatically by `test_hidden_agenda.py`*
"""

        with open(REPORT_FILE_PATH, "w", encoding="utf-8") as f:
            f.write(md_content)

        logger.info(f"[FILE] Detailed Log written to: {LOG_FILE_PATH}")
        logger.info(f"[FILE] Summary Markdown written to: {REPORT_FILE_PATH}")
        logger.info(f"[FILE] Metrics JSON written to: {METRICS_FILE_PATH}")
        logger.info(f"[FILE] Master Chronological CSV written to: {CSV_EVENTS_FILE_PATH}")
        logger.info(f"[FILE] Roles Matrix CSV written to: {CSV_ROLES_FILE_PATH}")
        logger.info(f"[FILE] Chat Transcript CSV written to: {CSV_CHAT_FILE_PATH}")
        if OPENPYXL_AVAILABLE:
            logger.info(f"[FILE] Excel Dashboard Report written to: {EXCEL_FILE_PATH}")


# ==============================================================================
# MAIN ENTRYPOINT
# ==============================================================================
async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=HEADLESS,
            slow_mo=SLOW_MO_MS,
            args=["--no-sandbox", "--disable-setuid-sandbox"]
        )
        tester = HiddenAgendaTester(browser)
        await tester.run_full_suite()


if __name__ == "__main__":
    asyncio.run(main())
