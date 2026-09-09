'use client';

import React, { useState } from 'react';
import { ClientRoomState } from '../types/game';
import { VotingStatsChart } from './VotingStatsChart';
import { Target, Lock, X, CheckCircle2, Ban } from 'lucide-react';

interface VotingModalProps {
  roomState: ClientRoomState;
  onCastVote: (targetId: string | null) => void;
  onSelectPendingVote?: (targetId: string | null) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const VotingModal: React.FC<VotingModalProps> = ({ roomState, onCastVote, onSelectPendingVote, isOpen, onClose }) => {
  const isVoting = roomState.phase === 'DAY_VOTING';
  const myPlayer = roomState.myPlayer;

  const [selectedVoteTargetId, setSelectedVoteTargetId] = useState<string | null>(myPlayer?.votedForId || null);

  if (!isVoting || !isOpen || !myPlayer) return null;

  const candidates = Object.values(roomState.players).filter((p) => !p.isHost && p.isAlive && p.id !== myPlayer.id);

  const handleSelectCandidate = (targetId: string | null) => {
    setSelectedVoteTargetId(targetId);
    if (onSelectPendingVote) onSelectPendingVote(targetId);
  };

  const handleConfirmLockVote = () => {
    onCastVote(selectedVoteTargetId);
  };

  const selectedTargetPlayer = selectedVoteTargetId ? roomState.players[selectedVoteTargetId] : null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-50 p-3 sm:p-4 font-mono overflow-y-auto">
      <div className="max-w-4xl w-full border-2 border-[#ffcc00]/50 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 shadow-2xl space-y-4 sm:space-y-6 bg-gradient-to-b from-[#1e293b]/95 via-[#0f172a]/95 to-[#0a0e19]/98 text-white my-auto max-h-[92vh] overflow-y-auto relative">
        <div className="card-bracket top-left"></div>
        <div className="card-bracket top-right"></div>
        <div className="card-bracket bottom-left"></div>
        <div className="card-bracket bottom-right"></div>
        {/* Modal Top Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3 sm:pb-4 gap-2">
          <div>
            <h2 className="text-lg sm:text-2xl font-black text-white uppercase tracking-tight font-sans flex items-center gap-2">
              <Target className="w-5 h-5 sm:w-6 sm:h-6 text-[#ffcc00] shrink-0" /> DAYTIME VOTING & SELECTION CHART
            </h2>
            <p className="text-[10px] sm:text-xs text-slate-400 font-mono">Live Slido-style polling graph & vote locking</p>
          </div>
          <button onClick={onClose} className="p-1.5 sm:p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-400 hover:text-white shrink-0">
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Slido Style Vertical Bar Chart */}
        <VotingStatsChart roomState={roomState} />

        {/* Interactive Candidate Selection Grid (Disappears after locking) */}
        {myPlayer.isAlive && !myPlayer.isHost && (
          myPlayer.hasVoted ? (
            <div className="p-4 sm:p-5 rounded-2xl bg-emerald-950/80 border border-emerald-500 text-emerald-300 flex flex-wrap items-center justify-between gap-3 font-mono">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-bold">
                <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400 shrink-0" />
                <span>YOUR VOTE IS CONFIRMED & LOCKED. SELECTION MENU CLOSED.</span>
              </div>
              <span className="bg-emerald-900 border border-emerald-600 text-white px-3 sm:px-4 py-1.5 rounded-xl text-xs font-black">
                🔒 VOTE LOCKED
              </span>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-bold text-[#ffcc00] uppercase tracking-wider">
                  Select Suspect to Remove
                </h3>
                <button
                  onClick={() => handleSelectCandidate(null)}
                  className={`btn-secondary text-xs !py-1 ${selectedVoteTargetId === null ? 'bg-[#ffcc00]/20 text-[#ffcc00] border-[#ffcc00]/40' : 'text-slate-300'}`}
                >
                  <Ban className="w-3.5 h-3.5 inline mr-1" /> Abstain
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-2.5 max-h-48 sm:max-h-60 overflow-y-auto p-1">
                {candidates.map((p) => {
                  const isSelected = selectedVoteTargetId === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => handleSelectCandidate(p.id)}
                      className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border text-center font-bold text-xs transition-all ${
                        isSelected
                          ? 'bg-[#ffcc00] text-[#05070c] border-[#ffcc00] shadow-lg shadow-[#ffcc00]/20 scale-105'
                          : 'bg-white/5 border-white/10 text-white hover:border-white/25'
                      }`}
                    >
                      {p.name}
                    </button>
                  );
                })}
              </div>

              {/* Lock Vote Confirmation Banner */}
              <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-[#05070c] border border-[#ffcc00]/40 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs">
                  <Lock className="w-4 h-4 text-[#ffcc00] shrink-0" />
                  <span className="text-slate-300">
                    Target Selected:{' '}
                    <strong className="text-[#ffcc00] font-extrabold">
                      {selectedTargetPlayer ? selectedTargetPlayer.name : selectedVoteTargetId === null ? 'Abstain Vote' : 'None Selected'}
                    </strong>
                  </span>
                </div>

                <button
                  onClick={handleConfirmLockVote}
                  className="btn-primary w-full sm:w-auto py-2.5 px-6 sm:px-8 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-[#ffcc00]/20"
                >
                  <Lock className="w-4 h-4" /> LOCK VOTE NOW
                </button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
};
