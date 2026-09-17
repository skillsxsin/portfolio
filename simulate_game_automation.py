#!/usr/bin/env python3
"""
HIDDEN AGENDA - 14-PLAYER END-TO-END UI AUTOMATION SCRIPT
--------------------------------------------------------
This script uses Playwright to automate a full 14-player match:
  1. Opens a live Chromium browser with 14 tabs (1 Host + 13 Players).
  2. Host creates room at https://bhavyajangid.com/projects/hidden-agenda/ and retrieves the room code.
  3. 13 players join the room via WebRTC / Socket.
  4. Host starts match directly into Night Step 1 (Killing).
  5. Godfather & Mafia coordinate kill target using live radar and lock.
  6. Doctor heals / protects target.
  7. Police inspects suspect and receives scan feedback.
  8. Day Discussion & Voting: Alive players vote and lock suspects.
  9. Eliminated players chat in Ghost Chat and submit Ghost Oracle predictions.
 10. Runs until match conclusion and GameOver screen.

Usage:
  python simulate_game_automation.py
  python simulate_game_automation.py --url https://bhavyajangid.com/projects/hidden-agenda/
"""

import sys
import time
import argparse
import asyncio
from playwright.async_api import async_playwright

EMOJIS = ['👾', '🤖', '👻', '🕹️', '🎮', '💀', '🗡️', '🛡️', '🕵️', '🎩', '👑', '⚡', '🕶️', '🐉', '🧙', '🎯']

async def run_automation(base_url="https://bhavyajangid.com/projects/hidden-agenda/", slow_mo=200):
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
        await host_page.wait_for_load_state("domcontentloaded")

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
        await host_page.wait_for_selector("span.font-black.text-3xl", timeout=15000)
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

        join_url = f"{base_url.rstrip('/')}/?code={room_code}"

        for i, name in enumerate(player_names, 1):
            page = await context.new_page()
            await page.goto(join_url)
            await page.wait_for_load_state("domcontentloaded")

            # Fill Name
            name_input = page.locator("input[placeholder*='e.g. Sarah']")
            if await name_input.count() == 0:
                join_tab_btn = page.locator("button:has-text('JOIN A GAME')")
                if await join_tab_btn.count() > 0:
                    await join_tab_btn.click()
            
            await page.locator("input[placeholder*='e.g. Sarah']").fill(name)
            
            # Fill code if not populated
            code_input = page.locator("input[placeholder*='e.g. aK9x3P']")
            current_code = await code_input.input_value()
            if not current_code:
                await code_input.fill(room_code)

            # Select Emoji
            emoji = EMOJIS[i % len(EMOJIS)]
            emoji_btn = page.locator(f"button:has-text('{emoji}')")
            if await emoji_btn.count() > 0:
                await emoji_btn.first.click()

            # Submit Join
            await page.locator("button[type='submit']:has-text('JOIN ROOM')").click()
            print(f"  -> Player {i:02d}/13 joined: '{name}'")
            player_pages.append({"name": name, "page": page, "index": i})
            await asyncio.sleep(0.3)

        # Wait for all players to sync on host
        print("\n  ⏳ Waiting for WebRTC peer synchronization on Host...")
        await host_page.bring_to_front()
        for _ in range(20):
            start_btn = host_page.locator("button:has-text('START MATCH')")
            if await start_btn.count() > 0 and await start_btn.is_enabled():
                btn_text = await start_btn.inner_text()
                print(f"  ✅ Host Roster Synced: {btn_text}")
                break
            await asyncio.sleep(0.5)

        # ---------------------------------------------------------------------
        # 3. HOST STARTS MATCH
        # ---------------------------------------------------------------------
        print("\n[STEP 3] Host Moderator is starting the match...")
        start_btn = host_page.locator("button:has-text('START MATCH')")
        if await start_btn.count() > 0 and await start_btn.is_enabled():
            await start_btn.click()
            print("  ✅ START MATCH triggered! Direct transition into Night Step 1.")
        else:
            print("  ⚠️ Force starting via host control if button disabled...")
            if await start_btn.count() > 0:
                await start_btn.click(force=True)

        await asyncio.sleep(2.5)

        # ---------------------------------------------------------------------
        # 4. GAME LOOP AUTOMATION (NIGHT -> DAY -> VOTING)
        # ---------------------------------------------------------------------
        round_num = 1
        max_rounds = 8

        while round_num <= max_rounds:
            print(f"\n" + "=" * 55)
            print(f"🌙 ROUND {round_num}: EXECUTING NIGHT PHASES (DIRECT KILL START)")
            print("=" * 55)

            # Check if Game is Over
            game_over_check = await host_page.locator("text='Match Concluded'").count()
            if game_over_check > 0:
                print("🏆 MATCH CONCLUDED!")
                break

            # -----------------------------------------------------------------
            # STEP 4A: NIGHT STEP 1 - MAFIA / GODFATHER KILL
            # -----------------------------------------------------------------
            print("\n  [NIGHT STEP 1] Mafia Syndicate Target Selection & Locking...")
            for p_info in player_pages:
                page = p_info["page"]
                mafia_modal = page.locator("h2:has-text('GODFATHER NIGHT EXECUTION'), h2:has-text('MAFIA NIGHT ASSASSINATION')")
                if await mafia_modal.count() > 0:
                    await page.bring_to_front()
                    p_name = p_info["name"]
                    print(f"    🕶️ Mafia Tab Active: {p_name}")

                    # Select candidate target
                    candidate_buttons = page.locator("div.grid button:not([disabled])")
                    c_count = await candidate_buttons.count()
                    if c_count > 0:
                        target_btn = candidate_buttons.first
                        chosen_victim = (await target_btn.inner_text()).split("\n")[0]
                        await target_btn.click()
                        print(f"      -> {p_name} selected target: '{chosen_victim}'")
                        await asyncio.sleep(0.3)

                        # Lock Target
                        lock_btn = page.locator("button:has-text('LOCK FINAL TARGET'), button:has-text('LOCK KILL TARGET VOTE'), button:has-text('LOCK NIGHT ACTION NOW')")
                        if await lock_btn.count() > 0 and await lock_btn.first.is_enabled():
                            await lock_btn.first.click()
                            print(f"      🔒 {p_name} LOCKED kill selection!")
                            await asyncio.sleep(0.3)

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
                        target_btn = candidate_buttons.first
                        target_name = (await target_btn.inner_text()).split("\n")[0]
                        await target_btn.click()
                        print(f"      -> Doctor selected {target_name} to heal.")
                        await asyncio.sleep(0.3)

                        lock_btn = page.locator("button:has-text('LOCK NIGHT ACTION NOW')")
                        if await lock_btn.count() > 0 and await lock_btn.first.is_enabled():
                            await lock_btn.first.click()
                            print(f"      🔒 Doctor LOCKED heal protection.")
                    await asyncio.sleep(0.3)

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
                        target_btn = candidate_buttons.last
                        target_name = (await target_btn.inner_text()).split("\n")[0]
                        await target_btn.click()
                        print(f"      -> Police selected suspect {target_name} for scan.")
                        await asyncio.sleep(0.3)

                        lock_btn = page.locator("button:has-text('LOCK NIGHT ACTION NOW')")
                        if await lock_btn.count() > 0 and await lock_btn.first.is_enabled():
                            await lock_btn.first.click()
                            print(f"      🔒 Police LOCKED inspection.")
                    await asyncio.sleep(0.3)

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
                vote_candidates = page.locator("button:has-text('SELECT TO VOTE')")
                if await vote_candidates.count() > 0:
                    await page.bring_to_front()
                    p_name = p_info["name"]
                    await vote_candidates.first.click()
                    print(f"    🗳️ {p_name} selected vote candidate.")
                    await asyncio.sleep(0.2)

                    lock_vote_btn = page.locator("button:has-text('LOCK VOTE NOW')")
                    if await lock_vote_btn.count() > 0:
                        await lock_vote_btn.first.click()
                        print(f"    🔒 {p_name} locked vote.")

            await asyncio.sleep(2.5)

            # Dismiss day elimination modal
            for p_info in player_pages:
                page = p_info["page"]
                ack_btn = page.locator("button:has-text('ACKNOWLEDGE & PROCEED')")
                if await ack_btn.count() > 0:
                    await ack_btn.first.click()

            round_num += 1

        print("\n" + "=" * 70)
        print("🎉 AUTOMATION COMPLETED SUCCESSFULLY!")
        print("You can inspect all 14 browser tabs to view the complete match state.")
        print("Press Enter in console when you want to close the browser.")
        print("=" * 70)
        input("Press Enter to close browser...")
        await browser.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Hidden Agenda 14-Player UI Automation")
    parser.add_argument("--url", default="https://bhavyajangid.com/projects/hidden-agenda/", help="URL of the application")
    parser.add_argument("--slow-mo", type=int, default=200, help="Playwright slow motion delay in ms")
    args = parser.parse_args()

    asyncio.run(run_automation(base_url=args.url, slow_mo=args.slow_mo))
