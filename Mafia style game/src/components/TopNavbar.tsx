'use client';

import React, { useState, useEffect } from 'react';
import { getAssetPath } from '../utils/assets';
import { spyBgm } from '../utils/spyAudioSynthesizer';
import { Volume2, VolumeX, Music } from 'lucide-react';

export const TopNavbar: React.FC = () => {
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [volume, setVolumeState] = useState<number>(0.6);
  const [showVolumeSlider, setShowVolumeSlider] = useState<boolean>(false);

  useEffect(() => {
    setIsMuted(spyBgm.getMuted() || !spyBgm.getIsPlaying());
    setVolumeState(spyBgm.getVolume());
  }, []);

  const toggleAudio = () => {
    if (!spyBgm.getIsPlaying()) {
      spyBgm.start();
    }
    const muted = spyBgm.toggleMute();
    setIsMuted(muted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolumeState(val);
    spyBgm.setVolume(val);
    setIsMuted(val === 0);
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

        {/* Right: Interactive Mute & Volume Controls */}
        <div className="flex items-center gap-1.5 sm:gap-3 relative shrink-0">
          {/* Synthesized Spy BGM Mute Switch & Volume Controller */}
          <div className="flex items-center gap-1 sm:gap-1.5 bg-white/5 border border-white/15 p-1 rounded-2xl shadow-md">
            <button
              onClick={toggleAudio}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border text-[11px] sm:text-xs font-mono font-bold transition-all ${
                !isMuted
                  ? 'bg-gradient-to-r from-purple-900/80 to-red-900/80 border-[#ffcc00]/50 text-[#ffcc00] shadow-md shadow-[#ffcc00]/20'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
              }`}
              title={!isMuted ? 'Mute Spy BGM' : 'Play Synthesized Spy Thriller BGM'}
            >
              {!isMuted ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#ffcc00] animate-bounce" />
                  <span className="hidden sm:inline">SPY MUSIC</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />
                  <span className="hidden sm:inline">MUTED</span>
                </>
              )}
            </button>

            {/* Inline Volume Slider Bar */}
            <div className="flex items-center gap-1.5 sm:gap-2 px-1.5 sm:px-2.5 py-1">
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-12 sm:w-20 accent-[#ffcc00] h-1.5 bg-white/20 rounded-lg cursor-pointer"
                title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
              />
              <span className="text-[9px] sm:text-[10px] font-mono text-[#ffcc00] font-bold w-6 sm:w-7 text-right">
                {Math.round((isMuted ? 0 : volume) * 100)}%
              </span>
            </div>
          </div>

          <a
            href="https://bhavyajangid.com"
            className="text-[11px] sm:text-xs font-bold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-2.5 sm:px-3.5 py-1.5 rounded-xl transition-all hidden xs:inline-block"
          >
            Portfolio
          </a>
        </div>
      </div>
    </nav>
  );
};

