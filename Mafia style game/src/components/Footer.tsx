'use client';

import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-white/10 py-6 text-center text-xs text-slate-400 font-mono mt-auto relative z-20 bg-[#05070c]/80 backdrop-blur-md">
      <div className="flex justify-center items-center gap-4 mb-3">
        <a
          href="mailto:jangidbhavya99@gmail.com"
          className="w-9 h-9 rounded-full bg-white flex items-center justify-center transition-all hover:-translate-y-0.5 hover:bg-[#ffcc00] shadow-md group"
          title="Email"
        >
          <svg className="w-5 h-5 fill-black group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
            <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
          </svg>
        </a>
        <a
          href="https://wa.me/918955136723"
          target="_blank"
          rel="noopener noreferrer"
          className="w-9 h-9 rounded-full bg-white flex items-center justify-center transition-all hover:-translate-y-0.5 hover:bg-[#ffcc00] shadow-md group"
          title="WhatsApp (+91 8955136723)"
        >
          <svg className="w-5 h-5 fill-black group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
            <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm.01 1.67c2.2 0 4.26.86 5.82 2.42 1.55 1.56 2.41 3.63 2.41 5.83 0 4.54-3.7 8.23-8.24 8.23-1.48 0-2.93-.39-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.32a8.196 8.196 0 0 1-1.26-4.36c0-4.54 3.69-8.24 8.24-8.24zm-2.94 3.77c-.16 0-.43.06-.65.3-.22.23-.84.82-.84 2.02 0 1.2.88 2.35 1 2.52.13.16 1.66 2.61 4.08 3.56 2.02.79 2.43.63 2.87.59.44-.04 1.43-.59 1.63-1.15.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28-.24-.12-1.43-.7-1.65-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.01-.37-1.93-1.19-.71-.64-1.2-1.43-1.33-1.67-.14-.24-.02-.37.1-.49.11-.11.25-.3.37-.44.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.52-1.25-.71-1.72-.19-.45-.38-.39-.52-.4-.14-.01-.3-.03-.5-.03z"/>
          </svg>
        </a>
        <a
          href="https://github.com/skillsxsin"
          target="_blank"
          rel="noopener noreferrer"
          className="w-9 h-9 rounded-full bg-white flex items-center justify-center transition-all hover:-translate-y-0.5 hover:bg-[#ffcc00] shadow-md group"
          title="GitHub (@skillsxsin)"
        >
          <svg className="w-5 h-5 fill-black group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
            <path d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z"/>
          </svg>
        </a>
        <a
          href="https://www.linkedin.com/in/bhavya-jangid/"
          target="_blank"
          rel="noopener noreferrer"
          className="w-9 h-9 rounded-full bg-white flex items-center justify-center transition-all hover:-translate-y-0.5 hover:bg-[#ffcc00] shadow-md group"
          title="LinkedIn"
        >
          <svg className="w-5 h-5 fill-black group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
            <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
          </svg>
        </a>
      </div>
      <p>© 2026 Bhavya Jangid. Crafted with Vanilla CSS & Retro Design.</p>
    </footer>
  );
};
