const fs = require('fs');
const path = require('path');
const gameEngine = require('../src/server/gameEngine');

console.log('🔄 GENERATING EXHAUSTIVE BRANCHING PERMUTATION SIMULATIONS (ALL OUTCOMES)...\n');

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

const allPermutations = [];
let globalSimCount = 1;

for (let pCount = 4; pCount <= 20; pCount++) {
  const config = ROLE_TABLE[pCount];

  // For each player count, simulate every player (P1..PN) being voted out 1st
  for (let firstVotedIdx = 0; firstVotedIdx < pCount; firstVotedIdx++) {
    // Also simulate Guardian Save vs No Save variations
    [true, false].forEach((guardianSaves) => {
      // Also simulate Investigator finding Shadow vs Innocent
      [true, false].forEach((investigatorFindsShadow) => {
        const sim = simulatePermutationPath(globalSimCount, pCount, config, firstVotedIdx, guardianSaves, investigatorFindsShadow);
        allPermutations.push(sim);
        globalSimCount++;
      });
    });
  }
}

function simulatePermutationPath(id, count, config, firstVotedIndex, guardianSaves, investigatorFindsShadow) {
  const roomCode = `PERM${id.toString().padStart(4, '0')}`;
  const room = gameEngine.createRoom(roomCode, 'host_gm', 'Host Moderator');
  room.settings = { ...room.settings, ...config };

  // Add Players Deterministically
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

  // Deterministic Role Deck Generation
  const roles = [];
  for (let i = 0; i < (config.director || 0); i++) roles.push('DIRECTOR');
  for (let i = 0; i < (config.shadow || 0); i++) roles.push('SHADOW');
  for (let i = 0; i < (config.wildcard || 0); i++) roles.push('WILDCARD');
  for (let i = 0; i < (config.guardian || 0); i++) roles.push('GUARDIAN');
  for (let i = 0; i < (config.investigator || 0); i++) roles.push('INVESTIGATOR');
  while (roles.length < count) roles.push('CITIZEN');

  // Assign roles deterministically
  playerIds.forEach((pid, idx) => {
    const r = roles[idx];
    const team = (r === 'DIRECTOR' || r === 'SHADOW') ? 'SHADOWS' : (r === 'WILDCARD' ? 'WILDCARD' : 'CITIZENS');
    room.players[pid].role = r;
    room.players[pid].team = team;
  });

  room.phase = 'DAY_DISCUSSION';
  const eventLog = [];
  let round = 1;

  const firstVotedPlayer = room.players[playerIds[firstVotedIndex]];

  while (room.phase !== 'GAME_OVER' && round <= 15) {
    // DAY VOTING PHASE
    if (room.phase === 'DAY_DISCUSSION') {
      gameEngine.hostForceNextPhase(room); // -> DAY_VOTING
    }

    if (room.phase === 'DAY_VOTING') {
      const alive = Object.values(room.players).filter(p => !p.isHost && p.isAlive);
      let targetToVote = null;

      if (round === 1) {
        targetToVote = firstVotedPlayer.isAlive ? firstVotedPlayer : alive[0];
      } else {
        // Subsequent rounds: vote out next alive enemy
        const shadows = alive.filter(p => p.team === 'SHADOWS');
        const citizens = alive.filter(p => p.team === 'CITIZENS');
        const wildcard = alive.find(p => p.role === 'WILDCARD');

        if (wildcard && Math.random() < 0.25) {
          targetToVote = wildcard; // Wildcard trickster win chance
        } else if (shadows.length > 0) {
          targetToVote = shadows[0];
        } else {
          targetToVote = citizens[0];
        }
      }

      if (targetToVote && targetToVote.isAlive) {
        alive.forEach(v => gameEngine.castVote(room, v.id, targetToVote.id));
        const elim = room.lastEliminatedPlayer;
        if (elim) {
          eventLog.push(`Day ${round}: ${elim.name} voted out (Role: ${elim.role}, Team: ${elim.team})`);
          if (elim.role === 'WILDCARD') {
            eventLog.push(`🏆 WILDCARD WIN: ${elim.name} tricked players into voting them out!`);
          }
        }
      }
    }

    // NIGHT PHASE
    if (room.phase === 'NIGHT') {
      const alive = Object.values(room.players).filter(p => !p.isHost && p.isAlive);
      const shadows = alive.filter(p => p.team === 'SHADOWS');
      const guardian = alive.find(p => p.role === 'GUARDIAN');
      const investigator = alive.find(p => p.role === 'INVESTIGATOR');
      const nonShadows = alive.filter(p => p.team !== 'SHADOWS');

      let nightTarget = nonShadows[0];

      if (room.nightSubPhase === 'SHADOWS' && shadows.length > 0 && nightTarget) {
        for (const s of shadows) {
          if (room.nightSubPhase === 'SHADOWS') {
            gameEngine.submitNightAction(room, s.id, nightTarget.id);
          }
        }
      }

      // Guardian Action
      if (room.nightSubPhase === 'GUARDIAN' && guardian && guardian.isAlive) {
        const protectTarget = guardianSaves ? nightTarget : nonShadows[nonShadows.length - 1];
        if (guardian.protectionsUsed < room.settings.guardianProtections && protectTarget) {
          gameEngine.submitNightAction(room, guardian.id, protectTarget.id);
          if (protectTarget.id === nightTarget?.id) {
            eventLog.push(`Night ${round}: Shadows targeted ${nightTarget.name}, but Guardian PROTECTED ${protectTarget.name} (Clutch Save!)`);
          }
        }
      }

      // Investigator Action
      if (room.nightSubPhase === 'INVESTIGATOR' && investigator && investigator.isAlive) {
        const targetToCheck = investigatorFindsShadow ? alive.find(p => p.team === 'SHADOWS' && p.role !== 'DIRECTOR') : alive.find(p => p.team === 'CITIZENS' && p.id !== investigator.id);
        if (investigator.checksUsed < room.settings.investigatorChecks && targetToCheck) {
          gameEngine.submitNightAction(room, investigator.id, targetToCheck.id);
          const isShadow = targetToCheck.team === 'SHADOWS' && targetToCheck.role !== 'DIRECTOR';
          eventLog.push(`Night ${round}: Investigator checked ${targetToCheck.name} -> Result: ${isShadow ? 'SHADOW DETECTED' : 'INNOCENT'}`);
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
    Simulation_ID: `PERM_${id.toString().padStart(4, '0')}`,
    Player_Count: count,
    First_Voted_Out_Player: `${firstVotedPlayer.name} (${firstVotedPlayer.role})`,
    First_Voted_Out_Role: firstVotedPlayer.role,
    Guardian_Clutch_Save_Executed: guardianSaves ? 'YES' : 'NO',
    Investigator_Discovered_Shadow: investigatorFindsShadow ? 'YES' : 'NO',
    Director_Count: config.director || 0,
    Shadow_Count: config.shadow || 0,
    Guardian_Count: config.guardian || 0,
    Investigator_Count: config.investigator || 0,
    Wildcard_Count: config.wildcard || 0,
    Citizen_Count: config.citizen || 0,
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
      const escaped = val.replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  });

  fs.writeFileSync(filePath, csvRows.join('\n'), 'utf8');
}

const csvPath = path.join(__dirname, '../game_all_permutations_simulation.csv');
exportToCSV(allPermutations, csvPath);

const artifactPath = 'C:\\Users\\jangi\\.gemini\\antigravity-ide\\brain\\e672d443-7887-457f-a619-2e0ee799d124\\game_all_permutations_simulation.csv';
fs.writeFileSync(artifactPath, fs.readFileSync(csvPath, 'utf8'), 'utf8');

console.log(`✅ EXHAUSTIVE PERMUTATION SIMULATION COMPLETE! Generated ${allPermutations.length} total game outcome permutations.`);
console.log(`📁 CSV File generated at:\n   1. ${csvPath}\n   2. ${artifactPath}\n`);
