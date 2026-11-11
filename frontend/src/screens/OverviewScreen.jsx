import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  PackageOpen,
  HeartHandshake,
  CheckCircle2,
  TrendingUp,
  Activity,
  ArrowRight,
  ShieldAlert,
  Boxes,
  Sparkles,
} from 'lucide-react';
import CountUp from '../components/CountUp';
import SkeletonCard from '../components/SkeletonCard';
import { api } from '../services/api';

export default function OverviewScreen({ onNavigate }) {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState(null);
  const [activities, setActivities] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchOverviewData();
  }, []);

  async function fetchOverviewData() {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getKpis();
      setKpis(data.kpis);
      setActivities(data.activities);
    } catch (err) {
      setError(err.message || 'Failed to load overview data');
    } finally {
      setLoading(false);
    }
  }

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 },
    },
  };

  const cardVariant = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
  };

  if (loading) {
    return (
      <div className="space-y-8 p-10 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <SkeletonCard className="lg:col-span-2 h-72" lines={5} />
          <SkeletonCard className="h-72" lines={4} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-10 max-w-xl mx-auto text-center py-24">
        <div className="p-4 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 w-16 h-16 mx-auto flex items-center justify-center mb-4 border border-rose-200 dark:border-rose-800">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Failed to Load Overview</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{error}</p>
        <button
          onClick={fetchOverviewData}
          className="px-5 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-sm font-medium transition-all"
        >
          Try Again
        </button>
      </div>
    );
  }

  const kpiCards = [
    {
      id: 'stockout',
      title: 'Stockout Risk',
      value: kpis?.stockout_risk_products ?? 0,
      suffix: ' SKUs',
      desc: 'Demand exceeds lead time buffer',
      color: 'rose',
      icon: AlertTriangle,
      border: 'hover:border-rose-300 dark:hover:border-rose-800',
      badge: 'Action Urged',
      badgeBg: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/50',
      navTarget: 'inventory',
    },
    {
      id: 'excess',
      title: 'Excess Inventory',
      value: kpis?.excess_stock_products ?? 0,
      suffix: ' SKUs',
      desc: 'Stock > 2.2x reorder ceiling',
      color: 'amber',
      icon: PackageOpen,
      border: 'hover:border-amber-300 dark:hover:border-amber-800',
      badge: 'Markdown Opportunity',
      badgeBg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50',
      navTarget: 'inventory',
    },
    {
      id: 'sentiment',
      title: 'Avg Customer Sentiment',
      value: kpis?.average_sentiment ?? 0,
      decimals: 2,
      prefix: kpis?.average_sentiment > 0 ? '+' : '',
      desc: 'VADER aggregate (-1.0 to +1.0)',
      color: 'indigo',
      icon: HeartHandshake,
      border: 'hover:border-indigo-300 dark:hover:border-indigo-800',
      badge: 'Positive Perception',
      badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900/50',
      navTarget: 'sentiment',
    },
    {
      id: 'approvals',
      title: 'Pending Decisions',
      value: kpis?.pending_approvals ?? 0,
      suffix: ' Items',
      desc: 'AI price adjustments waiting',
      color: 'emerald',
      icon: CheckCircle2,
      border: 'hover:border-emerald-300 dark:hover:border-emerald-800',
      badge: 'Sign-off Needed',
      badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50',
      navTarget: 'pricing',
    },
  ];

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="p-10 space-y-10 max-w-7xl mx-auto"
    >
      {/* Welcome Banner */}
      <motion.div
        variants={cardVariant}
        className="clean-card rounded-2xl p-8 transition-all"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-2">
            <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-mono">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Executive Decision Support</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 dark:text-white tracking-tight">
              E-Commerce Demand & Pricing Control
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
              Automated demand forecasting, supply chain lead time risk monitoring, and explainable
              pricing recommendations bounded strictly by your SKU margin constraints.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => onNavigate('forecast')}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all flex items-center space-x-1.5"
            >
              <span>Explore Forecasts</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <motion.div
              key={kpi.id}
              variants={cardVariant}
              onClick={() => onNavigate(kpi.navTarget)}
              className={`clean-card clean-card-hover rounded-2xl p-6 cursor-pointer group flex flex-col justify-between ${kpi.border}`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {kpi.title}
                  </span>
                  <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:scale-105 transition-transform">
                    <Icon className="w-4 h-4" />
                  </div>
                </div>

                <div className="mt-4 flex items-baseline space-x-2">
                  <CountUp
                    value={kpi.value}
                    decimals={kpi.decimals || 0}
                    prefix={kpi.prefix || ''}
                    suffix={kpi.suffix || ''}
                    className="text-3xl font-display font-bold text-slate-900 dark:text-white tracking-tight"
                  />
                </div>

                <div className="mt-2.5">
                  <span className={`text-[11px] font-mono px-2 py-0.5 rounded-md border ${kpi.badgeBg}`}>
                    {kpi.badge}
                  </span>
                </div>
              </div>

              <div className="mt-6 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200">
                <span className="truncate">{kpi.desc}</span>
                <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-indigo-600 dark:text-indigo-400" />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Main Grid: Live Events & Quick Navigation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Real-Time Activity Strip (Left 2 cols) */}
        <motion.div
          variants={cardVariant}
          className="lg:col-span-2 clean-card rounded-2xl p-7 space-y-5"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="font-display font-semibold text-slate-900 dark:text-white text-base">
                Operational Activity Stream
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-500">
              Live automated events
            </span>
          </div>

          <div className="space-y-3">
            {activities.map((act) => {
              let dotColor = 'bg-indigo-500';

              if (act.severity === 'critical') {
                dotColor = 'bg-rose-500';
              } else if (act.severity === 'warning') {
                dotColor = 'bg-amber-500';
              } else if (act.severity === 'success') {
                dotColor = 'bg-emerald-500';
              }

              return (
                <div
                  key={act.id}
                  className="flex items-start space-x-3.5 p-3.5 rounded-xl bg-slate-50/70 hover:bg-slate-100/70 dark:bg-slate-800/30 dark:hover:bg-slate-800/60 border border-slate-100 dark:border-slate-800 transition-colors"
                >
                  <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${dotColor}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{act.product}</h4>
                      <span className="text-[11px] font-mono text-slate-400 whitespace-nowrap">{act.time}</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{act.message}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Shortcuts & Summary Panel (Right 1 col) */}
        <motion.div
          variants={cardVariant}
          className="clean-card rounded-2xl p-7 space-y-6 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <Boxes className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              <h3 className="font-display font-semibold text-slate-900 dark:text-white text-base">
                Quick Navigation
              </h3>
            </div>

            <div className="mt-4 space-y-3">
              <button
                onClick={() => onNavigate('forecast')}
                className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-50 hover:bg-indigo-50/50 dark:bg-slate-800/30 dark:hover:bg-slate-800/70 border border-slate-200/60 dark:border-slate-800 text-left transition-all group"
              >
                <div>
                  <div className="text-sm font-medium text-slate-800 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                    Forecast Studio
                  </div>
                  <div className="text-xs text-slate-500">
                    Baseline MA vs Gradient-Boosting
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
              </button>

              <button
                onClick={() => onNavigate('inventory')}
                className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-50 hover:bg-rose-50/50 dark:bg-slate-800/30 dark:hover:bg-slate-800/70 border border-slate-200/60 dark:border-slate-800 text-left transition-all group"
              >
                <div>
                  <div className="text-sm font-medium text-slate-800 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400">
                    Inventory Board
                  </div>
                  <div className="text-xs text-slate-500">
                    Lead time & stockout risk control
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-rose-600 dark:group-hover:text-rose-400 group-hover:translate-x-1 transition-all" />
              </button>

              <button
                onClick={() => onNavigate('pricing')}
                className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-50 hover:bg-emerald-50/50 dark:bg-slate-800/30 dark:hover:bg-slate-800/70 border border-slate-200/60 dark:border-slate-800 text-left transition-all group"
              >
                <div>
                  <div className="text-sm font-medium text-slate-800 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                    Pricing Desk
                  </div>
                  <div className="text-xs text-slate-500">
                    Review and approve clamped prices
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
              </button>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-400">
            <span className="font-semibold text-slate-800 dark:text-slate-200">Catalog Coverage:</span>
            <p className="mt-1 text-[11px] leading-relaxed">
              Monitoring {kpis?.total_catalog_products ?? 10} SKUs across 400 historical daily records.
            </p>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
