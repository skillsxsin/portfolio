'use client';

import React from 'react';
import { ClientRoomState } from '../types/game';
import { Scale, CheckCircle2, ShieldCheck, Sun } from 'lucide-react';

interface TieVoteModalProps {
  roomState: ClientRoomState;
}

export const TieVoteModal: React.FC<TieVoteModalProps> = ({ roomState }) => {
  const voteOutcome = roomState.lastVoteOutcome;
  const nightOutcome = roomState.lastNightOutcome;
  const [dismissedVoteId, setDismissedVoteId] = React.useState<string | null>(null);
  const [dismissedNightId, setDismissedNightId] = React.useState<string | null>(null);

  const isVoteNoKill = voteOutcome && (voteOutcome.type === 'TIE' || voteOutcome.type === 'ABSTAIN');
  const voteOutcomeId = isVoteNoKill
    ? `${voteOutcome.type}_${voteOutcome.timestamp || ''}_${roomState.dayNumber}`
    : null;

  const isNightNoKill = nightOutcome && nightOutcome.noDeaths && roomState.phase === 'DAY_DISCUSSION';
  const nightOutcomeId = isNightNoKill
    ? `night_safe_${nightOutcome.savedByDoctor ? 'doc' : 'quiet'}_${nightOutcome.timestamp || ''}_${roomState.dayNumber}`
    : null;

  const showVoteModal = isVoteNoKill && voteOutcomeId !== dismissedVoteId && roomState.phase !== 'LOBBY';
  const showNightModal = !showVoteModal && isNightNoKill && nightOutcomeId !== dismissedNightId && roomState.phase !== 'LOBBY';

  if (!showVoteModal && !showNightModal) {
    return null;
  }

  if (showVoteModal && voteOutcome) {
    return (
      <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4 font-mono">
        <div className="max-w-md w-full border-2 border-[#ffcc00]/70 rounded-2xl sm:rounded-3xl p-6 shadow-2xl space-y-4 text-center bg-gradient-to-b from-amber-950/95 via-[#0f172a]/98 to-[#0a0e19]/98 text-white relative">
          <div className="card-bracket top-left"></div>
          <div className="card-bracket top-right"></div>
          <div className="card-bracket bottom-left"></div>
          <div className="card-bracket bottom-right"></div>
          
          <div className="w-14 h-14 rounded-2xl bg-black/60 border border-[#ffcc00]/40 mx-auto flex items-center justify-center shadow-xl">
            <Scale className="w-8 h-8 text-[#ffcc00]" />
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#ffcc00] bg-white/10 px-3 py-0.5 rounded-full inline-block border border-[#ffcc00]/30">
              DAYTIME VOTE OUTCOME
            </span>
            <h2 className="text-2xl font-black text-white uppercase font-sans tracking-tight">
              NO ONE WAS KILLED
            </h2>
            <p className="text-xs text-amber-200/90 leading-relaxed font-sans">
              {voteOutcome.type === 'ABSTAIN'
                ? 'All players abstained. Nobody was eliminated in today\'s vote.'
                : 'Daytime vote resulted in a tie. Nobody was eliminated today.'}
            </p>
          </div>

          <button
            onClick={() => voteOutcomeId && setDismissedVoteId(voteOutcomeId)}
            className="btn-primary w-full py-3 sm:py-3.5 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-xl"
          >
            <CheckCircle2 className="w-4 h-4" /> CONTINUE
          </button>
        </div>
      </div>
    );
  }

  if (showNightModal && nightOutcome) {
    return (
      <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4 font-mono">
        <div className="max-w-md w-full border-2 border-emerald-500/70 rounded-2xl sm:rounded-3xl p-6 shadow-2xl space-y-4 text-center bg-gradient-to-b from-emerald-950/95 via-[#0f172a]/98 to-[#0a0e19]/98 text-white relative">
          <div className="card-bracket top-left"></div>
          <div className="card-bracket top-right"></div>
          <div className="card-bracket bottom-left"></div>
          <div className="card-bracket bottom-right"></div>
          
          <div className="w-14 h-14 rounded-2xl bg-black/60 border border-emerald-500/40 mx-auto flex items-center justify-center shadow-xl">
            {nightOutcome.savedByDoctor ? (
              <ShieldCheck className="w-8 h-8 text-emerald-400 animate-pulse" />
            ) : (
              <Sun className="w-8 h-8 text-[#ffcc00]" />
            )}
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-300 bg-white/10 px-3 py-0.5 rounded-full inline-block border border-emerald-500/30">
              DAWN REPORT (DAY {roomState.dayNumber})
            </span>
            <h2 className="text-2xl font-black text-white uppercase font-sans tracking-tight">
              NO ONE WAS KILLED TONIGHT
            </h2>
            <p className="text-xs text-emerald-200/90 leading-relaxed font-sans">
              {nightOutcome.savedByDoctor
                ? 'The Doctor successfully healed and protected the target from the Mafia attack!'
                : 'A quiet and peaceful night. No casualties occurred.'}
            </p>
          </div>

          <button
            onClick={() => nightOutcomeId && setDismissedNightId(nightOutcomeId)}
            className="btn-primary w-full py-3 sm:py-3.5 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-xl"
          >
            <CheckCircle2 className="w-4 h-4" /> CONTINUE
          </button>
        </div>
      </div>
    );
  }

  return null;
};

