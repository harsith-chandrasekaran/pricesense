import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  HeartHandshake,
  Star,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Minus,
  User,
  Calendar,
} from 'lucide-react';
import SkeletonCard from '../components/SkeletonCard';
import CountUp from '../components/CountUp';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';

export default function SentimentLabScreen() {
  const { isDark } = useTheme();
  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState(1);
  const [sentimentData, setSentimentData] = useState(null);
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
        console.error('Error fetching products:', err);
      }
    }
    loadCatalog();
  }, []);

  useEffect(() => {
    if (!selectedProductId) return;

    async function fetchSentiment() {
      try {
        setLoading(true);
        setError(null);
        const data = await api.getSentiment(selectedProductId);
        setSentimentData(data);
      } catch (err) {
        setError(err.message || 'Failed to analyze customer sentiment');
      } finally {
        setLoading(false);
      }
    }
    fetchSentiment();
  }, [selectedProductId]);

  const selectedProduct = products.find((p) => p.id === Number(selectedProductId));

  const compoundScore = sentimentData?.overall_score ?? 0;
  const normalizedScore = (compoundScore + 1) / 2;
  const gaugeAngle = -90 + normalizedScore * 180;

  const getScoreColor = (val) => {
    if (val >= 0.25) return { stroke: '#4f46e5', text: 'text-indigo-600 dark:text-indigo-400', label: 'Strongly Positive' };
    if (val >= 0.05) return { stroke: '#10b981', text: 'text-emerald-600 dark:text-emerald-400', label: 'Positive' };
    if (val <= -0.15) return { stroke: '#ef4444', text: 'text-rose-600 dark:text-rose-400', label: 'Negative Headwind' };
    return { stroke: '#f59e0b', text: 'text-amber-600 dark:text-amber-400', label: 'Balanced / Neutral' };
  };

  const scoreTheme = getScoreColor(compoundScore);

  return (
    <div className="p-10 space-y-10 max-w-7xl mx-auto">
      {/* Product Selector Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-7 clean-card rounded-2xl">
        <div>
          <div className="flex items-center space-x-2">
            <HeartHandshake className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h2 className="font-display font-bold text-lg text-slate-900 dark:text-white">
              VADER Customer Sentiment Lab
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Rule-based lexical NLP analyzing review polarity to determine brand pricing power
          </p>
        </div>

        {/* Product Dropdown */}
        <div className="w-full md:w-80">
          <select
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(Number(e.target.value))}
            className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <SkeletonCard className="h-96" lines={3} />
          <SkeletonCard className="lg:col-span-2 h-96" lines={5} />
        </div>
      ) : error ? (
        <div className="clean-card rounded-2xl p-12 text-center border-rose-200 dark:border-rose-900/50">
          <p className="text-rose-600 dark:text-rose-400">{error}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Semicircle Gauge & Breakdown */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35 }}
            className="clean-card rounded-2xl p-7 space-y-6 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  VADER Compound Score
                </span>
                <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full border bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-medium ${scoreTheme.text}`}>
                  {scoreTheme.label}
                </span>
              </div>

              {/* Semicircle Gauge SVG */}
              <div className="relative flex flex-col items-center justify-center pt-6 pb-2">
                <svg className="w-56 h-32 overflow-visible" viewBox="0 0 200 110">
                  {/* Background Arc */}
                  <path
                    d="M 20 100 A 80 80 0 0 1 180 100"
                    fill="none"
                    stroke={isDark ? '#1e293b' : '#e2e8f0'}
                    strokeWidth="12"
                    strokeLinecap="round"
                  />
                  {/* Colored Meter Arc */}
                  <defs>
                    <linearGradient id="minimalGaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#ef4444" />
                      <stop offset="45%" stopColor="#f59e0b" />
                      <stop offset="75%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#4f46e5" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M 20 100 A 80 80 0 0 1 180 100"
                    fill="none"
                    stroke="url(#minimalGaugeGrad)"
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray="251.2"
                    strokeDashoffset={251.2 * (1 - normalizedScore)}
                    style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
                  />

                  {/* Pivot circle */}
                  <circle 
                    cx="100" 
                    cy="100" 
                    r="6" 
                    fill={isDark ? '#0f172a' : '#ffffff'} 
                    stroke={isDark ? '#64748b' : '#94a3b8'} 
                    strokeWidth="2.5" 
                  />

                  {/* Needle */}
                  <g style={{ transform: `rotate(${gaugeAngle}deg)`, transformOrigin: '100px 100px', transition: 'transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                    <line x1="100" y1="100" x2="100" y2="35" stroke={isDark ? '#f8fafc' : '#1e293b'} strokeWidth="2.5" strokeLinecap="round" />
                    <circle cx="100" cy="35" r="3.5" fill="#4f46e5" />
                  </g>
                </svg>

                {/* Score Number Display */}
                <div className="text-center mt-3">
                  <div className={`text-4xl font-display font-bold tracking-tight ${scoreTheme.text}`}>
                    <CountUp
                      value={compoundScore}
                      decimals={2}
                      prefix={compoundScore > 0 ? '+' : ''}
                    />
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                    Range: -1.00 to +1.00
                  </div>
                </div>
              </div>

              {/* Pos / Neu / Neg Breakdown Bars */}
              <div className="space-y-3.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">Sentiment Distribution</div>

                {/* Positive */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="flex items-center space-x-1.5 text-indigo-600 dark:text-indigo-400">
                      <ThumbsUp className="w-3 h-3" />
                      <span>Positive</span>
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">{sentimentData?.breakdown?.positive_pct}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${sentimentData?.breakdown?.positive_pct}%` }}
                      transition={{ duration: 0.6 }}
                      className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full"
                    />
                  </div>
                </div>

                {/* Neutral */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="flex items-center space-x-1.5 text-amber-600 dark:text-amber-400">
                      <Minus className="w-3 h-3" />
                      <span>Neutral</span>
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">{sentimentData?.breakdown?.neutral_pct}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${sentimentData?.breakdown?.neutral_pct}%` }}
                      transition={{ duration: 0.6 }}
                      className="h-full bg-amber-500 rounded-full"
                    />
                  </div>
                </div>

                {/* Negative */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="flex items-center space-x-1.5 text-rose-600 dark:text-rose-400">
                      <ThumbsDown className="w-3 h-3" />
                      <span>Negative</span>
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">{sentimentData?.breakdown?.negative_pct}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${sentimentData?.breakdown?.negative_pct}%` }}
                      transition={{ duration: 0.6 }}
                      className="h-full bg-rose-500 rounded-full"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Metrics Footer */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-mono text-slate-500">
              <span>Avg Rating: {sentimentData?.average_rating} / 5.0</span>
              <span>{sentimentData?.review_count} Reviews</span>
            </div>
          </motion.div>

          {/* Right Column: Customer Feedback Snippets */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.08 }}
            className="lg:col-span-2 clean-card rounded-2xl p-7 space-y-5 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center space-x-2">
                  <MessageSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="font-display font-semibold text-slate-900 dark:text-white text-base">
                    Recent Customer Feedback & VADER Polarity
                  </h3>
                </div>
                <span className="text-xs font-mono text-slate-400">
                  Scored Snippets
                </span>
              </div>

              {/* Review Cards List */}
              <div className="mt-4 space-y-3.5 max-h-[520px] overflow-y-auto pr-1">
                {(sentimentData?.reviews || []).map((rev) => {
                  const isPos = rev.sentiment_label === 'positive';
                  const isNeg = rev.sentiment_label === 'negative';

                  let badgeColor = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50';
                  if (isPos) badgeColor = 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900/50';
                  if (isNeg) badgeColor = 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/50';

                  return (
                    <div
                      key={rev.id || rev.author}
                      className="p-4 rounded-xl bg-slate-50/70 hover:bg-slate-100/70 dark:bg-slate-800/30 dark:hover:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300">
                            <User className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{rev.author}</span>
                          <span className="text-slate-400">•</span>
                          <div className="flex items-center text-amber-400 text-xs">
                            {Array.from({ length: rev.rating }).map((_, i) => (
                              <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                            ))}
                          </div>
                        </div>

                        <div className={`flex items-center space-x-1.5 text-xs font-mono px-2 py-0.5 rounded-full border ${badgeColor}`}>
                          <span>VADER:</span>
                          <span className="font-bold">
                            {rev.sentiment_score > 0 ? `+${rev.sentiment_score}` : rev.sentiment_score}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed italic">
                        "{rev.text}"
                      </p>

                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1">
                        <span className="capitalize">{rev.sentiment_label} classification</span>
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>{rev.date}</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] font-mono text-slate-400 flex items-center justify-between">
              <span>Lexical sentiment polarity</span>
              <span>Updated in real time</span>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
