const assert = require('assert');
const gameEngine = require('../src/server/gameEngine');

console.log('🧪 RUNNING END-TO-END AUTOMATED TEST: 12 PLAYERS (RECOMMENDED SETTINGS)\n');

// 1. Create Room by Host
const hostId = 'socket_host_01';
const room = gameEngine.createRoom('TEST12', hostId, 'Alex (Host)');
console.log('  ✅ 1. Room created: TEST12 by Host');

// 2. Add 12 Players with 8-Bit Emoji Avatars
const avatars = ['👾', '🤖', '👻', '🕹️', '🎮', '💀', '🗡️', '🛡️', '🕵️', '🎩', '👑', '⚡'];
const playerIds = [];

for (let i = 1; i <= 12; i++) {
  const id = `socket_player_${i}`;
  playerIds.push(id);
  room.players[id] = {
    id,
    name: `Player_${i}`,
    isHost: false,
    isAlive: true,
    avatarSeed: `seed_${i}`,
    avatarEmoji: avatars[(i - 1) % avatars.length],
    isOnline: true,
    protectionsUsed: 0,
    checksUsed: 0,
    investigatorResults: [],
  };
}

assert.strictEqual(Object.keys(room.players).length, 13, 'Host + 12 Players = 13 players total in room');
console.log('  ✅ 2. 12 Players joined room with 8-Bit Emoji Avatars');

// 3. Recommended Role Settings Check for 12 Players
const reco = gameEngine.getRoleRecommendation(12);
console.log('  📋 Recommended Settings for 12 Players:', reco);
assert.strictEqual(reco.director, 1);
assert.strictEqual(reco.shadow, 2);
assert.strictEqual(reco.guardian, 1);
assert.strictEqual(reco.investigator, 1);
assert.strictEqual(reco.wildcard, 1);
assert.strictEqual(reco.citizen, 6);
console.log('  ✅ 3. Recommended settings verified for 12 Players (1 Director, 2 Shadows, 1 Guardian, 1 Investigator, 1 Wildcard, 6 Citizens)');

// 4. Start Game
gameEngine.startGame(room);
assert.strictEqual(room.phase, 'DAY_DISCUSSION', 'Game starts at DAY_DISCUSSION');
console.log('  ✅ 4. Game started successfully. Phase: DAY_DISCUSSION');

// Verify role distribution among players
const roleCounts = {};
playerIds.forEach((id) => {
  const p = room.players[id];
  roleCounts[p.role] = (roleCounts[p.role] || 0) + 1;
  assert.ok(p.role, `Player ${p.name} assigned role: ${p.role}`);
  assert.strictEqual(p.isOnline, true, `Player ${p.name} status is ONLINE`);
});
assert.strictEqual(roleCounts.DIRECTOR, 1);
assert.strictEqual(roleCounts.SHADOW, 2);
assert.strictEqual(roleCounts.GUARDIAN, 1);
assert.strictEqual(roleCounts.INVESTIGATOR, 1);
assert.strictEqual(roleCounts.WILDCARD, 1);
assert.strictEqual(roleCounts.CITIZEN, 6);
console.log('  ✅ 5. Role assignments verified across all 12 players');

// Helper to find alive players by role/team
function getAlivePlayers() {
  return Object.values(room.players).filter((p) => !p.isHost && p.isAlive);
}
function getAliveByRole(role) {
  return getAlivePlayers().find((p) => p.role === role);
}

// 5. Host advances phase from DAY_DISCUSSION to DAY_VOTING
gameEngine.hostForceNextPhase(room);
assert.strictEqual(room.phase, 'DAY_VOTING', 'Phase: DAY_VOTING');
console.log('  ✅ 6. Phase advanced to DAY_VOTING');

// 6. Test pending vote live bar graph updates
const aliveVoters = getAlivePlayers();
const voteTarget = aliveVoters[0];
console.log(`     Voters selecting pending vote target: ${voteTarget.name}`);
aliveVoters.slice(1, 6).forEach((voter) => {
  gameEngine.selectPendingVote(room, voter.id, voteTarget.id);
});
const pendingCount = Object.values(room.players).filter((p) => p.pendingVoteTargetId === voteTarget.id).length;
assert.strictEqual(pendingCount, 5, '5 pending votes registered in graph state');
console.log('  ✅ 7. Live pending vote graph counts verified (5 voters choosing same target)');

// 7. Host advances phase (resolves Day voting or forces Night)
gameEngine.hostForceNextPhase(room); // -> NIGHT
assert.strictEqual(room.phase, 'NIGHT', 'Phase: NIGHT');
assert.strictEqual(room.nightSubPhase, 'SHADOWS', 'Night starts at SHADOWS subphase');
console.log('  ✅ 8. Phase advanced to NIGHT (Subphase: SHADOWS)');

// 8. Night Action 1: Shadows & Director select target
const shadows = getAlivePlayers().filter((p) => p.team === 'SHADOWS');
const citizenTarget = getAlivePlayers().find((p) => p.team === 'CITIZENS');

console.log(`     All Shadows (${shadows.map(s => s.name).join(', ')}) target ${citizenTarget.name}`);
shadows.forEach((s) => gameEngine.submitNightAction(room, s.id, citizenTarget.id));

assert.strictEqual(room.nightSubPhase, 'GUARDIAN', 'Subphase advanced to GUARDIAN');
console.log('  ✅ 9. Shadows subphase completed → Advanced to GUARDIAN subphase');

// 9. Night Action 2: Guardian protects a citizen
const guardian = getAliveByRole('GUARDIAN');
const protectTarget = getAlivePlayers().find((p) => p.team === 'CITIZENS' && p.id !== citizenTarget.id);
console.log(`     Guardian (${guardian.name}) protects ${protectTarget.name}`);
gameEngine.submitNightAction(room, guardian.id, protectTarget.id);

assert.strictEqual(room.nightSubPhase, 'INVESTIGATOR', 'Subphase advanced to INVESTIGATOR');
console.log('  ✅ 10. Guardian subphase completed → Advanced to INVESTIGATOR subphase');

// 10. Night Action 3: Investigator checks a player
const investigator = getAliveByRole('INVESTIGATOR');
const checkTarget = getAlivePlayers().find((p) => p.id !== investigator.id);
console.log(`     Investigator (${investigator.name}) checks ${checkTarget.name}`);
gameEngine.submitNightAction(room, investigator.id, checkTarget.id);

assert.strictEqual(room.phase, 'DAY_DISCUSSION', 'Night resolved → Phase: DAY_DISCUSSION');
assert.ok(room.lastEliminatedPlayer, 'Last eliminated player recorded');

// Verify that getSanitizedClientState conceals night kill role from client state
const clientState = gameEngine.getSanitizedClientState(room, playerIds[0]);
assert.strictEqual(clientState.lastEliminatedPlayer?.role, undefined, 'Client state conceals night kill role!');
console.log(`  ✅ 11. Night resolved! Player eliminated: ${room.lastEliminatedPlayer.name} (Client role concealed: ${clientState.lastEliminatedPlayer?.role === undefined})`);

// 11. Advance to DAY_VOTING and cast locked votes for all alive players
gameEngine.hostForceNextPhase(room);
assert.strictEqual(room.phase, 'DAY_VOTING', 'Phase: DAY_VOTING');
const curVoters = getAlivePlayers();
const targetP = curVoters[0];
console.log(`     Casting locked votes against ${targetP.name}...`);
curVoters.forEach((voter) => {
  gameEngine.castVote(room, voter.id, targetP.id);
});
console.log(`  ✅ 12. Daytime voting completed! Eliminated: ${room.lastEliminatedPlayer?.name} (Voted out)`);

// 12. Loop Night/Day cycles until match ends (Game Over)
let round = 2;
while (room.phase !== 'GAME_OVER' && round <= 15) {
  console.log(`\n  --- ROUND ${round} ---`);
  if (room.phase === 'DAY_DISCUSSION') {
    gameEngine.hostForceNextPhase(room); // -> DAY_VOTING
  }

  if (room.phase === 'DAY_VOTING') {
    const curAlive = getAlivePlayers();
    const tgt = curAlive[0];
    curAlive.forEach((v) => gameEngine.castVote(room, v.id, tgt.id));
  }

  if (room.phase === 'NIGHT') {
    const aliveShad = getAlivePlayers().filter((p) => p.team === 'SHADOWS');
    const aliveCitTarget = getAlivePlayers().find((p) => p.team !== 'SHADOWS');

    if (aliveShad.length > 0 && aliveCitTarget) {
      aliveShad.forEach((s) => gameEngine.submitNightAction(room, s.id, aliveCitTarget.id));
    }
    if (room.nightSubPhase === 'GUARDIAN') {
      const g = getAliveByRole('GUARDIAN');
      if (g && g.isAlive && g.protectionsUsed < room.settings.guardianProtections) {
        const tgt = getAlivePlayers().find((p) => p.id !== g.id);
        if (tgt) gameEngine.submitNightAction(room, g.id, tgt.id);
      }
    }
    if (room.nightSubPhase === 'INVESTIGATOR') {
      const inv = getAliveByRole('INVESTIGATOR');
      if (inv && inv.isAlive && inv.checksUsed < room.settings.investigatorChecks) {
        const tgt = getAlivePlayers().find((p) => p.id !== inv.id);
        if (tgt) gameEngine.submitNightAction(room, inv.id, tgt.id);
      }
    }
  }

  round++;
}

assert.strictEqual(room.phase, 'GAME_OVER', 'Match successfully reached GAME_OVER phase');
console.log(`\n  🏆 MATCH FINISHED! Winner: ${room.winner}`);

// 12. Host Reset to Lobby
gameEngine.hostResetToLobby(room);
assert.strictEqual(room.phase, 'LOBBY', 'Host reset room to LOBBY phase');
Object.values(room.players).forEach((p) => {
  if (!p.isHost) {
    assert.strictEqual(p.isAlive, true, `Player ${p.name} restored to alive`);
    assert.strictEqual(p.hasVoted, false, `Player ${p.name} vote state reset`);
  }
});
console.log('  ✅ 13. Host reset to lobby verified. All 12 players cleanly restored for next match!');

console.log('\n🎉 ALL 12-PLAYER END-TO-END AUTOMATED ENGINE TESTS PASSED PERFECTLY!\n');
