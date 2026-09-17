'use client';

import React, { useState } from 'react';
import { ClientRoomState } from '../types/game';
import { MessageSquare, ScrollText, Lock, Send, Download, Vote } from 'lucide-react';

interface ClueAndChatFeedProps {
  roomState: ClientRoomState;
  onSendChat: (msg: string) => void;
  onSendMafiaChat?: (msg: string) => void;
  onSendShadowChat?: (msg: string) => void;
  onSendGhostChat?: (msg: string) => void;
}

export const ClueAndChatFeed: React.FC<ClueAndChatFeedProps> = ({
  roomState, onSendChat, onSendMafiaChat, onSendShadowChat, onSendGhostChat,
}) => {
  const [chatInput, setChatInput]     = useState('');
  const [mafiaInput, setMafiaInput]   = useState('');
  const [ghostInput, setGhostInput]   = useState('');
  const [tab, setTab]                 = useState<'log' | 'chat' | 'mafia' | 'ghost'>('chat');

  const myPlayer      = roomState.myPlayer;
  const isMafiaOrHost = myPlayer?.team === 'MAFIA' || myPlayer?.isHost;
  const isDeadOrHost  = !myPlayer?.isAlive || myPlayer?.isHost || roomState.phase === 'GAME_OVER';

  const submitChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onSendChat(chatInput.trim());
    setChatInput('');
  };

  const submitMafia = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mafiaInput.trim()) return;
    if (onSendMafiaChat) onSendMafiaChat(mafiaInput.trim());
    else if (onSendShadowChat) onSendShadowChat(mafiaInput.trim());
    setMafiaInput('');
  };

  const submitGhost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ghostInput.trim()) return;
    if (onSendGhostChat) onSendGhostChat(ghostInput.trim());
    setGhostInput('');
  };

  const downloadMatchLogs = () => {
    const lines = [
      `=======================================================`,
      `HIDDEN AGENDA - MATCH LOGS (ROOM: ${roomState.code})`,
      `Exported: ${new Date().toLocaleString()}`,
      `Total Players: ${Object.keys(roomState.players).length}`,
      `=======================================================\n`,
      `[SYSTEM & VOTING EVENTS]`,
    ];

    roomState.logs.forEach((log) => {
      lines.push(`[${log.timestamp}] [${log.type.toUpperCase()}] ${log.author ? `${log.author}: ` : ''}${log.message}`);
    });

    if (isMafiaOrHost && (roomState.mafiaLogs || roomState.shadowLogs)) {
      lines.push(`\n[MAFIA SYNDICATE PRIVATE TRANSCRIPT]`);
      (roomState.mafiaLogs || roomState.shadowLogs || []).forEach((m) => {
        lines.push(`[${m.timestamp}] ${m.author}: ${m.message}`);
      });
    }

    if (isDeadOrHost && roomState.ghostLogs) {
      lines.push(`\n[GHOST REALM AFTERLIFE TRANSCRIPT]`);
      roomState.ghostLogs.forEach((g) => {
        lines.push(`[${g.timestamp}] ${g.author}: ${g.message}`);
      });
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hidden-agenda-logs-${roomState.code}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const chatLogs = roomState.logs.filter((l) => l.type === 'chat');
  const systemLogs = roomState.logs.filter((l) => l.type !== 'chat');
  const mafiaLogs = roomState.mafiaLogs || roomState.shadowLogs || [];
  const ghostLogs = roomState.ghostLogs || [];

  return (
    <div className="card-panel flex flex-col h-[380px] sm:h-[440px] border-white/20">
      {/* Tabs */}
      <div className="flex items-center justify-between gap-1.5 sm:gap-2 border-b border-white/15 pb-2 sm:pb-2.5 mb-2.5 sm:mb-3 flex-wrap font-mono">
        <div className="flex items-center gap-1.5 flex-wrap">
          {([
            { key: 'chat', icon: <MessageSquare className="w-3.5 h-3.5" />, label: 'Room Chat' },
            { key: 'log',  icon: <ScrollText    className="w-3.5 h-3.5" />, label: 'Match Log' },
          ] as { key: 'chat' | 'log'; icon: React.ReactNode; label: string }[]).map(({ key, icon, label }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all ${
                tab === key ? 'bg-[#ffcc00]/20 text-[#ffcc00] border border-[#ffcc00]/50' : 'text-slate-300 hover:text-white'
              }`}>
              {icon} {label}
            </button>
          ))}

          {isMafiaOrHost && (
            <button onClick={() => setTab('mafia')}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-bold rounded-xl flex items-center gap-1.5 border transition-all ${
                tab === 'mafia' ? 'bg-red-950 text-red-300 border-red-700 ring-1 ring-red-500' : 'bg-red-950/40 text-red-400 border-red-900/60 hover:bg-red-950'
              }`}>
              <Lock className="w-3.5 h-3.5" /> Mafia Chat
            </button>
          )}

          {isDeadOrHost && (
            <button onClick={() => setTab('ghost')}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-bold rounded-xl flex items-center gap-1.5 border transition-all ${
                tab === 'ghost' ? 'bg-purple-950 text-purple-300 border-purple-600 ring-1 ring-purple-400 shadow-md shadow-purple-900/40' : 'bg-purple-950/40 text-purple-300 border-purple-900/60 hover:bg-purple-950'
              }`}>
              <span>👻</span> Ghost Chat
            </button>
          )}
        </div>

        {tab === 'log' && (
          <button
            onClick={downloadMatchLogs}
            title="Download full match log file (.txt)"
            className="p-1 sm:px-2 sm:py-1 text-[10px] font-mono font-bold bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/15 rounded-lg flex items-center gap-1"
          >
            <Download className="w-3 h-3 text-[#ffcc00]" />
            <span className="hidden sm:inline">Export .txt</span>
          </button>
        )}
      </div>

      {/* Content */}
      {tab === 'chat' && (
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs mb-2 font-sans">
            {chatLogs.length === 0
              ? <p className="text-slate-400 italic font-mono text-center mt-8">No messages yet. Start the conversation!</p>
              : chatLogs.map((m) => (
                <div key={m.id} className="p-2.5 rounded-xl bg-[#0f172a]/70 border border-white/20">
                  <span className="text-slate-400 text-[10px] font-mono mr-2">[{m.timestamp}]</span>
                  <strong className="text-[#ffcc00] font-mono mr-1.5">{m.author}:</strong>
                  <span className="text-slate-100">{m.message}</span>
                </div>
              ))}
          </div>
          <form onSubmit={submitChat} className="flex gap-2">
            <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)}
              placeholder="Send message..." className="input-field flex-1 text-xs" />
            <button type="submit" className="btn-primary !py-2 !px-3 text-xs flex items-center gap-1">
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}

      {tab === 'log' && (
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs font-mono">
          {systemLogs.map((log) => (
            <div key={log.id} className={`p-2.5 rounded-xl border ${
              log.type === 'elimination' ? 'bg-red-950/60 border-red-800 text-red-200 font-bold'
              : log.type === 'vote'      ? 'bg-amber-950/40 border-amber-800/80 text-amber-200'
              : log.type === 'night'     ? 'bg-purple-950/60 border-purple-800 text-purple-200'
              : 'bg-[#0f172a]/70 border-white/20 text-slate-200'
            }`}>
              <span className="text-[10px] opacity-50 mr-2">[{log.timestamp}]</span>
              {log.message}
            </div>
          ))}
        </div>
      )}

      {tab === 'mafia' && isMafiaOrHost && (
        <div className="flex flex-col flex-1 min-h-0 font-sans">
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs mb-2">
            {mafiaLogs.map((m) => (
              <div key={m.id} className="p-2.5 rounded-xl bg-red-950/30 border border-red-900/60 font-mono">
                <span className="text-red-500 text-[10px] mr-2">[{m.timestamp}]</span>
                <strong className="text-red-300 mr-1.5">{m.author}:</strong>
                <span className="text-red-100">{m.message}</span>
              </div>
            ))}
          </div>
          <form onSubmit={submitMafia} className="flex gap-2">
            <input type="text" value={mafiaInput} onChange={(e) => setMafiaInput(e.target.value)}
              placeholder="Private Mafia message..." className="input-field flex-1 text-xs border-red-900 text-red-200" />
            <button type="submit" className="bg-red-900 hover:bg-red-800 text-red-100 border border-red-700 !py-2 !px-3 text-xs rounded-xl flex items-center gap-1 font-mono font-bold">
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}

      {tab === 'ghost' && isDeadOrHost && (
        <div className="flex flex-col flex-1 min-h-0 font-sans">
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs mb-2">
            {ghostLogs.map((g) => (
              <div key={g.id} className="p-2.5 rounded-xl bg-purple-950/30 border border-purple-900/60 font-mono">
                <span className="text-purple-400 text-[10px] mr-2">[{g.timestamp}]</span>
                <strong className="text-purple-300 mr-1.5">{g.author}:</strong>
                <span className="text-purple-100">{g.message}</span>
              </div>
            ))}
          </div>
          <form onSubmit={submitGhost} className="flex gap-2">
            <input type="text" value={ghostInput} onChange={(e) => setGhostInput(e.target.value)}
              placeholder="Ghost lounge chat..." className="input-field flex-1 text-xs border-purple-900 text-purple-200" />
            <button type="submit" className="bg-purple-900 hover:bg-purple-800 text-purple-100 border border-purple-700 !py-2 !px-3 text-xs rounded-xl flex items-center gap-1 font-mono font-bold">
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
