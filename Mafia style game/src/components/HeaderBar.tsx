'use client';

import React, { useState } from 'react';
import { ClientRoomState } from '../types/game';
import { Shield, Clock, Users, HelpCircle, Pause } from 'lucide-react';

interface HeaderBarProps { roomState: ClientRoomState; }

export const HeaderBar: React.FC<HeaderBarProps> = ({ roomState }) => {
  const [showHelp, setShowHelp] = useState(false);

  const getPhase = () => {
    if (roomState.phase === 'NIGHT') {
      if (roomState.nightSubPhase === 'MAFIA') {
        return { label: 'Night Step 1: Godfather & Mafia Target', color: 'bg-red-950/60 text-red-300 border-red-800' };
      }
      if (roomState.nightSubPhase === 'DOCTOR') {
        return { label: 'Night Step 2: Doctor Heal', color: 'bg-emerald-950/60 text-emerald-300 border-emerald-800' };
      }
      if (roomState.nightSubPhase === 'POLICE') {
        return { label: 'Night Step 3: Police Inspection', color: 'bg-blue-950/60 text-blue-300 border-blue-800' };
      }
      return { label: 'Night Phase', color: 'bg-purple-950/60 text-purple-300 border-purple-800' };
    }
    switch (roomState.phase) {
      case 'DAY_DISCUSSION': return { label: 'Day Discussion: Expose the Mafia', color: 'bg-[#ffcc00]/10 text-[#ffcc00] border-[#ffcc00]/30' };
      case 'DAY_VOTING':    return { label: 'Daytime Voting: Remove a Suspect', color: 'bg-amber-950/60 text-amber-300 border-amber-800' };
      case 'GAME_OVER':     return { label: 'Match Concluded', color: 'bg-emerald-950/60 text-emerald-300 border-emerald-800' };
      default:              return { label: 'Hidden Agenda', color: 'bg-white/5 text-slate-300 border-white/10' };
    }
  };

  const phase = getPhase();
  const alive  = Object.values(roomState.players).filter((p) => !p.isHost && p.isAlive).length;
  const total  = Object.values(roomState.players).filter((p) => !p.isHost).length;

  return (
    <header className="card-panel !p-2.5 sm:!p-3 mb-4 border-white/10">
      <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
        <div className="flex items-center gap-1.5 sm:gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 sm:gap-2 bg-[#05070c] px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-xl border border-white/10 font-mono text-xs">
            <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#ffcc00]" />
            <span className="text-[10px] sm:text-xs text-slate-400 uppercase tracking-wider">ROOM</span>
            <span className="font-mono font-black text-sm sm:text-lg text-white">{roomState.code}</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 bg-[#05070c] px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl border border-white/10 font-mono text-xs">
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />
            <span className="text-[10px] sm:text-xs text-slate-300">ALIVE: <strong className="text-white font-mono">{alive}</strong> / {total}</span>
          </div>

          {roomState.phase === 'DAY_VOTING' && (
            <div className="flex items-center gap-1.5 sm:gap-2 bg-[#05070c] px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl border border-[#ffcc00]/30 font-mono text-[10px] sm:text-xs">
              <span className="text-slate-400">VOTES:</span>
              <strong className="text-[#ffcc00]">
                {Object.values(roomState.players).filter((p) => !p.isHost && p.hasVoted).length} / {alive} Locked
              </strong>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap font-mono">
          <div className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl border text-[10px] sm:text-xs font-bold flex items-center gap-1.5 uppercase ${phase.color}`}>
            {phase.label}
            {roomState.dayNumber > 0 && <span className="opacity-60 text-[10px] sm:text-xs"> · Day {roomState.dayNumber}</span>}
          </div>

          {roomState.isTimerPaused ? (
            <div className="flex items-center gap-1 sm:gap-1.5 bg-amber-950/80 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl border border-amber-600 text-amber-300 font-mono font-bold text-[10px] sm:text-xs animate-pulse">
              <Pause className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> PAUSED
            </div>
          ) : roomState.phaseTimeRemaining > 0 ? (
            <div className="flex items-center gap-1 sm:gap-1.5 bg-[#05070c] px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl border border-white/10 text-[#ffcc00] font-mono font-bold text-[10px] sm:text-xs">
              <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> {roomState.phaseTimeRemaining}s
            </div>
          ) : (
            <div className="flex items-center gap-1 sm:gap-1.5 bg-[#05070c] px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl border border-white/10 text-slate-400 font-mono font-bold text-[10px] sm:text-xs">
              <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> UNTIMED
            </div>
          )}

          <button onClick={() => setShowHelp(!showHelp)} className="btn-secondary !p-1.5 sm:!p-2" title="Role guide">
            <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-300" />
          </button>
        </div>
      </div>

      {showHelp && (
        <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-sans">
          <div className="p-3 bg-[#05070c] rounded-xl border border-emerald-900/60">
            <strong className="text-emerald-400 block mb-1">Villagers Team</strong>
            Doctor heals. Police inspects. Villagers discuss and vote out Mafia members.
          </div>
          <div className="p-3 bg-[#05070c] rounded-xl border border-red-900/60">
            <strong className="text-red-400 block mb-1">Mafia Team</strong>
            Godfather leads, has final say, and is immune to police inspection (&quot;No&quot;). Mafia kills villagers.
          </div>
          {/* Wildcard guide commented out
          <div className="p-3 bg-[#05070c] rounded-xl border border-amber-900/60">
            <strong className="text-amber-400 block mb-1">Wildcard</strong>
            Independent player whose goal is to get eliminated by daytime vote.
          </div>
          */}
        </div>
      )}
    </header>
  );
};
