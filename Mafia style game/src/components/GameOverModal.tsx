'use client';

import React from 'react';
import { ClientRoomState } from '../types/game';
import { RotateCcw, Users } from 'lucide-react';

interface GameOverModalProps {
  roomState: ClientRoomState;
  onResetToLobby: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({ roomState, onResetToLobby }) => {
  const [confirmResetOpen, setConfirmResetOpen] = React.useState(false);
  const [isRevealing, setIsRevealing] = React.useState(true);

  React.useEffect(() => {
    if (roomState.phase === 'GAME_OVER') {
      setIsRevealing(true);
      const timer = setTimeout(() => {
        setIsRevealing(false);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [roomState.phase, roomState.winner]);

  if (roomState.phase !== 'GAME_OVER') return null;

  if (isRevealing) {
    return (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4 font-mono">
        <div className="card-panel-accent max-w-sm w-full text-center space-y-4 p-8 border-[#ffcc00]/40">
          <div className="w-14 h-14 border-4 border-[#ffcc00] border-t-transparent rounded-full animate-spin mx-auto shadow-xl shadow-[#ffcc00]/20" />
          <h3 className="text-base font-black text-[#ffcc00] uppercase tracking-wider">
            CALCULATING FINAL MATCH RESULTS...
          </h3>
          <p className="text-xs text-slate-300 font-sans animate-pulse">
            Tallying votes, night actions, and faction victory conditions
          </p>
        </div>
      </div>
    );
  }

  const winner      = roomState.winner;
  const players     = Object.values(roomState.players).filter((p) => !p.isHost);

  const isVillagersWin = winner === 'VILLAGERS';
  const isMafiaWin     = winner === 'MAFIA';
  /* const isWildcardWin  = winner === 'WILDCARD'; */

  const headline  = isVillagersWin
    ? 'VILLAGERS VICTORY'
    : isMafiaWin
    ? 'MAFIA VICTORY'
    /* : isWildcardWin ? 'WILDCARD VICTORY' */
    : 'MATCH CONCLUDED';

  const subline   = isVillagersWin
    ? 'All Mafia members and the Godfather have been eliminated.'
    : isMafiaWin
    ? 'The Mafia equal or outnumber the rest of the villagers.'
    /* : isWildcardWin ? 'Successfully tricked daytime voting for a solo victory.' */
    : '';

  const bgColor   = isVillagersWin
    ? 'from-emerald-950/95 border-emerald-500'
    : isMafiaWin
    ? 'from-red-950/95 border-red-500'
    /* : isWildcardWin ? 'from-amber-950/95 border-[#ffcc00]' */
    : 'from-[#121829] border-white/30';

  const headColor = isVillagersWin
    ? 'text-emerald-300'
    : isMafiaWin
    ? 'text-red-300'
    /* : isWildcardWin ? 'text-[#ffcc00]' */
    : 'text-white';

  const handleResetClick = () => {
    setConfirmResetOpen(true);
  };

  const handleConfirmReset = () => {
    setConfirmResetOpen(false);
    onResetToLobby();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
      <div className={`max-w-xl w-full bg-gradient-to-b ${bgColor} to-[#0a0e19]/98 border-2 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 shadow-2xl space-y-4 sm:space-y-6 font-mono my-auto max-h-[92vh] overflow-y-auto relative`}>
        <div className="card-bracket top-left"></div>
        <div className="card-bracket top-right"></div>
        <div className="card-bracket bottom-left"></div>
        <div className="card-bracket bottom-right"></div>
        {/* Top Header */}
        <div className="text-center space-y-2 sm:space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-0.5 sm:py-1 rounded-full bg-[#ffcc00]/10 border border-[#ffcc00]/40 text-[#ffcc00] text-[10px] sm:text-xs font-mono font-bold uppercase">
            MATCH RESULT SUMMARY
          </div>
          <h2 className={`text-2xl sm:text-3xl md:text-4xl font-black ${headColor} tracking-wider uppercase font-sans`}>{headline}</h2>
          <p className="text-slate-300 text-xs font-sans leading-relaxed max-w-md mx-auto">{subline}</p>
        </div>

        {/* Full Match Statistics & Role Reveal */}
        <div>
          <div className="flex items-center justify-between mb-2.5 border-b border-white/10 pb-2">
            <h3 className="text-xs font-bold text-[#ffcc00] uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4" /> Full Match Role Reveal ({players.length} Players)
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">Day {roomState.dayNumber || 1}</span>
          </div>

          <div className="space-y-2 max-h-48 sm:max-h-64 overflow-y-auto pr-1">
            {players.map((p) => {
              const role = roomState.allRolesRevealed?.[p.id]?.role || p.role;
              const isMafiaTeam = p.team === 'MAFIA' || role === 'GODFATHER' || role === 'MAFIA';
              /* const isWildcard = role === 'WILDCARD'; */
              return (
                <div key={p.id} className={`flex items-center justify-between p-2.5 sm:p-3 rounded-xl border text-xs gap-2 ${
                  isMafiaTeam ? 'bg-red-950/50 border-red-800 text-red-200'
                  /* : isWildcard ? 'bg-amber-950/50 border-amber-800 text-amber-200' */
                  : 'bg-emerald-950/40 border-emerald-800 text-emerald-200'
                }`}>
                  <div className="flex items-center gap-2.5 sm:gap-3 truncate">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center font-bold text-xs text-white shrink-0">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="truncate">
                      <span className="font-bold text-white font-sans text-xs sm:text-sm block truncate">{p.name}</span>
                      <span className={`text-[9px] sm:text-[10px] font-mono font-semibold ${p.isAlive ? 'text-emerald-400' : 'text-red-400'}`}>
                        {p.isAlive ? 'ALIVE' : 'ELIMINATED'}
                      </span>
                    </div>
                  </div>
                  <span className={`font-mono font-bold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg border text-[11px] sm:text-xs shrink-0 ${
                    isMafiaTeam ? 'bg-red-900/60 border-red-700 text-red-200'
                    /* : isWildcard ? 'bg-amber-900/60 border-amber-700 text-amber-200' */
                    : 'bg-emerald-900/60 border-emerald-700 text-emerald-200'
                  }`}>{role}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Post-Game Return to Host Page Button */}
        <div className="pt-2 border-t border-white/10 space-y-2 sm:space-y-3">
          <button
            onClick={handleResetClick}
            className="btn-primary w-full py-3 sm:py-3.5 text-xs sm:text-sm font-black flex items-center justify-center gap-2 uppercase tracking-wider shadow-xl shadow-[#ffcc00]/25"
          >
            <RotateCcw className="w-4 h-4" />
            RETURN TO HOST COMMAND PAGE
          </button>
          <p className="text-center text-[10px] sm:text-[11px] text-slate-400 font-sans">
            Return to the Host Command Center to configure limits and start a new match.
          </p>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmResetOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card-panel-accent max-w-md w-full text-center space-y-4 font-mono">
            <h3 className="text-base font-black text-[#ffcc00] uppercase tracking-wider">Confirm Return To Host Lobby</h3>
            <p className="text-xs text-slate-300 font-sans leading-relaxed">
              Are you sure you want to reset the room and return to the Host Lobby to start a new game?
            </p>
            <div className="flex gap-3 justify-center pt-2">
              <button onClick={() => setConfirmResetOpen(false)} className="btn-secondary flex-1 py-2 text-xs">
                CANCEL
              </button>
              <button onClick={handleConfirmReset} className="btn-primary flex-1 py-2 text-xs font-bold">
                CONFIRM RESET
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
