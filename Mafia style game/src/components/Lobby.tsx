'use client';

import React, { useState } from 'react';
import { ClientRoomState, Role, RoleRecommendation } from '../types/game';
import {
  Crown, Play, LogIn, Plus, Users, Link as LinkIcon, Check,
  BookOpen, ChevronDown, ChevronUp, Settings, Shield, Target, Search, Eye, Sparkles
} from 'lucide-react';

const ROLE_TABLE: Record<number, RoleRecommendation> = {
  4:  { godfather: 0, mafia: 1, wildcard: 0, doctor: 1, police: 1, villager: 1, doctorHeals: 1, policeChecks: 1 },
  5:  { godfather: 1, mafia: 1, wildcard: 0, doctor: 1, police: 1, villager: 1, doctorHeals: 1, policeChecks: 1 },
  6:  { godfather: 1, mafia: 1, wildcard: 0, doctor: 1, police: 1, villager: 2, doctorHeals: 1, policeChecks: 1 },
  7:  { godfather: 1, mafia: 1, wildcard: 0, doctor: 1, police: 1, villager: 3, doctorHeals: 1, policeChecks: 1 },
  8:  { godfather: 1, mafia: 2, wildcard: 0, doctor: 1, police: 1, villager: 3, doctorHeals: 1, policeChecks: 1 },
  9:  { godfather: 1, mafia: 2, wildcard: 0, doctor: 1, police: 1, villager: 4, doctorHeals: 1, policeChecks: 1 },
  10: { godfather: 1, mafia: 2, wildcard: 0, doctor: 1, police: 1, villager: 5, doctorHeals: 1, policeChecks: 2 },
  11: { godfather: 1, mafia: 2, wildcard: 0, doctor: 1, police: 1, villager: 6, doctorHeals: 1, policeChecks: 2 },
  12: { godfather: 1, mafia: 2, wildcard: 0, doctor: 1, police: 1, villager: 7, doctorHeals: 2, policeChecks: 2 },
  13: { godfather: 1, mafia: 3, wildcard: 0, doctor: 1, police: 1, villager: 7, doctorHeals: 2, policeChecks: 2 },
  14: { godfather: 1, mafia: 3, wildcard: 0, doctor: 1, police: 1, villager: 8, doctorHeals: 2, policeChecks: 2 },
  15: { godfather: 1, mafia: 3, wildcard: 0, doctor: 1, police: 1, villager: 9, doctorHeals: 2, policeChecks: 2 },
  16: { godfather: 1, mafia: 4, wildcard: 0, doctor: 1, police: 1, villager: 9, doctorHeals: 2, policeChecks: 3 },
  17: { godfather: 1, mafia: 4, wildcard: 0, doctor: 1, police: 1, villager: 10, doctorHeals: 2, policeChecks: 3 },
  18: { godfather: 1, mafia: 4, wildcard: 0, doctor: 1, police: 1, villager: 11, doctorHeals: 2, policeChecks: 3 },
  19: { godfather: 1, mafia: 5, wildcard: 0, doctor: 1, police: 1, villager: 11, doctorHeals: 3, policeChecks: 3 },
  20: { godfather: 1, mafia: 5, wildcard: 0, doctor: 1, police: 1, villager: 12, doctorHeals: 3, policeChecks: 3 },
};

function getRecommendation(playerCount: number): RoleRecommendation {
  const clamped = Math.min(20, Math.max(4, playerCount));
  const base = ROLE_TABLE[clamped] || ROLE_TABLE[4];
  return {
    ...base,
    director: base.godfather,
    shadow: base.mafia,
    guardian: base.doctor,
    investigator: base.police,
    citizen: base.villager,
    guardianProtections: base.doctorHeals,
    investigatorChecks: base.policeChecks,
  };
}

import { BIT_EMOJI_AVATARS } from '../utils/avatars';

interface LobbyProps {
  roomState: ClientRoomState | null;
  onCreateRoom: (name: string, settings: any, avatarEmoji?: string) => void;
  onJoinRoom: (code: string, name: string, avatarEmoji?: string) => void;
  onUpdateSettings: (code: string, settings: any) => void;
  onStartGame: (code: string) => void;
  errorMsg: string | null;
  initialJoinCode?: string;
}

export const Lobby: React.FC<LobbyProps> = ({
  roomState, onCreateRoom, onJoinRoom, onUpdateSettings, onStartGame, errorMsg, initialJoinCode = '',
}) => {
  const [hostName, setHostName] = useState('');
  const [joinName, setJoinName] = useState('');
  const [joinCode, setJoinCode] = useState(initialJoinCode);
  const [selectedEmoji, setSelectedEmoji] = useState('👾');
  const [copiedLink, setCopiedLink] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showFullMatrix, setShowFullMatrix] = useState(false);

  const [doctorHeals, setDoctorHeals] = useState(1);
  const [policeChecks, setPoliceChecks] = useState(1);
  const [discussionTimerSec, setDiscussionTimerSec] = useState(90);
  const [votingTimerSec, setVotingTimerSec] = useState(45);
  const [nightTimerSec, setNightTimerSec] = useState(30);
  const [manualRoles, setManualRoles] = useState<Record<string, Role>>({});
  const [activeLandingTab, setActiveLandingTab] = useState<'HOST' | 'JOIN'>(initialJoinCode ? 'JOIN' : 'HOST');

  React.useEffect(() => {
    if (initialJoinCode) {
      setJoinCode(initialJoinCode);
      setActiveLandingTab('JOIN');
    }
  }, [initialJoinCode]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hostName.trim()) return;
    onCreateRoom(hostName.trim(), {
      doctorHeals,
      policeChecks,
      guardianProtections: doctorHeals,
      investigatorChecks: policeChecks,
      discussionTimerSec,
      votingTimerSec,
      nightTimerSec,
    }, selectedEmoji);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinName.trim() || !joinCode.trim()) return;
    onJoinRoom(joinCode.trim(), joinName.trim(), selectedEmoji);
  };

  const copyLink = () => {
    if (!roomState?.code) return;
    const fullUrl = `${window.location.origin}${window.location.pathname}?code=${roomState.code}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const setManualRole = (playerId: string, role: Role) => {
    const updated = { ...manualRoles, [playerId]: role };
    setManualRoles(updated);
    if (roomState?.code) onUpdateSettings(roomState.code, { manualRoles: updated });
  };

  // ── LOBBY ROOM VIEW ──────────────────────────────────────────────────────
  if (roomState && roomState.phase === 'LOBBY') {
    const isHost = roomState.myPlayer?.isHost;
    const players = Object.values(roomState.players);
    const activePlayers = players.filter((p) => !p.isHost);
    const rec = getRecommendation(activePlayers.length);

    return (
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Room Header Banner */}
        <div className="card-panel-accent flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <span className="text-xs text-slate-400 font-mono uppercase tracking-wider">ROOM CODE</span>
              <span className="font-mono font-black text-3xl text-[#ffcc00] bg-[#05070c] px-4 py-1 rounded-xl border border-[#ffcc00]/40 tracking-widest">
                {roomState.code}
              </span>
              <button onClick={copyLink} className="btn-secondary text-xs flex items-center gap-2 border-white/10 text-slate-200 !py-1.5">
                {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <LinkIcon className="w-4 h-4" />}
                {copiedLink ? 'Copied' : 'Copy Invite Link'}
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Host: <strong className="text-[#ffcc00]">{players.find((p) => p.isHost)?.name || 'Moderator'}</strong> (Moderator). Active Players: <strong className="text-white">{activePlayers.length}</strong>
            </p>
          </div>

          {isHost && (
            <button
              onClick={() => onStartGame(roomState.code)}
              disabled={activePlayers.length < 4}
              className="btn-primary py-3 px-8 text-sm font-extrabold flex items-center gap-2 disabled:opacity-40"
            >
              <Play className="w-4 h-4 fill-current" />
              START MATCH ({activePlayers.length} Players)
            </button>
          )}
        </div>

        {errorMsg && <div className="p-4 bg-red-950/60 border border-red-800 text-red-300 rounded-xl text-xs font-semibold">{errorMsg}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Player roster */}
          <div className="card-panel lg:col-span-2 space-y-4">
            <h2 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2 font-mono">
              <Users className="w-4 h-4 text-[#ffcc00]" /> Active Roster ({players.length})
            </h2>
            <div className="space-y-2">
              {players.map((p) => (
                <div key={p.id} className={`p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${p.isHost ? 'bg-[#ffcc00]/10 border-[#ffcc00]/30' : 'bg-[#05070c] border-white/10'}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xl shrink-0">
                      <span>{p.avatarEmoji || (p.isHost ? '👑' : '👾')}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-white block">{p.name}</span>
                        <span className={`w-2 h-2 rounded-full inline-block ${p.isOnline !== false ? 'bg-emerald-400 shadow-sm shadow-emerald-400' : 'bg-slate-500'}`} title={p.isOnline !== false ? 'Online' : 'Offline'} />
                      </div>
                      {p.isHost
                        ? <span className="text-[10px] text-[#ffcc00] font-mono font-bold flex items-center gap-1 mt-0.5"><Crown className="w-3 h-3" /> HOST MODERATOR (🟢 ONLINE)</span>
                        : <span className="text-[10px] font-mono block mt-0.5 flex items-center gap-1">{p.isOnline !== false ? <span className="text-emerald-400 font-bold">🟢 ONLINE</span> : <span className="text-slate-400">🔴 OFFLINE</span>}</span>}
                    </div>
                  </div>
                  {isHost && !p.isHost && (
                    <select
                      value={manualRoles[p.id] || ''}
                      onChange={(e) => setManualRole(p.id, e.target.value as Role)}
                      className="bg-[#0a0e19] border border-white/15 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono"
                    >
                      <option value="">Auto-Assign</option>
                      <option value="GODFATHER">The Godfather</option>
                      <option value="MAFIA">The Mafia</option>
                      <option value="DOCTOR">The Doctor</option>
                      <option value="POLICE">The Police</option>
                      <option value="VILLAGER">The Villagers</option>
                      {/* <option value="WILDCARD">The Wildcard</option> */}
                    </select>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Host Recommendation Engine Sidebar */}
          <div className="space-y-4">
            <div className="card-panel border-[#ffcc00]/20 bg-gradient-to-b from-[#121829] to-[#0a0e19]">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-extrabold text-[#ffcc00] uppercase tracking-wider flex items-center gap-2 font-mono">
                  <Sparkles className="w-4 h-4" /> Recommendation Engine
                </h2>
                <button onClick={() => setShowFullMatrix(!showFullMatrix)} className="text-[11px] text-slate-300 hover:text-[#ffcc00] font-mono font-bold flex items-center gap-1">
                  <Eye className="w-3 h-3" /> {showFullMatrix ? 'Hide Matrix' : 'Full Table'}
                </button>
              </div>
              <p className="text-xs text-slate-400 mb-3">Recommended composition for <strong className="text-white font-mono">{activePlayers.length} players</strong>:</p>
              
              <div className="space-y-2 text-xs font-sans">
                {[
                  { label: 'The Godfather', value: rec.godfather, color: 'text-purple-400' },
                  { label: 'The Mafia', value: rec.mafia, color: 'text-red-400' },
                  /* { label: 'The Wildcard', value: rec.wildcard, color: 'text-amber-400' }, */
                  { label: 'The Doctor', value: rec.doctor, color: 'text-emerald-400' },
                  { label: 'The Police', value: rec.police, color: 'text-blue-400' },
                  { label: 'The Villagers', value: rec.villager, color: 'text-slate-300' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">{label}</span>
                    <strong className={`font-mono ${color}`}>{value}</strong>
                  </div>
                ))}
                <div className="flex justify-between py-1 border-b border-white/5 mt-1">
                  <span className="text-emerald-300">Doctor Heals</span>
                  <strong className="text-emerald-400 font-mono">{rec.doctorHeals} / match</strong>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-blue-300">Police Checks</span>
                  <strong className="text-blue-400 font-mono">{rec.policeChecks} / match</strong>
                </div>
              </div>
            </div>

            {/* Host Overrides */}
            {isHost && (
              <div className="card-panel space-y-3">
                <h2 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2 font-mono">
                  <Settings className="w-4 h-4 text-[#ffcc00]" /> Host Quota Overrides
                </h2>
                <div>
                  <label className="block text-[11px] font-bold text-emerald-400 mb-1">Doctor Heals Quota</label>
                  <input type="number" min={1} max={5} value={doctorHeals}
                    onChange={(e) => {
                      const v = parseInt(e.target.value) || 1;
                      setDoctorHeals(v);
                      if (roomState?.code) onUpdateSettings(roomState.code, { doctorHeals: v, guardianProtections: v });
                    }}
                    className="input-field w-full" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-blue-400 mb-1">Police Checks Quota</label>
                  <input type="number" min={1} max={5} value={policeChecks}
                    onChange={(e) => {
                      const v = parseInt(e.target.value) || 1;
                      setPoliceChecks(v);
                      if (roomState?.code) onUpdateSettings(roomState.code, { policeChecks: v, investigatorChecks: v });
                    }}
                    className="input-field w-full" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Matrix modal */}
        {showFullMatrix && (
          <div className="card-panel border-[#ffcc00]/30 space-y-4">
            <h3 className="text-sm font-extrabold text-[#ffcc00] uppercase tracking-wider flex items-center gap-2 font-mono">
              <Sparkles className="w-4 h-4" /> Full Host Recommendation Matrix (4-20 Players)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse font-mono">
                <thead>
                  <tr className="border-b border-white/15 bg-[#05070c] text-slate-400">
                    <th className="p-2.5 text-center">Players</th>
                    <th className="p-2.5 text-purple-400">Godfather</th>
                    <th className="p-2.5 text-red-400">Mafia</th>
                    {/* <th className="p-2.5 text-amber-400">Wildcard</th> */}
                    <th className="p-2.5 text-emerald-400">Doctor</th>
                    <th className="p-2.5 text-blue-400">Police</th>
                    <th className="p-2.5 text-slate-300">Villagers</th>
                    <th className="p-2.5 text-emerald-300">Doctor Heals</th>
                    <th className="p-2.5 text-blue-300">Police Checks</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(ROLE_TABLE).map(([num, row]) => (
                    <tr key={num} className={`border-b border-white/5 ${activePlayers.length === Number(num) ? 'bg-[#ffcc00]/15 font-bold ring-1 ring-[#ffcc00]' : 'hover:bg-white/5'}`}>
                      <td className="p-2.5 text-center font-bold text-white">{num}</td>
                      <td className="p-2.5 text-purple-300">{row.godfather}</td>
                      <td className="p-2.5 text-red-300">{row.mafia}</td>
                      {/* <td className="p-2.5 text-amber-300">{row.wildcard}</td> */}
                      <td className="p-2.5 text-emerald-300">{row.doctor}</td>
                      <td className="p-2.5 text-blue-300">{row.police}</td>
                      <td className="p-2.5 text-slate-300">{row.villager}</td>
                      <td className="p-2.5 text-emerald-400 text-center">{row.doctorHeals}</td>
                      <td className="p-2.5 text-blue-400 text-center">{row.policeChecks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── LANDING HOME ─────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto space-y-8 py-4 md:py-6 w-full">
      {/* Hero banner */}
      <div className="card-panel-accent relative overflow-hidden p-6 md:p-10 text-center">
        <div className="card-bracket top-left"></div>
        <div className="card-bracket top-right"></div>
        <div className="card-bracket bottom-left"></div>
        <div className="card-bracket bottom-right"></div>

        <div className="max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-white/5 border border-white/15 text-[#ffcc00] text-xs font-mono font-bold uppercase tracking-wider">
            BHAVYAJANGID.COM PROJECT: HIDDEN AGENDA
          </div>

          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight uppercase leading-none font-sans">
            HIDDEN AGENDA
          </h1>

          <p className="text-slate-300 text-xs md:text-sm max-w-lg mx-auto leading-relaxed">
            Real-time multiplayer social deduction game. Uncover the Godfather, eliminate the Mafia, and protect the innocent villagers.
          </p>
        </div>
      </div>

      {errorMsg && <div className="p-4 bg-red-950/60 border border-red-800 text-red-300 rounded-xl text-xs font-semibold text-center">{errorMsg}</div>}

      {/* Tab Switcher (Host vs Join) */}
      <div className="max-w-5xl mx-auto space-y-4 w-full">
        <div className="flex bg-[#05070c] p-1.5 rounded-2xl border border-white/15 font-mono">
          <button
            type="button"
            onClick={() => setActiveLandingTab('HOST')}
            className={`flex-1 py-3 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeLandingTab === 'HOST'
                ? 'bg-[#ffcc00] text-[#05070c] shadow-lg shadow-[#ffcc00]/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Plus className="w-4 h-4" /> HOST A GAME
          </button>
          <button
            type="button"
            onClick={() => setActiveLandingTab('JOIN')}
            className={`flex-1 py-3 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeLandingTab === 'JOIN'
                ? 'bg-[#ffcc00] text-[#05070c] shadow-lg shadow-[#ffcc00]/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LogIn className="w-4 h-4" /> JOIN A GAME
          </button>
        </div>

        {/* Host Game Form (Expanded by default when going directly to hidden-agenda) */}
        {activeLandingTab === 'HOST' && (
          <div className="card-panel space-y-4">
            <h2 className="text-base font-black text-white flex items-center gap-2 font-mono border-b border-white/10 pb-3">
              <Plus className="w-5 h-5 text-[#ffcc00]" /> Host a Game Room
            </h2>
            <form onSubmit={handleCreate} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-slate-300 font-bold mb-1.5">Your Name (Host Moderator)</label>
                <input type="text" value={hostName} onChange={(e) => setHostName(e.target.value)}
                  placeholder="e.g. Alex" className="input-field w-full" required />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1.5">Choose 8-Bit Emoji Avatar</label>
                <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-1.5 sm:gap-2 p-2 sm:p-2.5 bg-[#05070c] rounded-2xl border border-white/10 w-full">
                  {BIT_EMOJI_AVATARS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setSelectedEmoji(emoji)}
                      className={`w-full h-11 sm:h-10 text-lg sm:text-xl rounded-xl flex items-center justify-center transition-all ${
                        selectedEmoji === emoji ? 'bg-[#ffcc00] ring-2 ring-[#ffcc00]/50 scale-105 shadow-lg' : 'bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-slate-400 leading-relaxed font-sans">
                As the Host Moderator, you manage night phases, oversee daytime voting, and direct match flow.
              </p>
              <button type="submit" className="btn-primary w-full py-3.5 text-xs font-black flex items-center justify-center gap-2 uppercase tracking-wider shadow-lg shadow-[#ffcc00]/20">
                <span>{selectedEmoji}</span> CREATE ROOM & OPEN HOST DASHBOARD
              </button>
            </form>
          </div>
        )}

        {/* Join Game Form (Shared link traits) */}
        {activeLandingTab === 'JOIN' && (
          <div className="card-panel space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h2 className="text-base font-black text-white flex items-center gap-2 font-mono">
                <LogIn className="w-5 h-5 text-[#ffcc00]" /> Join a Game Room
              </h2>
              <button
                type="button"
                onClick={() => setActiveLandingTab('HOST')}
                className="text-[11px] text-[#ffcc00] hover:underline font-mono"
              >
                Looking for hosting the game?
              </button>
            </div>

            <form onSubmit={handleJoin} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-slate-300 font-bold mb-1.5">Your Name</label>
                <input type="text" value={joinName} onChange={(e) => setJoinName(e.target.value)}
                  placeholder="e.g. Sarah" className="input-field w-full" required />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1.5">Choose 8-Bit Emoji Avatar</label>
                <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-1.5 sm:gap-2 p-2 sm:p-2.5 bg-[#05070c] rounded-2xl border border-white/10 w-full">
                  {BIT_EMOJI_AVATARS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setSelectedEmoji(emoji)}
                      className={`w-full h-11 sm:h-10 text-lg sm:text-xl rounded-xl flex items-center justify-center transition-all ${
                        selectedEmoji === emoji ? 'bg-[#ffcc00] ring-2 ring-[#ffcc00]/50 scale-105 shadow-lg' : 'bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1.5">6-Character Room Code</label>
                <input type="text" value={joinCode} onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="e.g. aK9x3P" className="input-field w-full font-mono text-lg text-center tracking-widest font-bold"
                  maxLength={6} required />
              </div>

              <button type="submit" className="btn-secondary w-full py-3.5 text-xs font-black flex items-center justify-center gap-2 uppercase tracking-wider border-white/15">
                <span>{selectedEmoji}</span> JOIN ROOM AS {joinName.trim() ? joinName.trim().toUpperCase() : 'PLAYER'}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Rules section */}
      <div className="card-panel border-white/10">
        <button onClick={() => setShowRules(!showRules)} className="w-full flex items-center justify-between text-left">
          <div className="flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-[#ffcc00]" />
            <h2 className="text-base font-extrabold text-white">Hidden Agenda Game Guide</h2>
          </div>
          {showRules ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
        </button>

        {showRules && (
          <div className="mt-6 space-y-6 text-xs border-t border-white/10 pt-6">
            <div>
              <h3 className="font-extrabold text-white text-sm mb-3 uppercase font-mono tracking-wider">Characters & Roles</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { name: 'The Godfather', role: 'Secret Leader', team: 'MAFIA', color: 'border-purple-500/30 bg-purple-950/20 text-purple-300', desc: 'Immune to police and leader of the Mafia. Identity is hidden from non-Mafia. The Police receives "No" (Innocent) when inspecting them. If Mafia members disagree on a target, the Godfather has the final say.' },
                  { name: 'The Mafia', role: 'Secret Team', team: 'MAFIA', color: 'border-red-500/30 bg-red-950/20 text-red-300', desc: 'Kills the villagers. Works with the Godfather to secretly eliminate players each night. Mafia members know each other and know the Godfather.' },
                  { name: 'The Doctor', role: 'Healer & Protector', team: 'VILLAGERS', color: 'border-emerald-500/30 bg-emerald-950/20 text-emerald-300', desc: 'Heals. Chooses one player to heal each night. If targeted by Mafia, the player survives. Has a limited number of heals per match.' },
                  { name: 'The Police', role: 'Inspector', team: 'VILLAGERS', color: 'border-blue-500/30 bg-blue-950/20 text-blue-300', desc: 'Inspects person (Godfather is immune). Secretly checks one player each night to determine if they are Mafia ("Yes"). The Godfather appears innocent ("No"). Limited checks per match.' },
                  { name: 'The Villagers', role: 'General Public', team: 'VILLAGERS', color: 'border-slate-500/30 bg-slate-900/40 text-slate-300', desc: 'General public. Has no special night abilities. Participates in daytime discussion, analyzes behavior, and votes to eliminate suspected Mafia.' },
                  /* { name: 'The Wildcard', role: 'Independent', team: 'WILDCARD', color: 'border-amber-500/30 bg-amber-950/20 text-amber-300', desc: 'Has no team. Goal is to get eliminated by the daytime vote. If voted out during daytime vote, they immediately win!' }, */
                ].map(r => (
                  <div key={r.name} className={`p-4 rounded-xl border ${r.color} space-y-1.5`}>
                    <div className="flex items-center justify-between">
                      <strong className="text-white text-sm">{r.name}</strong>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-black/40 border border-white/10">{r.team}</span>
                    </div>
                    <p className="text-slate-400 leading-relaxed text-[11px]">{r.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-extrabold text-white text-sm mb-3 uppercase font-mono tracking-wider">Night Progression</h3>
              <div className="space-y-2 font-mono">
                {[
                  { step: 'Step 1', title: 'Godfather & Mafia Target', desc: 'Godfather and Mafia choose a villager to eliminate. Godfather choice overrides tie votes.' },
                  { step: 'Step 2', title: 'Doctor Heal', desc: 'Doctor chooses a player to heal from the Mafia attack.' },
                  { step: 'Step 3', title: 'Police Inspection', desc: 'Police inspects a suspect and receives a private result (Godfather is immune).' },
                ].map(s => (
                  <div key={s.step} className="p-3.5 rounded-xl border border-white/10 bg-[#05070c] flex gap-3 text-xs">
                    <span className="font-black text-[#ffcc00] shrink-0">{s.step}</span>
                    <div>
                      <strong className="text-white block mb-0.5">{s.title}</strong>
                      <p className="text-slate-400 font-sans text-[11px]">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
