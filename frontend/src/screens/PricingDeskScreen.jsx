import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Tag,
  Check,
  X,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import SkeletonCard from '../components/SkeletonCard';
import { fireApprovalConfetti, fireRejectFeedback } from '../components/ConfettiEffect';
import { api } from '../services/api';

export default function PricingDeskScreen({ onDecisionRecorded }) {
  const [recommendations, setRecommendations] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterDecision, setFilterDecision] = useState('all');
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchRecommendations();
  }, []);

  async function fetchRecommendations() {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getRecommendations();
      setRecommendations(res.recommendations || []);
      setSummary(res.summary);
    } catch (err) {
      setError(err.message || 'Failed to load pricing recommendations');
    } finally {
      setLoading(false);
    }
  }

  async function handleDecision(recId, decision, event) {
    if (decision === 'approved') {
      fireApprovalConfetti(event.currentTarget);
    } else {
      fireRejectFeedback(event.currentTarget);
    }

    try {
      setUpdatingId(recId);
      setRecommendations((prev) =>
        prev.map((r) =>
          r.id === recId
            ? { ...r, decision, decision_timestamp: new Date().toISOString() }
            : r
        )
      );

      await api.postDecision(recId, decision);

      if (onDecisionRecorded) {
        onDecisionRecorded();
      }
    } catch (err) {
      console.error('Failed to update recommendation:', err);
      fetchRecommendations();
    } finally {
      setUpdatingId(null);
    }
  }

  const filteredRecs = recommendations.filter((r) => {
    if (filterDecision === 'all') return true;
    return r.decision === filterDecision;
  });

  return (
    <div className="p-10 space-y-10 max-w-7xl mx-auto">
      {/* Header & Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-7 clean-card rounded-2xl">
        <div>
          <div className="flex items-center space-x-2">
            <Tag className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h2 className="font-display font-bold text-lg text-slate-900 dark:text-white">
              AI Pricing Desk & Manager Sign-Off
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Transparent, rule-based pricing clamped strictly within SKU margin boundaries
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center space-x-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 text-xs font-mono select-none overflow-x-auto">
          {[
            { id: 'all', label: `All (${recommendations.length})` },
            { id: 'pending', label: `Pending (${summary?.pending ?? 0})` },
            { id: 'approved', label: `Approved (${summary?.approved ?? 0})` },
            { id: 'rejected', label: `Rejected (${summary?.rejected ?? 0})` },
          ].map((tab) => {
            const active = filterDecision === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setFilterDecision(tab.id)}
                className={`relative px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
                  active ? 'text-slate-900 dark:text-white font-semibold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                {tab.label}
                {active && (
                  <motion.div
                    layoutId="pricingFilterMinimal"
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonCard lines={6} />
          <SkeletonCard lines={6} />
        </div>
      ) : error ? (
        <div className="clean-card rounded-2xl p-12 text-center border-rose-200 dark:border-rose-900/50">
          <p className="text-rose-600 dark:text-rose-400">{error}</p>
        </div>
      ) : (
        <motion.div layout className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AnimatePresence>
            {filteredRecs.map((rec) => {
              const isUp = rec.price_diff > 0;
              const isApproved = rec.decision === 'approved';
              const isRejected = rec.decision === 'rejected';

              return (
                <motion.div
                  key={rec.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.25 }}
                  className={`clean-card rounded-2xl p-6 transition-all flex flex-col justify-between space-y-5 ${
                    isApproved
                      ? 'border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/20 dark:bg-emerald-950/10'
                      : isRejected
                      ? 'border-rose-300 dark:border-rose-800/80 bg-rose-50/20 dark:bg-rose-950/10 opacity-75'
                      : 'border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div>
                    {/* SKU Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center space-x-2 text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                          <span>{rec.sku}</span>
                          <span>•</span>
                          <span>{rec.category}</span>
                        </div>
                        <h3 className="text-base font-display font-semibold text-slate-900 dark:text-white mt-0.5">
                          {rec.product_name}
                        </h3>
                      </div>

                      <span
                        className={`text-xs font-mono px-2.5 py-0.5 rounded-full border flex-shrink-0 font-medium ${
                          isApproved
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                            : isRejected
                            ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                            : 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800'
                        }`}
                      >
                        {rec.decision.toUpperCase()}
                      </span>
                    </div>

                    {/* Price Comparison Block */}
                    <div className="mt-5 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      {/* Current */}
                      <div>
                        <div className="text-[10px] font-mono uppercase text-slate-400 dark:text-slate-500">
                          Current Price
                        </div>
                        <div className="text-xl font-display font-semibold text-slate-700 dark:text-slate-300">
                          ${rec.current_price.toFixed(2)}
                        </div>
                      </div>

                      {/* Delta Indicator */}
                      <div className="flex flex-col items-center px-3">
                        <div
                          className={`flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${
                            isUp
                              ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                          }`}
                        >
                          {isUp ? (
                            <TrendingUp className="w-3.5 h-3.5" />
                          ) : (
                            <TrendingDown className="w-3.5 h-3.5" />
                          )}
                          <span>
                            {isUp ? '+' : ''}
                            {rec.pct_change}%
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1 font-mono">
                          {isUp ? '+$' : '-$'}
                          {Math.abs(rec.price_diff).toFixed(2)}
                        </span>
                      </div>

                      {/* Suggested */}
                      <div className="text-right">
                        <div className="text-[10px] font-mono uppercase text-indigo-600 dark:text-indigo-400 font-semibold">
                          AI Suggested
                        </div>
                        <div className="text-2xl font-display font-bold text-indigo-600 dark:text-indigo-400">
                          ${rec.suggested_price.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {/* Min/Max Band Visual Track */}
                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between text-[11px] font-mono text-slate-500">
                        <span>Min Band: ${rec.min_price}</span>
                        <span className="text-slate-400">Base Cost: ${rec.base_cost}</span>
                        <span>Max Band: ${rec.max_price}</span>
                      </div>

                      <div className="relative h-3 w-full rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 p-0.5 flex items-center">
                        <div
                          className="h-full rounded-full bg-indigo-200 dark:bg-indigo-900/60"
                          style={{
                            left: `${Math.min(rec.cur_band_pct, rec.sug_band_pct)}%`,
                            width: `${Math.max(4, Math.abs(rec.sug_band_pct - rec.cur_band_pct))}%`,
                            position: 'absolute',
                          }}
                        />

                        {/* Current Price Marker */}
                        <div
                          className="absolute w-2 h-3.5 bg-slate-400 dark:bg-slate-500 rounded-xs -translate-x-1/2 z-10"
                          style={{ left: `${rec.cur_band_pct}%` }}
                          title={`Current Price: $${rec.current_price}`}
                        />

                        {/* Suggested Price Marker */}
                        <div
                          className="absolute w-3 h-3 bg-indigo-600 dark:bg-indigo-400 rounded-full -translate-x-1/2 z-20 shadow-sm border border-white dark:border-slate-900"
                          style={{ left: `${rec.sug_band_pct}%` }}
                          title={`Suggested Price: $${rec.suggested_price}`}
                        />
                      </div>

                      <div className="flex justify-between text-[10px] font-mono text-slate-400">
                        <span className="flex items-center space-x-1">
                          <span className="w-1.5 h-1.5 bg-slate-400 inline-block rounded-xs" />
                          <span>Current Position ({rec.cur_band_pct}%)</span>
                        </span>
                        <span className="flex items-center space-x-1 text-indigo-600 dark:text-indigo-400 font-medium">
                          <span className="w-1.5 h-1.5 bg-indigo-600 dark:bg-indigo-400 inline-block rounded-full" />
                          <span>Target Position ({rec.sug_band_pct}%)</span>
                        </span>
                      </div>
                    </div>

                    {/* Explainable Decision Factors */}
                    <div className="mt-5 space-y-2">
                      <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Decision Drivers:
                      </div>

                      {/* Demand */}
                      <div className="text-xs p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-0.5">
                        <div className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 uppercase font-semibold">
                          Demand Factor
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                          {rec.reason_demand}
                        </p>
                      </div>

                      {/* Stock */}
                      <div className="text-xs p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-0.5">
                        <div className="text-[10px] font-mono text-amber-600 dark:text-amber-400 uppercase font-semibold">
                          Inventory Exposure
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                          {rec.reason_stock}
                        </p>
                      </div>

                      {/* Sentiment */}
                      <div className="text-xs p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-0.5">
                        <div className="text-[10px] font-mono text-purple-600 dark:text-purple-400 uppercase font-semibold">
                          Customer Sentiment
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                          {rec.reason_sentiment}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bottom Bar */}
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                    <div className="text-xs font-mono text-slate-400">
                      Confidence: {(rec.confidence_score * 100).toFixed(0)}%
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={(e) => handleDecision(rec.id, 'rejected', e)}
                        disabled={updatingId === rec.id}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center space-x-1.5 transition-all ${
                          isRejected
                            ? 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800'
                            : 'bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-700 border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 dark:border-slate-700'
                        }`}
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>

                      <button
                        onClick={(e) => handleDecision(rec.id, 'approved', e)}
                        disabled={updatingId === rec.id}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border flex items-center space-x-1.5 shadow-sm transition-all ${
                          isApproved
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600 active:scale-95'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{isApproved ? 'Approved ✓' : 'Approve Price'}</span>
                      </button>
                    </div>
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
