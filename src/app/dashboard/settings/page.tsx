'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Settings, Save, Loader2, Check, LogOut, Building2, 
  CreditCard,  FileText, ImageIcon,
  AlertCircle, CheckCircle2, ExternalLink, Eye, EyeOff, Trash2,
} from 'lucide-react';
import { useT } from '@/lib/i18n';

interface StripeConfig {
  configured: boolean;
  source?: string;
  publishable_key_masked?: string;
  secret_key_masked?: string;
}

interface BusinessSettings {
  business_name: string;
  email: string;
  address: string;
  phone: string;
  website: string;
  logo_url: string;
  default_notes: string;
  doc_prefix: string;
}

const PROFILE_KEY = 'SmartTool MVP_sender_profile';
const SETTINGS_KEY = 'SmartTool MVP_settings';

export default function SettingsPage() {
  const router = useRouter();
  const t = useT();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'business' | 'defaults' | 'payment'>('business');

  // Stripe config state
  const [stripeConfig, setStripeConfig] = useState<StripeConfig>({ configured: false });
  const [stripeLoading, setStripeLoading] = useState(true);
  const [stripePubKey, setStripePubKey] = useState('');
  const [stripeSecretKey, setStripeSecretKey] = useState('');
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [stripeSaving, setStripeSaving] = useState(false);
  const [stripeError, setStripeError] = useState('');
  const [stripeSuccess, setStripeSuccess] = useState('');

  const [settings, setSettings] = useState<BusinessSettings>({
    business_name: '',
    email: '',
    address: '',
    phone: '',
    website: '',
    logo_url: '',
    default_notes: '',
    doc_prefix: 'SCR',
  });

  // Load Stripe config
  useEffect(() => {
    async function loadStripeConfig() {
      try {
        const res = await fetch('/api/admin/stripe');
        if (res.ok) {
          const data = await res.json();
          setStripeConfig(data);
        }
      } catch {}
      setStripeLoading(false);
    }
    loadStripeConfig();
  }, []);

  const handleStripeSave = async () => {
    setStripeSaving(true);
    setStripeError('');
    setStripeSuccess('');

    try {
      const res = await fetch('/api/admin/stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publishable_key: stripePubKey,
          secret_key: stripeSecretKey,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStripeError(data.error || 'Failed to save');
      } else {
        setStripeConfig({
          configured: true,
          source: 'database',
          publishable_key_masked: data.publishable_key_masked,
          secret_key_masked: data.secret_key_masked,
        });
        setStripePubKey('');
        setStripeSecretKey('');
        setStripeSuccess(t('settings.stripeTestSuccess'));
        setTimeout(() => setStripeSuccess(''), 5000);
      }
    } catch (err: any) {
      setStripeError(err.message || 'Network error');
    }
    setStripeSaving(false);
  };

  const handleStripeDisconnect = async () => {
    if (!confirm(t('msg.confirmDelete'))) return;
    try {
      await fetch('/api/admin/stripe', { method: 'DELETE' });
      setStripeConfig({ configured: false });
    } catch {}
  };

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) {
        setSettings(prev => ({ ...prev, ...JSON.parse(stored) }));
      } else {
      }
    } catch {}
  }, []);

  const handleSave = () => {
    setSaving(true);
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {}
    setSaving(false);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500000) {
      alert('Logo must be under 500KB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setSettings(prev => ({ ...prev, logo_url: ev.target?.result as string || '' }));
    };
    reader.readAsDataURL(file);
  };

  const handleSignOut = async () => {
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {}
    router.push('/login');
  };

  const update = (field: keyof BusinessSettings, value: string | number) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const inputClasses = "w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all";
  const inputStyle = { background: '#0c0a1d', borderColor: '#4b3d6615', color: '#e4e4e4' };
  const labelClasses = "block text-xs font-medium mb-1.5";

  const tabs = [
    { id: 'business' as const, label: t('settings.business'), icon: Building2 },
    { id: 'defaults' as const, label: t('settings.defaults'), icon: FileText },
    { id: 'payment' as const, label: t('settings.payment'), icon: CreditCard },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings className="w-6 h-6" style={{ color: '#4b3d66' }} />
          <h1 className="text-xl font-bold" style={{ fontFamily: "'Cabinet Grotesk', sans-serif", color: '#e4e4e4' }}>
            {t('settings.title')}
          </h1>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90 disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #4b3d66, #6a5b8a)' }}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saving ? t('msg.processing') : saved ? t('msg.saved') : t('action.save')}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#ffffff08' }}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all"
              style={{
                background: active ? '#4b3d66' : 'transparent',
                color: active ? '#fff' : '#e4e4e450',
              }}>
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Business Tab */}
      {activeTab === 'business' && (
        <div className="space-y-5">
          {/* Logo */}
          <div className="rounded-2xl p-5" style={{ background: '#ffffff08', boxShadow: '0 1px 2px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.15)', border: '1px solid #4b3d6608' }}>
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: '#e4e4e4' }}>
              <ImageIcon className="w-4 h-4" style={{ color: '#4b3d66' }} /> {t('settings.logo')}
            </h2>
            <div className="flex items-center gap-4">
              {settings.logo_url ? (
                <div className="relative">
                  <img src={settings.logo_url} alt="Logo" className="w-20 h-20 object-contain rounded-xl border" style={{ borderColor: '#4b3d6610' }} />
                  <button onClick={() => update('logo_url', '')}
                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                    ×
                  </button>
                </div>
              ) : (
                <div className="w-20 h-20 rounded-xl border-2 border-dashed flex items-center justify-center"
                  style={{ borderColor: '#4b3d6620' }}>
                  <ImageIcon className="w-6 h-6" style={{ color: '#e4e4e440' }} />
                </div>
              )}
              <div>
                <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium cursor-pointer border hover:bg-white/[0.04]"
                  style={{ borderColor: '#4b3d6615', color: '#e4e4e4' }}>
                  <ImageIcon className="w-4 h-4" /> {t('settings.uploadLogo')}
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                </label>
                <p className="text-[11px] mt-1" style={{ color: '#e4e4e440' }}>{t('settings.logoHint')}</p>
              </div>
            </div>
          </div>

          {/* Business Details */}
          <div className="rounded-2xl p-5" style={{ background: '#ffffff08', boxShadow: '0 1px 2px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.15)', border: '1px solid #4b3d6608' }}>
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: '#e4e4e4' }}>
              <Building2 className="w-4 h-4" style={{ color: '#4b3d66' }} /> {t('settings.business')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClasses} style={{ color: '#e4e4e450' }}>{t('settings.businessName')}</label>
                <input type="text" value={settings.business_name} onChange={e => update('business_name', e.target.value)}
                  placeholder="Your Company LLC" className={inputClasses} style={inputStyle} />
              </div>
              <div>
                <label className={labelClasses} style={{ color: '#e4e4e450' }}>{t('label.email')}</label>
                <input type="email" value={settings.email} onChange={e => update('email', e.target.value)}
                  placeholder="billing@company.com" className={inputClasses} style={inputStyle} />
              </div>
              <div>
                <label className={labelClasses} style={{ color: '#e4e4e450' }}>{t('label.phone')}</label>
                <input type="tel" value={settings.phone} onChange={e => update('phone', e.target.value)}
                  placeholder="+1 (555) 123-4567" className={inputClasses} style={inputStyle} />
              </div>
              <div>
                <label className={labelClasses} style={{ color: '#e4e4e450' }}>{t('label.website')}</label>
                <input type="url" value={settings.website} onChange={e => update('website', e.target.value)}
                  placeholder="https://company.com" className={inputClasses} style={inputStyle} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClasses} style={{ color: '#e4e4e450' }}>{t('label.address')}</label>
                <input type="text" value={settings.address} onChange={e => update('address', e.target.value)}
                  placeholder="123 Main St, City, State, ZIP, Country" className={inputClasses} style={inputStyle} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Defaults Tab */}
      {activeTab === 'defaults' && (

        <div className="space-y-5">
          <div className="rounded-2xl p-5" style={{ background: '#ffffff08', boxShadow: '0 1px 2px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.15)', border: '1px solid #4b3d6608' }}>
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: '#e4e4e4' }}>
              <FileText className="w-4 h-4" style={{ color: '#4b3d66' }} /> {t('settings.defaults')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClasses} style={{ color: '#e4e4e450' }}>{t('settings.docPrefix')}</label>
                <input type="text" value={settings.doc_prefix} onChange={e => update('doc_prefix', e.target.value)}
                  placeholder="SCR" className={inputClasses} style={inputStyle} />
                <p className="text-[11px] mt-1" style={{ color: '#e4e4e440' }}>Supply Chain Reports will be numbered: {settings.doc_prefix}-0001</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl p-5" style={{ background: '#ffffff08', boxShadow: '0 1px 2px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.15)', border: '1px solid #4b3d6608' }}>
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: '#e4e4e4' }}>
              <FileText className="w-4 h-4" style={{ color: '#4b3d66' }} /> {t('settings.defaultNotes')}
            </h2>
            <textarea value={settings.default_notes} onChange={e => update('default_notes', e.target.value)}
              placeholder="Default notes for new supply chain reports..."
              rows={3} className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 resize-none transition-all"
              style={inputStyle} />
            <p className="text-[11px] mt-1" style={{ color: '#e4e4e440' }}>{t('settings.defaultNotesHint')}</p>
          </div>
        </div>
      )}

      {/* Payment Tab */}
      {activeTab === 'payment' && (
        <div className="space-y-5">

          {/* ─── Stripe Configuration ─── */}
          <div className="rounded-2xl p-5" style={{ background: '#ffffff08', boxShadow: '0 1px 2px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.15)', border: '1px solid #4b3d6608' }}>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: '#e4e4e4' }}>
                <CreditCard className="w-4 h-4" style={{ color: '#4b3d66' }} /> {t('settings.stripeConfig')}
              </h2>
              {stripeLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#e4e4e440' }} />
              ) : stripeConfig.configured ? (
                <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: '#22c55e18', color: '#22c55e' }}>
                  <CheckCircle2 className="w-3.5 h-3.5" /> {t('settings.stripeConnected')}
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: '#f59e0b18', color: '#f59e0b' }}>
                  <AlertCircle className="w-3.5 h-3.5" /> {t('settings.stripeNotConnected')}
                </span>
              )}
            </div>
            <p className="text-xs mb-5" style={{ color: '#e4e4e450' }}>
              {t('settings.stripeDescription')}
            </p>

            {/* Current connection info */}
            {stripeConfig.configured && (
              <div className="mb-5 p-4 rounded-xl" style={{ background: '#4b3d6608', border: '1px solid #4b3d6612' }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <p className="text-[11px] font-medium mb-1" style={{ color: '#e4e4e440' }}>{t('settings.publishableKey')}</p>
                    <p className="text-xs font-mono" style={{ color: '#e4e4e470' }}>{stripeConfig.publishable_key_masked || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium mb-1" style={{ color: '#e4e4e440' }}>{t('settings.secretKey')}</p>
                    <p className="text-xs font-mono" style={{ color: '#e4e4e470' }}>{stripeConfig.secret_key_masked || '—'}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: '1px solid #4b3d6610' }}>
                  <p className="text-[11px]" style={{ color: '#e4e4e440' }}>
                    Source: {stripeConfig.source === 'env' ? '.env file' : 'Database'}
                  </p>
                  {stripeConfig.source === 'database' && (
                    <button onClick={handleStripeDisconnect}
                      className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-lg transition-all hover:bg-red-500/10"
                      style={{ color: '#ef4444' }}>
                      <Trash2 className="w-3 h-3" /> Disconnect
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Enter new keys */}
            {!stripeConfig.configured && (
              <div className="space-y-4">
                <div className="p-3 rounded-xl" style={{ background: '#4b3d6606', border: '1px solid #4b3d6610' }}>
                  <p className="text-xs" style={{ color: '#e4e4e460' }}>
                    {t('settings.stripeInstructions')}{' '}
                    <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-medium underline" style={{ color: '#4b3d66' }}>
                      {t('settings.stripeDashboard')} <ExternalLink className="w-3 h-3" />
                    </a>
                  </p>
                </div>

                <div>
                  <label className={labelClasses} style={{ color: '#e4e4e450' }}>{t('settings.publishableKey')}</label>
                  <input type="text" value={stripePubKey} onChange={e => setStripePubKey(e.target.value)}
                    placeholder="pk_live_... or pk_test_..." className={inputClasses} style={inputStyle} />
                </div>

                <div>
                  <label className={labelClasses} style={{ color: '#e4e4e450' }}>{t('settings.secretKey')}</label>
                  <div className="relative">
                    <input type={showSecretKey ? 'text' : 'password'} value={stripeSecretKey}
                      onChange={e => setStripeSecretKey(e.target.value)}
                      placeholder="sk_live_... or sk_test_..." className={inputClasses + ' pr-10'} style={inputStyle} />
                    <button type="button" onClick={() => setShowSecretKey(!showSecretKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded" style={{ color: '#e4e4e440' }}>
                      {showSecretKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {stripeError && (
                  <div className="p-3 rounded-xl flex items-start gap-2" style={{ background: '#ef444410', border: '1px solid #ef444420' }}>
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#ef4444' }} />
                    <p className="text-xs" style={{ color: '#ef4444' }}>{stripeError}</p>
                  </div>
                )}

                {stripeSuccess && (
                  <div className="p-3 rounded-xl flex items-start gap-2" style={{ background: '#22c55e10', border: '1px solid #22c55e20' }}>
                    <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#22c55e' }} />
                    <p className="text-xs" style={{ color: '#22c55e' }}>{stripeSuccess}</p>
                  </div>
                )}

                <button onClick={handleStripeSave}
                  disabled={stripeSaving || !stripeSecretKey || !stripeSecretKey.startsWith('sk_')}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90 disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg, #4b3d66, #6a5b8a)' }}>
                  {stripeSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                  {stripeSaving ? t('msg.processing') : t('settings.testConnection')}
                </button>
              </div>
            )}
          </div>

          {/* ─── Account ─── */}
          <div className="rounded-2xl p-5" style={{ background: '#ffffff08', boxShadow: '0 1px 2px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.15)', border: '1px solid #4b3d6608' }}>
            <h2 className="text-sm font-semibold mb-4" style={{ color: '#e4e4e4' }}>{t('settings.account')}</h2>
            <button onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all hover:bg-red-500/10"
              style={{ borderColor: '#ef444430', color: '#ef4444' }}>
              <LogOut className="w-4 h-4" /> {t('nav.signOut')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
