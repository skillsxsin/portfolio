'use client';

import React, { useState, useEffect } from 'react';
import { ClientRoomState } from '../types/game';
import { VotingStatsChart } from './VotingStatsChart';
import { Target, Shield, Search, Skull, CheckCircle2, AlertCircle, Lock, Ban, Users } from 'lucide-react';

interface PlayerGridProps {
  roomState: ClientRoomState;
  onCastVote: (targetId: string | null) => void;
  onSelectPendingVote?: (targetId: string | null) => void;
  onNightAction: (targetId: string) => void;
  onSelectPendingNightTarget?: (targetId: string | null) => void;
}

export const PlayerGrid: React.FC<PlayerGridProps> = ({ roomState, onCastVote, onSelectPendingVote, onNightAction, onSelectPendingNightTarget }) => {
  const players     = Object.values(roomState.players).filter((p) => !p.isHost);
  const myPlayer    = roomState.myPlayer;
  const isVoting    = roomState.phase === 'DAY_VOTING';
  const isNight     = roomState.phase === 'NIGHT';
  const subPhase    = roomState.nightSubPhase;

  // Selected vote target state before locking
  const [selectedVoteTargetId, setSelectedVoteTargetId] = useState<string | null>(myPlayer?.votedForId || null);

  // Selected night target state before locking
  const [selectedNightTargetId, setSelectedNightTargetId] = useState<string | null>(myPlayer?.nightTargetId || myPlayer?.pendingNightTargetId || null);

  useEffect(() => {
    if (myPlayer?.nightTargetId) {
      setSelectedNightTargetId(myPlayer.nightTargetId);
    } else if (myPlayer?.pendingNightTargetId) {
      setSelectedNightTargetId(myPlayer.pendingNightTargetId);
    }
  }, [myPlayer?.nightTargetId, myPlayer?.pendingNightTargetId]);

  const isMafiaTurn  = subPhase === 'MAFIA' && (myPlayer?.role === 'GODFATHER' || myPlayer?.role === 'MAFIA');
  const isDoctorTurn = subPhase === 'DOCTOR' && myPlayer?.role === 'DOCTOR';
  const isPoliceTurn = subPhase === 'POLICE' && myPlayer?.role === 'POLICE';
  const canAct       = isNight && myPlayer?.isAlive && !myPlayer?.isHost && (isMafiaTurn || isDoctorTurn || isPoliceTurn) && !myPlayer?.nightActionCompleted;

  const mafiaTeammates = Object.values(roomState.players).filter(
    (p) => !p.isHost && (p.team === 'MAFIA' || p.role === 'GODFATHER' || p.role === 'MAFIA')
  );

  const nightStatusMsg = () => {
    if (!isNight) return null;
    if (canAct) return null;
    if (myPlayer?.nightActionCompleted) return 'Action submitted & locked: waiting for other players.';
    if (subPhase === 'MAFIA') return 'Step 1: The Godfather and Mafia are choosing their target.';
    if (subPhase === 'DOCTOR') return 'Step 2: The Doctor is selecting a player to heal.';
    if (subPhase === 'POLICE') return 'Step 3: The Police is inspecting a suspect.';
    return 'Night phase in progress.';
  };

  const actionLabel = () => {
    if (isMafiaTurn) {
      const isGodfather = myPlayer?.role === 'GODFATHER';
      return {
        label: isGodfather ? 'SELECT TO ELIMINATE' : 'SELECT TO ELIMINATE',
        icon: <Target className="w-4 h-4 text-red-400" />,
        active: 'bg-red-700 text-white',
        idle: 'bg-[#05070c] text-red-300 border-white/10 hover:bg-red-950/60',
      };
    }
    if (isDoctorTurn) {
      return {
        label: 'SELECT TO HEAL',
        icon: <Shield className="w-4 h-4 text-emerald-400" />,
        active: 'bg-emerald-700 text-white',
        idle: 'bg-[#05070c] text-emerald-300 border-white/10 hover:bg-emerald-950/60',
      };
    }
    if (isPoliceTurn) {
      return {
        label: 'SELECT TO INSPECT',
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

  const handleSelectNightCandidate = (targetId: string) => {
    if (myPlayer?.nightActionCompleted) return;
    setSelectedNightTargetId(targetId);
    if (onSelectPendingNightTarget) onSelectPendingNightTarget(targetId);
  };

  const handleConfirmLockNightAction = () => {
    if (selectedNightTargetId) {
      onNightAction(selectedNightTargetId);
    }
  };

  const selectedTargetPlayer = selectedVoteTargetId ? roomState.players[selectedVoteTargetId] : null;
  const selectedNightPlayer = selectedNightTargetId ? roomState.players[selectedNightTargetId] : null;

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

        {/* Lock Vote Action Banner */}
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

        {/* Night Target Selection & Lock Banner */}
        {isNight && (isMafiaTurn || isDoctorTurn || isPoliceTurn) && myPlayer?.isAlive && !myPlayer?.isHost && (
          myPlayer.nightActionCompleted ? (
            <div className="mb-4 p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500 text-emerald-300 flex items-center justify-between gap-3 font-mono">
              <div className="flex items-center gap-2 text-xs font-bold">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>YOUR NIGHT ACTION IS CONFIRMED & LOCKED.</span>
              </div>
              <span className="bg-emerald-900 border border-emerald-600 text-white px-3 py-1 rounded-xl text-xs font-black">
                LOCKED
              </span>
            </div>
          ) : (
            <div className="mb-4 p-3.5 rounded-2xl bg-gradient-to-r from-red-950/40 via-purple-950/30 to-[#05070c] border border-red-500/50 flex flex-wrap items-center justify-between gap-3 font-mono">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-red-400 animate-pulse" />
                <span className="text-xs text-slate-300">
                  Chosen Night Target:{' '}
                  <strong className="text-red-400 font-bold">
                    {selectedNightPlayer ? selectedNightPlayer.name : 'None Selected (Click candidate below)'}
                  </strong>
                </span>
              </div>

              <button
                disabled={!selectedNightTargetId}
                onClick={handleConfirmLockNightAction}
                className={`py-2 px-6 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg transition-all ${
                  selectedNightTargetId
                    ? 'bg-red-700 hover:bg-red-600 text-white cursor-pointer shadow-red-900/30'
                    : 'bg-white/10 text-slate-500 cursor-not-allowed border border-white/10'
                }`}
              >
                <Lock className="w-3.5 h-3.5" /> LOCK NIGHT ACTION NOW
              </button>
            </div>
          )
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {players.map((p) => {
            const isMe        = p.id === roomState.myPlayerId;
            const isSelectedVote  = selectedVoteTargetId === p.id;
            const isSelectedNight = selectedNightTargetId === p.id;
            const nightLockedTarget = myPlayer?.nightTargetId === p.id;
            const showVote    = isVoting && myPlayer?.isAlive && !myPlayer?.isHost && !myPlayer?.hasVoted && p.isAlive && !isMe;
            const isTeammate  = isMafiaTurn && (p.team === 'MAFIA' || p.role === 'GODFATHER' || p.role === 'MAFIA');
            const showNight   = canAct && p.isAlive && !isMe && !isTeammate;

            // Find any mafia teammate targeting this player during night
            const targetingTeammates = isMafiaTurn
              ? mafiaTeammates.filter((tm) => {
                  if (tm.id === myPlayer?.id) return false;
                  const targetId = tm.nightActionCompleted ? tm.nightTargetId : tm.pendingNightTargetId;
                  return targetId === p.id;
                })
              : [];

            return (
              <div key={p.id} className={`rounded-2xl p-4 border flex flex-col gap-3 transition-all ${
                !p.isAlive                ? 'bg-[#0f172a]/40 border-white/10 opacity-50 backdrop-blur-md'
                : isSelectedVote || isSelectedNight ? 'bg-[#1e293b]/90 border-[#ffcc00] ring-2 ring-[#ffcc00]/40 shadow-lg shadow-[#ffcc00]/20 backdrop-blur-xl'
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
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-extrabold text-sm text-white block">{p.name}{isMe ? ' (You)' : ''}</span>
                        <span className={`w-2 h-2 rounded-full inline-block ${p.isOnline !== false ? 'bg-emerald-400 shadow-sm shadow-emerald-400' : 'bg-slate-500'}`} title={p.isOnline !== false ? 'Online' : 'Offline'} />
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                        {!p.isAlive
                          ? <span className="text-red-400 text-xs flex items-center gap-1 font-mono"><Skull className="w-3 h-3" /> ELIMINATED</span>
                          : <span className="text-emerald-400 text-xs font-mono font-semibold flex items-center gap-1"><span className="text-[10px]">{p.isOnline !== false ? '🟢 ONLINE' : '🔴 OFFLINE'}</span></span>}
                        
                        {/* Revealed / Teammate Role Badge */}
                        {p.role && (
                          <span className={`text-[9px] font-mono font-black px-1.5 py-0.2 rounded uppercase tracking-wider border ${
                            p.role === 'GODFATHER' ? 'bg-purple-950/90 text-purple-200 border-purple-500 shadow-sm shadow-purple-900/50' :
                            p.role === 'MAFIA' ? 'bg-red-950/90 text-red-200 border-red-500 shadow-sm shadow-red-900/50' :
                            p.role === 'DOCTOR' ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500' :
                            p.role === 'POLICE' ? 'bg-blue-950/90 text-blue-200 border-blue-500' :
                            'bg-slate-800/90 text-slate-200 border-slate-600'
                          }`}>
                            {p.role === 'GODFATHER' ? '👑 GODFATHER' : p.role === 'MAFIA' ? '🕶️ MAFIA' : p.role}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Voted indicator */}
                  {isVoting && p.hasVoted && (
                    <span title="Has locked vote" className="flex items-center gap-1 bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
                      <Lock className="w-3 h-3" /> LOCKED
                    </span>
                  )}
                </div>

                {/* Teammates night targeting indicators on this player */}
                {targetingTeammates.length > 0 && (
                  <div className="flex flex-wrap gap-1 bg-black/50 p-1.5 rounded-lg border border-red-900/40">
                    {targetingTeammates.map((tm) => {
                      const isLocked = tm.nightActionCompleted;
                      const isGf = tm.role === 'GODFATHER';
                      return (
                        <span
                          key={tm.id}
                          className={`text-[9px] px-1.5 py-0.5 rounded font-black flex items-center gap-1 ${
                            isLocked
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-600'
                              : isGf
                              ? 'bg-purple-950 text-purple-300 border border-purple-600 animate-pulse'
                              : 'bg-red-950 text-red-300 border border-red-600 animate-pulse'
                          }`}
                        >
                          {isLocked ? <Lock className="w-2.5 h-2.5" /> : '🎯'}
                          <span>{tm.name} {isLocked ? 'locked' : 'targeting'}</span>
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Vote Selection button */}
                {showVote && (
                  <button
                    onClick={() => handleSelectCandidate(p.id)}
                    className={`w-full py-2.5 rounded-xl text-xs font-black tracking-wider flex items-center justify-center gap-2 border transition-all ${
                      isSelectedVote
                        ? 'bg-[#ffcc00] text-[#05070c] border-[#ffcc00] shadow-lg shadow-[#ffcc00]/20'
                        : 'bg-white/5 text-slate-200 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <Target className="w-4 h-4" />
                    {isSelectedVote ? 'SELECTED FOR VOTE' : 'SELECT TO VOTE'}
                  </button>
                )}

                {/* Night action button (selects target first, does not lock prematurely) */}
                {showNight && act && (
                  <button
                    onClick={() => handleSelectNightCandidate(p.id)}
                    className={`w-full py-2.5 rounded-xl text-xs font-black tracking-wider flex items-center justify-center gap-2 border transition-all ${
                      nightLockedTarget
                        ? 'bg-emerald-800 text-white border-emerald-500 ring-2 ring-emerald-400'
                        : isSelectedNight
                        ? 'bg-[#ffcc00] text-[#05070c] border-[#ffcc00] shadow-lg shadow-[#ffcc00]/20'
                        : act.idle
                    }`}
                  >
                    {nightLockedTarget ? <Lock className="w-4 h-4" /> : act.icon}
                    {nightLockedTarget ? 'TARGET LOCKED' : isSelectedNight ? 'TARGET SELECTED (Click Lock Above)' : act.label}
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

