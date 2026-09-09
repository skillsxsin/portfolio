'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { ClientRoomState } from '../types/game';

// Import gameEngine for client-side P2P hosting fallback
const gameEngine = require('../server/gameEngine');

const BIT_EMOJI_AVATARS = ['👾', '🤖', '👻', '🕹️', '🎮', '💀', '🗡️', '🛡️', '🕵️', '🎩', '👑', '⚡', '🕶️', '🐉', '🧙', '🎯'];

function loadPeerJS(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject();
  if ((window as any).Peer) return Promise.resolve((window as any).Peer);
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/peerjs@1.5.2/dist/peerjs.min.js';
    script.onload = () => resolve((window as any).Peer);
    script.onerror = () => reject(new Error('Failed to load PeerJS library'));
    document.head.appendChild(script);
  });
}

function genCode() {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(true); // Default to ready for instant load
  const [roomState, setRoomState] = useState<ClientRoomState | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // P2P Fallback State (Active by default for serverless deployment)
  const isP2PRef = useRef<boolean>(true);
  const p2pHostRoomRef = useRef<any>(null);
  const p2pConnectionsRef = useRef<Map<string, any>>(new Map());
  const p2pGuestConnRef = useRef<any>(null);
  const timerIntervalRef = useRef<any>(null);

  const broadcastP2P = () => {
    const room = p2pHostRoomRef.current;
    if (!room) return;
    // Host state update
    setRoomState(gameEngine.getSanitizedClientState(room, 'host'));
    // Broadcast to connected guest peers
    p2pConnectionsRef.current.forEach((conn, peerId) => {
      if (conn && conn.open) {
        const sanitized = gameEngine.getSanitizedClientState(room, peerId);
        conn.send({ type: 'room_state', state: sanitized });
      }
    });
  };

  const startP2PTimer = () => {
    if (timerIntervalRef.current) return;
    timerIntervalRef.current = setInterval(() => {
      const room = p2pHostRoomRef.current;
      if (!room || room.phase === 'LOBBY' || room.phase === 'GAME_OVER') return;
      if (room.isTimerPaused) { broadcastP2P(); return; }

      if (room.phaseTimeRemaining > 0) {
        room.phaseTimeRemaining -= 1;
        if (room.phaseTimeRemaining === 0) {
          if (room.phase === 'DAY_DISCUSSION') {
            room.phase = 'DAY_VOTING';
            room.phaseTimeRemaining = room.settings.votingTimerSec || 0;
            Object.values(room.players).forEach((p: any) => { p.hasVoted = false; p.votedForId = null; });
            room.logs.push({ id: Date.now() + '_v', timestamp: new Date().toLocaleTimeString(), type: 'system', message: 'Voting phase has begun. Cast your vote!' });
          } else if (room.phase === 'DAY_VOTING') {
            gameEngine.resolveDayVoting(room);
          } else if (room.phase === 'NIGHT') {
            if (gameEngine.hostForceNextPhase) gameEngine.hostForceNextPhase(room);
          }
        }
      }
      broadcastP2P();
    }, 1000);
  };

  useEffect(() => {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
    const socketPath = basePath ? `${basePath}/socket.io` : '/socket.io';
    
    try {
      const socket = io({ path: socketPath, timeout: 1000, reconnectionAttempts: 1, autoConnect: true });
      socketRef.current = socket;

      socket.on('connect', () => {
        isP2PRef.current = false;
        setIsConnected(true);
        setErrorMsg(null);
      });

      socket.on('disconnect', () => {
        if (!isP2PRef.current) setIsConnected(false);
      });

      socket.on('room_state', (state: ClientRoomState) => setRoomState(state));
    } catch (e) {
      // Fall back silently to P2P
      isP2PRef.current = true;
      setIsConnected(true);
    }

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  const emit = (event: string, data: any, cb?: (res: any) => void) => {
    if (!isP2PRef.current && socketRef.current?.connected) {
      socketRef.current.emit(event, data, (res: any) => {
        if (!res?.success && res?.error) setErrorMsg(res.error);
        if (cb) cb(res);
      });
      return;
    }

    // Handle P2P WebRTC Fallback
    handleP2PEmit(event, data, cb);
  };

  const handleP2PEmit = async (event: string, data: any, cb?: (res: any) => void) => {
    try {
      if (event === 'create_room') {
        const code = genCode();
        const room = gameEngine.createRoom(code, 'host', data.playerName || 'Game Master', data.settings || {});
        if (room.players['host'] && data.avatarEmoji) room.players['host'].avatarEmoji = data.avatarEmoji;
        p2pHostRoomRef.current = room;
        startP2PTimer();
        broadcastP2P();
        if (cb) cb({ success: true, code });

        // Connect PeerJS in background for multiplayer guest peers
        loadPeerJS().then((Peer) => {
          try {
            const peer = new Peer('ha_' + code.toLowerCase());

            peer.on('open', () => {
              // Successfully registered host peer ID
            });

            peer.on('connection', (conn: any) => {
              conn.on('data', (msg: any) => {
                const currentRoom = p2pHostRoomRef.current;
                if (!currentRoom) return;
                const peerId = conn.peer;

                if (msg.type === 'join_room') {
                  p2pConnectionsRef.current.set(peerId, conn);
                  const count = Object.keys(currentRoom.players).length;
                  const emoji = msg.avatarEmoji || BIT_EMOJI_AVATARS[count % BIT_EMOJI_AVATARS.length];
                  currentRoom.players[peerId] = {
                    id: peerId,
                    name: msg.playerName || `Player${count}`,
                    isHost: false,
                    isAlive: true,
                    avatarSeed: msg.playerName + '_' + Math.random(),
                    avatarEmoji: emoji,
                    isOnline: true,
                    protectionsUsed: 0,
                    checksUsed: 0,
                    doctorHealsUsed: 0,
                    policeChecksUsed: 0,
                    policeResults: [],
                    investigatorResults: [],
                  };
                  currentRoom.logs.push({ id: Date.now() + '_join', timestamp: new Date().toLocaleTimeString(), type: 'system', message: `${emoji} ${msg.playerName} joined.` });
                  broadcastP2P();
                } else if (msg.type === 'cast_vote') {
                  gameEngine.castVote(currentRoom, peerId, msg.targetPlayerId);
                  broadcastP2P();
                } else if (msg.type === 'select_pending_vote') {
                  gameEngine.selectPendingVote(currentRoom, peerId, msg.targetPlayerId);
                  broadcastP2P();
                } else if (msg.type === 'submit_night_action') {
                  gameEngine.submitNightAction(currentRoom, peerId, msg.targetPlayerId);
                  broadcastP2P();
                } else if (msg.type === 'send_chat') {
                  const player = currentRoom.players[peerId];
                  if (player && msg.message?.trim()) {
                    currentRoom.logs.push({ id: Date.now() + '_chat', timestamp: new Date().toLocaleTimeString(), type: 'chat', author: player.name, message: msg.message.trim() });
                    broadcastP2P();
                  }
                } else if (msg.type === 'send_mafia_chat' || msg.type === 'send_shadow_chat') {
                  gameEngine.sendMafiaChat(currentRoom, peerId, msg.message);
                  broadcastP2P();
                }
              });

              conn.on('close', () => {
                const currentRoom = p2pHostRoomRef.current;
                if (currentRoom && currentRoom.players[conn.peer]) {
                  const pName = currentRoom.players[conn.peer].name;
                  delete currentRoom.players[conn.peer];
                  currentRoom.logs.push({ id: Date.now() + '_leave', timestamp: new Date().toLocaleTimeString(), type: 'system', message: `🚪 ${pName} left.` });
                  broadcastP2P();
                }
              });
            });

            peer.on('error', (err: any) => {
              console.warn('P2P Peer notice:', err);
            });
          } catch (e) {
            console.warn('Peer initialization notice:', e);
          }
        }).catch((err) => {
          console.warn('Could not load PeerJS in background:', err);
        });
        return;
      }

      if (event === 'join_room') {
        const Peer = await loadPeerJS();
        const peer = new Peer();
        const targetHostId = 'ha_' + data.code.trim().toLowerCase();

        peer.on('open', () => {
          const conn = peer.connect(targetHostId);
          p2pGuestConnRef.current = conn;

          conn.on('open', () => {
            conn.send({ type: 'join_room', playerName: data.playerName, avatarEmoji: data.avatarEmoji });
            if (cb) cb({ success: true, code: data.code });
          });

          conn.on('data', (msg: any) => {
            if (msg.type === 'room_state') {
              setRoomState(msg.state);
            }
          });

          conn.on('error', () => {
            if (cb) cb({ success: false, error: 'Could not connect to room host.' });
          });
        });

        peer.on('error', () => {
          if (cb) cb({ success: false, error: 'Room code not found or Host is offline.' });
        });
        return;
      }

      // Host directly handles room updates
      const room = p2pHostRoomRef.current;
      if (room) {
        if (event === 'start_game') gameEngine.startGame(room);
        else if (event === 'update_settings') room.settings = { ...room.settings, ...data.settings };
        else if (event === 'cast_vote') gameEngine.castVote(room, 'host', data.targetPlayerId);
        else if (event === 'select_pending_vote') gameEngine.selectPendingVote(room, 'host', data.targetPlayerId);
        else if (event === 'submit_night_action') gameEngine.submitNightAction(room, 'host', data.targetPlayerId);
        else if (event === 'send_chat') {
          room.logs.push({ id: Date.now() + '_chat', timestamp: new Date().toLocaleTimeString(), type: 'chat', author: room.players['host']?.name || 'GM', message: data.message });
        }
        else if (event === 'send_mafia_chat' || event === 'send_shadow_chat') gameEngine.sendMafiaChat(room, 'host', data.message);
        else if (event === 'host_force_next_phase') gameEngine.hostForceNextPhase && gameEngine.hostForceNextPhase(room);
        else if (event === 'host_adjust_timer') gameEngine.hostAdjustTimer && gameEngine.hostAdjustTimer(room, data.seconds);
        else if (event === 'host_toggle_pause_timer') gameEngine.hostTogglePauseTimer && gameEngine.hostTogglePauseTimer(room);
        else if (event === 'host_eliminate_player') gameEngine.hostEliminatePlayer && gameEngine.hostEliminatePlayer(room, data.targetPlayerId);
        else if (event === 'host_reset_to_lobby') gameEngine.hostResetToLobby && gameEngine.hostResetToLobby(room);

        broadcastP2P();
        if (cb) cb({ success: true });
        return;
      }

      // Guest sends event to host via data channel
      const conn = p2pGuestConnRef.current;
      if (conn && conn.open) {
        conn.send({ type: event, ...data });
        if (cb) cb({ success: true });
      }
    } catch (e: any) {
      if (cb) cb({ success: false, error: e.message });
    }
  };

  return {
    socket: socketRef.current,
    isConnected,
    roomState,
    errorMsg,
    setErrorMsg,
    createRoom: (playerName: string, settings: any, avatarEmoji?: string, cb?: any) => emit('create_room', { playerName, settings, avatarEmoji }, cb),
    joinRoom: (code: string, playerName: string, avatarEmoji?: string, cb?: any) => emit('join_room', { code, playerName, avatarEmoji }, cb),
    updateSettings: (code: string, settings: any) => emit('update_settings', { code, settings }),
    startGame: (code: string, cb?: any) => emit('start_game', { code }),
    selectPendingVote: (code: string, targetPlayerId: string | null) => emit('select_pending_vote', { code, targetPlayerId }),
    castVote: (code: string, targetPlayerId: string | null, cb?: any) => emit('cast_vote', { code, targetPlayerId }, cb),
    submitNightAction: (code: string, targetPlayerId: string, cb?: any) => emit('submit_night_action', { code, targetPlayerId }, cb),
    sendChat: (code: string, message: string) => emit('send_chat', { code, message }),
    sendMafiaChat: (code: string, message: string, cb?: any) => emit('send_mafia_chat', { code, message }, cb),
    sendShadowChat: (code: string, message: string, cb?: any) => emit('send_mafia_chat', { code, message }, cb),
    hostForceNextPhase: (code: string) => emit('host_force_next_phase', { code }),
    hostAdjustTimer: (code: string, seconds: number) => emit('host_adjust_timer', { code, seconds }),
    hostTogglePauseTimer: (code: string) => emit('host_toggle_pause_timer', { code }),
    hostEliminatePlayer: (code: string, targetPlayerId: string) => emit('host_eliminate_player', { code, targetPlayerId }),
    hostResetToLobby: (code: string) => emit('host_reset_to_lobby', { code }),
  };
}
