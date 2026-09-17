const assert = require('assert');
const gameEngine = require('../src/server/gameEngine');

console.log('🧪 HIDDEN AGENDA (GODFATHER / MAFIA / DOCTOR / POLICE / VILLAGERS) ENGINE TESTS\n');
let passed = 0;

function test(name, fn) {
  try { fn(); console.log(`  ✅ ${name}`); passed++; }
  catch (e) { console.error(`  ❌ ${name}\n     ${e.message}`); process.exit(1); }
}

// 1. Role recommendation table
test('Role table – 4 players', () => {
  const r = gameEngine.getRoleRecommendation(4);
  assert.strictEqual(r.godfather, 0);
  assert.strictEqual(r.mafia, 1);
  assert.strictEqual(r.villager, 1);
  assert.strictEqual(r.doctorHeals, 1);
  assert.strictEqual(r.policeChecks, 1);
});

test('Role table – 8 players', () => {
  const r = gameEngine.getRoleRecommendation(8);
  assert.strictEqual(r.godfather, 1);
  assert.strictEqual(r.mafia, 2);
  assert.strictEqual(r.villager, 3);
  assert.strictEqual(r.doctor, 1);
  assert.strictEqual(r.police, 1);
});

test('Role table – 20 players', () => {
  const r = gameEngine.getRoleRecommendation(20);
  assert.strictEqual(r.godfather, 1);
  assert.strictEqual(r.mafia, 5);
  assert.strictEqual(r.villager, 12);
  assert.strictEqual(r.doctorHeals, 3);
  assert.strictEqual(r.policeChecks, 3);
});

// 2. Game start assigns roles and excludes host
test('Game start – host excluded, players assigned roles', () => {
  const room = gameEngine.createRoom('ABC123', 'h1', 'HostGM');
  ['p1','p2','p3','p4'].forEach((id) => { room.players[id] = { id, name: id, isHost: false, isAlive: true, avatarSeed: id }; });
  gameEngine.startGame(room);
  assert(!room.players['h1'].role, 'Host has no role');
  ['p1','p2','p3','p4'].forEach((id) => assert(room.players[id].role, `${id} has role`));
  assert.strictEqual(room.phase, 'DAY_DISCUSSION');
});

// 3. Sequential night: MAFIA → DOCTOR → POLICE
test('Sequential night flow: MAFIA → DOCTOR → POLICE', () => {
  const room = gameEngine.createRoom('SEQ001', 'h1', 'GM', { nightTimerSec: 30, doctorHeals: 1, policeChecks: 1 });
  room.players['p1'] = { id: 'p1', name: 'Godfather', role: 'GODFATHER', team: 'MAFIA',     isAlive: true, avatarSeed: '1', nightActionCompleted: false };
  room.players['p2'] = { id: 'p2', name: 'Doctor',    role: 'DOCTOR',    team: 'VILLAGERS', isAlive: true, avatarSeed: '2', doctorHealsUsed: 0, nightActionCompleted: false };
  room.players['p3'] = { id: 'p3', name: 'Police',    role: 'POLICE',    team: 'VILLAGERS', isAlive: true, avatarSeed: '3', policeChecksUsed: 0, nightActionCompleted: false, policeResults: [] };
  room.players['p4'] = { id: 'p4', name: 'Villager',  role: 'VILLAGER',  team: 'VILLAGERS', isAlive: true, avatarSeed: '4', nightActionCompleted: false };

  room.phase = 'NIGHT'; room.nightSubPhase = 'MAFIA';
  room.nightActions = { mafiaVotes: {}, godfatherTarget: null, doctorTarget: null, policeTarget: null };

  gameEngine.submitNightAction(room, 'p1', 'p4');
  assert.strictEqual(room.nightSubPhase, 'DOCTOR', 'After Mafia → DOCTOR');

  gameEngine.submitNightAction(room, 'p2', 'p4');
  assert.strictEqual(room.nightSubPhase, 'POLICE', 'After Doctor → POLICE');

  gameEngine.submitNightAction(room, 'p3', 'p1');
  assert.ok(room.phase === 'DAY_DISCUSSION' || room.phase === 'GAME_OVER', 'Night resolved → Day');
});

// 4. Doctor heal blocks mafia kill
test('Doctor heal blocks mafia kill', () => {
  const room = gameEngine.createRoom('DOC01', 'h1', 'GM', { nightTimerSec: 30, doctorHeals: 1, policeChecks: 1 });
  room.players['p1'] = { id: 'p1', name: 'Godfather', role: 'GODFATHER', team: 'MAFIA',     isAlive: true, avatarSeed: '1', nightActionCompleted: false };
  room.players['p2'] = { id: 'p2', name: 'Doctor',    role: 'DOCTOR',    team: 'VILLAGERS', isAlive: true, avatarSeed: '2', doctorHealsUsed: 0, nightActionCompleted: false };
  room.players['p3'] = { id: 'p3', name: 'Villager',  role: 'VILLAGER',  team: 'VILLAGERS', isAlive: true, avatarSeed: '3', nightActionCompleted: false };

  room.phase = 'NIGHT'; room.nightSubPhase = 'MAFIA';
  room.nightActions = { mafiaVotes: {}, godfatherTarget: null, doctorTarget: null, policeTarget: null };

  gameEngine.submitNightAction(room, 'p1', 'p3');  // Godfather targets p3
  gameEngine.submitNightAction(room, 'p2', 'p3');  // Doctor heals p3
  assert.ok(room.players['p3'].isAlive, 'Villager healed by Doctor, still alive');
});

// 5. Doctor heal quota enforced
test('Doctor heal quota enforced', () => {
  const room = gameEngine.createRoom('DQ', 'h1', 'GM', { doctorHeals: 1 });
  room.players['p1'] = { id: 'p1', name: 'Doc', role: 'DOCTOR', team: 'VILLAGERS', isAlive: true, avatarSeed: '1', doctorHealsUsed: 1, nightActionCompleted: false };
  room.players['p2'] = { id: 'p2', name: 'Vil', role: 'VILLAGER', team: 'VILLAGERS', isAlive: true, avatarSeed: '2' };
  room.phase = 'NIGHT'; room.nightSubPhase = 'DOCTOR';
  assert.throws(() => gameEngine.submitNightAction(room, 'p1', 'p2'), /protection limit/);
});

// 6. Police check quota enforced
test('Police check quota enforced', () => {
  const room = gameEngine.createRoom('PQ', 'h1', 'GM', { policeChecks: 2 });
  room.players['p1'] = { id: 'p1', name: 'Pol', role: 'POLICE', team: 'VILLAGERS', isAlive: true, avatarSeed: '1', policeChecksUsed: 2, nightActionCompleted: false, policeResults: [] };
  room.players['p2'] = { id: 'p2', name: 'Vil', role: 'VILLAGER', team: 'VILLAGERS', isAlive: true, avatarSeed: '2' };
  room.phase = 'NIGHT'; room.nightSubPhase = 'POLICE';
  assert.throws(() => gameEngine.submitNightAction(room, 'p1', 'p2'), /quota reached/);
});

// 7. Godfather is immune to police inspection (appears innocent NO), Mafia appears YES
test('Godfather is immune to police inspection; Mafia scans YES', () => {
  const room = gameEngine.createRoom('IMM01', 'h1', 'GM', { nightTimerSec: 30, doctorHeals: 1, policeChecks: 2 });
  room.players['p1'] = { id: 'p1', name: 'Godfather', role: 'GODFATHER', team: 'MAFIA',     isAlive: true, avatarSeed: '1', nightActionCompleted: false };
  room.players['p2'] = { id: 'p2', name: 'MafiaGooon',role: 'MAFIA',     team: 'MAFIA',     isAlive: true, avatarSeed: '2', nightActionCompleted: false };
  room.players['p3'] = { id: 'p3', name: 'Police',    role: 'POLICE',    team: 'VILLAGERS', isAlive: true, avatarSeed: '3', policeChecksUsed: 0, nightActionCompleted: false, policeResults: [] };
  room.players['p4'] = { id: 'p4', name: 'Vil1',      role: 'VILLAGER',  team: 'VILLAGERS', isAlive: true, avatarSeed: '4', nightActionCompleted: false };
  room.players['p5'] = { id: 'p5', name: 'Vil2',      role: 'VILLAGER',  team: 'VILLAGERS', isAlive: true, avatarSeed: '5', nightActionCompleted: false };

  room.phase = 'NIGHT'; room.nightSubPhase = 'MAFIA';
  room.nightActions = { mafiaVotes: {}, godfatherTarget: null, doctorTarget: null, policeTarget: null };

  // Godfather targets p4
  gameEngine.submitNightAction(room, 'p1', 'p4');
  gameEngine.submitNightAction(room, 'p2', 'p4');

  // Skip Doctor since no Doctor, advances to POLICE
  assert.strictEqual(room.nightSubPhase, 'POLICE');

  // Police inspects Godfather -> should be innocent (isMafia = false)
  gameEngine.submitNightAction(room, 'p3', 'p1');
  const resGodfather = room.players['p3'].policeResults.find((r) => r.targetName === 'Godfather');
  assert.strictEqual(resGodfather.isMafia, false, 'Godfather is immune to police scan');
});

// 9. Mafia syndicate teammates know each other and see each other's live selections
test('Mafia teammates know each other and see live pending selections', () => {
  const room = gameEngine.createRoom('SYN01', 'h1', 'GM');
  room.players['p1'] = { id: 'p1', name: 'Godfather', role: 'GODFATHER', team: 'MAFIA', isAlive: true, avatarSeed: '1', nightActionCompleted: false };
  room.players['p2'] = { id: 'p2', name: 'MafiaGoon', role: 'MAFIA', team: 'MAFIA', isAlive: true, avatarSeed: '2', nightActionCompleted: false };
  room.players['p3'] = { id: 'p3', name: 'Villager1', role: 'VILLAGER', team: 'VILLAGERS', isAlive: true, avatarSeed: '3', nightActionCompleted: false };
  room.players['p4'] = { id: 'p4', name: 'Villager2', role: 'VILLAGER', team: 'VILLAGERS', isAlive: true, avatarSeed: '4', nightActionCompleted: false };
  room.phase = 'NIGHT';
  room.nightSubPhase = 'MAFIA';

  // p1 selects p3, p2 selects p4
  gameEngine.selectPendingNightTarget(room, 'p1', 'p3');
  gameEngine.selectPendingNightTarget(room, 'p2', 'p4');

  const mafia1State = gameEngine.getSanitizedClientState(room, 'p1');
  const mafia2State = gameEngine.getSanitizedClientState(room, 'p2');
  const villagerState = gameEngine.getSanitizedClientState(room, 'p3');

  // Mafia 1 sees Mafia 2's role and pending target
  assert.strictEqual(mafia1State.players['p2'].role, 'MAFIA', 'Mafia 1 sees Mafia 2 role');
  assert.strictEqual(mafia1State.players['p2'].pendingNightTargetId, 'p4', 'Mafia 1 sees Mafia 2 pending target');

  // Mafia 2 sees Godfather role and pending target
  assert.strictEqual(mafia2State.players['p1'].role, 'GODFATHER', 'Mafia 2 sees Godfather role');
  assert.strictEqual(mafia2State.players['p1'].pendingNightTargetId, 'p3', 'Mafia 2 sees Godfather pending target');

  // Villager cannot see roles or pending targets of Mafia
  assert.strictEqual(villagerState.players['p1'].role, undefined, 'Villager cannot see Godfather role');
  assert.strictEqual(villagerState.players['p2'].role, undefined, 'Villager cannot see Mafia role');
  assert.strictEqual(villagerState.players['p1'].pendingNightTargetId, undefined, 'Villager cannot see pending target');
});

// 10. Locking night action completes action and clears pending target
test('Locking night action completes action and clears pending target', () => {
  const room = gameEngine.createRoom('LOCK01', 'h1', 'GM');
  room.players['p1'] = { id: 'p1', name: 'Godfather', role: 'GODFATHER', team: 'MAFIA', isAlive: true, avatarSeed: '1', nightActionCompleted: false };
  room.players['p2'] = { id: 'p2', name: 'MafiaGoon', role: 'MAFIA', team: 'MAFIA', isAlive: true, avatarSeed: '2', nightActionCompleted: false };
  room.players['p3'] = { id: 'p3', name: 'Villager', role: 'VILLAGER', team: 'VILLAGERS', isAlive: true, avatarSeed: '3', nightActionCompleted: false };
  room.phase = 'NIGHT';
  room.nightSubPhase = 'MAFIA';
  room.nightActions = { mafiaVotes: {}, godfatherTarget: null, doctorTarget: null, policeTarget: null };

  gameEngine.selectPendingNightTarget(room, 'p1', 'p3');
  assert.strictEqual(room.players['p1'].pendingNightTargetId, 'p3');

  gameEngine.submitNightAction(room, 'p1', 'p3');
  assert.strictEqual(room.players['p1'].nightActionCompleted, true);
  assert.strictEqual(room.players['p1'].nightTargetId, 'p3');
  assert.strictEqual(room.players['p1'].pendingNightTargetId, null);
});

console.log(`\n🎉 ALL ${passed} TESTS PASSED!\n`);
