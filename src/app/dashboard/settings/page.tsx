'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Settings, Save, Loader2, Check, LogOut, Building2, Receipt,
  CreditCard, Globe, Hash, Percent, FileText, ImageIcon,
} from 'lucide-react';

interface BusinessSettings {
  business_name: string;
  email: string;
  address: string;
  phone: string;
  website: string;
  tax_id: string;
  logo_url: string;
  default_currency: string;
  default_payment_terms: string;
  default_tax_rate: number;
  tax_label: string;
  invoice_prefix: string;
  default_notes: string;
  payment_instructions: string;
}

const PROFILE_KEY = 'SmartTool MVP_sender_profile';
const SETTINGS_KEY = 'SmartTool MVP_settings';

const CURRENCIES = [
  { code: 'USD', label: 'USD - US Dollar' },
  { code: 'EUR', label: 'EUR - Euro' },
  { code: 'GBP', label: 'GBP - British Pound' },
  { code: 'UAH', label: 'UAH - Ukrainian Hryvnia' },
  { code: 'CAD', label: 'CAD - Canadian Dollar' },
  { code: 'AUD', label: 'AUD - Australian Dollar' },
  { code: 'JPY', label: 'JPY - Japanese Yen' },
  { code: 'CHF', label: 'CHF - Swiss Franc' },
  { code: 'INR', label: 'INR - Indian Rupee' },
  { code: 'BRL', label: 'BRL - Brazilian Real' },
];

const PAYMENT_TERMS = [
  { value: 'due_on_receipt', label: 'Due on Receipt' },
  { value: 'net_15', label: 'Net 15' },
  { value: 'net_30', label: 'Net 30' },
  { value: 'net_60', label: 'Net 60' },
];

export default function SettingsPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'business' | 'invoice' | 'payment'>('business');

  const [settings, setSettings] = useState<BusinessSettings>({
    business_name: '',
    email: '',
    address: '',
    phone: '',
    website: '',
    tax_id: '',
    logo_url: '',
    default_currency: 'USD',
    default_payment_terms: 'net_30',
    default_tax_rate: 0,
    tax_label: 'Tax',
    invoice_prefix: 'INV',
    default_notes: '',
    payment_instructions: '',
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) {
        setSettings(prev => ({ ...prev, ...JSON.parse(stored) }));
      } else {
        // Migrate from old sender profile
        const profile = localStorage.getItem(PROFILE_KEY);
        if (profile) {
          const p = JSON.parse(profile);
          setSettings(prev => ({
            ...prev,
            business_name: p.business_name || '',
            email: p.email || '',
            address: p.address || '',
            phone: p.phone || '',
          }));
        }
      }
    } catch {}
  }, []);

  const handleSave = () => {
    setSaving(true);
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      // Also update sender profile for backwards compatibility
      localStorage.setItem(PROFILE_KEY, JSON.stringify({
        business_name: settings.business_name,
        email: settings.email,
        address: settings.address,
        phone: settings.phone,
      }));
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
  const inputStyle = { background: '#1a202c', borderColor: '#5a67d815', color: '#edf2f7' };
  const labelClasses = "block text-xs font-medium mb-1.5";

  const tabs = [
    { id: 'business' as const, label: 'Business', icon: Building2 },
    { id: 'invoice' as const, label: 'Invoice Defaults', icon: Receipt },
    { id: 'payment' as const, label: 'Payment', icon: CreditCard },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings className="w-6 h-6" style={{ color: '#5a67d8' }} />
          <h1 className="text-xl font-bold" style={{ fontFamily: "'Montserrat', sans-serif", color: '#edf2f7' }}>
            Settings
          </h1>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90 disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #5a67d8, #4a5568)' }}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save'}
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
                background: active ? '#5a67d8' : 'transparent',
                color: active ? '#fff' : '#edf2f750',
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
          <div className="rounded-2xl p-5" style={{ background: '#ffffff08', boxShadow: '0 1px 2px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.15)', border: '1px solid #5a67d808' }}>
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: '#edf2f7' }}>
              <ImageIcon className="w-4 h-4" style={{ color: '#5a67d8' }} /> Logo
            </h2>
            <div className="flex items-center gap-4">
              {settings.logo_url ? (
                <div className="relative">
                  <img src={settings.logo_url} alt="Logo" className="w-20 h-20 object-contain rounded-xl border" style={{ borderColor: '#5a67d810' }} />
                  <button onClick={() => update('logo_url', '')}
                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                    ×
                  </button>
                </div>
              ) : (
                <div className="w-20 h-20 rounded-xl border-2 border-dashed flex items-center justify-center"
                  style={{ borderColor: '#5a67d820' }}>
                  <ImageIcon className="w-6 h-6" style={{ color: '#edf2f740' }} />
                </div>
              )}
              <div>
                <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium cursor-pointer border hover:bg-white/[0.04]"
                  style={{ borderColor: '#5a67d815', color: '#edf2f7' }}>
                  <ImageIcon className="w-4 h-4" /> Upload Logo
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                </label>
                <p className="text-[11px] mt-1" style={{ color: '#edf2f740' }}>PNG or JPG, max 500KB. Shows on invoices and PDF.</p>
              </div>
            </div>
          </div>

          {/* Business Details */}
          <div className="rounded-2xl p-5" style={{ background: '#ffffff08', boxShadow: '0 1px 2px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.15)', border: '1px solid #5a67d808' }}>
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: '#edf2f7' }}>
              <Building2 className="w-4 h-4" style={{ color: '#5a67d8' }} /> Business Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClasses} style={{ color: '#edf2f750' }}>Business Name</label>
                <input type="text" value={settings.business_name} onChange={e => update('business_name', e.target.value)}
                  placeholder="Your Company LLC" className={inputClasses} style={inputStyle} />
              </div>
              <div>
                <label className={labelClasses} style={{ color: '#edf2f750' }}>Email</label>
                <input type="email" value={settings.email} onChange={e => update('email', e.target.value)}
                  placeholder="billing@company.com" className={inputClasses} style={inputStyle} />
              </div>
              <div>
                <label className={labelClasses} style={{ color: '#edf2f750' }}>Phone</label>
                <input type="tel" value={settings.phone} onChange={e => update('phone', e.target.value)}
                  placeholder="+1 (555) 123-4567" className={inputClasses} style={inputStyle} />
              </div>
              <div>
                <label className={labelClasses} style={{ color: '#edf2f750' }}>Website</label>
                <input type="url" value={settings.website} onChange={e => update('website', e.target.value)}
                  placeholder="https://company.com" className={inputClasses} style={inputStyle} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClasses} style={{ color: '#edf2f750' }}>Address</label>
                <input type="text" value={settings.address} onChange={e => update('address', e.target.value)}
                  placeholder="123 Main St, City, State, ZIP, Country" className={inputClasses} style={inputStyle} />
              </div>
              <div>
                <label className={labelClasses} style={{ color: '#edf2f750' }}>Tax ID / VAT Number</label>
                <input type="text" value={settings.tax_id} onChange={e => update('tax_id', e.target.value)}
                  placeholder="US12-3456789" className={inputClasses} style={inputStyle} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Defaults Tab */}
      {activeTab === 'invoice' && (
        <div className="space-y-5">
          <div className="rounded-2xl p-5" style={{ background: '#ffffff08', boxShadow: '0 1px 2px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.15)', border: '1px solid #5a67d808' }}>
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: '#edf2f7' }}>
              <Receipt className="w-4 h-4" style={{ color: '#5a67d8' }} /> Default Values
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClasses} style={{ color: '#edf2f750' }}>
                  <Globe className="w-3 h-3 inline mr-1" /> Currency
                </label>
                <select value={settings.default_currency} onChange={e => update('default_currency', e.target.value)}
                  className={inputClasses} style={inputStyle}>
                  {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClasses} style={{ color: '#edf2f750' }}>Payment Terms</label>
                <select value={settings.default_payment_terms} onChange={e => update('default_payment_terms', e.target.value)}
                  className={inputClasses} style={inputStyle}>
                  {PAYMENT_TERMS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClasses} style={{ color: '#edf2f750' }}>
                  <Hash className="w-3 h-3 inline mr-1" /> Invoice Number Prefix
                </label>
                <input type="text" value={settings.invoice_prefix} onChange={e => update('invoice_prefix', e.target.value)}
                  placeholder="INV" className={inputClasses} style={inputStyle} />
                <p className="text-[11px] mt-1" style={{ color: '#edf2f740' }}>Invoices will be numbered: {settings.invoice_prefix}-0001</p>
              </div>
              <div>
                <label className={labelClasses} style={{ color: '#edf2f750' }}>
                  <Percent className="w-3 h-3 inline mr-1" /> Default Tax Rate (%)
                </label>
                <input type="number" min="0" max="100" step="0.5" value={settings.default_tax_rate || ''}
                  onChange={e => update('default_tax_rate', parseFloat(e.target.value) || 0)}
                  placeholder="0" className={inputClasses} style={inputStyle} />
              </div>
              <div>
                <label className={labelClasses} style={{ color: '#edf2f750' }}>Tax Label</label>
                <input type="text" value={settings.tax_label} onChange={e => update('tax_label', e.target.value)}
                  placeholder="Tax / VAT / GST / Sales Tax" className={inputClasses} style={inputStyle} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl p-5" style={{ background: '#ffffff08', boxShadow: '0 1px 2px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.15)', border: '1px solid #5a67d808' }}>
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: '#edf2f7' }}>
              <FileText className="w-4 h-4" style={{ color: '#5a67d8' }} /> Default Notes
            </h2>
            <textarea value={settings.default_notes} onChange={e => update('default_notes', e.target.value)}
              placeholder="Thank you for your business! Payment is due within the terms specified above."
              rows={3} className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 resize-none transition-all"
              style={inputStyle} />
            <p className="text-[11px] mt-1" style={{ color: '#edf2f740' }}>This will appear on every new invoice by default.</p>
          </div>
        </div>
      )}

      {/* Payment Tab */}
      {activeTab === 'payment' && (
        <div className="space-y-5">
          <div className="rounded-2xl p-5" style={{ background: '#ffffff08', boxShadow: '0 1px 2px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.15)', border: '1px solid #5a67d808' }}>
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: '#edf2f7' }}>
              <CreditCard className="w-4 h-4" style={{ color: '#5a67d8' }} /> Payment Instructions
            </h2>
            <textarea value={settings.payment_instructions} onChange={e => update('payment_instructions', e.target.value)}
              placeholder="Bank: First National Bank\nAccount: 1234567890\nRouting: 021000021\n\nOr pay via PayPal: billing@company.com\nOr pay via Wise: company.com/pay"
              rows={6} className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 resize-none transition-all font-mono"
              style={inputStyle} />
            <p className="text-[11px] mt-1" style={{ color: '#edf2f740' }}>
              These instructions will appear at the bottom of your invoices and PDF exports.
            </p>
          </div>

          {/* Account */}
          <div className="rounded-2xl p-5" style={{ background: '#ffffff08', boxShadow: '0 1px 2px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.15)', border: '1px solid #5a67d808' }}>
            <h2 className="text-sm font-semibold mb-4" style={{ color: '#edf2f7' }}>Account</h2>
            <button onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all hover:bg-red-500/10"
              style={{ borderColor: '#ef444430', color: '#ef4444' }}>
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
