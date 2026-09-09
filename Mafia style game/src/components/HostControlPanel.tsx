'use client';

import React, { useState } from 'react';
import { ClientRoomState } from '../types/game';
import { Crown, FastForward, Plus, Minus, Skull, RotateCcw, Play, Pause, Eye, EyeOff, KeyRound } from 'lucide-react';

interface HostControlPanelProps {
  roomState: ClientRoomState;
  onForceNextPhase: () => void;
  onAdjustTimer: (s: number) => void;
  onTogglePauseTimer: () => void;
  onEliminatePlayer: (id: string) => void;
  onResetToLobby: () => void;
}

export const HostControlPanel: React.FC<HostControlPanelProps> = ({
  roomState, onForceNextPhase, onAdjustTimer, onTogglePauseTimer, onEliminatePlayer, onResetToLobby,
}) => {
  const [showMatrix, setShowMatrix] = useState(true);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  if (!roomState.myPlayer?.isHost) return null;

  const activePlayers = Object.values(roomState.players).filter((p) => !p.isHost && p.isAlive);
  const allPlayers    = Object.values(roomState.players).filter((p) => !p.isHost);
  const isPaused      = roomState.isTimerPaused;
  const maxDoctorHeals  = roomState.settings.doctorHeals ?? (roomState.settings.guardianProtections ?? 1);
  const maxPoliceChecks = roomState.settings.policeChecks ?? (roomState.settings.investigatorChecks ?? 1);

  const handleResetClick = () => {
    setConfirmResetOpen(true);
  };

  const handleConfirmReset = () => {
    setConfirmResetOpen(false);
    onResetToLobby();
  };

  return (
    <div className="card-panel-accent mb-4 border-[#ffcc00]/30 bg-gradient-to-r from-[#121829] via-[#0a0e19] to-[#05070c]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#ffcc00]/20 border border-[#ffcc00]/40 flex items-center justify-center">
            <Crown className="w-4 h-4 text-[#ffcc00]" />
          </div>
          <div>
            <h2 className="text-xs font-black text-[#ffcc00] font-mono uppercase tracking-wider">Host Moderator Command Center</h2>
            <p className="text-[11px] text-slate-400 font-mono">Live match controls and quota inspector</p>
          </div>
        </div>
        <button onClick={() => setShowMatrix(!showMatrix)} className="btn-secondary !py-1 !px-3 text-xs flex items-center gap-1 border-white/15 text-slate-300 font-mono">
          {showMatrix ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          {showMatrix ? 'Hide Roles' : 'Inspect Roles'}
        </button>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2 text-xs mb-3 font-mono">
        <button onClick={onTogglePauseTimer}
          className={`btn-secondary flex-1 min-w-[100px] !py-2 flex items-center justify-center gap-1.5 font-bold text-xs ${isPaused ? 'bg-emerald-950/80 border-emerald-600 text-emerald-300 animate-pulse' : 'bg-white/5 border-white/15 text-slate-200'}`}>
          {isPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5 fill-current" />}
          {isPaused ? 'RESUME' : 'PAUSE'}
        </button>

        <button onClick={onForceNextPhase} className="btn-primary flex-1 min-w-[120px] !py-2 flex items-center justify-center gap-1.5 font-black text-xs">
          <FastForward className="w-3.5 h-3.5" /> SKIP PHASE
        </button>

        <div className="flex items-center gap-1 flex-1 min-w-[180px]">
          {[{ v: 30, cls: 'text-emerald-400 border-emerald-900' }, { v: 15, cls: 'text-emerald-400 border-emerald-900' }, { v: -15, cls: 'text-red-400 border-red-900' }].map(({ v, cls }) => (
            <button key={v} onClick={() => onAdjustTimer(v)}
              className={`btn-secondary flex-1 !py-2 !px-1 flex items-center justify-center font-bold text-[11px] sm:text-xs ${cls}`}>
              {v > 0 ? <Plus className="w-3 h-3" /> : <Minus className="w-3 h-3" />} {Math.abs(v)}s
            </button>
          ))}
        </div>

        <button onClick={handleResetClick} className="btn-secondary flex-1 min-w-[90px] !py-2 flex items-center justify-center gap-1.5 font-bold text-slate-300 hover:text-white hover:border-red-500/50 text-xs">
          <RotateCcw className="w-3.5 h-3.5 text-amber-400" /> RESET
        </button>
      </div>

      {/* Confirmation Modal */}
      {confirmResetOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card-panel-accent max-w-md w-full text-center space-y-4 font-mono">
            <h3 className="text-base font-black text-[#ffcc00] uppercase tracking-wider">Confirm Match Reset</h3>
            <p className="text-xs text-slate-300 font-sans leading-relaxed">
              Are you sure you want to reset this match back to the Lobby? All assigned roles and live match progress will be cleared.
            </p>
            <div className="flex gap-3 justify-center pt-2">
              <button onClick={() => setConfirmResetOpen(false)} className="btn-secondary flex-1 py-2 text-xs">
                CANCEL
              </button>
              <button onClick={handleConfirmReset} className="btn-danger flex-1 py-2 text-xs font-bold">
                CONFIRM RESET
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quota stats bar */}
      {allPlayers.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3 text-[11px] font-mono">
          {allPlayers.filter((p) => p.role === 'DOCTOR' || p.role === 'POLICE').map((p) => {
            const isDoctor = p.role === 'DOCTOR';
            const used  = isDoctor ? (p.doctorHealsUsed ?? p.protectionsUsed ?? 0) : (p.policeChecksUsed ?? p.checksUsed ?? 0);
            const max   = isDoctor ? maxDoctorHeals : maxPoliceChecks;
            const label = isDoctor ? `${p.name} Doctor Heals` : `${p.name} Police Checks`;
            const color = isDoctor ? 'text-emerald-400 border-emerald-800 bg-emerald-950/30' : 'text-blue-400 border-blue-800 bg-blue-950/30';
            return (
              <div key={p.id} className={`px-3 py-1 rounded-lg border font-bold flex items-center gap-2 ${color} ${!p.isAlive ? 'opacity-40 line-through' : ''}`}>
                {label}: <strong>{used}/{max}</strong> used
              </div>
            );
          })}
        </div>
      )}

      {/* Force Eliminate */}
      <div className="flex flex-wrap items-center gap-2 bg-[#05070c] p-2.5 rounded-xl border border-white/10 text-xs mb-3 font-mono">
        <Skull className="w-4 h-4 text-red-400 shrink-0" />
        <span className="text-slate-400 font-semibold uppercase">Force Eliminate:</span>
        <div className="flex-1 flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
          {activePlayers.length > 0 ? activePlayers.map((p) => (
            <button key={p.id} onClick={() => onEliminatePlayer(p.id)}
              className="bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-300 px-2.5 py-1 rounded text-[11px] font-bold transition-all">
              {p.name}
            </button>
          )) : <span className="text-slate-600 italic">No alive players</span>}
        </div>
      </div>

      {/* Role Matrix */}
      {showMatrix && (
        <div className="bg-[#05070c] p-3 sm:p-3.5 rounded-xl border border-white/10 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-[#ffcc00] font-bold mb-2 uppercase tracking-wider text-xs">
            <KeyRound className="w-4 h-4" /> Role Inspector (Host Only)
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {allPlayers.map((p) => {
              const role = roomState.allRolesRevealed?.[p.id]?.role || p.role;
              const roleColor = role === 'GODFATHER'
                ? 'text-purple-400'
                : role === 'MAFIA'
                ? 'text-red-400'
                : role === 'DOCTOR'
                ? 'text-emerald-400'
                : role === 'POLICE'
                ? 'text-blue-400'
                /* : role === 'WILDCARD' ? 'text-amber-400' */
                : 'text-slate-300';
              return (
                <div key={p.id} className="p-2.5 bg-white/5 rounded-lg border border-white/10">
                  <div className="flex justify-between font-bold gap-2">
                    <span className="text-white truncate text-[12px]">{p.name}</span>
                    <span className={p.isAlive ? 'text-emerald-400 text-[10px] shrink-0' : 'text-red-400 text-[10px] shrink-0'}>{p.isAlive ? 'ALIVE' : 'DEAD'}</span>
                  </div>
                  <div className={`font-mono text-[11px] mt-0.5 font-bold ${roleColor}`}>{role || 'Unassigned'}</div>
                  {role === 'DOCTOR' && <div className="text-[10px] text-emerald-300 mt-0.5">Heals: {p.doctorHealsUsed ?? p.protectionsUsed ?? 0}/{maxDoctorHeals}</div>}
                  {role === 'POLICE' && <div className="text-[10px] text-blue-300 mt-0.5">Inspections: {p.policeChecksUsed ?? p.checksUsed ?? 0}/{maxPoliceChecks}</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
