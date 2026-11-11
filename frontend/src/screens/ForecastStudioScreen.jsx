import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import {
  LineChart as ChartIcon,
  Sparkles,
} from 'lucide-react';
import CountUp from '../components/CountUp';
import SkeletonCard from '../components/SkeletonCard';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';

export default function ForecastStudioScreen() {
  const { isDark } = useTheme();
  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState(1);
  const [horizon, setHorizon] = useState(7);
  const [forecastData, setForecastData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadCatalog() {
      try {
        const res = await api.getProducts();
        if (res.products && res.products.length > 0) {
          setProducts(res.products);
          setSelectedProductId(res.products[0].id);
        }
      } catch (err) {
        console.error('Failed to load products:', err);
      }
    }
    loadCatalog();
  }, []);

  useEffect(() => {
    if (!selectedProductId) return;

    async function fetchForecast() {
      try {
        setLoading(true);
        setError(null);
        const data = await api.getForecast(selectedProductId, horizon);
        setForecastData(data);
      } catch (err) {
        setError(err.message || 'Failed to load forecast model output');
      } finally {
        setLoading(false);
      }
    }
    fetchForecast();
  }, [selectedProductId, horizon]);

  const chartData = React.useMemo(() => {
    if (!forecastData) return [];

    const items = [];

    // Historical 14 days
    const recent = (forecastData.recent_history || []).slice(-14);
    recent.forEach((r) => {
      items.push({
        date: r.date.slice(5),
        fullDate: r.date,
        actual: r.actual,
        type: 'history',
      });
    });

    // Future predictions
    (forecastData.future_forecast || []).forEach((f) => {
      items.push({
        date: f.date.slice(5),
        fullDate: f.date,
        advanced: f.advanced,
        baseline: f.baseline,
        lower: f.lower_bound,
        upper: f.upper_bound,
        type: 'projection',
      });
    });

    return items;
  }, [forecastData]);

  const selectedProduct = products.find((p) => p.id === Number(selectedProductId));

  // Custom Minimal Tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;

    const dataItem = payload[0]?.payload;
    const isProjection = dataItem?.type === 'projection';

    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-slate-200 dark:border-slate-800 shadow-md text-xs space-y-1.5 min-w-[170px]">
        <div className="font-mono text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-100 dark:border-slate-800 pb-1 flex items-center justify-between">
          <span>{dataItem?.fullDate || label}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
            isProjection 
              ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300' 
              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
          }`}>
            {isProjection ? 'AI Projected' : 'Historical'}
          </span>
        </div>

        {payload.map((entry, index) => {
          if (entry.value === undefined || entry.value === null) return null;
          return (
            <div key={`item-${index}`} className="flex items-center justify-between space-x-3 pt-0.5">
              <span className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-400">
                <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: entry.color }} />
                <span>{entry.name}:</span>
              </span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                {typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value} u
              </span>
            </div>
          );
        })}

        {isProjection && dataItem?.lower !== undefined && (
          <div className="text-[10px] text-slate-400 font-mono pt-1 border-t border-slate-100 dark:border-slate-800">
            95% Range: {dataItem.lower} - {dataItem.upper}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-10 space-y-10 max-w-7xl mx-auto">
      {/* Top Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-7 clean-card rounded-2xl">
        <div className="flex-1 max-w-md">
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
            Catalog Product SKU
          </label>
          <div className="relative">
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(Number(e.target.value))}
              className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-indigo-500 transition-colors appearance-none cursor-pointer"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku}) — ${p.current_price}
                </option>
              ))}
            </select>
            <div className="absolute right-4 top-3.5 pointer-events-none text-slate-400 text-xs">
              ▼
            </div>
          </div>
        </div>

        {/* 7 vs 30 Days Toggle */}
        <div className="flex flex-col sm:items-end">
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
            Forecast Horizon
          </label>
          <div className="relative inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 select-none">
            {[7, 30].map((h) => {
              const active = horizon === h;
              return (
                <button
                  key={h}
                  onClick={() => setHorizon(h)}
                  className={`relative z-10 px-5 py-2 text-xs font-mono font-medium rounded-lg transition-colors ${
                    active ? 'text-indigo-700 dark:text-white font-semibold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                  }`}
                >
                  {h}-Day Horizon
                  {active && (
                    <motion.div
                      layoutId="horizonPillMinimal"
                      className="absolute inset-0 rounded-lg bg-white dark:bg-slate-700 shadow-sm"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-6">
          <SkeletonCard className="h-96" lines={2} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      ) : error ? (
        <div className="clean-card rounded-2xl p-12 text-center border-rose-200 dark:border-rose-900/50">
          <p className="text-rose-600 dark:text-rose-400 font-medium">{error}</p>
        </div>
      ) : (
        <>
          {/* Main Chart Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="clean-card rounded-2xl p-7 space-y-5"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-3">
              <div>
                <div className="flex items-center space-x-2">
                  <ChartIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="font-display font-semibold text-lg text-slate-900 dark:text-white">
                    {forecastData?.product_name || selectedProduct?.name}
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Overlaying seasonal Moving Average against {forecastData?.metrics?.advanced?.model_name}
                </p>
              </div>

              {/* Accuracy Improvement Pill */}
              <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-mono">
                <Sparkles className="w-3.5 h-3.5" />
                <span>
                  +{forecastData?.metrics?.mae_improvement_pct}% Lower MAE vs Baseline
                </span>
              </div>
            </div>

            {/* Recharts Curve Container */}
            <div className="h-80 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 15, left: -5, bottom: 0 }}>
                  <defs>
                    <linearGradient id="indigoArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.16} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke={isDark ? '#1e293b' : '#e2e8f0'} 
                    vertical={false} 
                  />
                  <XAxis
                    dataKey="date"
                    stroke={isDark ? '#64748b' : '#94a3b8'}
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: isDark ? '#334155' : '#cbd5e1' }}
                  />
                  <YAxis
                    stroke={isDark ? '#64748b' : '#94a3b8'}
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: isDark ? '#334155' : '#cbd5e1' }}
                    unit=" u"
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    iconType="circle"
                    wrapperStyle={{ paddingBottom: '16px', fontSize: '12px' }}
                  />

                  {/* Historical Sales */}
                  <Line
                    type="monotone"
                    dataKey="actual"
                    name="Historical Sales"
                    stroke={isDark ? '#94a3b8' : '#64748b'}
                    strokeWidth={1.8}
                    dot={{ fill: isDark ? '#94a3b8' : '#64748b', r: 3 }}
                    connectNulls
                  />

                  {/* Baseline Moving Average */}
                  <Line
                    type="monotone"
                    dataKey="baseline"
                    name="Seasonal 7-Day MA"
                    stroke="#a855f7"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false}
                    connectNulls
                  />

                  {/* Gradient-Boosting Area */}
                  <Area
                    type="monotone"
                    dataKey="advanced"
                    name="Gradient-Boosting Model"
                    stroke="#4f46e5"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#indigoArea)"
                    dot={{ fill: '#4f46e5', strokeWidth: 1, r: 3.5 }}
                    connectNulls
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Total Demand Summary Bar */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-500 font-mono gap-4">
              <div className="flex items-center space-x-2">
                <span className="text-slate-700 dark:text-slate-300 font-medium">Upcoming Projected Demand:</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                  {forecastData?.summary?.total_projected_demand} units
                </span>
                <span className="text-slate-400">
                  (~{forecastData?.summary?.avg_daily_projected} units/day)
                </span>
              </div>
              <div className="text-slate-400 text-[11px]">
                Validation held-out test split: {forecastData?.metrics?.test_sample_count} days
              </div>
            </div>
          </motion.div>

          {/* Model Accuracy Metrics Panel: MAE, RMSE, MAPE */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* MAE */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="clean-card rounded-2xl p-6 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Mean Absolute Error (MAE)
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                  Lower is better
                </span>
              </div>

              <div className="flex items-baseline space-x-2.5">
                <CountUp
                  value={forecastData?.metrics?.advanced?.mae ?? 0}
                  decimals={2}
                  className="text-3xl font-display font-bold text-slate-900 dark:text-white"
                />
                <span className="text-xs text-slate-500 font-mono">units error</span>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 font-mono">
                <span>Baseline MAE:</span>
                <span className="text-slate-800 dark:text-slate-200 font-medium">{forecastData?.metrics?.baseline?.mae}</span>
              </div>
            </motion.div>

            {/* RMSE */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.16 }}
              className="clean-card rounded-2xl p-6 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Root Mean Square Error (RMSE)
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
                  Penalizes variance
                </span>
              </div>

              <div className="flex items-baseline space-x-2.5">
                <CountUp
                  value={forecastData?.metrics?.advanced?.rmse ?? 0}
                  decimals={2}
                  className="text-3xl font-display font-bold text-slate-900 dark:text-white"
                />
                <span className="text-xs text-slate-500 font-mono">units</span>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 font-mono">
                <span>Baseline RMSE:</span>
                <span className="text-slate-800 dark:text-slate-200 font-medium">{forecastData?.metrics?.baseline?.rmse}</span>
              </div>
            </motion.div>

            {/* MAPE */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.24 }}
              className="clean-card rounded-2xl p-6 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Mean Abs Pct Error (MAPE)
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                  Relative variance
                </span>
              </div>

              <div className="flex items-baseline space-x-2.5">
                <CountUp
                  value={forecastData?.metrics?.advanced?.mape ?? 0}
                  decimals={2}
                  suffix="%"
                  className="text-3xl font-display font-bold text-slate-900 dark:text-white"
                />
                <span className="text-xs text-slate-500 font-mono">variance</span>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 font-mono">
                <span>Baseline MAPE:</span>
                <span className="text-slate-800 dark:text-slate-200 font-medium">{forecastData?.metrics?.baseline?.mape}%</span>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </div>
  );
}
