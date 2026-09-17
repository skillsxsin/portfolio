#!/usr/bin/env python3
"""
HIDDEN AGENDA - 14-PLAYER END-TO-END UI AUTOMATION SCRIPT
--------------------------------------------------------
This script uses Playwright to automate a full 14-player match:
  1. Opens a live Chromium browser with 14 tabs (1 Host + 13 Players).
  2. Host creates room and retrieves the room code.
  3. 13 players join the room with unique names and avatars.
  4. Host starts match directly into Night Step 1 (Killing).
  5. Godfather & Mafia coordinate kill target using live radar and lock.
  6. Doctor heals / protects target.
  7. Police inspects suspect and receives scan feedback.
  8. Day Discussion & Voting: Alive players vote and lock suspects.
  9. Eliminated players chat in Ghost Chat and submit Ghost Oracle predictions.
 10. Runs until match conclusion and GameOver screen.

Usage:
  python simulate_game_automation.py [--url http://localhost:3000] [--slow-mo 300]
"""

import sys
import time
import argparse
import asyncio
from playwright.async_api import async_playwright

EMOJIS = ['👾', '🤖', '👻', '🕹️', '🎮', '💀', '🗡️', '🛡️', '🕵️', '🎩', '👑', '⚡', '🕶️', '🐉', '🧙', '🎯']

async def run_automation(base_url="http://localhost:3000", slow_mo=300):
    print("=" * 70)
    print(f"🕵️ HIDDEN AGENDA - 14-PLAYER LIVE UI AUTOMATION")
    print(f"🌐 Target URL: {base_url}")
    print(f"⏱️ Slow Motion Delay: {slow_mo}ms")
    print("=" * 70)

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=False,
            slow_mo=slow_mo,
            args=["--start-maximized", "--disable-blink-features=AutomationControlled"]
        )
        context = await browser.new_context(viewport=None)

        # ---------------------------------------------------------------------
        # 1. CREATE HOST TAB & ROOM
        # ---------------------------------------------------------------------
        print("\n[STEP 1] Launching Host Moderator Tab...")
        host_page = await context.new_page()
        await host_page.goto(base_url)
        await host_page.wait_for_load_state("networkidle")

        # Fill Host Form
        print("  -> Creating room as 'Game Master Alex'...")
        host_input = host_page.locator("input[placeholder*='e.g. Alex']")
        if await host_input.count() > 0:
            await host_input.fill("Game Master Alex")
            await host_page.locator("button[type='submit']:has-text('CREATE ROOM')").click()
        else:
            # Fallback if landing tab is on JOIN
            await host_page.locator("button:has-text('HOST A GAME')").click()
            await host_page.locator("input[placeholder*='e.g. Alex']").fill("Game Master Alex")
            await host_page.locator("button[type='submit']:has-text('CREATE ROOM')").click()

        # Wait for Room Code
        await host_page.wait_for_selector("span.font-black.text-3xl", timeout=10000)
        room_code = (await host_page.locator("span.font-black.text-3xl").inner_text()).strip()
        print(f"  ✅ Room Created Successfully! Room Code: [{room_code}]")

        # ---------------------------------------------------------------------
        # 2. LAUNCH 13 GUEST PLAYERS
        # ---------------------------------------------------------------------
        print(f"\n[STEP 2] Launching 13 Guest Player Tabs to join room [{room_code}]...")
        player_pages = []
        player_names = [
            "Arthur (Alpha)", "Beatrix (Bravo)", "Cedric (Charlie)", "Diana (Delta)",
            "Elena (Echo)", "Felix (Foxtrot)", "Gideon (Golf)", "Helena (Hotel)",
            "Ivan (India)", "Julia (Juliet)", "Kaelen (Kilo)", "Lyra (Lima)", "Marcus (Mike)"
        ]

        for i, name in enumerate(player_names, 1):
            page = await context.new_page()
            await page.goto(base_url)
            await page.wait_for_load_state("networkidle")

            # Switch to JOIN Tab
            join_tab_btn = page.locator("button:has-text('JOIN A GAME')")
            if await join_tab_btn.count() > 0:
                await join_tab_btn.click()

            # Fill Name and Code
            await page.locator("input[placeholder*='e.g. Sarah']").fill(name)
            await page.locator("input[placeholder*='e.g. aK9x3P']").fill(room_code)
            
            # Select Emoji
            emoji = EMOJIS[i % len(EMOJIS)]
            emoji_btn = page.locator(f"button:has-text('{emoji}')")
            if await emoji_btn.count() > 0:
                await emoji_btn.first.click()

            # Submit Join
            await page.locator("button[type='submit']:has-text('JOIN ROOM')").click()
            print(f"  -> Player {i:02d}/13 joined: '{name}'")
            player_pages.append({"name": name, "page": page, "index": i})
            await asyncio.sleep(0.15)

        print("\n  ✅ All 13 Players joined the lobby!")
        await asyncio.sleep(1)

        # ---------------------------------------------------------------------
        # 3. HOST STARTS MATCH
        # ---------------------------------------------------------------------
        print("\n[STEP 3] Host Moderator is starting the match...")
        await host_page.bring_to_front()
        start_btn = host_page.locator("button:has-text('START MATCH')")
        await start_btn.wait_for(state="visible")
        await start_btn.click()
        print("  ✅ START MATCH triggered! Direct transition into Night Step 1.")
        await asyncio.sleep(2)

        # ---------------------------------------------------------------------
        # 4. GAME LOOP AUTOMATION (NIGHT -> DAY -> VOTING)
        # ---------------------------------------------------------------------
        round_num = 1
        max_rounds = 10

        while round_num <= max_rounds:
            print(f"\n" + "=" * 50)
            print(f"🌙 ROUND {round_num}: EXECUTING NIGHT PHASES")
            print("=" * 50)

            # Check if Game is Over
            game_over_check = await host_page.locator("text='Match Concluded'").count()
            if game_over_check > 0:
                print("🏆 MATCH CONCLUDED!")
                break

            # -----------------------------------------------------------------
            # STEP 4A: NIGHT STEP 1 - MAFIA / GODFATHER KILL
            # -----------------------------------------------------------------
            print("\n  [NIGHT STEP 1] Mafia Syndicate Target Selection & Locking...")
            mafia_acted = 0
            chosen_victim = None

            for p_info in player_pages:
                page = p_info["page"]
                # Check if Mafia action modal is active
                mafia_modal = page.locator("h2:has-text('GODFATHER NIGHT EXECUTION'), h2:has-text('MAFIA NIGHT ASSASSINATION')")
                if await mafia_modal.count() > 0:
                    await page.bring_to_front()
                    p_name = p_info["name"]
                    print(f"    🕶️ Mafia Tab Active: {p_name}")

                    # Select candidate target
                    candidate_buttons = page.locator("div.grid button:not([disabled])")
                    c_count = await candidate_buttons.count()
                    if c_count > 0:
                        # Choose first available non-teammate candidate
                        target_btn = candidate_buttons.first
                        chosen_victim = (await target_btn.inner_text()).split("\n")[0]
                        await target_btn.click()
                        print(f"      -> {p_name} selected target: '{chosen_victim}' (Teammates see live radar)")
                        await asyncio.sleep(0.5)

                        # Lock Target
                        lock_btn = page.locator("button:has-text('LOCK FINAL TARGET'), button:has-text('LOCK KILL TARGET VOTE'), button:has-text('LOCK NIGHT ACTION NOW')")
                        if await lock_btn.count() > 0 and await lock_btn.first.is_enabled():
                            await lock_btn.first.click()
                            print(f"      🔒 {p_name} LOCKED kill target!")
                            mafia_acted += 1
                            await asyncio.sleep(0.5)

            await asyncio.sleep(1.5)

            # -----------------------------------------------------------------
            # STEP 4B: NIGHT STEP 2 - DOCTOR HEAL
            # -----------------------------------------------------------------
            print("\n  [NIGHT STEP 2] Doctor Heal & Protection Phase...")
            for p_info in player_pages:
                page = p_info["page"]
                doc_modal = page.locator("h2:has-text('DOCTOR HEAL & PROTECT')")
                if await doc_modal.count() > 0:
                    await page.bring_to_front()
                    p_name = p_info["name"]
                    print(f"    💊 Doctor Tab Active: {p_name}")

                    candidate_buttons = page.locator("div.grid button:not([disabled])")
                    if await candidate_buttons.count() > 0:
                        # Doctor heals a player
                        target_btn = candidate_buttons.first
                        target_name = (await target_btn.inner_text()).split("\n")[0]
                        await target_btn.click()
                        print(f"      -> Doctor selected {target_name} to heal.")
                        await asyncio.sleep(0.5)

                        lock_btn = page.locator("button:has-text('LOCK NIGHT ACTION NOW')")
                        if await lock_btn.count() > 0 and await lock_btn.first.is_enabled():
                            await lock_btn.first.click()
                            print(f"      🔒 Doctor LOCKED heal protection.")
                    await asyncio.sleep(0.5)

            await asyncio.sleep(1.5)

            # -----------------------------------------------------------------
            # STEP 4C: NIGHT STEP 3 - POLICE INSPECTION
            # -----------------------------------------------------------------
            print("\n  [NIGHT STEP 3] Police Suspect Inspection Phase...")
            for p_info in player_pages:
                page = p_info["page"]
                police_modal = page.locator("h2:has-text('POLICE SUSPECT CHECK')")
                if await police_modal.count() > 0:
                    await page.bring_to_front()
                    p_name = p_info["name"]
                    print(f"    🔍 Police Tab Active: {p_name}")

                    candidate_buttons = page.locator("div.grid button:not([disabled])")
                    if await candidate_buttons.count() > 0:
                        # Police inspects last candidate
                        target_btn = candidate_buttons.last
                        target_name = (await target_btn.inner_text()).split("\n")[0]
                        await target_btn.click()
                        print(f"      -> Police selected suspect {target_name} for scan.")
                        await asyncio.sleep(0.5)

                        lock_btn = page.locator("button:has-text('LOCK NIGHT ACTION NOW')")
                        if await lock_btn.count() > 0 and await lock_btn.first.is_enabled():
                            await lock_btn.first.click()
                            print(f"      🔒 Police LOCKED inspection.")
                    await asyncio.sleep(0.5)

            await asyncio.sleep(2)

            # -----------------------------------------------------------------
            # STEP 4D: DISMISS ELIMINATION MODAL & GHOST PREDICTIONS
            # -----------------------------------------------------------------
            print("\n  [DAWN RESOLUTION] Processing Dawn & Elimination popups...")
            for p_info in player_pages:
                page = p_info["page"]
                ack_btn = page.locator("button:has-text('ACKNOWLEDGE & PROCEED')")
                if await ack_btn.count() > 0:
                    await ack_btn.first.click()

            # Ghost Oracle Minigame betting for dead players
            for p_info in player_pages:
                page = p_info["page"]
                ghost_pred_card = page.locator("h2:has-text('GHOST ORACLE PREDICTION MINIGAME')")
                if await ghost_pred_card.count() > 0:
                    # Place a quick bet on night kill / day vote
                    predict_btns = page.locator("button:has-text('🎯 Guess')")
                    if await predict_btns.count() > 0:
                        await predict_btns.first.click()

            # -----------------------------------------------------------------
            # STEP 4E: DAY DISCUSSION & ADVANCING TO VOTING
            # -----------------------------------------------------------------
            print("\n  [DAYTIME DISCUSSION] Advancing to Daytime Voting Phase...")
            await host_page.bring_to_front()
            force_btn = host_page.locator("button:has-text('FORCE NEXT PHASE')")
            if await force_btn.count() > 0:
                await force_btn.click()
                print("    -> Host advanced discussion directly to Daytime Voting.")
            await asyncio.sleep(2)

            # -----------------------------------------------------------------
            # STEP 4F: DAYTIME VOTING & TRIAL
            # -----------------------------------------------------------------
            print("\n  [DAYTIME VOTING] Players casting and locking votes...")
            for p_info in player_pages:
                page = p_info["page"]
                # If player is alive and voting is active
                vote_candidates = page.locator("button:has-text('SELECT TO VOTE')")
                if await vote_candidates.count() > 0:
                    await page.bring_to_front()
                    p_name = p_info["name"]
                    # Select first candidate
                    await vote_candidates.first.click()
                    print(f"    🗳️ {p_name} selected vote candidate.")
                    await asyncio.sleep(0.2)

                    # Lock vote
                    lock_vote_btn = page.locator("button:has-text('LOCK VOTE NOW')")
                    if await lock_vote_btn.count() > 0:
                        await lock_vote_btn.first.click()
                        print(f"    🔒 {p_name} locked vote.")

            await asyncio.sleep(2)

            # Dismiss day elimination modal
            for p_info in player_pages:
                page = p_info["page"]
                ack_btn = page.locator("button:has-text('ACKNOWLEDGE & PROCEED')")
                if await ack_btn.count() > 0:
                    await ack_btn.first.click()

            round_num += 1

        print("\n" + "=" * 70)
        print("🎉 AUTOMATION COMPLETED SUCCESSFULLY!")
        print("You can inspect the browser tabs to see the final match results.")
        print("Press Enter in console when you want to close the browser.")
        print("=" * 70)
        input("Press Enter to close browser...")
        await browser.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Hidden Agenda 14-Player UI Automation")
    parser.add_argument("--url", default="http://localhost:3000", help="URL of the running application")
    parser.add_argument("--slow-mo", type=int, default=250, help="Playwright slow motion delay in ms")
    args = parser.parse_args()

    asyncio.run(run_automation(base_url=args.url, slow_mo=args.slow_mo))
