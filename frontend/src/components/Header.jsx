import React, { useState, useEffect } from 'react';
import { RefreshCw, Database, Radio, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function Header({ title, subtitle, onRefresh, isRefreshing }) {
  const { theme, toggleTheme, isDark } = useTheme();
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }) + ' UTC'
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="sticky top-0 z-20 h-20 px-8 flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-[#0b0f19]/80 backdrop-blur-md transition-colors duration-200">
      {/* Title & Subtitle with clean typography */}
      <div>
        <h1 className="text-xl font-display font-semibold text-slate-900 dark:text-white tracking-tight">
          {title}
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5">
          {subtitle}
        </p>
      </div>

      {/* Action Controls & Theme Toggle */}
      <div className="flex items-center space-x-3">
        {/* Simulated Data Status Badge */}
        <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-xs font-mono text-slate-600 dark:text-slate-300">
          <Database className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
          <span>Simulated Data</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        </div>

        {/* UTC Clock */}
        <div className="hidden md:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 font-mono">
          <Radio className="w-3 h-3 text-emerald-500" />
          <span>{timeStr || 'LIVE'}</span>
        </div>

        {/* Light / Dark Mode Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors flex items-center justify-center"
          title={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
          aria-label={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
        >
          {isDark ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-600" />
          )}
        </button>

        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className={`p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all ${
            isRefreshing ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'
          }`}
          title="Refresh metrics"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-500' : ''}`} />
        </button>
      </div>
    </header>
  );
}
