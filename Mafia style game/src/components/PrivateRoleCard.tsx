'use client';

import React from 'react';
import { ClientPlayer } from '../types/game';
import { Shield, Search } from 'lucide-react';

interface PrivateRoleCardProps { player?: ClientPlayer; }

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
  /* Wildcard commented out
  WILDCARD: {
    color: 'text-amber-300', bg: 'border-amber-500/30 bg-amber-950/20',
    description: 'Independent. You have no team. Your goal is to get yourself removed by the daytime vote. If you are voted out by daytime vote, you immediately win!',
  },
  */
};

export const PrivateRoleCard: React.FC<PrivateRoleCardProps> = ({ player }) => {
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

  return (
    <div className={`card-panel mb-4 border ${meta.bg}`}>
      <div className="flex flex-wrap items-start gap-4">
        {/* Role Header & Name */}
        <div>
          <div className="flex items-center gap-2 flex-wrap font-mono">
            <h2 className={`text-2xl font-black tracking-wide ${meta.color}`}>{player.role}</h2>
            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${
              isMafiaTeam ? 'bg-red-950/80 text-red-300 border-red-800'
              /* : team === 'WILDCARD' ? 'bg-amber-950/80 text-amber-300 border-amber-800' */
              : 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
            }`}>
              {isMafiaTeam ? 'Mafia Team' : 'Villagers Team'}
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed font-sans">{meta.description}</p>
        </div>

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
