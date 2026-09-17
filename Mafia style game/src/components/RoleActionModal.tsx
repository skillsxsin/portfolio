'use client';

import React, { useState, useEffect } from 'react';
import { ClientRoomState } from '../types/game';
import { Target, Shield, Search, CheckCircle2, Clock, Lock, Users, Crown } from 'lucide-react';

interface RoleActionModalProps {
  roomState: ClientRoomState;
  onNightAction: (targetId: string) => void;
  onSelectPendingNightTarget?: (targetId: string | null) => void;
}

export const RoleActionModal: React.FC<RoleActionModalProps> = ({ roomState, onNightAction, onSelectPendingNightTarget }) => {
  const isNight = roomState.phase === 'NIGHT';
  const subPhase = roomState.nightSubPhase;
  const myPlayer = roomState.myPlayer;

  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(myPlayer?.nightTargetId || myPlayer?.pendingNightTargetId || null);

  useEffect(() => {
    if (myPlayer?.nightTargetId) {
      setSelectedTargetId(myPlayer.nightTargetId);
    } else if (myPlayer?.pendingNightTargetId) {
      setSelectedTargetId(myPlayer.pendingNightTargetId);
    }
  }, [myPlayer?.nightTargetId, myPlayer?.pendingNightTargetId]);

  if (!isNight || !myPlayer || !myPlayer.isAlive || myPlayer.isHost) {
    return null;
  }

  const isMafiaTurn  = subPhase === 'MAFIA' && (myPlayer.role === 'GODFATHER' || myPlayer.role === 'MAFIA');
  const isDoctorTurn = subPhase === 'DOCTOR' && myPlayer.role === 'DOCTOR';
  const isPoliceTurn = subPhase === 'POLICE' && myPlayer.role === 'POLICE';

  if (!isMafiaTurn && !isDoctorTurn && !isPoliceTurn) {
    return null;
  }

  // If action is already locked by this player and they are not in Mafia team, don't show modal
  if (myPlayer.nightActionCompleted && !isMafiaTurn) {
    return null;
  }

  // Teammates in Mafia Syndicate
  const mafiaTeammates = Object.values(roomState.players).filter(
    (p) => !p.isHost && (p.team === 'MAFIA' || p.role === 'GODFATHER' || p.role === 'MAFIA')
  );

  // For Mafia: exclude other mafia members from kill targets so they only target villagers
  const candidates = Object.values(roomState.players).filter((p) => {
    if (p.isHost || !p.isAlive || p.id === myPlayer.id) return false;
    if (isMafiaTurn && (p.team === 'MAFIA' || p.role === 'GODFATHER' || p.role === 'MAFIA')) return false;
    return true;
  });

  const maxHeals = roomState.settings.doctorHeals ?? (roomState.settings.guardianProtections ?? 1);
  const healsUsed = myPlayer.doctorHealsUsed ?? (myPlayer.protectionsUsed ?? 0);
  const healsLeft = Math.max(0, maxHeals - healsUsed);

  const maxChecks = roomState.settings.policeChecks ?? (roomState.settings.investigatorChecks ?? 1);
  const checksUsed = myPlayer.policeChecksUsed ?? (myPlayer.checksUsed ?? 0);
  const checksLeft = Math.max(0, maxChecks - checksUsed);

  const handleSelectCandidate = (targetId: string) => {
    if (myPlayer.nightActionCompleted) return;
    setSelectedTargetId(targetId);
    if (onSelectPendingNightTarget) {
      onSelectPendingNightTarget(targetId);
    }
  };

  const handleConfirmLock = () => {
    if (selectedTargetId) {
      onNightAction(selectedTargetId);
    }
  };

  const handleDelayAction = () => {
    onNightAction('SKIP');
  };

  const getRoleConfig = () => {
    if (isMafiaTurn) {
      const isGodfather = myPlayer.role === 'GODFATHER';
      return {
        title: isGodfather ? 'GODFATHER NIGHT EXECUTION' : 'MAFIA NIGHT ASSASSINATION',
        badge: 'STEP 1: MAFIA SYNDICATE PHASE',
        icon: <Target className="w-7 h-7 sm:w-8 sm:h-8 text-red-400 animate-pulse" />,
        desc: isGodfather
          ? 'Select a target to eliminate tonight. As Godfather, your decision has FINAL absolute precedence if there is disagreement. See what your teammates are targeting before locking.'
          : 'Coordinate target selection with your Syndicate. All teammates see your real-time selections. Lock your selection once agreed.',
        btnColor: isGodfather ? 'bg-purple-700 hover:bg-purple-600 text-white' : 'bg-red-700 hover:bg-red-600 text-white',
        border: isGodfather ? 'border-purple-500/70' : 'border-red-500/70',
        canDelay: false,
      };
    }
    if (isDoctorTurn) {
      return {
        title: 'DOCTOR HEAL & PROTECT',
        badge: `STEP 2: DOCTOR PHASE (${healsLeft} HEAL${healsLeft === 1 ? '' : 'S'} LEFT)`,
        icon: <Shield className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-400 animate-pulse" />,
        desc: 'Select a player to protect tonight, or choose to delay and save your heal for later.',
        btnColor: 'bg-emerald-700 hover:bg-emerald-600 text-white',
        border: 'border-emerald-500/70',
        canDelay: true,
      };
    }
    return {
      title: 'POLICE SUSPECT CHECK',
      badge: `STEP 3: POLICE PHASE (${checksLeft} INSPECTION${checksLeft === 1 ? '' : 'S'} LEFT)`,
      icon: <Search className="w-7 h-7 sm:w-8 sm:h-8 text-blue-400 animate-pulse" />,
      desc: 'Select a suspect to inspect, or choose to delay and save your inspection for later.',
      btnColor: 'bg-blue-700 hover:bg-blue-600 text-white',
      border: 'border-blue-500/70',
      canDelay: true,
    };
  };

  const config = getRoleConfig();
  const selectedTargetPlayer = selectedTargetId ? roomState.players[selectedTargetId] : null;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-3 sm:p-4 font-mono overflow-y-auto">
      <div className={`max-w-xl w-full border-2 ${config.border} rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4 bg-gradient-to-b from-[#1e293b]/98 via-[#0f172a]/98 to-[#0a0e19]/98 text-white relative my-auto max-h-[94vh] overflow-y-auto`}>
        <div className="card-bracket top-left"></div>
        <div className="card-bracket top-right"></div>
        <div className="card-bracket bottom-left"></div>
        <div className="card-bracket bottom-right"></div>

        {/* Header Section */}
        <div className="flex items-center gap-3 border-b border-white/10 pb-3">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-black/60 border border-white/20 flex items-center justify-center shrink-0 shadow-lg">
            {config.icon}
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#ffcc00] bg-white/10 border border-white/20 px-2 py-0.5 rounded-full inline-block mb-0.5">
              {config.badge}
            </span>
            <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-tight font-sans truncate">
              {config.title}
            </h2>
          </div>
        </div>

        <p className="text-xs text-slate-300 font-sans leading-relaxed">{config.desc}</p>

        {/* Mafia Syndicate Coordination & Teammate Live Radar */}
        {isMafiaTurn && (
          <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-red-950/40 via-purple-950/40 to-slate-900/60 border border-red-500/40 space-y-2">
            <div className="flex items-center justify-between gap-2 text-xs font-bold text-red-300 uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-red-400" /> Syndicate Allies & Live Selections
              </span>
              <span className="text-[10px] text-slate-400 font-normal">Real-Time Sync</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {mafiaTeammates.map((tm) => {
                const isMe = tm.id === myPlayer.id;
                const isGodfather = tm.role === 'GODFATHER';
                const isLocked = tm.nightActionCompleted;
                const targetPlayerId = isLocked ? tm.nightTargetId : tm.pendingNightTargetId;
                const targetPlayer = targetPlayerId ? roomState.players[targetPlayerId] : null;

                return (
                  <div
                    key={tm.id}
                    className={`p-2 sm:p-2.5 rounded-xl border text-xs flex flex-col gap-1 transition-all ${
                      isMe
                        ? 'bg-white/10 border-white/30 text-white'
                        : isLocked
                        ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                        : targetPlayer
                        ? 'bg-amber-950/40 border-amber-500/50 text-amber-300'
                        : 'bg-black/40 border-white/10 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-extrabold flex items-center gap-1 truncate font-sans">
                        {tm.avatarEmoji || '👾'} {tm.name} {isMe ? '(You)' : ''}
                      </span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider shrink-0 ${
                        isGodfather ? 'bg-purple-900 text-purple-200 border border-purple-600' : 'bg-red-900 text-red-200 border border-red-600'
                      }`}>
                        {isGodfather ? '👑 GODFATHER' : '🕶️ MAFIA'}
                      </span>
                    </div>

                    <div className="text-[11px] font-mono flex items-center justify-between gap-1 pt-0.5 border-t border-white/5">
                      <span className="text-slate-400 text-[10px]">Target:</span>
                      {isLocked ? (
                        <span className="font-bold text-emerald-400 flex items-center gap-1">
                          <Lock className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span className="truncate max-w-[120px]">{targetPlayer ? targetPlayer.name : 'Locked'}</span>
                        </span>
                      ) : targetPlayer ? (
                        <span className="font-bold text-amber-300 flex items-center gap-1">
                          <span className="animate-pulse">🎯</span>
                          <span className="truncate max-w-[120px]">{targetPlayer.name}</span>
                        </span>
                      ) : (
                        <span className="text-slate-500 italic text-[10px]">Selecting...</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-slate-400 font-sans italic pt-1 border-t border-red-950/60">
              💡 Click any candidate below to signal your target to your partner. Check their choice above before clicking Lock!
            </p>
          </div>
        )}

        {/* Candidate Target Cards Grid */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300 uppercase tracking-wider">
            <span>{isMafiaTurn ? 'Select Victim to Eliminate' : isDoctorTurn ? 'Select Player to Protect' : 'Select Suspect to Inspect'}</span>
            <span className="text-[10px] text-slate-400">{candidates.length} Available</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 sm:max-h-56 overflow-y-auto pr-1">
            {candidates.map((p) => {
              const isSelected = selectedTargetId === p.id;
              
              // Find all syndicate teammates who are currently targeting or locked on this player
              const targetingTeammates = isMafiaTurn
                ? mafiaTeammates.filter((tm) => {
                    if (tm.id === myPlayer.id) return false;
                    const tmTarget = tm.nightActionCompleted ? tm.nightTargetId : tm.pendingNightTargetId;
                    return tmTarget === p.id;
                  })
                : [];

              return (
                <button
                  key={p.id}
                  disabled={myPlayer.nightActionCompleted}
                  onClick={() => handleSelectCandidate(p.id)}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between gap-1.5 transition-all relative ${
                    isSelected
                      ? 'bg-[#ffcc00] text-[#05070c] border-[#ffcc00] shadow-lg shadow-[#ffcc00]/20 font-bold scale-[1.02]'
                      : 'bg-white/5 border-white/10 hover:border-white/30 text-white'
                  } ${myPlayer.nightActionCompleted ? 'cursor-default opacity-85' : 'cursor-pointer'}`}
                >
                  <div className="flex items-center justify-between gap-2 w-full">
                    <span className="font-extrabold text-xs sm:text-sm font-sans truncate flex items-center gap-1.5">
                      <span>{p.avatarEmoji || '👾'}</span>
                      <span className="truncate">{p.name}</span>
                    </span>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-[#05070c] shrink-0" />}
                  </div>

                  {/* Teammates targeting indicators */}
                  {targetingTeammates.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {targetingTeammates.map((tm) => {
                        const isLocked = tm.nightActionCompleted;
                        const isGf = tm.role === 'GODFATHER';
                        return (
                          <span
                            key={tm.id}
                            className={`text-[9px] px-1.5 py-0.5 rounded font-black flex items-center gap-1 ${
                              isSelected
                                ? 'bg-black/80 text-[#ffcc00] border border-black/40'
                                : isLocked
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-600'
                                : isGf
                                ? 'bg-purple-950 text-purple-300 border border-purple-600 animate-pulse'
                                : 'bg-red-950 text-red-300 border border-red-600 animate-pulse'
                            }`}
                          >
                            {isLocked ? <Lock className="w-2.5 h-2.5" /> : '🎯'}
                            <span className="truncate max-w-[90px]">{tm.name} {isLocked ? 'locked' : 'targeting'}</span>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Lock / Confirm Action Section */}
        {myPlayer.nightActionCompleted ? (
          <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-emerald-950/80 border border-emerald-500 text-emerald-300 flex flex-wrap items-center justify-between gap-3 font-mono">
            <div className="flex items-center gap-2 text-xs font-bold">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>YOUR NIGHT ACTION IS CONFIRMED & LOCKED.</span>
            </div>
            <span className="bg-emerald-900 border border-emerald-600 text-white px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1">
              <Lock className="w-3.5 h-3.5" /> LOCKED
            </span>
          </div>
        ) : (
          <div className="space-y-2 pt-1 border-t border-white/10">
            {/* Live selected target preview banner */}
            <div className="p-2.5 sm:p-3 rounded-xl bg-[#05070c] border border-white/15 flex items-center justify-between gap-2 text-xs">
              <span className="text-slate-400">Chosen Target:</span>
              <span className="font-black text-[#ffcc00] truncate font-sans">
                {selectedTargetPlayer ? `${selectedTargetPlayer.avatarEmoji || '👾'} ${selectedTargetPlayer.name}` : 'None Selected (Click candidate above)'}
              </span>
            </div>

            <button
              disabled={!selectedTargetId}
              onClick={handleConfirmLock}
              className={`w-full py-3 sm:py-3.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl transition-all ${
                selectedTargetId
                  ? `${config.btnColor} cursor-pointer shadow-red-900/30`
                  : 'bg-white/10 text-slate-500 cursor-not-allowed border border-white/10'
              }`}
            >
              <Lock className="w-4 h-4" />
              {isMafiaTurn
                ? myPlayer.role === 'GODFATHER'
                  ? 'LOCK FINAL TARGET (GODFATHER PRECEDENCE)'
                  : 'LOCK KILL TARGET VOTE'
                : 'LOCK NIGHT ACTION NOW'}
            </button>

            {config.canDelay && (
              <button
                onClick={handleDelayAction}
                className="w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-slate-200 border border-white/20 transition-all"
              >
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                DELAY / SAVE ACTION (PASS TONIGHT)
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

