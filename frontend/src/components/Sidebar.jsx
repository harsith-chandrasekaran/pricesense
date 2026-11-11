import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  LineChart,
  Boxes,
  HeartHandshake,
  Tag,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Cpu,
} from 'lucide-react';

export default function Sidebar({
  currentScreen,
  setCurrentScreen,
  collapsed,
  setCollapsed,
  badges = {},
}) {
  const navItems = [
    {
      id: 'overview',
      label: 'Overview',
      icon: LayoutDashboard,
      desc: 'KPIs & recent signals',
    },
    {
      id: 'forecast',
      label: 'Forecast Studio',
      icon: LineChart,
      desc: 'Moving Average vs ML',
    },
    {
      id: 'inventory',
      label: 'Inventory Board',
      icon: Boxes,
      badge: badges.stockoutRisks > 0 ? `${badges.stockoutRisks}` : null,
      badgeColor: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400',
      desc: 'Stockout & excess control',
    },
    {
      id: 'sentiment',
      label: 'Sentiment Lab',
      icon: HeartHandshake,
      desc: 'Review polarity analytics',
    },
    {
      id: 'pricing',
      label: 'Pricing Desk',
      icon: Tag,
      badge: badges.pendingApprovals > 0 ? `${badges.pendingApprovals}` : null,
      badgeColor: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400',
      desc: 'Price recommendations',
    },
  ];

  return (
    <motion.aside
      animate={{ width: collapsed ? 80 : 256 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="relative flex flex-col h-screen sticky top-0 z-30 bg-white dark:bg-[#0e1320] border-r border-slate-200/80 dark:border-slate-800 select-none transition-colors duration-200"
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between p-5 border-b border-slate-200/80 dark:border-slate-800 h-20">
        <div className="flex items-center space-x-3 overflow-hidden">
          {/* Minimal Brand Icon */}
          <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
            <TrendingUp className="w-5 h-5" />
          </div>

          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.18 }}
                className="whitespace-nowrap"
              >
                <div className="flex items-center space-x-1.5">
                  <span className="font-display font-bold text-base tracking-tight text-slate-900 dark:text-white">
                    Price<span className="text-indigo-600 dark:text-indigo-400">Sense</span>
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
                    v2.4
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">Pricing Intelligence</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Toggle Collapse */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-2 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          {!collapsed ? 'Modules' : '•••'}
        </div>

        {navItems.map((item) => {
          const isActive = currentScreen === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => setCurrentScreen(item.id)}
              className={`relative group w-full flex items-center rounded-xl transition-all duration-150 text-left ${
                collapsed ? 'justify-center p-3' : 'px-3.5 py-2.5'
              } ${
                isActive
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-medium'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
              }`}
            >
              {/* Active Indicator Bar */}
              {isActive && (
                <motion.div
                  layoutId="activeSideBar"
                  className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-indigo-600 dark:bg-indigo-400"
                  transition={{ type: "spring", stiffness: 450, damping: 35 }}
                />
              )}

              <div className="relative z-10 flex items-center space-x-3 w-full">
                <Icon
                  className={`w-4 h-4 flex-shrink-0 ${
                    isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                  }`}
                />

                {!collapsed && (
                  <div className="flex-1 min-w-0 flex items-center justify-between">
                    <span className="text-sm truncate">{item.label}</span>
                    {item.badge && (
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full font-semibold ${item.badgeColor}`}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Tooltip on collapsed */}
              {collapsed && (
                <div className="absolute left-full ml-3 px-2.5 py-1 rounded-lg bg-slate-900 text-white text-xs opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-md z-50 whitespace-nowrap">
                  {item.label}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer System Status */}
      <div className="p-3 border-t border-slate-200/80 dark:border-slate-800">
        {!collapsed ? (
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/40 text-xs space-y-1.5">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                <span className="font-medium text-slate-700 dark:text-slate-300">Models Online</span>
              </span>
              <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Ready</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
              <span>ML Engine</span>
              <span>VADER 3.3</span>
            </div>
          </div>
        ) : (
          <div className="flex justify-center py-2" title="Models Online">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
        )}
      </div>
    </motion.aside>
  );
}
