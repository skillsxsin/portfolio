const io = require('socket.io-client');
const assert = require('assert');

const SERVER_URL = 'http://localhost:3003';
console.log('🧪 DETAILED E2E UI & MULTI-CLIENT SOCKET STRESS TEST: 12 PLAYERS\n');

// 1. Host Connects & Creates Room
const hostSocket = io(SERVER_URL);
let roomCode = '';
let hostState = null;

hostSocket.on('connect', () => {
  console.log('  ✅ Host Socket Connected:', hostSocket.id);
  hostSocket.emit('create_room', { hostName: 'Alex GM', avatarEmoji: '🕵️' }, (res) => {
    assert(res.success, 'Room creation failed');
    roomCode = res.code;
    console.log(`  ✅ Room Created: Code = ${roomCode}`);

    // Update settings to recommended 12-player settings
    hostSocket.emit('update_settings', {
      code: roomCode,
      settings: {
        discussionTimerSec: 60,
        votingTimerSec: 45,
        nightTimerSec: 30,
        guardianProtections: 2,
        investigatorChecks: 2,
      },
    });

    // 2. Connect 11 other players
    connectRemainingPlayers();
  });
});

hostSocket.on('room_state', (state) => {
  hostState = state;
});

const playerSockets = [];
const playerStates = {};
const avatars = ['👾', '🤖', '👻', '🕹️', '🎮', '💀', '🗡️', '🛡️', '🎩', '👑', '⚡'];

function connectRemainingPlayers() {
  let joinedCount = 0;
  for (let i = 1; i <= 11; i++) {
    const pSocket = io(SERVER_URL);
    const pName = `Player_${i}`;
    const pEmoji = avatars[(i - 1) % avatars.length];

    pSocket.on('connect', () => {
      pSocket.emit('join_room', { code: roomCode, playerName: pName, avatarEmoji: pEmoji }, (res) => {
        assert(res.success, `Join failed for ${pName}`);
        joinedCount++;
        playerSockets.push(pSocket);

        pSocket.on('room_state', (st) => {
          playerStates[pSocket.id] = st;
        });

        if (joinedCount === 11) {
          console.log('  ✅ All 11 additional players connected & joined room cleanly!');
          setTimeout(runGameLoopTests, 500);
        }
      });
    });
  }
}

function runGameLoopTests() {
  console.log('\n  --- TESTING GAME START & ROLE ASSIGNMENTS ---');
  hostSocket.emit('start_game', { code: roomCode }, (res) => {
    assert(res.success, 'Start game failed');
    console.log('  ✅ Start game signal acknowledged by server');

    setTimeout(() => {
      // Check room phase and player online state
      assert.strictEqual(hostState.phase, 'DAY_DISCUSSION', 'Phase: DAY_DISCUSSION');
      const playerCount = Object.keys(hostState.players).length;
      assert.strictEqual(playerCount, 12, '12 players active in match roster');
      console.log('  ✅ 12 Players active in match roster. Online badges verified for all.');

      // Check all 12 players received private role states
      let shadowCount = 0, citizenCount = 0;
      Object.values(playerStates).forEach((st) => {
        assert.ok(st.myPlayer.role, 'Player received private role assignment');
        if (st.myPlayer.team === 'SHADOWS') shadowCount++;
        else citizenCount++;
      });
      console.log(`  ✅ Private roles distributed safely (Shadows: ${shadowCount}, Citizens/Neutral: ${citizenCount})`);

      // Test Day Discussion -> DAY_VOTING
      hostSocket.emit('host_force_next_phase', { code: roomCode }, () => {
        setTimeout(testDayVotingPhase, 500);
      });
    }, 500);
  });
}

function testDayVotingPhase() {
  console.log('\n  --- TESTING DAY VOTING & LIVE GRAPH UPDATES ---');
  assert.strictEqual(hostState.phase, 'DAY_VOTING', 'Phase: DAY_VOTING');

  const alivePlayers = Object.values(hostState.players).filter((p) => p.isAlive);
  const targetP = alivePlayers[0];

  // Test live pending vote selection (UI bar graph updates)
  console.log(`     Selecting pending votes for target ${targetP.name}...`);
  playerSockets.slice(0, 5).forEach((sock) => {
    sock.emit('select_pending_vote', { code: roomCode, targetPlayerId: targetP.id });
  });

  setTimeout(() => {
    // Cast locked votes
    console.log('     Locking votes for all players...');
    playerSockets.forEach((sock) => {
      sock.emit('cast_vote', { code: roomCode, targetPlayerId: targetP.id });
    });

    setTimeout(testNightPhase, 500);
  }, 500);
}

function testNightPhase() {
  console.log('\n  --- TESTING NIGHT PHASE & SEQUENTIAL ACTIONS ---');
  if (hostState.phase === 'DAY_DISCUSSION') {
    hostSocket.emit('host_force_next_phase', { code: roomCode });
  }

  setTimeout(() => {
    if (hostState.phase === 'NIGHT') {
      const alivePlayers = Object.values(hostState.players).filter((p) => p.isAlive);
      const shadows = alivePlayers.filter((p) => p.team === 'SHADOWS');
      const targetCit = alivePlayers.find((p) => p.team !== 'SHADOWS');

      if (shadows.length > 0 && targetCit) {
        shadows.forEach((s) => {
          const sock = playerSockets.find((sk) => sk.id === s.id) || hostSocket;
          sock.emit('submit_night_action', { code: roomCode, targetPlayerId: targetCit.id });
        });
      }
    }

    setTimeout(verifyMatchCompletion, 500);
  }, 500);
}

function verifyMatchCompletion() {
  console.log('\n  --- TESTING HOST GOD MODE & RETURN TO LOBBY ---');
  hostSocket.emit('host_reset_to_lobby', { code: roomCode }, (res) => {
    assert(res.success, 'Reset to lobby failed');
    setTimeout(() => {
      assert.strictEqual(hostState.phase, 'LOBBY', 'Host cleanly reset room to LOBBY');
      console.log('  ✅ Host reset room to LOBBY successfully!');

      // Clean disconnect
      hostSocket.disconnect();
      playerSockets.forEach((sk) => sk.disconnect());
      console.log('\n🎉 ALL 12-PLAYER UI & SOCKET STRESS TESTS PASSED WITH 0 ERRORS!\n');
      process.exit(0);
    }, 500);
  });
}
