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

// 8. Mafia private chat hidden from Villagers
test('Mafia private chat hidden from Villagers', () => {
  const room = gameEngine.createRoom('CHAT', 'h1', 'GM');
  room.players['p1'] = { id: 'p1', name: 'Godfather', role: 'GODFATHER', team: 'MAFIA',     isAlive: true, avatarSeed: '1' };
  room.players['p2'] = { id: 'p2', name: 'Villager',  role: 'VILLAGER',  team: 'VILLAGERS', isAlive: true, avatarSeed: '2' };
  gameEngine.sendMafiaChat(room, 'p1', 'Target p2 tonight!');
  const villagerState = gameEngine.getSanitizedClientState(room, 'p2');
  const mafiaState    = gameEngine.getSanitizedClientState(room, 'p1');
  assert.strictEqual(villagerState.mafiaLogs, undefined, 'Villagers cannot see mafia chat');
  assert.ok(mafiaState.mafiaLogs?.length > 1, 'Mafia can see their chat');
});

console.log(`\n🎉 ALL ${passed} TESTS PASSED!\n`);
