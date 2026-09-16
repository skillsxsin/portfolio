'use client';

import React from 'react';
import { ClientRoomState } from '../types/game';
import { Skull, CheckCircle2, ShieldAlert, Users } from 'lucide-react';

interface EliminationModalProps {
  roomState: ClientRoomState;
  onDismiss?: () => void;
}

export const EliminationModal: React.FC<EliminationModalProps> = ({ roomState, onDismiss }) => {
  const lastElim = roomState.lastEliminatedPlayer;
  const [dismissedId, setDismissedId] = React.useState<string | null>(null);

  const elimEventId = lastElim ? `${lastElim.id}_${lastElim.reason}_${lastElim.category || lastElim.role || ''}_${lastElim.timestamp || ''}` : null;

  if (!lastElim || !elimEventId || elimEventId === dismissedId || roomState.phase === 'LOBBY') {
    return null;
  }

  const isKiller = lastElim.category === 'KILLERS' || lastElim.role === 'GODFATHER' || lastElim.role === 'MAFIA' || lastElim.team === 'MAFIA';
  const categoryLabel = isKiller ? 'KILLERS' : 'VILLAGERS';
  const categorySubtext = isKiller ? 'Godfather & Mafia Syndicate' : 'Innocent Villagers, Doctor & Police';

  const reasonText =
    lastElim.reason === 'NIGHT_ATTACK' || lastElim.reason === 'Night Attack'
      ? 'Killed in the Night'
      : lastElim.reason === 'VOTED_OUT' || lastElim.reason === 'Voted Out'
      ? 'Eliminated by Daytime Vote'
      : lastElim.reason === 'HOST_ELIMINATED'
      ? 'Eliminated by Game Master'
      : 'Eliminated from the Match';

  const handleDismiss = () => {
    setDismissedId(elimEventId);
    if (onDismiss) onDismiss();
  };

  const borderColor = isKiller ? 'border-red-500/80' : 'border-emerald-500/80';
  const bgGradient = isKiller
    ? 'from-red-950/95 via-[#0f172a]/98 to-[#0a0e19]/98'
    : 'from-emerald-950/95 via-[#0f172a]/98 to-[#0a0e19]/98';
  const badgeBg = isKiller
    ? 'bg-red-900/80 text-red-200 border-red-600 ring-1 ring-red-500/40'
    : 'bg-emerald-900/80 text-emerald-200 border-emerald-600 ring-1 ring-emerald-500/40';

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4 font-mono">
      <div className={`max-w-md w-full border-2 ${borderColor} rounded-2xl sm:rounded-3xl p-6 sm:p-7 shadow-2xl space-y-4 text-center bg-gradient-to-b ${bgGradient} text-white relative`}>
        <div className="card-bracket top-left"></div>
        <div className="card-bracket top-right"></div>
        <div className="card-bracket bottom-left"></div>
        <div className="card-bracket bottom-right"></div>

        <div className="w-14 h-14 rounded-2xl bg-black/60 border border-white/20 mx-auto flex items-center justify-center shadow-xl">
          {isKiller ? (
            <ShieldAlert className="w-8 h-8 text-red-400 animate-pulse" />
          ) : (
            <Skull className="w-8 h-8 text-emerald-400" />
          )}
        </div>

        <div className="space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300 bg-white/10 px-3 py-0.5 rounded-full inline-block border border-white/15">
            {reasonText}
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-white uppercase font-sans tracking-tight">
            {lastElim.name}
          </h2>
        </div>

        {/* 2-Category Alignment Callout Box */}
        <div className={`p-3.5 sm:p-4 rounded-2xl border text-center space-y-1 ${badgeBg}`}>
          <div className="text-[10px] uppercase font-mono tracking-widest opacity-80 flex items-center justify-center gap-1">
            <Users className="w-3.5 h-3.5" /> REVEALED ALIGNMENT
          </div>
          <div className="text-xl sm:text-2xl font-black tracking-wider uppercase font-sans">
            {categoryLabel}
          </div>
          <div className="text-[11px] font-sans opacity-90">
            {categorySubtext}
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="btn-primary w-full py-3 sm:py-3.5 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-xl"
        >
          <CheckCircle2 className="w-4 h-4" /> CONTINUE
        </button>
      </div>
    </div>
  );
};


