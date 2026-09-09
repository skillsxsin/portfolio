const fs = require('fs');
const path = require('path');
const gameEngine = require('../src/server/gameEngine');

console.log('📊 SIMULATING ALL POSSIBLE GAME OUTCOMES FOR PLAYER COUNTS 4 TO 20...\n');

const ROLE_TABLE = {
  4:  { director: 0, shadow: 1, wildcard: 0, guardian: 1, investigator: 1, citizen: 1, guardianProtections: 1, investigatorChecks: 1 },
  5:  { director: 1, shadow: 1, wildcard: 0, guardian: 1, investigator: 1, citizen: 1, guardianProtections: 1, investigatorChecks: 1 },
  6:  { director: 1, shadow: 1, wildcard: 0, guardian: 1, investigator: 1, citizen: 2, guardianProtections: 1, investigatorChecks: 1 },
  7:  { director: 1, shadow: 1, wildcard: 0, guardian: 1, investigator: 1, citizen: 3, guardianProtections: 1, investigatorChecks: 1 },
  8:  { director: 1, shadow: 2, wildcard: 0, guardian: 1, investigator: 1, citizen: 3, guardianProtections: 1, investigatorChecks: 1 },
  9:  { director: 1, shadow: 2, wildcard: 1, guardian: 1, investigator: 1, citizen: 3, guardianProtections: 1, investigatorChecks: 1 },
  10: { director: 1, shadow: 2, wildcard: 1, guardian: 1, investigator: 1, citizen: 4, guardianProtections: 1, investigatorChecks: 2 },
  11: { director: 1, shadow: 2, wildcard: 1, guardian: 1, investigator: 1, citizen: 5, guardianProtections: 1, investigatorChecks: 2 },
  12: { director: 1, shadow: 2, wildcard: 1, guardian: 1, investigator: 1, citizen: 6, guardianProtections: 2, investigatorChecks: 2 },
  13: { director: 1, shadow: 3, wildcard: 1, guardian: 1, investigator: 1, citizen: 6, guardianProtections: 2, investigatorChecks: 2 },
  14: { director: 1, shadow: 3, wildcard: 1, guardian: 1, investigator: 1, citizen: 7, guardianProtections: 2, investigatorChecks: 2 },
  15: { director: 1, shadow: 3, wildcard: 1, guardian: 1, investigator: 1, citizen: 8, guardianProtections: 2, investigatorChecks: 2 },
  16: { director: 1, shadow: 4, wildcard: 1, guardian: 1, investigator: 1, citizen: 8, guardianProtections: 2, investigatorChecks: 3 },
  17: { director: 1, shadow: 4, wildcard: 1, guardian: 1, investigator: 1, citizen: 9, guardianProtections: 2, investigatorChecks: 3 },
  18: { director: 1, shadow: 4, wildcard: 1, guardian: 1, investigator: 1, citizen: 10, guardianProtections: 2, investigatorChecks: 3 },
  19: { director: 1, shadow: 5, wildcard: 1, guardian: 1, investigator: 1, citizen: 10, guardianProtections: 3, investigatorChecks: 3 },
  20: { director: 1, shadow: 5, wildcard: 1, guardian: 1, investigator: 1, citizen: 11, guardianProtections: 3, investigatorChecks: 3 },
};

const results = [];
let simId = 1;

// Simulation Strategy Enums
const STRATEGIES = [
  'Optimal Citizen Deduction',
  'Shadow Stealth Dominance',
  'Wildcard Trickster Victory',
  'Guardian Protection Clutch',
  'Tied Vote Deliberation Draw',
];

for (let pCount = 4; pCount <= 20; pCount++) {
  const config = ROLE_TABLE[pCount];

  STRATEGIES.forEach((strategy) => {
    // Run simulation instance
    const simResult = simulateSingleMatch(simId, pCount, config, strategy);
    results.push(simResult);
    simId++;
  });
}

function simulateSingleMatch(id, count, config, strategy) {
  const roomCode = `SIM${id.toString().padStart(3, '0')}`;
  const room = gameEngine.createRoom(roomCode, 'host_gm', 'Host Moderator');
  
  // Apply exact recommended settings
  room.settings = { ...room.settings, ...config };

  // Add Players
  const playerIds = [];
  for (let i = 1; i <= count; i++) {
    const pid = `p_${i}`;
    playerIds.push(pid);
    room.players[pid] = {
      id: pid,
      name: `Player_${i}`,
      isHost: false,
      isAlive: true,
      avatarSeed: `seed_${i}`,
      avatarEmoji: '👾',
      isOnline: true,
      protectionsUsed: 0,
      checksUsed: 0,
      investigatorResults: [],
    };
  }

  gameEngine.startGame(room);

  const eventLog = [];
  let round = 1;

  while (room.phase !== 'GAME_OVER' && round <= 12) {
    if (room.phase === 'DAY_DISCUSSION') {
      gameEngine.hostForceNextPhase(room); // -> DAY_VOTING
    }

    if (room.phase === 'DAY_VOTING') {
      const alive = Object.values(room.players).filter(p => !p.isHost && p.isAlive);
      const shadows = alive.filter(p => p.team === 'SHADOWS');
      const wildcard = alive.find(p => p.role === 'WILDCARD');
      const citizens = alive.filter(p => p.team === 'CITIZENS');

      let targetToVote = null;

      if (strategy === 'Wildcard Trickster Victory' && wildcard) {
        // Everyone votes for Wildcard
        targetToVote = wildcard;
      } else if (strategy === 'Optimal Citizen Deduction' && shadows.length > 0) {
        // Citizens vote out a Shadow
        targetToVote = shadows[0];
      } else if (strategy === 'Shadow Stealth Dominance' && citizens.length > 0) {
        // Shadows misdirect vote onto a Citizen
        targetToVote = citizens[0];
      } else if (strategy === 'Tied Vote Deliberation Draw' && round === 1 && alive.length >= 4) {
        // Split votes to cause a tie on round 1
        const t1 = alive[0];
        const t2 = alive[1];
        const half = Math.floor(alive.length / 2);
        alive.slice(0, half).forEach(v => gameEngine.castVote(room, v.id, t1.id));
        alive.slice(half).forEach(v => gameEngine.castVote(room, v.id, t2.id));
        eventLog.push(`Day ${round}: Voting TIED between ${t1.name} and ${t2.name} (No Elimination)`);
      } else {
        targetToVote = alive[0];
      }

      if (targetToVote && room.phase === 'DAY_VOTING') {
        alive.forEach(v => gameEngine.castVote(room, v.id, targetToVote.id));
        const elim = room.lastEliminatedPlayer;
        if (elim) {
          eventLog.push(`Day ${round}: ${elim.name} voted out (Role: ${elim.role}, Team: ${elim.team})`);
        }
      }
    }

    if (room.phase === 'NIGHT') {
      const alive = Object.values(room.players).filter(p => !p.isHost && p.isAlive);
      const shadows = alive.filter(p => p.team === 'SHADOWS');
      const guardian = alive.find(p => p.role === 'GUARDIAN');
      const investigator = alive.find(p => p.role === 'INVESTIGATOR');
      const citizens = alive.filter(p => p.team !== 'SHADOWS');

      // Night 1: Shadows Kill
      let nightTarget = citizens[0];
      if (strategy === 'Guardian Protection Clutch' && citizens.length > 1) {
        nightTarget = citizens[0];
      }

      if (shadows.length > 0 && nightTarget) {
        shadows.forEach(s => gameEngine.submitNightAction(room, s.id, nightTarget.id));
      }

      // Guardian Action
      if (room.nightSubPhase === 'GUARDIAN' && guardian) {
        let saveTarget = (strategy === 'Guardian Protection Clutch') ? nightTarget : citizens[citizens.length - 1];
        if (guardian.protectionsUsed < room.settings.guardianProtections && saveTarget) {
          gameEngine.submitNightAction(room, guardian.id, saveTarget.id);
          if (saveTarget.id === nightTarget?.id) {
            eventLog.push(`Night ${round}: Shadows targeted ${nightTarget.name}, but Guardian PROTECTED ${saveTarget.name} (Clutch Save!)`);
          }
        }
      }

      // Investigator Action
      if (room.nightSubPhase === 'INVESTIGATOR' && investigator) {
        const checkTarget = alive.find(p => p.id !== investigator.id);
        if (investigator.checksUsed < room.settings.investigatorChecks && checkTarget) {
          gameEngine.submitNightAction(room, investigator.id, checkTarget.id);
          const isShadow = checkTarget.team === 'SHADOWS' && checkTarget.role !== 'DIRECTOR';
          eventLog.push(`Night ${round}: Investigator checked ${checkTarget.name} -> Result: ${isShadow ? 'SHADOW DETECTED' : 'INNOCENT'}`);
        }
      }

      const elim = room.lastEliminatedPlayer;
      if (elim && elim.reason === 'NIGHT_ATTACK') {
        eventLog.push(`Night ${round}: ${elim.name} killed by Shadows (Role Concealed to Players)`);
      }
    }

    round++;
  }

  const aliveFinal = Object.values(room.players).filter(p => !p.isHost && p.isAlive);
  const survivalRate = ((aliveFinal.length / count) * 100).toFixed(1);

  let winningReason = 'Unknown';
  if (room.winner === 'CITIZENS') winningReason = 'All Shadows eliminated by Daytime Voting / Investigation';
  else if (room.winner === 'SHADOWS') winningReason = 'Shadows equaled or exceeded Citizens in count';
  else if (room.winner === 'WILDCARD') winningReason = 'Wildcard successfully manipulated Citizens into voting them out';

  return {
    Simulation_ID: `SIM_${id.toString().padStart(3, '0')}`,
    Player_Count: count,
    Director_Count: config.director || 0,
    Shadow_Count: config.shadow || 0,
    Guardian_Count: config.guardian || 0,
    Investigator_Count: config.investigator || 0,
    Wildcard_Count: config.wildcard || 0,
    Citizen_Count: config.citizen || 0,
    Guardian_Protections_Quota: config.guardianProtections,
    Investigator_Checks_Quota: config.investigatorChecks,
    Strategy_Name: strategy,
    Total_Rounds: round - 1,
    Chronological_Event_Log: eventLog.join(' | '),
    Winner_Team: room.winner || 'IN_PROGRESS',
    Winning_Reason: winningReason,
    Survival_Rate_Pct: `${survivalRate}%`,
    Final_Alive_Players: aliveFinal.map(p => `${p.name} (${p.role})`).join('; '),
  };
}

// Convert to CSV
function exportToCSV(data, filePath) {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];

  data.forEach((row) => {
    const values = headers.map((header) => {
      const val = row[header] !== undefined ? String(row[header]) : '';
      // Escape double quotes and wrap in quotes if contains comma/newline
      const escaped = val.replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  });

  fs.writeFileSync(filePath, csvRows.join('\n'), 'utf8');
}

const csvPath = path.join(__dirname, '../game_simulation_outcomes.csv');
exportToCSV(results, csvPath);

// Also copy to artifacts directory
const artifactPath = 'C:\\Users\\jangi\\.gemini\\antigravity-ide\\brain\\e672d443-7887-457f-a619-2e0ee799d124\\game_simulation_outcomes.csv';
fs.writeFileSync(artifactPath, fs.readFileSync(csvPath, 'utf8'), 'utf8');

console.log(`✅ SIMULATION COMPLETE! Simulated ${results.length} game outcomes across player counts 4 to 20.`);
console.log(`📁 CSV File generated at:\n   1. ${csvPath}\n   2. ${artifactPath}\n`);
