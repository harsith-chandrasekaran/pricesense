import React from 'react';
import { useTheme } from '../context/ThemeContext';

export default function AnimatedBackground() {
  const { isDark } = useTheme();

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
      {/* Base background color */}
      <div className="absolute inset-0 bg-slate-50/60 dark:bg-[#0b0f19] transition-colors duration-300" />
      
      {/* Subtle Dot Grid */}
      <div 
        className="absolute inset-0 opacity-[0.45] dark:opacity-[0.18] bg-[radial-gradient(#94a3b8_1px,transparent_1px)] dark:bg-[radial-gradient(#475569_1px,transparent_1px)] [background-size:24px_24px]" 
      />

      {/* Very soft, subtle gradient wash */}
      <div className="absolute top-0 right-0 w-[500px] h-[400px] bg-indigo-50/40 dark:bg-indigo-950/20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[400px] bg-slate-100/50 dark:bg-slate-900/40 rounded-full blur-3xl" />
    </div>
  );
}
