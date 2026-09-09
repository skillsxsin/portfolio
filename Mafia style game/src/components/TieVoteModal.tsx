'use client';

import React from 'react';
import { ClientRoomState } from '../types/game';
import { Scale, CheckCircle2 } from 'lucide-react';

interface TieVoteModalProps {
  roomState: ClientRoomState;
}

export const TieVoteModal: React.FC<TieVoteModalProps> = ({ roomState }) => {
  const outcome = roomState.lastVoteOutcome;
  const [dismissedId, setDismissedId] = React.useState<string | null>(null);

  const outcomeId = outcome && (outcome.type === 'TIE' || outcome.type === 'ABSTAIN')
    ? `${outcome.type}_${outcome.timestamp || ''}_${roomState.dayNumber}`
    : null;

  if (!outcome || !outcomeId || outcomeId === dismissedId || roomState.phase === 'LOBBY') {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 font-mono overflow-y-auto">
      <div className="max-w-sm w-full border-2 border-[#ffcc00]/60 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 sm:space-y-5 text-center bg-gradient-to-b from-amber-950/90 via-[#0f172a]/95 to-[#0a0e19]/98 text-white my-auto max-h-[92vh] overflow-y-auto relative">
        <div className="card-bracket top-left"></div>
        <div className="card-bracket top-right"></div>
        <div className="card-bracket bottom-left"></div>
        <div className="card-bracket bottom-right"></div>
        <div className="w-14 h-14 rounded-2xl bg-black/60 border border-[#ffcc00]/30 mx-auto flex items-center justify-center shadow-xl">
          <Scale className="w-8 h-8 text-[#ffcc00]" />
        </div>

        <div className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#ffcc00] bg-white/10 px-3 py-0.5 rounded-full inline-block">
            VOTE OUTCOME
          </span>
          <h2 className="text-xl font-black text-white uppercase font-sans">
            NO ONE ELIMINATED
          </h2>
          <p className="text-xs text-amber-200">
            {outcome.type === 'ABSTAIN' ? 'All players abstained.' : 'Voting tied — no player was eliminated.'}
          </p>
        </div>

        <button
          onClick={() => setDismissedId(outcomeId)}
          className="btn-primary w-full py-3 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-xl"
        >
          <CheckCircle2 className="w-4 h-4" /> CONTINUE
        </button>
      </div>
    </div>
  );
};
