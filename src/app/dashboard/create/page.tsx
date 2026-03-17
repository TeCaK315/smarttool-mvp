'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, FileText, Edit3 } from 'lucide-react';
import { useT } from '@/lib/i18n';

const STATUSES = [
  { value: 'draft', labelKey: 'status.draft', color: '#94a3b8' },
  { value: 'active', labelKey: 'status.active', color: '#3b82f6' },
  { value: 'completed', labelKey: 'status.completed', color: '#22c55e' },
];

const HISTORY_KEY = 'SmartTool MVP_history';
const COUNTER_KEY = 'SmartTool MVP_doc_counter';
const SETTINGS_KEY = 'SmartTool MVP_settings';

function getNextDocNumber(): string {
  try {
    const counter = parseInt(localStorage.getItem(COUNTER_KEY) || '0') + 1;
    localStorage.setItem(COUNTER_KEY, String(counter));
    return 'SCR-' + String(counter).padStart(4, '0');
  } catch { return 'SCR-0001'; }
}

export default function CreatePage() {
  const router = useRouter();
  const t = useT();
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [docNumber, setDocNumber] = useState('');
  const [docDate, setDocDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('draft');
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  useEffect(() => {
    // Load default settings
    try {
      const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
      if (settings.default_notes) setNotes(settings.default_notes);
    } catch {}

    // Check if editing an existing item
    const params = new URLSearchParams(window.location.search);
    const editParam = params.get('edit');
    if (editParam) {
      try {
        const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
        const found = history.find((h: any) => h.id === editParam);
        if (found && found.data) {
          setEditMode(true);
          setEditId(editParam);
          setDocNumber(found.data.doc_number || '');
          setDocDate(found.data.date || new Date().toISOString().split('T')[0]);
          setStatus(found.data.status || 'draft');
          setNotes(found.data.notes || '');
          // Restore form fields
          const { doc_number, date, status: s, notes: n, ...fields } = found.data;
          setFormData(fields);
          return;
        }
      } catch {}
    }

    setDocNumber(getNextDocNumber());
  }, []);

  const FIELD_NAMES = ['input_data', 'parameters'];
  const filledCount = FIELD_NAMES.filter(k => formData[k]?.trim()).length;
  const totalFields = FIELD_NAMES.length;

  const handleSubmit = async () => {
    setSubmitting(true);

    const payload = {
      ...formData,
      doc_number: docNumber,
      date: docDate,
      status,
      notes,
    };

    try {
      const existing = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');

      if (editMode && editId) {
        const updated = existing.map((h: any) =>
          h.id === editId ? { ...h, data: payload, result: payload, input: formData[FIELD_NAMES[0]] || 'Untitled', status } : h
        );
        localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      } else {
        const historyItem = {
          id: crypto.randomUUID(),
          doc_number: docNumber,
          input: formData[FIELD_NAMES[0]] || 'Untitled',
          created_at: new Date().toISOString(),
          status,
          data: payload,
          result: payload,
        };
        localStorage.setItem(HISTORY_KEY, JSON.stringify([historyItem, ...existing].slice(0, 50)));
      }

      const params = new URLSearchParams();
      params.set('_result', JSON.stringify(payload));
      params.set('doc_number', docNumber);
      router.push(`/dashboard/analysis?${params.toString()}`);
    } catch (err) {
      console.error('Submit error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const inputClasses = "w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all";
  const inputStyle = { background: '#0c0a1d', borderColor: '#4b3d6615', color: '#e4e4e4' };
  const labelClasses = "block text-xs font-medium mb-1.5";

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="p-2 rounded-xl transition-all hover:bg-white/[0.06]">
          <ArrowLeft className="w-5 h-5" style={{ color: '#e4e4e450' }} />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold" style={{ fontFamily: "'Cabinet Grotesk', sans-serif", color: '#e4e4e4' }}>
            {editMode ? <><Edit3 className="w-4 h-4 inline mr-2" />{t('create.editTitle')}</> : t('create.title')}
          </h1>
          <p className="text-xs mt-0.5" style={{ color: '#e4e4e440' }}>
            {docNumber && <span className="font-mono">{docNumber}</span>}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ─── Form (left 3 cols) ─── */}
        <div className="lg:col-span-3 space-y-5">

          {/* ─── Document Meta ─── */}
          <div className="rounded-2xl p-5" style={{ background: '#ffffff08', boxShadow: '0 1px 2px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.15)', border: '1px solid #4b3d6608' }}>
            <h2 className="text-sm font-semibold mb-4" style={{ color: '#e4e4e4' }}>{t('create.details')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelClasses} style={{ color: '#e4e4e450' }}>{t('label.number')}</label>
                <input type="text" value={docNumber} onChange={(e) => setDocNumber(e.target.value)}
                  className={inputClasses + ' font-mono'} style={inputStyle} />
              </div>
              <div>
                <label className={labelClasses} style={{ color: '#e4e4e450' }}>{t('label.date')}</label>
                <input type="date" value={docDate} onChange={(e) => setDocDate(e.target.value)}
                  className={inputClasses} style={inputStyle} />
              </div>
              <div>
                <label className={labelClasses} style={{ color: '#e4e4e450' }}>{t('label.status')}</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)}
                  className={inputClasses} style={inputStyle}>
                  {STATUSES.map(s => (
                    <option key={s.value} value={s.value}>{t(s.labelKey)}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* ─── Form Fields ─── */}
          <div className="rounded-2xl p-5" style={{ background: '#ffffff08', boxShadow: '0 1px 2px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.15)', border: '1px solid #4b3d6608' }}>
            <h2 className="text-sm font-semibold mb-4" style={{ color: '#e4e4e4' }}>{t('create.title')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              <div>
                <label className={labelClasses} style={{ color: '#e4e4e450' }}>Enter relevant supply chain data</label>
                <input
                  type="text"
                  value={formData['input_data'] || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, 'input_data': e.target.value }))}
                  placeholder="Supplier names, delivery times, costs"
                  className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all"
                  style={{ background: '#0c0a1d', borderColor: '#4b3d6615', color: '#e4e4e4' }}
                />
              </div>
              <div>
                <label className={labelClasses} style={{ color: '#e4e4e450' }}>Specify optimization parameters</label>
                <input
                  type="text"
                  value={formData['parameters'] || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, 'parameters': e.target.value }))}
                  placeholder="Max delivery time, budget constraints"
                  className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all"
                  style={{ background: '#0c0a1d', borderColor: '#4b3d6615', color: '#e4e4e4' }}
                />
              </div>
            </div>
          </div>

          {/* ─── Notes ─── */}
          <div className="rounded-2xl p-5" style={{ background: '#ffffff08', boxShadow: '0 1px 2px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.15)', border: '1px solid #4b3d6608' }}>
            <h2 className="text-sm font-semibold mb-3" style={{ color: '#e4e4e4' }}>{t('label.notes')}</h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('create.notesPlaceholder')}
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 resize-none transition-all"
              style={{ background: '#0c0a1d', borderColor: '#4b3d6615', color: '#e4e4e4' }}
            />
          </div>
        </div>

        {/* ─── Summary (right 2 cols) ─── */}
        <div className="lg:col-span-2">
          <div className="sticky top-20 space-y-5">
            <div className="rounded-2xl p-5" style={{ background: '#ffffff12', boxShadow: '0 4px 12px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.2)', border: '1px solid #4b3d6610' }}>
              <h2 className="text-sm font-semibold mb-4" style={{ color: '#e4e4e4' }}>{t('label.total')}</h2>

              {docNumber && (
                <div className="mb-4 pb-4" style={{ borderBottom: '1px solid #4b3d6610' }}>
                  <p className="text-[11px] font-mono" style={{ color: '#e4e4e440' }}>{docNumber}</p>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span style={{ color: '#e4e4e450' }}>{t('dashboard.totalItems')}</span>
                  <span className="font-mono text-xs" style={{ color: '#e4e4e450' }}>{filledCount} / {totalFields}</span>
                </div>
                {/* Progress bar */}
                <div className="h-2 rounded-full overflow-hidden" style={{ background: '#4b3d6615' }}>
                  <div className="h-full rounded-full transition-all duration-300"
                    style={{ width: totalFields > 0 ? (filledCount / totalFields * 100) + '%' : '0%', background: '#4b3d66' }} />
                </div>
                <p className="text-[11px]" style={{ color: '#e4e4e440' }}>
                  {filledCount === totalFields ? t('msg.saved') : `${totalFields - filledCount} fields remaining`}
                </p>
              </div>
            </div>


            {/* Actions */}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full py-3.5 rounded-xl text-sm font-semibold text-white transition-all duration-300 hover:scale-[1.02] hover:opacity-90 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #4b3d66, #6a5b8a)', boxShadow: '0 0 24px #4b3d6620' }}
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> {t('msg.processing')}</>
              ) : (
                <><FileText className="w-4 h-4" /> {editMode ? t('create.update') : t('create.submit')}</>
              )}
            </button>

            <Link
              href="/dashboard"
              className="block w-full py-2.5 rounded-xl text-sm font-medium text-center border transition-all duration-200 hover:bg-white/[0.04]"
              style={{ borderColor: '#4b3d6615', color: '#e4e4e450' }}
            >
              {t('action.cancel')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
