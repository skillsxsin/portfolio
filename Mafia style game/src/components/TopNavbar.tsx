'use client';

import React, { useState, useEffect } from 'react';
import { getAssetPath } from '../utils/assets';
import { spyBgm } from '../utils/spyAudioSynthesizer';
import { Volume2, VolumeX } from 'lucide-react';

export const TopNavbar: React.FC = () => {
  const [isMuted, setIsMuted] = useState<boolean>(true);

  useEffect(() => {
    setIsMuted(spyBgm.getMuted() || !spyBgm.getIsPlaying());
  }, []);

  const toggleAudio = () => {
    if (!spyBgm.getIsPlaying()) {
      spyBgm.start();
    }
    const muted = spyBgm.toggleMute();
    setIsMuted(muted);
  };

  return (
    <nav className="w-full border-b border-white/15 bg-[#0a0e19]/75 backdrop-blur-xl sticky top-0 z-40 px-3 sm:px-4 py-2 sm:py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
        {/* Left: Brand logo & Bhavya avatar standing photo */}
        <a href="https://bhavyajangid.com" className="flex items-center gap-2 sm:gap-3 group shrink-0">
          <img
            src={getAssetPath('/standing.png')}
            alt="Bhavya Jangid"
            className="h-8 sm:h-10 w-auto object-contain filter drop-shadow transition-transform duration-200 group-hover:scale-105"
          />
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-extrabold text-xs sm:text-sm text-white tracking-wide group-hover:text-[#ffcc00] transition-colors">
                BHAVYA JANGID
              </span>
              <span className="text-[9px] sm:text-[10px] font-mono uppercase bg-[#ffcc00]/10 text-[#ffcc00] border border-[#ffcc00]/30 px-1.5 sm:px-2 py-0.5 rounded-full font-bold">
                PROJECTS
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-400 font-mono hidden md:block">bhavyajangid.com/projects/hidden-agenda</p>
          </div>
        </a>

        {/* Right: Audio Mute/Un-mute Icon Button */}
        <div className="flex items-center gap-2 sm:gap-3 relative shrink-0">
          <button
            onClick={toggleAudio}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-mono font-bold transition-all ${
              !isMuted
                ? 'bg-gradient-to-r from-purple-900/90 to-red-900/90 border-[#ffcc00]/60 text-[#ffcc00] shadow-md shadow-[#ffcc00]/20'
                : 'bg-white/5 border-white/15 text-slate-400 hover:text-white hover:border-white/30'
            }`}
            title={!isMuted ? 'Mute Retro Spy Theme' : 'Play 8-Bit Retro Spy Theme'}
          >
            {!isMuted ? (
              <>
                <Volume2 className="w-4 h-4 text-[#ffcc00] animate-pulse" />
                <span className="hidden sm:inline">MUSIC ON</span>
              </>
            ) : (
              <>
                <VolumeX className="w-4 h-4 text-slate-400" />
                <span className="hidden sm:inline">MUTED</span>
              </>
            )}
          </button>

          <a
            href="https://bhavyajangid.com"
            className="text-[11px] sm:text-xs font-bold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-2.5 sm:px-3.5 py-2 rounded-xl transition-all hidden xs:inline-block"
          >
            Portfolio
          </a>
        </div>
      </div>
    </nav>
  );
};


