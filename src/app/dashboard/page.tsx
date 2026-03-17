'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Plus, Clock, ArrowRight, FileText, TrendingUp, Activity, CheckCircle,
  CheckCircle2, Users, BarChart3, ArrowUpRight,
  ArrowDownRight, Loader2,
} from 'lucide-react';
import { useT } from '@/lib/i18n';

interface HistoryItem {
  id: string;
  doc_number?: string;
  input: string;
  created_at: string;
  status: string;
  payment_status?: string;
  data?: any;
}

const HISTORY_KEY = 'SmartTool MVP_history';
const CLIENTS_KEY = 'SmartTool MVP_clients';

const STATUS_COLORS: Record<string, string> = {
  'draft': '#94a3b8',
  'active': '#3b82f6',
  'completed': '#22c55e',
};

export default function DashboardPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const t = useT();

  useEffect(() => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (stored) setHistory(JSON.parse(stored));
    } catch {}
    setLoading(false);
  }, []);

  // ─── Stats Calculations ───
  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
    const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;

    let thisMonthCount = 0;
    let lastMonthCount = 0;
    let inProgressCount = 0;
    let completedCount = 0;

    const last30Days: number[] = new Array(30).fill(0);

    history.forEach(item => {
      const status = item.status || 'pending';
      const created = new Date(item.created_at);

      if (created.getMonth() === thisMonth && created.getFullYear() === thisYear) {
        thisMonthCount++;
      }
      if (created.getMonth() === lastMonth && created.getFullYear() === lastMonthYear) {
        lastMonthCount++;
      }

      if (['pending', 'in_progress', 'processing'].includes(status)) {
        inProgressCount++;
      }
      if (['completed', 'done', 'finished'].includes(status)) {
        completedCount++;
      }

      // Chart data: last 30 days (count per day)
      const daysDiff = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff >= 0 && daysDiff < 30) {
        last30Days[29 - daysDiff]++;
      }
    });

    const activityChange = lastMonthCount > 0
      ? ((thisMonthCount - lastMonthCount) / lastMonthCount * 100).toFixed(0)
      : thisMonthCount > 0 ? '+100' : '0';

    return {
      thisMonthCount, inProgressCount, completedCount,
      activityChange, last30Days,
      totalItems: history.length,
    };
  }, [history]);

  // Mini chart
  const chartMax = Math.max(...stats.last30Days, 1);

  // Recent items
  const recent = history.slice(0, 5);
  


  return (
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'Cabinet Grotesk, sans-serif', color: '#e4e4e4' }}>
            {t('dashboard.title')}
          </h1>
        </div>
        <Link href="/dashboard/create"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #4b3d66, #6a5b8a)' }}>
          <Plus className="w-4 h-4" /> {t('dashboard.newItem')}
        </Link>
      </div>

      {/* ─── Stat Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Activity this month */}
        <div className="rounded-2xl p-5" style={{ background: '#ffffff08', boxShadow: '0 1px 2px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.15)', border: '1px solid #4b3d6608' }}>
          <div className="flex items-center justify-between mb-3">
            <Activity className="w-4 h-4" style={{ color: '#4b3d66' }} />
            {Number(stats.activityChange) !== 0 && (
              <span className="flex items-center gap-0.5 text-[11px] font-semibold"
                style={{ color: Number(stats.activityChange) > 0 ? '#22c55e' : '#ef4444' }}>
                {Number(stats.activityChange) > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {stats.activityChange}%
              </span>
            )}
          </div>
          <p className="text-2xl font-bold" style={{ color: '#e4e4e4' }}>{stats.thisMonthCount}</p>
          <p className="text-[11px] mt-1" style={{ color: '#e4e4e440' }}>{t('dashboard.activityThisMonth')}</p>
        </div>

        {/* In Progress */}
        <div className="rounded-2xl p-5" style={{ background: '#ffffff08', boxShadow: '0 1px 2px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.15)', border: '1px solid #4b3d6608' }}>
          <div className="flex items-center justify-between mb-3">
            <Clock className="w-4 h-4" style={{ color: '#f59e0b' }} />
          </div>
          <p className="text-2xl font-bold" style={{ color: stats.inProgressCount > 0 ? '#f59e0b' : '#e4e4e4' }}>
            {stats.inProgressCount}
          </p>
          <p className="text-[11px] mt-1" style={{ color: '#e4e4e440' }}>{t('dashboard.inProgress')}</p>
        </div>

        {/* Total items */}
        <div className="rounded-2xl p-5" style={{ background: '#ffffff08', boxShadow: '0 1px 2px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.15)', border: '1px solid #4b3d6608' }}>
          <div className="flex items-center justify-between mb-3">
            <FileText className="w-4 h-4" style={{ color: '#6a5b8a' }} />
          </div>
          <p className="text-2xl font-bold" style={{ color: '#e4e4e4' }}>{stats.totalItems}</p>
          <p className="text-[11px] mt-1" style={{ color: '#e4e4e440' }}>{t('dashboard.totalItems')}</p>
        </div>

        {/* Completed */}
        <div className="rounded-2xl p-5" style={{ background: '#ffffff08', boxShadow: '0 1px 2px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.15)', border: '1px solid #4b3d6608' }}>
          <div className="flex items-center justify-between mb-3">
            <CheckCircle className="w-4 h-4" style={{ color: '#22c55e' }} />
          </div>
          <p className="text-2xl font-bold" style={{ color: '#e4e4e4' }}>{stats.completedCount}</p>
          <p className="text-[11px] mt-1" style={{ color: '#e4e4e440' }}>{t('dashboard.completed')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── Chart (left 2 cols) ─── */}
        <div className="lg:col-span-2 rounded-2xl p-5" style={{ background: '#ffffff08', boxShadow: '0 1px 2px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.15)', border: '1px solid #4b3d6608' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" style={{ color: '#4b3d66' }} />
              <h2 className="text-sm font-semibold" style={{ color: '#e4e4e4' }}>{t('dashboard.last30Days')}</h2>
            </div>
            <span className="text-lg font-bold" style={{ color: '#4b3d66' }}>{stats.totalItems} {t('dashboard.totalItems')}</span>
          </div>
          {/* CSS bar chart */}
          <div className="flex items-end gap-[2px] h-24">
            {stats.last30Days.map((val, i) => (
              <div key={i} className="flex-1 rounded-t-sm transition-all hover:opacity-80"
                style={{
                  height: chartMax > 0 ? Math.max((val / chartMax) * 100, val > 0 ? 4 : 1) + '%' : '1%',
                  background: val > 0 ? '#4b3d66' : '#4b3d6615',
                }}
                title={val > 0 ? String(val) : ''}
              />
            ))}
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-[10px]" style={{ color: '#e4e4e440' }}>30d</span>
            <span className="text-[10px]" style={{ color: '#e4e4e440' }}>{t('label.date')}</span>
          </div>
        </div>

        {/* ─── Quick Actions (right col) ─── */}
        <div className="rounded-2xl p-5" style={{ background: '#ffffff08', boxShadow: '0 1px 2px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.15)', border: '1px solid #4b3d6608' }}>
          <h2 className="text-sm font-semibold mb-4" style={{ color: '#e4e4e4' }}>{t('dashboard.quickActions')}</h2>
          <div className="space-y-2">
            <Link href="/dashboard/create"
              className="flex items-center gap-3 p-3 rounded-xl transition-all hover:bg-white/[0.04] group"
              style={{ border: '1px solid #4b3d6608' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#4b3d6615' }}>
                <Plus className="w-4 h-4" style={{ color: '#4b3d66' }} />
              </div>
              <span className="text-sm font-medium flex-1" style={{ color: '#e4e4e4' }}>{t('dashboard.newItem')}</span>
              <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100" style={{ color: '#e4e4e440' }} />
            </Link>
            <Link href="/dashboard/clients"
              className="flex items-center gap-3 p-3 rounded-xl transition-all hover:bg-white/[0.04] group"
              style={{ border: '1px solid #4b3d6608' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#ff5c0015' }}>
                <Users className="w-4 h-4" style={{ color: '#ff5c00' }} />
              </div>
              <span className="text-sm font-medium flex-1" style={{ color: '#e4e4e4' }}>{t('nav.clients')}</span>
              <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100" style={{ color: '#e4e4e440' }} />
            </Link>
            <Link href="/dashboard/reports"
              className="flex items-center gap-3 p-3 rounded-xl transition-all hover:bg-white/[0.04] group"
              style={{ border: '1px solid #4b3d6608' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#6a5b8a15' }}>
                <BarChart3 className="w-4 h-4" style={{ color: '#6a5b8a' }} />
              </div>
              <span className="text-sm font-medium flex-1" style={{ color: '#e4e4e4' }}>{t('nav.reports')}</span>
              <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100" style={{ color: '#e4e4e440' }} />
            </Link>
            <Link href="/dashboard/history"
              className="flex items-center gap-3 p-3 rounded-xl transition-all hover:bg-white/[0.04] group"
              style={{ border: '1px solid #4b3d6608' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#f59e0b15' }}>
                <Clock className="w-4 h-4" style={{ color: '#f59e0b' }} />
              </div>
              <span className="text-sm font-medium flex-1" style={{ color: '#e4e4e4' }}>{t('nav.history')}</span>
              <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100" style={{ color: '#e4e4e440' }} />
            </Link>
          </div>
        </div>
      </div>


      {/* ─── Recent Items ─── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold" style={{ color: '#e4e4e4' }}>{t('dashboard.recentItems')}</h2>
          {history.length > 5 && (
            <Link href="/dashboard/history" className="text-xs font-medium flex items-center gap-1" style={{ color: '#4b3d66' }}>
              {t('dashboard.viewAll')} <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#4b3d66' }} />
          </div>
        ) : recent.length === 0 ? (
          <div className="rounded-xl border border-dashed p-10 text-center" style={{ borderColor: '#4b3d6620' }}>
            <FileText className="w-12 h-12 mx-auto mb-3" style={{ color: '#e4e4e440' }} />
            <h3 className="text-base font-semibold mb-1" style={{ color: '#e4e4e4' }}>{t('dashboard.noItems')}</h3>
            <Link href="/dashboard/create"
              className="inline-flex items-center gap-2 px-4 py-2 mt-3 rounded-xl text-sm font-medium text-white"
              style={{ background: '#4b3d66' }}>
              <Plus className="w-4 h-4" /> {t('dashboard.newItem')}
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {recent.map((item) => {
              const status = item.payment_status || item.data?.payment_status || item.status || 'draft';
              const statusColor = STATUS_COLORS[status] || '#94a3b8';
              return (
                <div key={item.id}
                  className="flex items-center gap-4 p-4 rounded-xl border transition-all duration-150 group"
                  style={{ background: '#ffffff08', boxShadow: '0 1px 2px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.15)', border: '1px solid #4b3d6608' }}>
                  {/* Status dot */}
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: statusColor }} />

                  {/* Info */}
                  <Link href={'/dashboard/analysis?id=' + item.id} className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {item.doc_number && (
                        <span className="text-xs font-mono font-semibold" style={{ color: '#4b3d66' }}>{item.doc_number}</span>
                      )}
                      <span className="text-sm font-medium truncate" style={{ color: '#e4e4e4' }}>
                        {item.input || 'Untitled'}
                      </span>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: '#e4e4e440' }}>
                      {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </Link>



                  <Link href={'/dashboard/analysis?id=' + item.id}>
                    <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#4b3d66' }} />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
