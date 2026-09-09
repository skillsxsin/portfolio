'use client';

import React, { useEffect, useState } from 'react';
import { useSocket } from '../hooks/useSocket';
import { TopNavbar } from '../components/TopNavbar';
import { Lobby } from '../components/Lobby';
import { HeaderBar } from '../components/HeaderBar';
import { HostControlPanel } from '../components/HostControlPanel';
import { PrivateRoleCard } from '../components/PrivateRoleCard';
import { PlayerGrid } from '../components/PlayerGrid';
import { ClueAndChatFeed } from '../components/ClueAndChatFeed';
import { GameOverModal } from '../components/GameOverModal';

import { EliminationModal } from '../components/EliminationModal';
import { TieVoteModal } from '../components/TieVoteModal';
import { RoleActionModal } from '../components/RoleActionModal';
import { VotingModal } from '../components/VotingModal';
import { Footer } from '../components/Footer';
import { getAssetPath } from '../utils/assets';

export default function Home() {
  const {
    isConnected,
    roomState,
    errorMsg,
    createRoom,
    joinRoom,
    updateSettings,
    startGame,
    selectPendingVote,
    castVote,
    submitNightAction,
    sendChat,
    sendMafiaChat,
    sendShadowChat,
    hostForceNextPhase,
    hostAdjustTimer,
    hostTogglePauseTimer,
    hostEliminatePlayer,
    hostResetToLobby,
  } = useSocket();

  const [initialJoinCode, setInitialJoinCode] = useState('');
  const [isVotingModalOpen, setIsVotingModalOpen] = useState(false);
  const [dismissedElimEventId, setDismissedElimEventId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      let code = searchParams.get('code') || searchParams.get('room') || searchParams.get('join');
      if (!code && window.location.hash) {
        const hash = window.location.hash.replace(/^#/, '');
        const hashParams = new URLSearchParams(hash);
        code = hashParams.get('code') || hashParams.get('room') || hash;
      }
      if (code) setInitialJoinCode(code.trim().toUpperCase());
    }
  }, []);

  // Auto-open voting modal when DAY_VOTING begins
  useEffect(() => {
    if (roomState?.phase === 'DAY_VOTING') {
      setIsVotingModalOpen(true);
    } else {
      setIsVotingModalOpen(false);
    }
  }, [roomState?.phase]);

  const bgStyle = { backgroundImage: `url(${getAssetPath('/bg.png')})` };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-[#080c19] text-white flex flex-col relative overflow-hidden">
        <div className="fixed inset-0 pointer-events-none z-0 bg-cover bg-center bg-no-repeat bg-fixed opacity-75 mix-blend-overlay" style={bgStyle} />
        <div className="relative z-10 flex-1 flex flex-col">
          <TopNavbar />
          <main className="flex-1 flex items-center justify-center p-4">
            <div className="card-panel-accent max-w-sm w-full text-center space-y-4 font-mono">
              <div className="w-12 h-12 border-4 border-[#ffcc00] border-t-transparent rounded-full animate-spin mx-auto" />
              <h2 className="text-base font-black text-white">Connecting to Hidden Agenda...</h2>
              <p className="text-xs text-slate-300 font-sans">Establishing real-time socket session</p>
            </div>
          </main>
          <Footer />
        </div>
      </div>
    );
  }

  if (!roomState || roomState.phase === 'LOBBY') {
    return (
      <div className="min-h-screen bg-[#080c19] text-white flex flex-col relative overflow-hidden">
        <div className="fixed inset-0 pointer-events-none z-0 bg-cover bg-center bg-no-repeat bg-fixed opacity-80" style={bgStyle} />
        <div className="relative z-10 flex-1 flex flex-col">
          <TopNavbar />
          <main className="flex-1 p-4 md:p-8">
            <Lobby
              roomState={roomState}
              onCreateRoom={createRoom}
              onJoinRoom={joinRoom}
              onUpdateSettings={updateSettings}
              onStartGame={startGame}
              errorMsg={errorMsg}
              initialJoinCode={initialJoinCode}
            />
          </main>
          <Footer />
        </div>
      </div>
    );
  }

  const lastElim = roomState?.lastEliminatedPlayer;
  const currentElimEventId = lastElim ? `${lastElim.id}_${lastElim.reason}_${lastElim.role}_${lastElim.timestamp || ''}` : null;
  const isEliminationPending = currentElimEventId !== null && currentElimEventId !== dismissedElimEventId;

  return (
    <div className="min-h-screen bg-[#080c19] text-white flex flex-col relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none z-0 bg-cover bg-center bg-no-repeat bg-fixed opacity-80" style={bgStyle} />
      <div className="relative z-10 flex-1 flex flex-col">
        <TopNavbar />
        <main className="flex-1 p-3 md:p-6 max-w-7xl mx-auto w-full space-y-4">
          <HeaderBar roomState={roomState} />

          <HostControlPanel
            roomState={roomState}
            onForceNextPhase={() => hostForceNextPhase(roomState.code)}
            onAdjustTimer={(s) => hostAdjustTimer(roomState.code, s)}
            onTogglePauseTimer={() => hostTogglePauseTimer(roomState.code)}
            onEliminatePlayer={(id) => hostEliminatePlayer(roomState.code, id)}
            onResetToLobby={() => hostResetToLobby(roomState.code)}
          />

          {!roomState.myPlayer?.isHost && <PrivateRoleCard player={roomState.myPlayer} />}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <PlayerGrid
                roomState={roomState}
                onSelectPendingVote={(id) => selectPendingVote(roomState.code, id)}
                onCastVote={(id) => castVote(roomState.code, id)}
                onNightAction={(id) => submitNightAction(roomState.code, id)}
              />
            </div>
            <div>
              <ClueAndChatFeed
                roomState={roomState}
                onSendChat={(msg) => sendChat(roomState.code, msg)}
                onSendMafiaChat={(msg) => sendMafiaChat(roomState.code, msg)}
                onSendShadowChat={(msg) => sendShadowChat(roomState.code, msg)}
              />
            </div>
          </div>

          {/* Interactive Pop-up Modals for Enhanced Usability */}
          <RoleActionModal
            roomState={roomState}
            onNightAction={(targetId) => submitNightAction(roomState.code, targetId)}
          />

          <VotingModal
            roomState={roomState}
            onSelectPendingVote={(targetId) => selectPendingVote(roomState.code, targetId)}
            onCastVote={(targetId) => castVote(roomState.code, targetId)}
            isOpen={isVotingModalOpen}
            onClose={() => setIsVotingModalOpen(false)}
          />

          <TieVoteModal roomState={roomState} />

          <EliminationModal
            roomState={roomState}
            onDismiss={() => currentElimEventId && setDismissedElimEventId(currentElimEventId)}
          />

          {/* Show GameOverModal ONLY AFTER elimination pop-up has been acknowledged */}
          {!isEliminationPending && (
            <GameOverModal
              roomState={roomState}
              onResetToLobby={() => hostResetToLobby(roomState.code)}
            />
          )}
        </main>
        <Footer />
      </div>
    </div>
  );
}



