import React from 'react';

export default function SkeletonCard({ className = '', lines = 3 }) {
  return (
    <div className={`clean-card rounded-2xl p-6 space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="h-5 w-1/3 rounded-lg skeleton-shimmer bg-slate-200 dark:bg-white/5" />
        <div className="h-8 w-8 rounded-full skeleton-shimmer bg-slate-200 dark:bg-white/5" />
      </div>
      <div className="h-9 w-2/3 rounded-xl skeleton-shimmer bg-slate-200 dark:bg-white/10" />
      <div className="space-y-2 pt-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="h-3 rounded-md skeleton-shimmer bg-slate-200 dark:bg-white/5"
            style={{ width: `${85 - i * 15}%` }}
          />
        ))}
      </div>
    </div>
  );
}
