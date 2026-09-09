'use client';

import React from 'react';
import { ClientRoomState } from '../types/game';
import { Skull, CheckCircle2 } from 'lucide-react';

interface EliminationModalProps {
  roomState: ClientRoomState;
  onDismiss?: () => void;
}

export const EliminationModal: React.FC<EliminationModalProps> = ({ roomState, onDismiss }) => {
  const lastElim = roomState.lastEliminatedPlayer;
  const [dismissedId, setDismissedId] = React.useState<string | null>(null);

  const elimEventId = lastElim ? `${lastElim.id}_${lastElim.reason}_${lastElim.role}_${lastElim.timestamp || ''}` : null;

  if (!lastElim || !elimEventId || elimEventId === dismissedId || roomState.phase === 'LOBBY') {
    return null;
  }

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

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 font-mono overflow-y-auto">
      <div className="max-w-sm w-full border-2 border-red-500/60 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 sm:space-y-5 text-center bg-gradient-to-b from-red-950/90 via-[#0f172a]/95 to-[#0a0e19]/98 text-white my-auto max-h-[92vh] overflow-y-auto relative">
        <div className="card-bracket top-left"></div>
        <div className="card-bracket top-right"></div>
        <div className="card-bracket bottom-left"></div>
        <div className="card-bracket bottom-right"></div>
        <div className="w-14 h-14 rounded-2xl bg-black/60 border border-white/20 mx-auto flex items-center justify-center shadow-xl">
          <Skull className="w-8 h-8 text-red-400 animate-pulse" />
        </div>

        <div className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-red-400 bg-white/10 px-3 py-0.5 rounded-full inline-block">
            ELIMINATED
          </span>
          <h2 className="text-2xl font-black text-white uppercase font-sans">
            {lastElim.name}
          </h2>
          <p className="text-xs text-slate-300">
            {reasonText}
          </p>
        </div>

        <button
          onClick={handleDismiss}
          className="btn-primary w-full py-3 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-xl"
        >
          <CheckCircle2 className="w-4 h-4" /> CONTINUE
        </button>
      </div>
    </div>
  );
};

