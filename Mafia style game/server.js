process.env.NEXT_TELEMETRY_DISABLED = '1';

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const next = require('next');
const gameEngine = require('./src/server/gameEngine');

const dev = process.env.NODE_ENV !== 'production';
const PORT = process.env.PORT || 3003;
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

console.log(`[SERVER] Starting on port ${PORT}... ${basePath ? `(Base path: ${basePath})` : ''}`);

const app = next({ dev, dir: __dirname, port: PORT });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  console.log('[SERVER] Next.js ready.');
  const expressApp = express();
  const server = http.createServer(expressApp);
  
  const socketPath = basePath ? `${basePath}/socket.io` : '/socket.io';
  const io = new Server(server, { path: socketPath, cors: { origin: '*' } });
  const rooms = new Map();

  function genCode() {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return rooms.has(code) ? genCode() : code;
  }

  function findRoom(code) {
    if (!code) return null;
    const c = code.trim();
    if (rooms.has(c)) return rooms.get(c);
    for (const [k, v] of rooms) { if (k.toLowerCase() === c.toLowerCase()) return v; }
    return null;
  }

  function broadcast(roomCode) {
    const room = rooms.get(roomCode);
    if (!room) return;
    const socketsInRoom = io.sockets.adapter.rooms.get(room.code);
    if (!socketsInRoom) return;
    for (const sid of socketsInRoom) {
      io.to(sid).emit('room_state', gameEngine.getSanitizedClientState(room, sid));
    }
  }

  // 1-second tick
  setInterval(() => {
    rooms.forEach((room, code) => {
      if (room.phase === 'LOBBY' || room.phase === 'GAME_OVER') return;
      if (room.isTimerPaused) { broadcast(code); return; }

      // Only tick down and auto-advance if a timer was set (> 0)
      if (room.phaseTimeRemaining > 0) {
        room.phaseTimeRemaining -= 1;
        if (room.phaseTimeRemaining === 0) {
          if (room.phase === 'DAY_DISCUSSION') {
            room.phase = 'DAY_VOTING';
            room.phaseTimeRemaining = room.settings.votingTimerSec || 0;
            Object.values(room.players).forEach((p) => { p.hasVoted = false; p.votedForId = null; });
            room.logs.push({ id: Date.now() + '_v', timestamp: new Date().toLocaleTimeString(), type: 'system', message: 'Voting phase has begun. Cast your vote!' });
          } else if (room.phase === 'DAY_VOTING') {
            gameEngine.resolveDayVoting(room);
          } else if (room.phase === 'NIGHT') {
            if (room.nightSubPhase === 'MAFIA' || room.nightSubPhase === 'SHADOWS') {
              const mafiaMembers = Object.values(room.players).filter((p) => p.isAlive && !p.isHost && (p.role === 'GODFATHER' || p.role === 'MAFIA' || p.role === 'DIRECTOR' || p.role === 'SHADOW'));
              const targets = Object.values(room.players).filter((p) => p.isAlive && !p.isHost && p.team !== 'MAFIA' && p.team !== 'SHADOWS');
              if (mafiaMembers.length > 0 && targets.length > 0) {
                mafiaMembers.forEach((m) => {
                  if (!m.nightActionCompleted) {
                    m.nightActionCompleted = true;
                    m.nightTargetId = targets[0].id;
                    if (m.role === 'GODFATHER' || m.role === 'DIRECTOR') room.nightActions.godfatherTarget = targets[0].id;
                    else room.nightActions.mafiaVotes[targets[0].id] = (room.nightActions.mafiaVotes[targets[0].id] || 0) + 1;
                  }
                });
              }
            }
            gameEngine.hostForceNextPhase && gameEngine.hostForceNextPhase(room);
          }
        }
      }
      broadcast(code);
    });
  }, 1000);

  io.on('connection', (socket) => {
    console.log(`[SOCKET] Connected: ${socket.id}`);

    const BIT_EMOJI_AVATARS = ['👾', '🤖', '👻', '🕹️', '🎮', '💀', '🗡️', '🛡️', '🕵️', '🎩', '👑', '⚡', '🕶️', '🐉', '🧙', '🎯'];

    socket.on('create_room', ({ playerName, settings, avatarEmoji }, cb) => {
      try {
        const code = genCode();
        const room = gameEngine.createRoom(code, socket.id, playerName || 'Game Master', settings || {});
        const emoji = avatarEmoji || '👑';
        if (room.players[socket.id]) room.players[socket.id].avatarEmoji = emoji;
        rooms.set(code, room);
        socket.join(code);
        broadcast(code);
        if (cb) cb({ success: true, code });
      } catch (e) { if (cb) cb({ success: false, error: e.message }); }
    });

    socket.on('join_room', ({ code, playerName, avatarEmoji }, cb) => {
      try {
        const room = findRoom(code);
        if (!room) throw new Error('Room not found. Check the code.');
        if (room.phase !== 'LOBBY') throw new Error('Game already started.');
        if (Object.keys(room.players).length >= room.settings.maxPlayers) throw new Error('Room is full.');
        const count = Object.keys(room.players).length;
        const emoji = avatarEmoji || BIT_EMOJI_AVATARS[count % BIT_EMOJI_AVATARS.length];
        room.players[socket.id] = {
          id: socket.id, name: playerName || `Player${count}`,
          isHost: false, isAlive: true, avatarSeed: playerName + '_' + Math.random(), avatarEmoji: emoji,
          isOnline: true,
          protectionsUsed: 0, checksUsed: 0,
          doctorHealsUsed: 0, policeChecksUsed: 0,
          policeResults: [], investigatorResults: [],
        };
        room.logs.push({ id: Date.now() + '_join', timestamp: new Date().toLocaleTimeString(), type: 'system', message: `${emoji} ${playerName} joined.` });
        socket.join(room.code);
        broadcast(room.code);
        if (cb) cb({ success: true, code: room.code });
      } catch (e) { if (cb) cb({ success: false, error: e.message }); }
    });

    socket.on('update_settings', ({ code, settings }) => {
      const room = findRoom(code);
      if (!room || !room.players[socket.id]?.isHost) return;
      room.settings = { ...room.settings, ...settings };
      broadcast(room.code);
    });

    socket.on('start_game', ({ code }, cb) => {
      try {
        const room = findRoom(code);
        if (!room) throw new Error('Room not found.');
        if (!room.players[socket.id]?.isHost) throw new Error('Only host can start.');
        gameEngine.startGame(room);
        broadcast(room.code);
        if (cb) cb({ success: true });
      } catch (e) { if (cb) cb({ success: false, error: e.message }); }
    });

    socket.on('select_pending_vote', ({ code, targetPlayerId }) => {
      const room = findRoom(code);
      if (room) {
        gameEngine.selectPendingVote(room, socket.id, targetPlayerId);
        broadcast(room.code);
      }
    });

    socket.on('cast_vote', ({ code, targetPlayerId }, cb) => {
      try {
        const room = findRoom(code);
        if (!room) throw new Error('Room not found.');
        gameEngine.castVote(room, socket.id, targetPlayerId);
        broadcast(room.code);
        if (cb) cb({ success: true });
      } catch (e) { if (cb) cb({ success: false, error: e.message }); }
    });

    socket.on('submit_night_action', ({ code, targetPlayerId }, cb) => {
      try {
        const room = findRoom(code);
        if (!room) throw new Error('Room not found.');
        gameEngine.submitNightAction(room, socket.id, targetPlayerId);
        broadcast(room.code);
        if (cb) cb({ success: true });
      } catch (e) { if (cb) cb({ success: false, error: e.message }); }
    });

    socket.on('send_chat', ({ code, message }) => {
      const room = findRoom(code);
      if (room && message?.trim()) {
        const player = room.players[socket.id];
        if (player) {
          room.logs.push({
            id: Date.now() + '_chat',
            timestamp: new Date().toLocaleTimeString(),
            type: 'chat',
            author: player.name,
            message: message.trim(),
          });
          broadcast(room.code);
        }
      }
    });

    socket.on('send_mafia_chat', ({ code, message }, cb) => {
      try {
        const room = findRoom(code);
        if (!room || !message?.trim()) return;
        gameEngine.sendMafiaChat(room, socket.id, message);
        broadcast(room.code);
        if (cb) cb({ success: true });
      } catch (e) { if (cb) cb({ success: false, error: e.message }); }
    });

    // Alias for backwards compatibility
    socket.on('send_shadow_chat', ({ code, message }, cb) => {
      try {
        const room = findRoom(code);
        if (!room || !message?.trim()) return;
        gameEngine.sendMafiaChat(room, socket.id, message);
        broadcast(room.code);
        if (cb) cb({ success: true });
      } catch (e) { if (cb) cb({ success: false, error: e.message }); }
    });

    // HOST GOD MODE
    socket.on('host_force_next_phase', ({ code }, cb) => {
      try {
        const room = findRoom(code);
        if (!room || !room.players[socket.id]?.isHost) throw new Error('Unauthorized');
        gameEngine.hostForceNextPhase(room);
        broadcast(room.code);
        if (cb) cb({ success: true });
      } catch (e) { if (cb) cb({ success: false, error: e.message }); }
    });

    socket.on('host_adjust_timer', ({ code, seconds }, cb) => {
      try {
        const room = findRoom(code);
        if (!room || !room.players[socket.id]?.isHost) throw new Error('Unauthorized');
        gameEngine.hostAdjustTimer(room, seconds);
        broadcast(room.code);
        if (cb) cb({ success: true });
      } catch (e) { if (cb) cb({ success: false, error: e.message }); }
    });

    socket.on('host_toggle_pause_timer', ({ code }, cb) => {
      try {
        const room = findRoom(code);
        if (!room || !room.players[socket.id]?.isHost) throw new Error('Unauthorized');
        gameEngine.hostTogglePauseTimer(room);
        broadcast(room.code);
        if (cb) cb({ success: true });
      } catch (e) { if (cb) cb({ success: false, error: e.message }); }
    });

    socket.on('host_eliminate_player', ({ code, targetPlayerId }, cb) => {
      try {
        const room = findRoom(code);
        if (!room || !room.players[socket.id]?.isHost) throw new Error('Unauthorized');
        gameEngine.hostEliminatePlayer(room, targetPlayerId);
        broadcast(room.code);
        if (cb) cb({ success: true });
      } catch (e) { if (cb) cb({ success: false, error: e.message }); }
    });

    socket.on('host_reset_to_lobby', ({ code }, cb) => {
      try {
        const room = findRoom(code);
        if (!room || !room.players[socket.id]?.isHost) throw new Error('Unauthorized');
        gameEngine.hostResetToLobby(room);
        broadcast(room.code);
        if (cb) cb({ success: true });
      } catch (e) { if (cb) cb({ success: false, error: e.message }); }
    });

    socket.on('disconnect', () => {
      console.log(`[SOCKET] Disconnected: ${socket.id}`);
      rooms.forEach((room, code) => {
        if (room.players[socket.id]) {
          const name = room.players[socket.id].name;
          if (room.phase === 'LOBBY') {
            delete room.players[socket.id];
            room.logs.push({ id: Date.now() + '_leave', timestamp: new Date().toLocaleTimeString(), type: 'system', message: `🚪 ${name} left.` });
            const remaining = Object.values(room.players);
            if (remaining.length === 0) rooms.delete(code);
          } else {
            room.players[socket.id].isOnline = false;
            room.logs.push({ id: Date.now() + '_disc', timestamp: new Date().toLocaleTimeString(), type: 'system', message: `⚠️ ${name} disconnected.` });
          }
          broadcast(code);
        }
      });
    });
  });

  const fs = require('fs');
  const path = require('path');

  expressApp.all('*', (req, res) => {
    const publicFilePath = path.join(__dirname, 'public', req.path);
    if (req.path !== '/' && !req.path.startsWith('/_next') && fs.existsSync(publicFilePath) && fs.statSync(publicFilePath).isFile()) {
      return res.sendFile(publicFilePath);
    }
    return handle(req, res);
  });

  server.listen(PORT, '0.0.0.0', (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${PORT}`);
  });
}).catch((err) => { console.error('[SERVER] Init failed:', err); });
