'use client';

import React, { useState } from 'react';
import { ClientRoomState } from '../types/game';
import { Target, Shield, Search, CheckCircle2, Clock } from 'lucide-react';

interface RoleActionModalProps {
  roomState: ClientRoomState;
  onNightAction: (targetId: string) => void;
}

export const RoleActionModal: React.FC<RoleActionModalProps> = ({ roomState, onNightAction }) => {
  const isNight = roomState.phase === 'NIGHT';
  const subPhase = roomState.nightSubPhase;
  const myPlayer = roomState.myPlayer;

  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);

  if (!isNight || !myPlayer || !myPlayer.isAlive || myPlayer.isHost || myPlayer.nightActionCompleted) {
    return null;
  }

  const isMafiaTurn  = subPhase === 'MAFIA' && (myPlayer.role === 'GODFATHER' || myPlayer.role === 'MAFIA');
  const isDoctorTurn = subPhase === 'DOCTOR' && myPlayer.role === 'DOCTOR';
  const isPoliceTurn = subPhase === 'POLICE' && myPlayer.role === 'POLICE';

  if (!isMafiaTurn && !isDoctorTurn && !isPoliceTurn) {
    return null;
  }

  const candidates = Object.values(roomState.players).filter(
    (p) => !p.isHost && p.isAlive && p.id !== myPlayer.id
  );

  const maxHeals = roomState.settings.doctorHeals ?? (roomState.settings.guardianProtections ?? 1);
  const healsUsed = myPlayer.doctorHealsUsed ?? (myPlayer.protectionsUsed ?? 0);
  const healsLeft = Math.max(0, maxHeals - healsUsed);

  const maxChecks = roomState.settings.policeChecks ?? (roomState.settings.investigatorChecks ?? 1);
  const checksUsed = myPlayer.policeChecksUsed ?? (myPlayer.checksUsed ?? 0);
  const checksLeft = Math.max(0, maxChecks - checksUsed);

  const getRoleConfig = () => {
    if (isMafiaTurn) {
      const isGodfather = myPlayer.role === 'GODFATHER';
      return {
        title: isGodfather ? 'GODFATHER NIGHT TARGET' : 'MAFIA NIGHT ATTACK',
        badge: 'STEP 1: MAFIA PHASE',
        icon: <Target className="w-8 h-8 text-red-400 animate-pulse" />,
        desc: isGodfather
          ? 'Select a target to eliminate tonight. As Godfather, your decision has FINAL precedence.'
          : 'Select a target to eliminate tonight with your team.',
        btnColor: 'bg-red-700 hover:bg-red-600 text-white',
        border: 'border-red-500/70',
        canDelay: false,
      };
    }
    if (isDoctorTurn) {
      return {
        title: 'DOCTOR HEAL & PROTECT',
        badge: `STEP 2: DOCTOR PHASE (${healsLeft} HEAL${healsLeft === 1 ? '' : 'S'} LEFT)`,
        icon: <Shield className="w-8 h-8 text-emerald-400 animate-pulse" />,
        desc: 'Select a player to protect tonight, or choose to delay and save your heal for later.',
        btnColor: 'bg-emerald-700 hover:bg-emerald-600 text-white',
        border: 'border-emerald-500/70',
        canDelay: true,
      };
    }
    return {
      title: 'POLICE SUSPECT CHECK',
      badge: `STEP 3: POLICE PHASE (${checksLeft} INSPECTION${checksLeft === 1 ? '' : 'S'} LEFT)`,
      icon: <Search className="w-8 h-8 text-blue-400 animate-pulse" />,
      desc: 'Select a suspect to inspect, or choose to delay and save your inspection for later.',
      btnColor: 'bg-blue-700 hover:bg-blue-600 text-white',
      border: 'border-blue-500/70',
      canDelay: true,
    };
  };

  const config = getRoleConfig();

  const handleConfirmAction = () => {
    if (selectedTargetId) {
      onNightAction(selectedTargetId);
    }
  };

  const handleDelayAction = () => {
    onNightAction('SKIP');
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-3 sm:p-4 font-mono">
      <div className={`max-w-lg w-full border-2 ${config.border} rounded-2xl sm:rounded-3xl p-5 sm:p-7 shadow-2xl space-y-4 sm:space-y-5 bg-gradient-to-b from-[#1e293b]/98 via-[#0f172a]/98 to-[#0a0e19]/98 text-white relative`}>
        <div className="card-bracket top-left"></div>
        <div className="card-bracket top-right"></div>
        <div className="card-bracket bottom-left"></div>
        <div className="card-bracket bottom-right"></div>

        {/* Header Icon */}
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-black/60 border border-white/20 mx-auto flex items-center justify-center shadow-xl">
          {config.icon}
        </div>

        <div className="text-center space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#ffcc00] bg-white/10 border border-white/20 px-2.5 py-0.5 rounded-full inline-block">
            {config.badge}
          </span>
          <h2 className="text-lg sm:text-xl font-black text-white uppercase tracking-tight font-sans">
            {config.title}
          </h2>
          <p className="text-xs text-slate-300 font-sans leading-relaxed">{config.desc}</p>
        </div>

        {/* Candidate Target Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
          {candidates.map((p) => {
            const isSelected = selectedTargetId === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setSelectedTargetId(p.id)}
                className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                  isSelected
                    ? 'bg-[#ffcc00] text-[#05070c] border-[#ffcc00] shadow-lg shadow-[#ffcc00]/20 font-bold'
                    : 'bg-white/5 border-white/10 hover:border-white/30 text-white'
                }`}
              >
                <span className="font-extrabold text-xs sm:text-sm font-sans truncate">{p.name}</span>
                {isSelected && <CheckCircle2 className="w-4 h-4 text-[#05070c] shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <button
            disabled={!selectedTargetId}
            onClick={handleConfirmAction}
            className={`w-full py-3 sm:py-3.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl transition-all ${
              selectedTargetId
                ? `${config.btnColor} cursor-pointer`
                : 'bg-white/10 text-slate-500 cursor-not-allowed border border-white/10'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            CONFIRM NIGHT TARGET
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
      </div>
    </div>
  );
};
