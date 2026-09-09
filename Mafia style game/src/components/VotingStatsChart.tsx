'use client';

import React from 'react';
import { ClientRoomState } from '../types/game';
import { BarChart3, Vote, Flame, Users, Lock, MousePointerClick } from 'lucide-react';

interface VotingStatsChartProps {
  roomState: ClientRoomState;
}

// Vibrant colors matching the user's Slido mockup image
const BAR_COLORS = [
  'bg-[#4f46e5] text-white', // Royal Indigo / Blue
  'bg-[#f43f5e] text-white', // Coral Rose / Red
  'bg-[#1e1b4b] text-white border border-indigo-400/40', // Deep Navy
  'bg-[#8b5cf6] text-white', // Purple
  'bg-[#ffcc00] text-[#05070c]', // Neon Gold
  'bg-[#10b981] text-white', // Emerald
];

export const VotingStatsChart: React.FC<VotingStatsChartProps> = ({ roomState }) => {
  const isVoting = roomState.phase === 'DAY_VOTING';
  const players = Object.values(roomState.players).filter((p) => !p.isHost);
  const alivePlayers = players.filter((p) => p.isAlive);

  // Compute live vote statistics, locked votes, and pending selections
  const voteCounts: Record<string, number> = {};
  const lockedVotersMap: Record<string, string[]> = {};
  const pendingVotersMap: Record<string, string[]> = {};
  const voteLinks: Array<{ voterName: string; targetName: string; isLocked: boolean; isAbstain: boolean }> = [];
  let totalVotesLocked = 0;

  players.forEach((p) => {
    if (p.hasVoted) {
      totalVotesLocked++;
      if (p.votedForId) {
        const targetPlayer = roomState.players[p.votedForId];
        const targetName = targetPlayer ? targetPlayer.name : 'Unknown';
        voteCounts[p.votedForId] = (voteCounts[p.votedForId] || 0) + 1;
        lockedVotersMap[p.votedForId] = lockedVotersMap[p.votedForId] || [];
        lockedVotersMap[p.votedForId].push(p.name);
        voteLinks.push({ voterName: p.name, targetName, isLocked: true, isAbstain: false });
      } else {
        voteLinks.push({ voterName: p.name, targetName: 'Abstain', isLocked: true, isAbstain: true });
      }
    } else if (p.pendingVoteTargetId) {
      // Pending vote selection before locking
      const targetId = p.pendingVoteTargetId;
      const targetPlayer = roomState.players[targetId];
      const targetName = targetPlayer ? targetPlayer.name : 'Unknown';
      voteCounts[targetId] = (voteCounts[targetId] || 0) + 1;
      pendingVotersMap[targetId] = pendingVotersMap[targetId] || [];
      pendingVotersMap[targetId].push(p.name);
      voteLinks.push({ voterName: p.name, targetName: `${targetName} (Selecting)`, isLocked: false, isAbstain: false });
    }
  });

  const maxVotes = Math.max(...Object.values(voteCounts), 1);
  const turnoutPercentage = alivePlayers.length > 0 ? Math.round((totalVotesLocked / alivePlayers.length) * 100) : 0;

  // List of all active candidate targets (plus those with votes/selections)
  const candidateTargets = alivePlayers.map((p) => {
    const count = voteCounts[p.id] || 0;
    return {
      id: p.id,
      name: p.name,
      avatarEmoji: p.avatarEmoji || '👾',
      count,
      percentage: alivePlayers.length > 0 ? Math.round((count / alivePlayers.length) * 100) : 0,
      relativeHeight: Math.max(15, Math.round((count / maxVotes) * 100)),
      lockedVoters: lockedVotersMap[p.id] || [],
      pendingVoters: pendingVotersMap[p.id] || [],
    };
  });

  if (!isVoting && totalVotesLocked === 0) return null;

  return (
    <div className="card-panel-accent mb-6 border-[#ffcc00]/50 font-mono space-y-4 sm:space-y-6 bg-gradient-to-b from-[#1e293b]/90 via-[#0f172a]/90 to-[#0a0e19]/95 p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl shadow-2xl">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-white/15 pb-3 sm:pb-4">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-[#ffcc00]/20 border border-[#ffcc00]/50 flex items-center justify-center shadow-lg shrink-0">
            <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-[#ffcc00]" />
          </div>
          <div>
            <h3 className="text-base sm:text-xl font-black text-white uppercase tracking-tight font-sans">
              Who should be eliminated today?
            </h3>
            <p className="text-[10px] sm:text-xs text-slate-300 font-mono flex items-center gap-1.5 mt-0.5">
              <Flame className="w-3.5 h-3.5 text-red-400" /> Live Polling Bar Chart & Locked Voters
            </p>
          </div>
        </div>

        {/* Turnout Chip */}
        <div className="flex items-center gap-1.5 sm:gap-2 bg-[#0f172a]/80 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl border border-white/20 text-[11px] sm:text-xs font-mono">
          <Vote className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#ffcc00]" />
          <span className="text-slate-300">TURNOUT:</span>
          <strong className="text-white font-bold">{totalVotesLocked} / {alivePlayers.length} ({turnoutPercentage}%)</strong>
        </div>
      </div>

      {/* Vertical Bar Graph Section (Matching Slido Mockup) */}
      <div className="bg-[#0f172a]/70 border border-white/20 rounded-2xl sm:rounded-3xl p-3 sm:p-6 md:p-8 space-y-4 shadow-inner">
        <div className="h-72 sm:h-80 md:h-84 flex items-end justify-around gap-2 sm:gap-4 md:gap-6 pt-16 sm:pt-20 pb-3 px-1 sm:px-2 overflow-x-auto scrollbar-thin">
          {candidateTargets.map((item, index) => {
            const colorClass = BAR_COLORS[index % BAR_COLORS.length];
            return (
              <div key={item.id} className="flex-1 flex flex-col items-center h-full justify-end min-w-[64px] sm:min-w-[80px] max-w-[110px] sm:max-w-[140px] group">
                {/* Floating Locked & Selecting Badges UI Element above graph */}
                <div className="mb-2 flex flex-col items-center gap-0.5 sm:gap-1 max-w-full z-10">
                  {/* Locked Voters Badges */}
                  {item.lockedVoters.map((voter, vIdx) => (
                    <span
                      key={`locked_${vIdx}`}
                      className="bg-emerald-950/90 border border-emerald-500 text-emerald-300 text-[8px] sm:text-[10px] font-black px-1.5 py-0.5 rounded-full flex items-center gap-1 shadow-lg shadow-emerald-500/20 tracking-wider truncate max-w-[85px] sm:max-w-[120px]"
                    >
                      <Lock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-400 shrink-0" /> {voter}
                    </span>
                  ))}

                  {/* Pending Selecting Voters Badges */}
                  {item.pendingVoters.map((voter, pIdx) => (
                    <span
                      key={`pending_${pIdx}`}
                      className="bg-[#ffcc00]/20 border border-[#ffcc00]/50 text-[#ffcc00] text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 animate-pulse shadow truncate max-w-[80px] sm:max-w-[110px]"
                    >
                      <MousePointerClick className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#ffcc00] shrink-0" /> {voter}
                    </span>
                  ))}
                </div>

                {/* Big Count Number right above the bar top */}
                <div className="text-xl sm:text-2xl md:text-3xl font-black text-white font-mono mb-1.5 sm:mb-2 group-hover:scale-110 transition-transform">
                  {item.count}
                </div>

                {/* Animated Vertical Bar */}
                <div className="w-full relative flex items-end justify-center rounded-t-2xl overflow-hidden bg-white/5 border-t border-x border-white/10">
                  <div
                    className={`w-full rounded-t-2xl ${colorClass} transition-all duration-500 ease-out shadow-lg flex items-center justify-center font-black text-xs font-mono`}
                    style={{ height: `${item.count > 0 ? item.relativeHeight : 8}%` }}
                  >
                    {item.count > 0 && <span className="opacity-80 text-[10px] hidden md:inline">{item.percentage}%</span>}
                  </div>
                </div>

                {/* Player Candidate Name Below Bar */}
                <div className="mt-2 sm:mt-3 text-center w-full">
                  <span className="font-extrabold text-[11px] sm:text-xs text-slate-200 font-sans flex items-center justify-center gap-1 truncate max-w-full">
                    <span>{item.avatarEmoji}</span>
                    <span className="truncate">{item.name}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Vote Connections Matrix */}
      {voteLinks.length > 0 && (
        <div className="pt-2 border-t border-white/10 space-y-3 font-mono">
          <h4 className="text-xs font-bold text-[#ffcc00] uppercase tracking-wider flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" /> Live Vote Connections Matrix
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {voteLinks.map((link, idx) => (
              <div key={idx} className="p-2.5 bg-[#05070c] rounded-xl border border-white/15 flex items-center justify-between text-xs">
                <span className="font-bold text-white flex items-center gap-1">
                  {link.isLocked && <Lock className="w-3 h-3 text-emerald-400" />} {link.voterName}
                </span>
                <span className="text-[#ffcc00] font-black text-sm mx-1">➔</span>
                <span className={`font-bold ${link.isAbstain ? 'text-slate-400 italic' : link.isLocked ? 'text-emerald-400' : 'text-[#ffcc00]'}`}>
                  {link.targetName}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};


