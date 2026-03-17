'use client';

import { useState, useEffect } from 'react';
import { BarChart3, Loader2 } from 'lucide-react';

interface UsageInfo {
  used: number;
  limit: number;
  remaining: number;
  isUnlimited: boolean;
  percentage: number;
}

interface UsageCardProps {
  metric?: string;
  label?: string;
}

export default function UsageCard({ metric = 'analyses', label = 'Analyses' }: UsageCardProps) {
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUsage() {
      try {
        const res = await fetch(`/api/usage?metric=${metric}`);
        if (res.ok) {
          const data = await res.json();
          setUsage(data);
        }
      } catch (err) {
        console.error('Failed to fetch usage:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchUsage();
  }, [metric]);

  if (loading) {
    return (
      <div className="rounded-2xl border p-6 flex items-center justify-center"
           style={{ background: '#4b3d6610', borderColor: '#4b3d6640' }}>
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#4b3d66' }} />
      </div>
    );
  }

  if (!usage) return null;

  const isNearLimit = !usage.isUnlimited && usage.percentage >= 80;
  const isAtLimit = !usage.isUnlimited && usage.percentage >= 100;

  return (
    <div className="rounded-2xl border p-6"
         style={{ background: '#4b3d6610', borderColor: '#4b3d6640' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5" style={{ color: '#4b3d66' }} />
          <h3 className="font-heading font-semibold" style={{ color: '#e4e4e4' }}>
            {label} Usage
          </h3>
        </div>
        <span className="text-sm" style={{ color: '#e4e4e470' }}>
          {usage.isUnlimited
            ? `${usage.used} used (unlimited)`
            : `${usage.used} / ${usage.limit}`}
        </span>
      </div>

      {!usage.isUnlimited && (
        <>
          <div className="w-full h-3 rounded-full overflow-hidden mb-2"
               style={{ background: '#4b3d6620' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, usage.percentage)}%`,
                background: isAtLimit ? '#ef4444' : isNearLimit ? '#f59e0b' : 'linear-gradient(135deg, #4b3d66, #6a5b8a)',
              }}
            />
          </div>
          <p className="text-sm" style={{ color: isAtLimit ? '#ef4444' : '#e4e4e470' }}>
            {isAtLimit
              ? 'Limit reached — upgrade for more'
              : `${usage.remaining} remaining this month`}
          </p>
        </>
      )}
    </div>
  );
}
