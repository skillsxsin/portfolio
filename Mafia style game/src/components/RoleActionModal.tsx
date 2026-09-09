'use client';

import React, { useState } from 'react';
import { ClientRoomState } from '../types/game';
import { Target, Shield, Search, CheckCircle2 } from 'lucide-react';

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
        border: 'border-red-500/50',
      };
    }
    if (isDoctorTurn) {
      return {
        title: 'DOCTOR HEAL & PROTECT',
        badge: 'STEP 2: DOCTOR PHASE',
        icon: <Shield className="w-8 h-8 text-emerald-400 animate-pulse" />,
        desc: 'Select a player to heal from the Mafia attack tonight.',
        btnColor: 'bg-emerald-700 hover:bg-emerald-600 text-white',
        border: 'border-emerald-500/50',
      };
    }
    return {
      title: 'POLICE SUSPECT CHECK',
      badge: 'STEP 3: POLICE PHASE',
      icon: <Search className="w-8 h-8 text-blue-400 animate-pulse" />,
      desc: 'Select a suspect to inspect their secret alignment (Godfather is immune and scans as Innocent Villagers).',
      btnColor: 'bg-blue-700 hover:bg-blue-600 text-white',
      border: 'border-blue-500/50',
    };
  };

  const config = getRoleConfig();

  const handleConfirmAction = () => {
    if (selectedTargetId) {
      onNightAction(selectedTargetId);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-3 sm:p-4 font-mono overflow-y-auto">
      <div className={`max-w-lg w-full border-2 ${config.border} rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 shadow-2xl space-y-4 sm:space-y-6 bg-gradient-to-b from-[#1e293b]/95 via-[#0f172a]/95 to-[#0a0e19]/98 text-white my-auto max-h-[92vh] overflow-y-auto relative`}>
        <div className="card-bracket top-left"></div>
        <div className="card-bracket top-right"></div>
        <div className="card-bracket bottom-left"></div>
        <div className="card-bracket bottom-right"></div>
        {/* Header Icon */}
        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-black/60 border border-white/20 mx-auto flex items-center justify-center shadow-xl">
          {config.icon}
        </div>

        <div className="text-center space-y-1.5 sm:space-y-2">
          <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-[#ffcc00] bg-white/10 border border-white/20 px-2.5 py-0.5 rounded-full inline-block">
            {config.badge}
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight font-sans">
            {config.title}
          </h2>
          <p className="text-xs text-slate-300 font-sans">{config.desc}</p>
        </div>

        {/* Candidate Target Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5 max-h-48 sm:max-h-60 overflow-y-auto pr-1">
          {candidates.map((p) => {
            const isSelected = selectedTargetId === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setSelectedTargetId(p.id)}
                className={`p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border text-left flex items-center justify-between transition-all ${
                  isSelected
                    ? 'bg-[#ffcc00] text-[#05070c] border-[#ffcc00] shadow-lg shadow-[#ffcc00]/20 font-bold'
                    : 'bg-white/5 border-white/10 hover:border-white/30 text-white'
                }`}
              >
                <span className="font-extrabold text-xs sm:text-sm font-sans">{p.name}</span>
                {isSelected && <CheckCircle2 className="w-4 h-4 text-[#05070c] shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* Submit Action Button */}
        <button
          disabled={!selectedTargetId}
          onClick={handleConfirmAction}
          className={`w-full py-3.5 sm:py-4 rounded-xl sm:rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl transition-all ${
            selectedTargetId
              ? `${config.btnColor} cursor-pointer`
              : 'bg-white/10 text-slate-500 cursor-not-allowed border border-white/10'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          CONFIRM NIGHT ACTION
        </button>
      </div>
    </div>
  );
};
