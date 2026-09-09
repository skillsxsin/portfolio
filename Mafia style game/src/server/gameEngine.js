// ── Role Distribution Table (Mathematically Balanced 50/50 Win Rate) ───────────
// Players | Godfather | Mafia | Wildcard (hidden/0) | Doctor | Police | Villagers | Doctor Heals | Police Checks
const ROLE_TABLE = {
  4:  { godfather: 0, mafia: 1, wildcard: 0, doctor: 1, police: 1, villager: 1, doctorHeals: 1, policeChecks: 1, guardianProtections: 1, investigatorChecks: 1 },
  5:  { godfather: 1, mafia: 1, wildcard: 0, doctor: 1, police: 1, villager: 1, doctorHeals: 1, policeChecks: 1, guardianProtections: 1, investigatorChecks: 1 },
  6:  { godfather: 1, mafia: 1, wildcard: 0, doctor: 1, police: 1, villager: 2, doctorHeals: 1, policeChecks: 1, guardianProtections: 1, investigatorChecks: 1 },
  7:  { godfather: 1, mafia: 1, wildcard: 0, doctor: 1, police: 1, villager: 3, doctorHeals: 1, policeChecks: 1, guardianProtections: 1, investigatorChecks: 1 },
  8:  { godfather: 1, mafia: 2, wildcard: 0, doctor: 1, police: 1, villager: 3, doctorHeals: 1, policeChecks: 1, guardianProtections: 1, investigatorChecks: 1 },
  9:  { godfather: 1, mafia: 2, wildcard: 0, doctor: 1, police: 1, villager: 4, doctorHeals: 1, policeChecks: 1, guardianProtections: 1, investigatorChecks: 1 },
  10: { godfather: 1, mafia: 2, wildcard: 0, doctor: 1, police: 1, villager: 5, doctorHeals: 1, policeChecks: 2, guardianProtections: 1, investigatorChecks: 2 },
  11: { godfather: 1, mafia: 2, wildcard: 0, doctor: 1, police: 1, villager: 6, doctorHeals: 1, policeChecks: 2, guardianProtections: 1, investigatorChecks: 2 },
  12: { godfather: 1, mafia: 2, wildcard: 0, doctor: 1, police: 1, villager: 7, doctorHeals: 2, policeChecks: 2, guardianProtections: 2, investigatorChecks: 2 },
  13: { godfather: 1, mafia: 3, wildcard: 0, doctor: 1, police: 1, villager: 7, doctorHeals: 2, policeChecks: 2, guardianProtections: 2, investigatorChecks: 2 },
  14: { godfather: 1, mafia: 3, wildcard: 0, doctor: 1, police: 1, villager: 8, doctorHeals: 2, policeChecks: 2, guardianProtections: 2, investigatorChecks: 2 },
  15: { godfather: 1, mafia: 3, wildcard: 0, doctor: 1, police: 1, villager: 9, doctorHeals: 2, policeChecks: 2, guardianProtections: 2, investigatorChecks: 2 },
  16: { godfather: 1, mafia: 4, wildcard: 0, doctor: 1, police: 1, villager: 9, doctorHeals: 2, policeChecks: 3, guardianProtections: 2, investigatorChecks: 3 },
  17: { godfather: 1, mafia: 4, wildcard: 0, doctor: 1, police: 1, villager: 10, doctorHeals: 2, policeChecks: 3, guardianProtections: 2, investigatorChecks: 3 },
  18: { godfather: 1, mafia: 4, wildcard: 0, doctor: 1, police: 1, villager: 11, doctorHeals: 2, policeChecks: 3, guardianProtections: 2, investigatorChecks: 3 },
  19: { godfather: 1, mafia: 5, wildcard: 0, doctor: 1, police: 1, villager: 11, doctorHeals: 3, policeChecks: 3, guardianProtections: 3, investigatorChecks: 3 },
  20: { godfather: 1, mafia: 5, wildcard: 0, doctor: 1, police: 1, villager: 12, doctorHeals: 3, policeChecks: 3, guardianProtections: 3, investigatorChecks: 3 },
};

function getRoleRecommendation(playerCount) {
  const clamped = Math.min(20, Math.max(4, playerCount));
  const base = ROLE_TABLE[clamped] || ROLE_TABLE[4];
  return {
    ...base,
    // Provide backwards compatible aliases
    director: base.godfather,
    shadow: base.mafia,
    guardian: base.doctor,
    investigator: base.police,
    citizen: base.villager,
    guardianProtections: base.doctorHeals,
    investigatorChecks: base.policeChecks,
  };
}

function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function generateRoleDeck(playerCount, manualDistribution) {
  let dist;
  if (manualDistribution && typeof manualDistribution === 'object' && ('godfather' in manualDistribution || 'mafia' in manualDistribution || 'director' in manualDistribution || 'shadow' in manualDistribution)) {
    dist = manualDistribution;
  } else {
    dist = getRoleRecommendation(playerCount);
  }

  const roles = [];
  const godfatherCount = dist.godfather !== undefined ? dist.godfather : (dist.director || 0);
  const mafiaCount = dist.mafia !== undefined ? dist.mafia : (dist.shadow || 0);
  const doctorCount = dist.doctor !== undefined ? dist.doctor : (dist.guardian || 0);
  const policeCount = dist.police !== undefined ? dist.police : (dist.investigator || 0);

  for (let i = 0; i < godfatherCount; i++) roles.push('GODFATHER');
  for (let i = 0; i < mafiaCount; i++) roles.push('MAFIA');
  // Wildcard logic hidden / commented out:
  // for (let i = 0; i < (dist.wildcard || 0); i++) roles.push('WILDCARD');
  for (let i = 0; i < doctorCount; i++) roles.push('DOCTOR');
  for (let i = 0; i < policeCount; i++) roles.push('POLICE');
  while (roles.length < playerCount) roles.push('VILLAGER');

  return shuffleArray(roles).slice(0, playerCount);
}

function createRoom(code, hostId, hostName, settings = {}) {
  const defaultSettings = {
    maxPlayers: 20,
    discussionTimerSec: 0,
    votingTimerSec: 0,
    nightTimerSec: 0,
    doctorHeals: 1,
    policeChecks: 1,
    guardianProtections: 1,
    investigatorChecks: 1,
    manualRoles: {},
  };

  return {
    code,
    phase: 'LOBBY',
    nightSubPhase: null,
    phaseTimeRemaining: 0,
    isTimerPaused: false,
    dayNumber: 0,
    players: {
      [hostId]: {
        id: hostId,
        name: hostName,
        isHost: true,
        isAlive: false,
        avatarSeed: hostName + '_host',
      },
    },
    settings: { ...defaultSettings, ...settings },
    logs: [{
      id: Date.now() + '_init',
      timestamp: _ts(),
      type: 'system',
      message: `Room ${code} created by Game Master "${hostName}".`,
    }],
    mafiaLogs: [{
      id: Date.now() + '_mafia_init',
      timestamp: _ts(),
      type: 'system',
      author: 'System',
      message: '🕶️ Private Mafia channel. Coordinate here — only your team & GM can read this.',
    }],
    nightActions: {
      mafiaVotes: {},
      godfatherTarget: null,
      doctorTarget: null,
      policeTarget: null,
    },
  };
}

function _ts() { return new Date().toLocaleTimeString(); }

function startGame(room) {
  const activePlayers = Object.values(room.players).filter((p) => !p.isHost);
  const playerIds = activePlayers.map((p) => p.id);

  if (playerIds.length < 4) throw new Error('Need at least 4 players to start.');

  const rec = getRoleRecommendation(playerIds.length);
  // Auto-populate heal/check limits from recommendation unless host overrode them
  room.settings.doctorHeals = room.settings.doctorHeals ?? (room.settings.guardianProtections ?? rec.doctorHeals);
  room.settings.policeChecks = room.settings.policeChecks ?? (room.settings.investigatorChecks ?? rec.policeChecks);
  room.settings.guardianProtections = room.settings.doctorHeals;
  room.settings.investigatorChecks = room.settings.policeChecks;

  const manualRolesMap = room.settings.manualRoles || {};
  const roleDeck = generateRoleDeck(playerIds.length, null);
  const shuffled = shuffleArray(playerIds);

  shuffled.forEach((id, idx) => {
    let role = manualRolesMap[id] || roleDeck[idx];
    // Map any legacy role strings if passed
    if (role === 'DIRECTOR') role = 'GODFATHER';
    if (role === 'SHADOW') role = 'MAFIA';
    if (role === 'GUARDIAN') role = 'DOCTOR';
    if (role === 'INVESTIGATOR') role = 'POLICE';
    if (role === 'CITIZEN') role = 'VILLAGER';

    let team = 'VILLAGERS';
    if (role === 'GODFATHER' || role === 'MAFIA') team = 'MAFIA';
    /* else if (role === 'WILDCARD') team = 'WILDCARD'; */

    room.players[id] = {
      ...room.players[id],
      isAlive: true,
      role,
      team,
      hasVoted: false,
      votedForId: null,
      nightActionCompleted: false,
      nightTargetId: null,
      protectionsUsed: 0,
      checksUsed: 0,
      doctorHealsUsed: 0,
      policeChecksUsed: 0,
      policeResults: [],
      investigatorResults: [],
    };
  });

  // Host stays as spectator
  const hostId = Object.keys(room.players).find((id) => room.players[id].isHost);
  if (hostId) {
    room.players[hostId].isAlive = false;
    room.players[hostId].role = undefined;
    room.players[hostId].team = undefined;
  }

  room.dayNumber = 1;
  room.phase = 'DAY_DISCUSSION';
  room.nightSubPhase = null;
  room.phaseTimeRemaining = room.settings.discussionTimerSec || 0;
  room.isTimerPaused = true;
  room.nightActions = {
    mafiaVotes: {},
    godfatherTarget: null,
    doctorTarget: null,
    policeTarget: null,
  };

  room.logs.push({
    id: Date.now() + '_start',
    timestamp: _ts(),
    type: 'system',
    message: `🎮 Hidden Agenda started with ${playerIds.length} players! Day ${room.dayNumber} Discussion begins (${room.settings.discussionTimerSec}s).`,
  });

  return room;
}

function castVote(room, voterId, targetPlayerId) {
  if (room.phase !== 'DAY_VOTING') throw new Error('Not in voting phase.');
  const voter = room.players[voterId];
  if (!voter || !voter.isAlive || voter.isHost) throw new Error('Invalid voter.');

  voter.hasVoted = true;
  voter.votedForId = targetPlayerId;

  room.logs.push({
    id: Date.now() + '_vote_' + voterId,
    timestamp: _ts(),
    type: 'system',
    message: `${voter.name} cast their vote.`,
  });

  const alivePlaying = Object.values(room.players).filter((p) => p.isAlive && !p.isHost);
  if (alivePlaying.every((p) => p.hasVoted)) resolveDayVoting(room);
  return room;
}

function resolveDayVoting(room) {
  const alivePlaying = Object.values(room.players).filter((p) => p.isAlive && !p.isHost);
  const counts = {};
  alivePlaying.forEach((p) => { if (p.votedForId) counts[p.votedForId] = (counts[p.votedForId] || 0) + 1; });

  let maxV = 0, lynchId = null, isTie = false;
  Object.entries(counts).forEach(([id, v]) => {
    if (v > maxV) { maxV = v; lynchId = id; isTie = false; }
    else if (v === maxV) { isTie = true; }
  });

  if (isTie || !lynchId || maxV === 0) {
    const outcomeType = maxV === 0 ? 'ABSTAIN' : 'TIE';
    const outcomeMsg = maxV === 0 ? 'All players abstained — nobody was eliminated today.' : 'Daytime vote tied — nobody was eliminated today.';
    room.lastVoteOutcome = {
      type: outcomeType,
      message: outcomeMsg,
      timestamp: _ts(),
    };
    room.logs.push({ id: Date.now() + '_tie', timestamp: _ts(), type: 'elimination', message: `⚖️ ${outcomeMsg}` });
    _startNight(room);
    return;
  }

  const elim = room.players[lynchId];
  elim.isAlive = false;
  room.lastVoteOutcome = {
    type: 'ELIMINATED',
    message: `${elim.name} was eliminated by daytime vote.`,
    timestamp: _ts(),
  };
  room.lastEliminatedPlayer = {
    id: elim.id,
    name: elim.name,
    role: elim.role,
    team: elim.team,
    reason: 'VOTED_OUT',
    timestamp: _ts(),
  };

  /* Wildcard logic commented out
  if (elim.role === 'WILDCARD') {
    room.winner = 'WILDCARD';
    room.phase = 'GAME_OVER';
    room.logs.push({
      id: Date.now() + '_win_wildcard',
      timestamp: _ts(),
      type: 'elimination',
      message: `WILDCARD VICTORY! ${elim.name} was voted out by the daytime vote and immediately won the game!`,
    });
    return;
  }
  */

  room.logs.push({
    id: Date.now() + '_lynch_' + elim.id,
    timestamp: _ts(),
    type: 'elimination',
    message: `${elim.name} was eliminated by daytime vote.`,
  });

  if (!_checkWin(room)) {
    _startNight(room);
  }
}

// ── SEQUENTIAL NIGHT FLOW ────────────────────────────────────────────────────
function _startNight(room) {
  if (_checkWin(room)) return;

  room.phase = 'NIGHT';
  room.nightSubPhase = 'MAFIA';
  room.phaseTimeRemaining = 0; // Untimed by default
  Object.values(room.players).forEach((p) => { p.nightActionCompleted = false; p.nightTargetId = null; });
  room.nightActions = {
    mafiaVotes: {},
    godfatherTarget: null,
    doctorTarget: null,
    policeTarget: null,
  };

  room.logs.push({
    id: Date.now() + '_night_mafia',
    timestamp: _ts(),
    type: 'night',
    message: 'Night begins. Step 1: The Godfather & Mafia choose a target to eliminate.',
  });
}

function submitNightAction(room, actorId, targetId) {
  if (room.phase !== 'NIGHT') throw new Error('Not in night phase.');
  const actor = room.players[actorId];
  if (!actor || !actor.isAlive || actor.isHost) throw new Error('Invalid actor.');

  if (room.nightSubPhase === 'MAFIA' || room.nightSubPhase === 'SHADOWS') {
    if (actor.role !== 'GODFATHER' && actor.role !== 'MAFIA' && actor.role !== 'DIRECTOR' && actor.role !== 'SHADOW') {
      throw new Error('Only Mafia members and the Godfather act now.');
    }
    actor.nightActionCompleted = true;
    actor.nightTargetId = targetId;
    if (actor.role === 'GODFATHER' || actor.role === 'DIRECTOR') {
      room.nightActions.godfatherTarget = targetId;
    } else {
      room.nightActions.mafiaVotes[targetId] = (room.nightActions.mafiaVotes[targetId] || 0) + 1;
    }

    const aliveMafia = Object.values(room.players).filter(
      (p) => p.isAlive && !p.isHost && (p.role === 'GODFATHER' || p.role === 'MAFIA' || p.role === 'DIRECTOR' || p.role === 'SHADOW')
    );
    if (aliveMafia.every((p) => p.nightActionCompleted)) _advanceNight(room);

  } else if (room.nightSubPhase === 'DOCTOR' || room.nightSubPhase === 'GUARDIAN') {
    if (actor.role !== 'DOCTOR' && actor.role !== 'GUARDIAN') throw new Error('Only the Doctor acts now.');
    const maxHeals = room.settings.doctorHeals ?? (room.settings.guardianProtections ?? 1);
    const used = actor.doctorHealsUsed ?? (actor.protectionsUsed ?? 0);
    if (used >= maxHeals) throw new Error(`Doctor protection limit reached (max ${maxHeals}).`);
    
    actor.doctorHealsUsed = used + 1;
    actor.protectionsUsed = actor.doctorHealsUsed;
    actor.nightActionCompleted = true;
    actor.nightTargetId = targetId;
    room.nightActions.doctorTarget = targetId;
    _advanceNight(room);

  } else if (room.nightSubPhase === 'POLICE' || room.nightSubPhase === 'INVESTIGATOR') {
    if (actor.role !== 'POLICE' && actor.role !== 'INVESTIGATOR') throw new Error('Only the Police acts now.');
    const maxChecks = room.settings.policeChecks ?? (room.settings.investigatorChecks ?? 1);
    const used = actor.policeChecksUsed ?? (actor.checksUsed ?? 0);
    if (used >= maxChecks) throw new Error(`Police inspection quota reached (max ${maxChecks}).`);
    
    actor.policeChecksUsed = used + 1;
    actor.checksUsed = actor.policeChecksUsed;
    actor.nightActionCompleted = true;
    actor.nightTargetId = targetId;
    room.nightActions.policeTarget = targetId;
    _advanceNight(room);
  }
  return room;
}

function _advanceNight(room) {
  if (room.nightSubPhase === 'MAFIA' || room.nightSubPhase === 'SHADOWS') {
    const aliveDoctor = Object.values(room.players).find((p) => p.isAlive && !p.isHost && (p.role === 'DOCTOR' || p.role === 'GUARDIAN'));
    const maxHeals = room.settings.doctorHeals ?? (room.settings.guardianProtections ?? 1);
    const used = aliveDoctor ? (aliveDoctor.doctorHealsUsed ?? aliveDoctor.protectionsUsed ?? 0) : 0;
    const healsLeft = aliveDoctor ? (maxHeals - used) : 0;

    if (aliveDoctor && healsLeft > 0) {
      room.nightSubPhase = 'DOCTOR';
      room.phaseTimeRemaining = 0; // Untimed by default
      room.logs.push({
        id: Date.now() + '_night_doctor',
        timestamp: _ts(),
        type: 'night',
        message: `Night Step 2: Doctor chooses a player to heal (${healsLeft} heal(s) remaining).`,
      });
    } else {
      room.nightSubPhase = 'DOCTOR';
      _advanceNight(room);
    }
  } else if (room.nightSubPhase === 'DOCTOR' || room.nightSubPhase === 'GUARDIAN') {
    const alivePolice = Object.values(room.players).find((p) => p.isAlive && !p.isHost && (p.role === 'POLICE' || p.role === 'INVESTIGATOR'));
    const maxChecks = room.settings.policeChecks ?? (room.settings.investigatorChecks ?? 1);
    const used = alivePolice ? (alivePolice.policeChecksUsed ?? alivePolice.checksUsed ?? 0) : 0;
    const checksLeft = alivePolice ? (maxChecks - used) : 0;

    if (alivePolice && checksLeft > 0) {
      room.nightSubPhase = 'POLICE';
      room.phaseTimeRemaining = 0; // Untimed by default
      room.logs.push({
        id: Date.now() + '_night_police',
        timestamp: _ts(),
        type: 'night',
        message: `Night Step 3: Police inspects a suspect (${checksLeft} inspection(s) remaining).`,
      });
    } else {
      _resolveNight(room);
    }
  } else if (room.nightSubPhase === 'POLICE' || room.nightSubPhase === 'INVESTIGATOR') {
    _resolveNight(room);
  }
}

function _resolveNight(room) {
  const { godfatherTarget, directorTarget, mafiaVotes, shadowVotes, doctorTarget, guardianTarget, policeTarget, investigatorTarget } = room.nightActions;

  // Determine mafia kill target
  // Rule: Godfather choice overrides general mafia votes if Godfather acted
  let killId = godfatherTarget || directorTarget;
  const votes = mafiaVotes || shadowVotes || {};
  if (!killId && Object.keys(votes).length > 0) {
    let maxV = 0;
    let topTargets = [];
    Object.entries(votes).forEach(([id, v]) => {
      if (v > maxV) {
        maxV = v;
        topTargets = [id];
      } else if (v === maxV) {
        topTargets.push(id);
      }
    });
    // Tie-breaking: If multiple Mafia members voted differently and tied, pick randomly from topTargets
    if (topTargets.length > 0) {
      killId = topTargets[Math.floor(Math.random() * topTargets.length)];
    }
  }

  const effectiveDoctorTarget = doctorTarget || guardianTarget;
  if (killId) {
    if (killId === effectiveDoctorTarget) {
      room.logs.push({
        id: Date.now() + '_saved',
        timestamp: _ts(),
        type: 'night',
        message: 'Dawn breaks... The Doctor healed the target from the Mafia\'s attack!',
      });
    } else {
      const victim = room.players[killId];
      if (victim && victim.isAlive && !victim.isHost) {
        victim.isAlive = false;
        room.lastEliminatedPlayer = {
          id: victim.id,
          name: victim.name,
          role: victim.role,
          team: victim.team,
          reason: 'NIGHT_ATTACK',
          timestamp: _ts(),
        };
        room.logs.push({
          id: Date.now() + '_kill',
          timestamp: _ts(),
          type: 'elimination',
          message: `Dawn breaks... ${victim.name} was killed in the night!`,
        });
      }
    }
  } else {
    room.logs.push({ id: Date.now() + '_quiet', timestamp: _ts(), type: 'night', message: 'A quiet night. No one was harmed.' });
  }

  // Police result — private feedback to Police only
  // Logic: Godfather is immune to police scan (scans as "No" / Innocent). Only MAFIA scans as "Yes" (is Mafia).
  const effectivePoliceTarget = policeTarget || investigatorTarget;
  if (effectivePoliceTarget) {
    const target = room.players[effectivePoliceTarget];
    const policePlayer = Object.values(room.players).find((p) => (p.role === 'POLICE' || p.role === 'INVESTIGATOR') && !p.isHost);
    if (target && policePlayer) {
      const isMafia = target.role === 'MAFIA' || target.role === 'SHADOW'; // Godfather scans as innocent "No" (immune)
      const resultMsg = isMafia ? '🚨 YES (Is Mafia!)' : '✅ NO (Appears Innocent)';

      room.logs.push({
        id: Date.now() + '_police_result',
        timestamp: _ts(),
        type: 'night',
        author: policePlayer.id,
        privateToPlayerId: policePlayer.id,
        message: `🔎 [POLICE INSPECTION REPORT] Checking ${target.name} — Result: ${resultMsg}`,
      });

      if (!policePlayer.policeResults) policePlayer.policeResults = [];
      policePlayer.policeResults.push({ targetName: target.name, isMafia, round: room.dayNumber });
      
      if (!policePlayer.investigatorResults) policePlayer.investigatorResults = [];
      policePlayer.investigatorResults.push({ targetName: target.name, isShadow: isMafia, round: room.dayNumber });
    }
  }

  room.nightSubPhase = null;
  Object.values(room.players).forEach((p) => { p.nightActionCompleted = false; p.nightTargetId = null; });
  room.nightActions = {
    mafiaVotes: {},
    godfatherTarget: null,
    doctorTarget: null,
    policeTarget: null,
  };

  if (!_checkWin(room)) _startDay(room);
}

function _startDay(room) {
  room.dayNumber += 1;
  room.phase = 'DAY_DISCUSSION';
  room.phaseTimeRemaining = room.settings.discussionTimerSec;
  Object.values(room.players).forEach((p) => { p.hasVoted = false; p.votedForId = null; p.pendingVoteTargetId = null; });

  room.logs.push({
    id: Date.now() + '_day_' + room.dayNumber,
    timestamp: _ts(),
    type: 'system',
    message: `☀️ Day ${room.dayNumber} begins. Discuss behavior and expose the Mafia! (${room.settings.discussionTimerSec}s)`,
  });
}

function _checkWin(room) {
  const alive = Object.values(room.players).filter((p) => p.isAlive && !p.isHost);
  const mafiaAlive = alive.filter((p) => p.team === 'MAFIA' || p.team === 'SHADOWS').length;
  const nonMafiaAlive = alive.filter((p) => p.team !== 'MAFIA' && p.team !== 'SHADOWS').length;

  if (mafiaAlive === 0) {
    room.winner = 'VILLAGERS';
    room.phase = 'GAME_OVER';
    room.logs.push({
      id: Date.now() + '_win_villagers',
      timestamp: _ts(),
      type: 'system',
      message: '🎉 VILLAGERS WIN! All Mafia members and the Godfather have been eliminated!',
    });
    return true;
  }
  if (mafiaAlive >= nonMafiaAlive) {
    room.winner = 'MAFIA';
    room.phase = 'GAME_OVER';
    room.logs.push({
      id: Date.now() + '_win_mafia',
      timestamp: _ts(),
      type: 'system',
      message: '🕶️ MAFIA WINS! The Mafia equal or outnumber the rest of the players!',
    });
    return true;
  }
  return false;
}

function sendMafiaChat(room, playerId, message) {
  const player = room.players[playerId];
  if (!player) return;
  if (player.team !== 'MAFIA' && player.team !== 'SHADOWS' && !player.isHost) {
    throw new Error('Only Mafia team can use the Mafia Syndicate chat.');
  }
  if (!room.mafiaLogs) room.mafiaLogs = [];
  const entry = {
    id: Date.now() + '_mc_' + playerId,
    timestamp: _ts(),
    type: 'chat',
    author: player.name,
    message: message.trim(),
  };
  room.mafiaLogs.push(entry);
  if (!room.shadowLogs) room.shadowLogs = [];
  room.shadowLogs.push(entry);
}

// Alias for compatibility
function sendShadowChat(room, playerId, message) {
  return sendMafiaChat(room, playerId, message);
}

// ── HOST GOD-MODE ────────────────────────────────────────────────────────────
function hostForceNextPhase(room) {
  room.logs.push({ id: Date.now() + '_force', timestamp: _ts(), type: 'system', message: '⚡ Game Master force-advanced the phase.' });
  if (room.phase === 'DAY_DISCUSSION') {
    room.phase = 'DAY_VOTING';
    room.phaseTimeRemaining = room.settings.votingTimerSec;
    Object.values(room.players).forEach((p) => { p.hasVoted = false; p.votedForId = null; });
  } else if (room.phase === 'DAY_VOTING') {
    resolveDayVoting(room);
  } else if (room.phase === 'NIGHT') {
    _advanceNight(room);
  }
  return room;
}

function hostAdjustTimer(room, seconds) {
  room.phaseTimeRemaining = Math.max(0, room.phaseTimeRemaining + seconds);
  return room;
}

function hostTogglePauseTimer(room) {
  room.isTimerPaused = !room.isTimerPaused;
  return room;
}

function hostEliminatePlayer(room, targetId) {
  const target = room.players[targetId];
  if (target && target.isAlive && !target.isHost) {
    target.isAlive = false;
    room.lastEliminatedPlayer = {
      id: target.id,
      name: target.name,
      role: target.role,
      team: target.team,
      reason: 'HOST_ELIMINATED',
      timestamp: _ts(),
    };
    room.logs.push({ id: Date.now() + '_gelim', timestamp: _ts(), type: 'elimination', message: `Game Master eliminated ${target.name}.` });
    /* Wildcard check commented out
    if (target.role === 'WILDCARD' && room.phase === 'DAY_VOTING') {
      room.winner = 'WILDCARD';
      room.phase = 'GAME_OVER';
      room.logs.push({ id: Date.now() + '_win_wildcard_gm', timestamp: _ts(), type: 'elimination', message: `WILDCARD VICTORY! ${target.name} was eliminated during daytime vote and won!` });
    } else {
    */
      _checkWin(room);
      if (room.phase !== 'GAME_OVER' && room.phase === 'NIGHT') _advanceNight(room);
    /* } */
  }
  return room;
}

function hostResetToLobby(room) {
  room.phase = 'LOBBY';
  room.nightSubPhase = null;
  room.phaseTimeRemaining = 0;
  room.isTimerPaused = false;
  room.dayNumber = 0;
  room.winner = undefined;
  room.lastEliminatedPlayer = undefined;
  room.lastVoteOutcome = undefined;
  room.nightActions = {
    mafiaVotes: {},
    godfatherTarget: null,
    doctorTarget: null,
    policeTarget: null,
  };
  Object.values(room.players).forEach((p) => {
    p.isAlive = !p.isHost;
    p.role = undefined; p.team = undefined;
    p.hasVoted = false; p.votedForId = null; p.pendingVoteTargetId = null;
    p.nightActionCompleted = false; p.nightTargetId = null;
    p.protectionsUsed = 0; p.checksUsed = 0;
    p.doctorHealsUsed = 0; p.policeChecksUsed = 0;
    p.policeResults = [];
    p.investigatorResults = [];
  });
  room.logs.push({ id: Date.now() + '_reset', timestamp: _ts(), type: 'system', message: '🔄 Game Master reset the match to lobby.' });
  return room;
}

// ── SANITIZED CLIENT STATE ───────────────────────────────────────────────────
function getSanitizedClientState(room, clientSocketId) {
  const clientPlayer = room.players[clientSocketId];
  const isHost = clientPlayer?.isHost === true;
  const isMafiaTeam = clientPlayer?.team === 'MAFIA' || clientPlayer?.team === 'SHADOWS';
  const isGameOver = room.phase === 'GAME_OVER';
  const policePlayer = Object.values(room.players).find((p) => (p.role === 'POLICE' || p.role === 'INVESTIGATOR') && !p.isHost);
  const isPolice = clientSocketId === policePlayer?.id;

  const sanitizedPlayers = {};
  Object.entries(room.players).forEach(([id, p]) => {
    const isSelf = id === clientSocketId;
    const isMafiaTeammate = isMafiaTeam && (p.team === 'MAFIA' || p.team === 'SHADOWS');
    sanitizedPlayers[id] = {
      id: p.id, name: p.name, isHost: p.isHost, isAlive: p.isAlive, avatarSeed: p.avatarSeed, avatarEmoji: p.avatarEmoji,
      isOnline: p.isOnline !== false,
      hasVoted: p.hasVoted,
      votedForId: p.hasVoted ? p.votedForId : undefined,
      pendingVoteTargetId: room.phase === 'DAY_VOTING' && !p.hasVoted ? p.pendingVoteTargetId : undefined,
      nightActionCompleted: isHost ? p.nightActionCompleted : (isSelf ? p.nightActionCompleted : undefined),
      role: (isSelf || isGameOver || isMafiaTeammate || isHost) ? p.role : undefined,
      team: (isSelf || isGameOver || isMafiaTeammate || isHost) ? p.team : undefined,
      protectionsUsed: (isSelf || isHost) ? (p.doctorHealsUsed ?? p.protectionsUsed) : undefined,
      checksUsed: (isSelf || isHost) ? (p.policeChecksUsed ?? p.checksUsed) : undefined,
      doctorHealsUsed: (isSelf || isHost) ? (p.doctorHealsUsed ?? p.protectionsUsed) : undefined,
      policeChecksUsed: (isSelf || isHost) ? (p.policeChecksUsed ?? p.checksUsed) : undefined,
      policeResults: (isPolice && isSelf || isHost) ? p.policeResults : undefined,
      investigatorResults: (isPolice && isSelf || isHost) ? (p.policeResults || p.investigatorResults) : undefined,
    };
  });

  const filteredLogs = room.logs.filter((log) => {
    if (log.privateToPlayerId) return log.privateToPlayerId === clientSocketId || isHost;
    return true;
  });

  const state = {
    code: room.code,
    phase: room.phase,
    nightSubPhase: room.nightSubPhase,
    phaseTimeRemaining: room.phaseTimeRemaining,
    isTimerPaused: room.isTimerPaused || false,
    dayNumber: room.dayNumber,
    players: sanitizedPlayers,
    settings: room.settings,
    myPlayerId: clientSocketId,
    myPlayer: sanitizedPlayers[clientSocketId],
    logs: filteredLogs,
    mafiaLogs: (isMafiaTeam || isHost || isGameOver) ? (room.mafiaLogs || room.shadowLogs) : undefined,
    shadowLogs: (isMafiaTeam || isHost || isGameOver) ? (room.mafiaLogs || room.shadowLogs) : undefined,
    lastEliminatedPlayer: (room.lastEliminatedPlayer && !isGameOver && !isHost)
      ? { ...room.lastEliminatedPlayer, role: undefined, team: undefined }
      : room.lastEliminatedPlayer,
    winner: room.winner,
  };

  if (isGameOver || isHost) {
    state.allRolesRevealed = {};
    Object.entries(room.players).forEach(([id, p]) => {
      state.allRolesRevealed[id] = { role: p.role };
    });
    const playing = Object.values(room.players).filter((p) => !p.isHost);
    const maxDoctorHeals = room.settings.doctorHeals ?? (room.settings.guardianProtections ?? 1);
    const maxPoliceChecks = room.settings.policeChecks ?? (room.settings.investigatorChecks ?? 1);
    state.quotaStats = playing.map((p) => ({
      id: p.id, name: p.name, role: p.role,
      protectionsUsed: p.doctorHealsUsed ?? (p.protectionsUsed || 0),
      checksUsed: p.policeChecksUsed ?? (p.checksUsed || 0),
      doctorHealsUsed: p.doctorHealsUsed ?? (p.protectionsUsed || 0),
      policeChecksUsed: p.policeChecksUsed ?? (p.checksUsed || 0),
    }));
  }

  return state;
}

function selectPendingVote(room, clientSocketId, targetId) {
  if (room.phase !== 'DAY_VOTING') return room;
  const player = room.players[clientSocketId];
  if (player && player.isAlive && !player.isHost && !player.hasVoted) {
    player.pendingVoteTargetId = targetId;
  }
  return room;
}

module.exports = {
  getRoleRecommendation,
  createRoom,
  startGame,
  selectPendingVote,
  castVote,
  resolveDayVoting,
  submitNightAction,
  sendMafiaChat,
  sendShadowChat,
  getSanitizedClientState,
  hostForceNextPhase,
  hostAdjustTimer,
  hostTogglePauseTimer,
  hostEliminatePlayer,
  hostResetToLobby,
};
