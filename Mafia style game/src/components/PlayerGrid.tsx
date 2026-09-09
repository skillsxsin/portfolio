'use client';

import React, { useState } from 'react';
import { ClientRoomState } from '../types/game';
import { VotingStatsChart } from './VotingStatsChart';
import { Target, Shield, Search, Skull, CheckCircle2, AlertCircle, Lock, Ban } from 'lucide-react';

interface PlayerGridProps {
  roomState: ClientRoomState;
  onCastVote: (targetId: string | null) => void;
  onSelectPendingVote?: (targetId: string | null) => void;
  onNightAction: (targetId: string) => void;
}

export const PlayerGrid: React.FC<PlayerGridProps> = ({ roomState, onCastVote, onSelectPendingVote, onNightAction }) => {
  const players     = Object.values(roomState.players).filter((p) => !p.isHost);
  const myPlayer    = roomState.myPlayer;
  const isVoting    = roomState.phase === 'DAY_VOTING';
  const isNight     = roomState.phase === 'NIGHT';
  const subPhase    = roomState.nightSubPhase;

  // Selected vote target state before locking
  const [selectedVoteTargetId, setSelectedVoteTargetId] = useState<string | null>(myPlayer?.votedForId || null);

  const isMafiaTurn  = subPhase === 'MAFIA' && (myPlayer?.role === 'GODFATHER' || myPlayer?.role === 'MAFIA');
  const isDoctorTurn = subPhase === 'DOCTOR' && myPlayer?.role === 'DOCTOR';
  const isPoliceTurn = subPhase === 'POLICE' && myPlayer?.role === 'POLICE';
  const canAct       = isNight && myPlayer?.isAlive && !myPlayer?.isHost && (isMafiaTurn || isDoctorTurn || isPoliceTurn) && !myPlayer?.nightActionCompleted;

  const nightStatusMsg = () => {
    if (!isNight) return null;
    if (canAct) return null;
    if (myPlayer?.nightActionCompleted) return 'Action submitted: waiting for next step.';
    if (subPhase === 'MAFIA') return 'Step 1: The Godfather and Mafia are choosing their target.';
    if (subPhase === 'DOCTOR') return 'Step 2: The Doctor is selecting a player to heal.';
    if (subPhase === 'POLICE') return 'Step 3: The Police is inspecting a suspect.';
    return 'Night phase in progress.';
  };

  const actionLabel = () => {
    if (isMafiaTurn) {
      const isGodfather = myPlayer?.role === 'GODFATHER';
      return {
        label: isGodfather ? 'GODFATHER ELIMINATE (FINAL Precedence)' : 'ELIMINATE TARGET',
        icon: <Target className="w-4 h-4 text-red-400" />,
        active: 'bg-red-700 text-white',
        idle: 'bg-[#05070c] text-red-300 border-white/10 hover:bg-red-950/60',
      };
    }
    if (isDoctorTurn) {
      return {
        label: 'HEAL PLAYER',
        icon: <Shield className="w-4 h-4 text-emerald-400" />,
        active: 'bg-emerald-700 text-white',
        idle: 'bg-[#05070c] text-emerald-300 border-white/10 hover:bg-emerald-950/60',
      };
    }
    if (isPoliceTurn) {
      return {
        label: 'INSPECT SUSPECT',
        icon: <Search className="w-4 h-4 text-blue-400" />,
        active: 'bg-blue-700 text-white',
        idle: 'bg-[#05070c] text-blue-300 border-white/10 hover:bg-blue-950/60',
      };
    }
    return null;
  };

  const act = actionLabel();
  const nightMsg = nightStatusMsg();

  const handleSelectCandidate = (targetId: string | null) => {
    setSelectedVoteTargetId(targetId);
    if (onSelectPendingVote) onSelectPendingVote(targetId);
  };

  const handleConfirmLockVote = () => {
    onCastVote(selectedVoteTargetId);
  };

  const selectedTargetPlayer = selectedVoteTargetId ? roomState.players[selectedVoteTargetId] : null;

  return (
    <div className="space-y-4">
      {/* Live Voting Statistics Graph */}
      {isVoting && <VotingStatsChart roomState={roomState} />}

      <div className="card-panel">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4 border-b border-white/10 pb-3">
          <div>
            <h3 className="text-base font-extrabold text-white font-mono uppercase tracking-wider">
              Active Players ({players.length})
            </h3>
            {nightMsg && (
              <p className={`text-xs mt-1 flex items-center gap-1.5 font-sans ${myPlayer?.nightActionCompleted ? 'text-emerald-400' : 'text-[#ffcc00] animate-pulse'}`}>
                <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {nightMsg}
              </p>
            )}
          </div>

          {/* Voting Action Bar */}
          {isVoting && myPlayer?.isAlive && !myPlayer?.isHost && !myPlayer.hasVoted && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleSelectCandidate(null)}
                className={`btn-secondary text-xs !py-1.5 border-white/15 ${selectedVoteTargetId === null ? 'bg-[#ffcc00]/20 text-[#ffcc00] border-[#ffcc00]/40' : 'text-slate-300'}`}
              >
                <Ban className="w-3.5 h-3.5 inline mr-1" /> Abstain
              </button>
            </div>
          )}
        </div>

        {/* Lock Vote Action Banner (Disappears after locking) */}
        {isVoting && myPlayer?.isAlive && !myPlayer?.isHost && (
          myPlayer.hasVoted ? (
            <div className="mb-4 p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500 text-emerald-300 flex items-center justify-between gap-3 font-mono">
              <div className="flex items-center gap-2 text-xs font-bold">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>YOUR VOTE IS CONFIRMED & LOCKED. WAITING FOR OTHER PLAYERS...</span>
              </div>
              <span className="bg-emerald-900 border border-emerald-600 text-white px-3 py-1 rounded-xl text-xs font-black">
                LOCKED
              </span>
            </div>
          ) : (
            <div className="mb-4 p-3.5 rounded-2xl bg-gradient-to-r from-[#121829] to-[#05070c] border border-[#ffcc00]/40 flex flex-wrap items-center justify-between gap-3 font-mono">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#ffcc00]" />
                <span className="text-xs text-slate-300">
                  Selected Vote Target:{' '}
                  <strong className="text-[#ffcc00] font-bold">
                    {selectedTargetPlayer ? selectedTargetPlayer.name : selectedVoteTargetId === null ? 'Abstain Vote' : 'None Selected'}
                  </strong>
                </span>
              </div>

              <button
                onClick={handleConfirmLockVote}
                className="btn-primary py-2 px-6 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-[#ffcc00]/20"
              >
                <Lock className="w-3.5 h-3.5" /> LOCK VOTE NOW
              </button>
            </div>
          )
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {players.map((p) => {
            const isMe        = p.id === roomState.myPlayerId;
            const isSelected  = selectedVoteTargetId === p.id;
            const nightTarget = myPlayer?.nightTargetId === p.id;
            const showVote    = isVoting && myPlayer?.isAlive && !myPlayer?.isHost && !myPlayer?.hasVoted && p.isAlive && !isMe;
            const showNight   = canAct && p.isAlive && !isMe;

            return (
              <div key={p.id} className={`rounded-2xl p-4 border flex flex-col gap-3 transition-all ${
                !p.isAlive                ? 'bg-[#0f172a]/40 border-white/10 opacity-50 backdrop-blur-md'
                : isSelected              ? 'bg-[#1e293b]/90 border-[#ffcc00] ring-2 ring-[#ffcc00]/40 shadow-lg shadow-[#ffcc00]/20 backdrop-blur-xl'
                : isMe                    ? 'bg-[#1e293b]/80 border-[#ffcc00]/40 backdrop-blur-xl'
                : 'bg-[#0f172a]/70 border-white/20 hover:border-white/40 backdrop-blur-xl'
              }`}>
                {/* Player name row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-xl border ${
                      !p.isAlive ? 'bg-white/5 text-slate-600 border-white/5' : isMe ? 'bg-[#ffcc00] text-[#05070c] border-[#ffcc00]' : 'bg-white/5 border-white/10'
                    }`}>
                      {p.avatarEmoji || '👾'}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-sm text-white block">{p.name}{isMe ? ' (You)' : ''}</span>
                        <span className={`w-2 h-2 rounded-full inline-block ${p.isOnline !== false ? 'bg-emerald-400 shadow-sm shadow-emerald-400' : 'bg-slate-500'}`} title={p.isOnline !== false ? 'Online' : 'Offline'} />
                      </div>
                      {!p.isAlive
                        ? <span className="text-red-400 text-xs flex items-center gap-1 font-mono"><Skull className="w-3 h-3" /> ELIMINATED</span>
                        : <span className="text-emerald-400 text-xs font-mono font-semibold flex items-center gap-1"><span className="text-[10px]">{p.isOnline !== false ? '🟢 ONLINE' : '🔴 OFFLINE'}</span></span>}
                    </div>
                  </div>

                  {/* Voted indicator */}
                  {isVoting && p.hasVoted && (
                    <span title="Has locked vote" className="flex items-center gap-1 bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
                      <Lock className="w-3 h-3" /> LOCKED
                    </span>
                  )}
                </div>

                {/* Vote Selection button */}
                {showVote && (
                  <button
                    onClick={() => handleSelectCandidate(p.id)}
                    className={`w-full py-2.5 rounded-xl text-xs font-black tracking-wider flex items-center justify-center gap-2 border transition-all ${
                      isSelected
                        ? 'bg-[#ffcc00] text-[#05070c] border-[#ffcc00] shadow-lg shadow-[#ffcc00]/20'
                        : 'bg-white/5 text-slate-200 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <Target className="w-4 h-4" />
                    {isSelected ? 'SELECTED FOR VOTE' : 'SELECT TO VOTE'}
                  </button>
                )}

                {/* Night action button */}
                {showNight && act && (
                  <button onClick={() => onNightAction(p.id)}
                    className={`w-full py-2.5 rounded-xl text-xs font-black tracking-wider flex items-center justify-center gap-2 border transition-all ${
                      nightTarget ? act.active + ' ring-2 ring-white/30' : act.idle
                    }`}>
                    {act.icon}
                    {nightTarget ? 'TARGET LOCKED' : act.label}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
