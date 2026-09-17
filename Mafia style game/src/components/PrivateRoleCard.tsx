'use client';

import React from 'react';
import { ClientPlayer } from '../types/game';
import { Shield, Search } from 'lucide-react';

interface PrivateRoleCardProps {
  player?: ClientPlayer;
  players?: Record<string, ClientPlayer>;
}

const ROLE_META: Record<string, { color: string; description: string; bg: string }> = {
  GODFATHER: {
    color: 'text-purple-300', bg: 'border-purple-500/30 bg-purple-950/20',
    description: 'Immune to police and leader of the Mafia. Your identity is hidden, and the Police always receives "No" (Appears Innocent) when inspecting you. If Mafia members disagree on a target, your choice has the final say.',
  },
  MAFIA: {
    color: 'text-red-300', bg: 'border-red-500/30 bg-red-950/20',
    description: 'Kills the villagers. You work with the Godfather to secretly eliminate villagers each night. All Mafia know each other and know the Godfather.',
  },
  DOCTOR: {
    color: 'text-emerald-300', bg: 'border-emerald-500/30 bg-emerald-950/20',
    description: 'Heals. Choose one player to heal each night. If that player is attacked by the Mafia, they survive.',
  },
  POLICE: {
    color: 'text-blue-300', bg: 'border-blue-500/30 bg-blue-950/20',
    description: 'Inspects person (Godfather is immune). Inspect one suspect each night to determine if they are Mafia ("Yes"). The Godfather appears innocent ("No").',
  },
  VILLAGER: {
    color: 'text-slate-300', bg: 'border-white/10 bg-[#05070c]',
    description: 'General public. You have no special night abilities. Participate in daytime discussion, analyze behavior, and vote to eliminate suspected Mafia.',
  },
};

export const PrivateRoleCard: React.FC<PrivateRoleCardProps> = ({ player, players }) => {
  if (!player || !player.role) {
    return (
      <div className="card-panel mb-4 text-center text-slate-400 py-4 text-xs font-mono">
        Waiting for role assignment...
      </div>
    );
  }

  const meta = ROLE_META[player.role] || { color: 'text-slate-300', bg: 'border-white/10 bg-[#05070c]', description: '' };
  const team = player.team || 'VILLAGERS';
  const isMafiaTeam = team === 'MAFIA';

  const policeLog = player.policeResults || player.investigatorResults || [];
  const syndicateMembers = (isMafiaTeam && players)
    ? Object.values(players).filter((p) => !p.isHost && (p.team === 'MAFIA' || p.role === 'GODFATHER' || p.role === 'MAFIA'))
    : [];

  return (
    <div className={`card-panel mb-4 border ${meta.bg}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        {/* Role Header & Name */}
        <div className="flex-1 min-w-[260px]">
          <div className="flex items-center gap-2 flex-wrap font-mono">
            <h2 className={`text-2xl font-black tracking-wide ${meta.color}`}>{player.role}</h2>
            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${
              isMafiaTeam ? 'bg-red-950/80 text-red-300 border-red-800'
              : 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
            }`}>
              {isMafiaTeam ? 'Mafia Syndicate Team' : 'Villagers Team'}
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed font-sans">{meta.description}</p>
        </div>

        {/* Syndicate Allies Roster for Mafia & Godfather */}
        {isMafiaTeam && syndicateMembers.length > 0 && (
          <div className="bg-[#05070c] border border-red-800/60 rounded-xl p-3 min-w-[240px] max-w-sm font-mono">
            <div className="flex items-center justify-between gap-2 mb-2 pb-1 border-b border-red-900/40">
              <span className="text-xs font-bold text-red-300 uppercase tracking-wider flex items-center gap-1.5">
                🕶️ Syndicate Allies ({syndicateMembers.length})
              </span>
              <span className="text-[9px] text-slate-400">Night Partners</span>
            </div>
            <div className="space-y-1.5">
              {syndicateMembers.map((m) => {
                const isMe = m.id === player.id;
                const isGf = m.role === 'GODFATHER';
                return (
                  <div
                    key={m.id}
                    className={`flex items-center justify-between text-xs px-2.5 py-1 rounded border font-bold ${
                      isMe
                        ? 'bg-red-950/40 border-red-700/60 text-white'
                        : isGf
                        ? 'bg-purple-950/40 border-purple-700/50 text-purple-200'
                        : 'bg-black/60 border-red-900/50 text-red-200'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <span>{m.avatarEmoji || '👾'}</span>
                      <span className="truncate">{m.name} {isMe ? '(You)' : ''}</span>
                    </span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-black shrink-0 ${
                      isGf ? 'bg-purple-900 text-purple-200 border border-purple-600' : 'bg-red-900 text-red-200 border border-red-600'
                    }`}>
                      {isGf ? '👑 GODFATHER' : '🕶️ MAFIA'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Police inspection history */}
        {player.role === 'POLICE' && policeLog.length > 0 && (
          <div className="ml-auto bg-[#05070c] border border-blue-800/60 rounded-xl p-3 min-w-[220px] max-w-xs font-mono">
            <div className="flex items-center gap-2 mb-2">
              <Search className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-bold text-blue-300 uppercase tracking-wider">Police Inspection Log</span>
            </div>
            <div className="space-y-1.5">
              {policeLog.map((r: any, i: number) => {
                const isPositive = r.isMafia !== undefined ? r.isMafia : r.isShadow;
                return (
                  <div key={i} className={`flex items-center justify-between text-xs px-2.5 py-1 rounded border font-bold ${
                    isPositive ? 'bg-red-950/60 border-red-800 text-red-300' : 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                  }`}>
                    <span>{r.targetName}</span>
                    <span className={isPositive ? 'text-red-400' : 'text-emerald-400'}>
                      {isPositive ? 'YES (Mafia)' : 'NO (Innocent)'}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="text-[10px] text-blue-400 mt-1.5">
              Inspections used: {player.policeChecksUsed ?? player.checksUsed ?? 0}
            </div>
          </div>
        )}

        {/* Doctor heals used */}
        {player.role === 'DOCTOR' && (
          <div className="ml-auto bg-[#05070c] border border-emerald-800/60 rounded-xl p-3 min-w-[180px] text-center font-mono">
            <div className="flex items-center gap-2 justify-center mb-1">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-emerald-300 uppercase">Heals Used</span>
            </div>
            <div className="text-2xl font-black text-emerald-400">{player.doctorHealsUsed ?? player.protectionsUsed ?? 0}</div>
          </div>
        )}
      </div>
    </div>
  );
};
