import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Boxes,
  AlertTriangle,
  PackageOpen,
  CheckCircle2,
  Clock,
  Truck,
} from 'lucide-react';
import SkeletonCard from '../components/SkeletonCard';
import { api } from '../services/api';

export default function InventoryBoardScreen() {
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchInventory();
  }, []);

  async function fetchInventory() {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getInventoryRisk();
      setItems(res.items || []);
      setSummary(res.summary);
    } catch (err) {
      setError(err.message || 'Failed to load inventory board');
    } finally {
      setLoading(false);
    }
  }

  const filteredItems = items.filter((item) => {
    if (filterStatus === 'all') return true;
    return item.status === filterStatus;
  });

  const getStatusConfig = (status) => {
    switch (status) {
      case 'stockout':
        return {
          label: 'Critical Stockout',
          color: 'rose',
          textColor: 'text-rose-600 dark:text-rose-400',
          badgeBg: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/50',
          borderColor: 'border-rose-200/90 dark:border-rose-900/40 hover:border-rose-300 dark:hover:border-rose-800',
          barColor: 'bg-rose-500',
          icon: AlertTriangle,
        };
      case 'excess':
        return {
          label: 'Excess Inventory',
          color: 'amber',
          textColor: 'text-amber-600 dark:text-amber-400',
          badgeBg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50',
          borderColor: 'border-amber-200/90 dark:border-amber-900/40 hover:border-amber-300 dark:hover:border-amber-800',
          barColor: 'bg-amber-500',
          icon: PackageOpen,
        };
      default:
        return {
          label: 'Healthy Stock',
          color: 'emerald',
          textColor: 'text-emerald-600 dark:text-emerald-400',
          badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50',
          borderColor: 'border-emerald-200/90 dark:border-emerald-900/40 hover:border-emerald-300 dark:hover:border-emerald-800',
          barColor: 'bg-emerald-500',
          icon: CheckCircle2,
        };
    }
  };

  return (
    <div className="p-10 space-y-10 max-w-7xl mx-auto">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-7 clean-card rounded-2xl">
        <div>
          <div className="flex items-center space-x-2">
            <Boxes className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h2 className="font-display font-bold text-lg text-slate-900 dark:text-white">
              Inventory Position & Supply Risk
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Stock level tracking relative to supplier lead times and daily order velocity
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 text-xs font-mono select-none overflow-x-auto">
          {[
            { id: 'all', label: `All (${items.length})` },
            { id: 'stockout', label: `Stockout (${summary?.stockout_risk_count ?? 0})` },
            { id: 'healthy', label: `Healthy (${summary?.healthy_count ?? 0})` },
            { id: 'excess', label: `Excess (${summary?.excess_stock_count ?? 0})` },
          ].map((tab) => {
            const active = filterStatus === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                className={`relative px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
                  active ? 'text-slate-900 dark:text-white font-semibold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                {tab.label}
                {active && (
                  <motion.div
                    layoutId="invFilterMinimal"
                    className="absolute inset-0 rounded-lg bg-white dark:bg-slate-700 shadow-sm"
                    transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} lines={4} />
          ))}
        </div>
      ) : error ? (
        <div className="clean-card rounded-2xl p-12 text-center border-rose-200 dark:border-rose-900/50">
          <p className="text-rose-600 dark:text-rose-400">{error}</p>
        </div>
      ) : (
        <motion.div
          layout
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          <AnimatePresence>
            {filteredItems.map((item) => {
              const cfg = getStatusConfig(item.status);
              const Icon = cfg.icon;

              return (
                <motion.div
                  key={item.product_id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.25 }}
                  whileHover={{ y: -4, transition: { duration: 0.15 } }}
                  className={`clean-card rounded-2xl p-6 border ${cfg.borderColor} transition-all flex flex-col justify-between group`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 tracking-wider uppercase">
                          {item.sku} • {item.category}
                        </span>
                        <h3 className="text-base font-display font-semibold text-slate-900 dark:text-white truncate mt-0.5 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {item.product_name}
                        </h3>
                      </div>

                      <span className={`inline-flex items-center space-x-1 text-[11px] font-mono px-2 py-0.5 rounded-full border ${cfg.badgeBg} flex-shrink-0`}>
                        <Icon className="w-3 h-3" />
                        <span>{item.status.toUpperCase()}</span>
                      </span>
                    </div>

                    {/* Stock Numbers & Days of Supply */}
                    <div className="mt-6 flex items-baseline justify-between">
                      <div>
                        <div className="text-3xl font-display font-bold text-slate-900 dark:text-white tracking-tight">
                          {item.stock_level}
                          <span className="text-xs font-normal text-slate-500 ml-1.5 font-sans">
                            units in stock
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className={`text-sm font-mono font-bold ${cfg.textColor}`}>
                          {item.days_of_supply}d
                        </div>
                        <div className="text-[10px] text-slate-500">Days of Supply</div>
                      </div>
                    </div>

                    {/* Stock Bar */}
                    <div className="mt-4 space-y-1.5">
                      <div className="flex justify-between text-[11px] font-mono text-slate-500">
                        <span>Threshold: {item.reorder_threshold}u</span>
                        <span>{item.stock_capacity_pct}% of capacity</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, Math.max(8, item.stock_capacity_pct))}%` }}
                          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                          className={`h-full rounded-full ${cfg.barColor}`}
                        />
                      </div>
                    </div>

                    {/* Operational Details Grid */}
                    <div className="mt-5 grid grid-cols-2 gap-2 text-xs font-mono text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-xl p-3 border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center space-x-1.5">
                        <Truck className="w-3.5 h-3.5 text-slate-400" />
                        <span>Lead: {item.lead_time_days} days</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Burn: {item.avg_daily_demand}/day</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom */}
                  <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <div className="text-[10px] uppercase font-mono text-slate-400">
                        Est. Runout Date
                      </div>
                      <div className="font-mono text-slate-700 dark:text-slate-300 font-medium">
                        {item.estimated_runout_date}
                      </div>
                    </div>

                    {item.recommended_reorder_qty > 0 ? (
                      <div className="text-right">
                        <div className="text-[10px] uppercase font-mono text-rose-600 dark:text-rose-400 font-semibold">
                          Reorder Action
                        </div>
                        <div className="font-mono text-slate-900 dark:text-white font-bold">
                          +{item.recommended_reorder_qty} units
                        </div>
                      </div>
                    ) : (
                      <div className="text-right">
                        <div className="text-[10px] uppercase font-mono text-emerald-600 dark:text-emerald-400">
                          Reorder Status
                        </div>
                        <div className="font-mono text-slate-500">Adequate</div>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
