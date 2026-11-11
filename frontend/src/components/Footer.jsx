import React from 'react';
import { Database, Cpu, Sparkles } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-slate-200/80 dark:border-slate-800 py-8 px-8 bg-white/50 dark:bg-[#0b0f19]/50 text-xs text-slate-500 dark:text-slate-400 transition-colors duration-200">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Simulated Data Label */}
        <div className="flex items-center space-x-2.5">
          <div className="p-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            <Database className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="font-semibold text-slate-700 dark:text-slate-200">Simulated data</span>
            <span className="text-slate-500 dark:text-slate-400 ml-1.5">
              — Generated for demonstration and ML benchmarking. All metrics strictly computed by code.
            </span>
          </div>
        </div>

        {/* Tech Stack Info */}
        <div className="flex items-center space-x-4 font-mono text-[11px] text-slate-500">
          <div className="flex items-center space-x-1">
            <Cpu className="w-3 h-3 text-indigo-500" />
            <span>Gradient Boosting</span>
          </div>
          <span>•</span>
          <div className="flex items-center space-x-1">
            <Sparkles className="w-3 h-3 text-purple-500" />
            <span>VADER NLP</span>
          </div>
          <span>•</span>
          <span>Light / Dark Theme</span>
        </div>
      </div>
    </footer>
  );
}
