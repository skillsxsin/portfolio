'use client';

import React from 'react';
import { ClientRoomState, Team } from '../types/game';
import { Sparkles, Trophy, Target, Award, CheckCircle2, Skull } from 'lucide-react';

interface GhostPredictionCardProps {
  roomState: ClientRoomState;
  onPredictNightTarget: (targetId: string) => void;
  onPredictDayTarget: (targetId: string) => void;
  onPredictWinner: (team: Team) => void;
}

export const GhostPredictionCard: React.FC<GhostPredictionCardProps> = ({
  roomState,
  onPredictNightTarget,
  onPredictDayTarget,
  onPredictWinner,
}) => {
  const myPlayer = roomState.myPlayer;
  const isDead = myPlayer?.isAlive === false;
  const isHost = myPlayer?.isHost === true;

  if (!isDead && !isHost) return null;

  const isNight = roomState.phase === 'NIGHT';
  const isDay = roomState.phase === 'DAY_DISCUSSION' || roomState.phase === 'DAY_VOTING';
  const myScore = roomState.ghostScores?.[roomState.myPlayerId] || { points: 0, correctGuesses: 0, history: [] };
  const myPred = roomState.myGhostPrediction || {};

  const alivePlayers = Object.values(roomState.players).filter((p) => !p.isHost && p.isAlive);
  const eliminatedPlayers = Object.values(roomState.players).filter((p) => !p.isHost && !p.isAlive);

  // Leaderboard ranking
  const leaderboard = Object.entries(roomState.ghostScores || {})
    .map(([id, score]) => ({
      id,
      name: roomState.players[id]?.name || 'Unknown Ghost',
      avatarEmoji: roomState.players[id]?.avatarEmoji || '👻',
      points: score.points,
      correctGuesses: score.correctGuesses,
    }))
    .sort((a, b) => b.points - a.points);

  const selectedNightVictim = myPred.nightVictimGuess ? roomState.players[myPred.nightVictimGuess] : null;
  const selectedDayLynch = myPred.dayLynchGuess ? roomState.players[myPred.dayLynchGuess] : null;

  return (
    <div className="card-panel border-purple-500/40 bg-gradient-to-br from-purple-950/40 via-[#0f172a]/90 to-black/80 font-mono space-y-4">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-purple-500/30 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-purple-900/60 border border-purple-500 flex items-center justify-center text-xl shadow-lg shadow-purple-900/40">
            👻
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-black text-purple-200 uppercase tracking-wider font-sans">
                Ghost Oracle Minigame
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-900/80 border border-purple-500 text-purple-300 font-extrabold">
                AFTERLIFE ARENA
              </span>
            </div>
            <p className="text-[11px] text-slate-300 font-sans">
              Eliminated? Predict match events to score points and crown the Ghost Oracle Champion!
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-black/60 px-3 py-1.5 rounded-xl border border-purple-500/50">
          <Trophy className="w-4 h-4 text-[#ffcc00]" />
          <span className="text-xs text-slate-300">Your Score:</span>
          <span className="text-sm font-black text-[#ffcc00]">{myScore.points} pts</span>
          <span className="text-[10px] text-purple-300 opacity-80">({myScore.correctGuesses} correct)</span>
        </div>
      </div>

      {/* Interactive Prediction Station */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* 1. Night Murder Prediction */}
        <div className={`p-3 rounded-xl border flex flex-col justify-between gap-2 transition-all ${
          isNight ? 'bg-purple-950/30 border-purple-500/60 ring-1 ring-purple-500/40' : 'bg-black/40 border-white/10 opacity-75'
        }`}>
          <div>
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[11px] font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1">
                <Target className="w-3.5 h-3.5 text-red-400" /> 1. Night Victim (+100 pts)
              </span>
              {isNight && <span className="text-[9px] text-emerald-400 font-extrabold animate-pulse">● ACTIVE</span>}
            </div>
            <p className="text-[10px] text-slate-400 font-sans leading-tight">
              Predict who the Mafia will assassinate tonight.
            </p>
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="text-[11px] flex items-center justify-between text-slate-300">
              <span>Your Bet:</span>
              <span className="font-bold text-[#ffcc00] truncate max-w-[140px]">
                {selectedNightVictim ? `${selectedNightVictim.avatarEmoji || '👾'} ${selectedNightVictim.name}` : 'No Bet Placed'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1 max-h-28 overflow-y-auto pr-1">
              {alivePlayers.map((p) => {
                const isSelected = myPred.nightVictimGuess === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => onPredictNightTarget(p.id)}
                    className={`px-2 py-1.5 rounded-lg text-[10px] font-bold border truncate text-left transition-all ${
                      isSelected
                        ? 'bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-900/50'
                        : 'bg-white/5 border-white/10 text-slate-200 hover:border-purple-400/40'
                    }`}
                  >
                    {p.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 2. Day Trial Prediction */}
        <div className={`p-3 rounded-xl border flex flex-col justify-between gap-2 transition-all ${
          isDay ? 'bg-purple-950/30 border-purple-500/60 ring-1 ring-purple-500/40' : 'bg-black/40 border-white/10 opacity-75'
        }`}>
          <div>
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-amber-400" /> 2. Day Trial Vote (+100 pts)
              </span>
              {isDay && <span className="text-[9px] text-emerald-400 font-extrabold animate-pulse">● ACTIVE</span>}
            </div>
            <p className="text-[10px] text-slate-400 font-sans leading-tight">
              Predict who the town will vote out during daytime trial.
            </p>
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="text-[11px] flex items-center justify-between text-slate-300">
              <span>Your Bet:</span>
              <span className="font-bold text-[#ffcc00] truncate max-w-[140px]">
                {selectedDayLynch ? `${selectedDayLynch.avatarEmoji || '👾'} ${selectedDayLynch.name}` : 'No Bet Placed'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1 max-h-28 overflow-y-auto pr-1">
              {alivePlayers.map((p) => {
                const isSelected = myPred.dayLynchGuess === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => onPredictDayTarget(p.id)}
                    className={`px-2 py-1.5 rounded-lg text-[10px] font-bold border truncate text-left transition-all ${
                      isSelected
                        ? 'bg-amber-600 text-white border-amber-400 shadow-md shadow-amber-900/50'
                        : 'bg-white/5 border-white/10 text-slate-200 hover:border-amber-400/40'
                    }`}
                  >
                    {p.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 3. Winning Faction Prediction */}
        <div className="p-3 rounded-xl border bg-purple-950/20 border-purple-500/40 flex flex-col justify-between gap-2">
          <div>
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> 3. Winning Team (+250 pts)
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-sans leading-tight">
              Bet on which faction will achieve final victory.
            </p>
          </div>

          <div className="space-y-2 pt-1">
            <div className="text-[11px] flex items-center justify-between text-slate-300">
              <span>Your Pick:</span>
              <span className="font-black text-[#ffcc00]">
                {myPred.winnerGuess ? (myPred.winnerGuess === 'MAFIA' ? '🕶️ MAFIA' : '🛡️ VILLAGERS') : 'No Pick'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onPredictWinner('VILLAGERS')}
                className={`py-2 px-2 rounded-lg text-[10px] font-black border flex items-center justify-center gap-1 transition-all ${
                  myPred.winnerGuess === 'VILLAGERS'
                    ? 'bg-emerald-700 text-white border-emerald-400 shadow-md shadow-emerald-900/50'
                    : 'bg-emerald-950/40 text-emerald-300 border-emerald-900 hover:bg-emerald-950'
                }`}
              >
                🛡️ VILLAGERS
              </button>

              <button
                onClick={() => onPredictWinner('MAFIA')}
                className={`py-2 px-2 rounded-lg text-[10px] font-black border flex items-center justify-center gap-1 transition-all ${
                  myPred.winnerGuess === 'MAFIA'
                    ? 'bg-red-700 text-white border-red-400 shadow-md shadow-red-900/50'
                    : 'bg-red-950/40 text-red-300 border-red-900 hover:bg-red-950'
                }`}
              >
                🕶️ MAFIA
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Ghost Oracle Leaderboard & History */}
      {leaderboard.length > 0 && (
        <div className="p-3 rounded-xl bg-black/60 border border-purple-500/30 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-purple-300 uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-[#ffcc00]" /> Ghost Oracle Leaderboard ({leaderboard.length} Ghosts)
            </span>
            <span className="text-[10px] text-slate-400 font-normal">Updated Live</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {leaderboard.map((item, idx) => {
              const isMe = item.id === roomState.myPlayerId;
              return (
                <div
                  key={item.id}
                  className={`p-2 rounded-lg border text-xs flex items-center justify-between gap-2 ${
                    isMe
                      ? 'bg-purple-900/40 border-purple-400 text-white font-bold'
                      : idx === 0
                      ? 'bg-[#ffcc00]/10 border-[#ffcc00]/40 text-[#ffcc00]'
                      : 'bg-white/5 border-white/10 text-slate-300'
                  }`}
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <span className="text-[10px] opacity-75 font-bold">#{idx + 1}</span>
                    <span>{item.avatarEmoji}</span>
                    <span className="truncate">{item.name} {isMe ? '(You)' : ''}</span>
                  </span>
                  <span className="font-mono font-black text-[#ffcc00] shrink-0">
                    {item.points} pts
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
