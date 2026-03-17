'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Save, Check, Loader2, Shield, FileText, Info,
  HelpCircle, AlertTriangle, Eye,
} from 'lucide-react';
import { useT } from '@/lib/i18n';

const LEGAL_KEY = 'SmartTool MVP_legal_pages';

const PLACEHOLDER_HINTS: Record<string, string> = {
  'COMPANY_NAME': 'Your registered business name (e.g. "Acme LLC", "John Doe Sole Proprietor"). Find it on your business registration certificate.',
  'WEBSITE_URL': 'Your full website URL including https:// (e.g. "https://invoiceflow.com")',
  'CONTACT_EMAIL': 'Business email for legal/support inquiries (e.g. "legal@company.com")',
  'COMPANY_ADDRESS': 'Registered business address. Check your incorporation documents or tax registration.',
  'COMPANY_REGISTRATION': 'Business registration number: EIN (US), KVK (NL), Company Number (UK), ИНН/ОГРН (RU), ЄДРПОУ (UA). Found on your registration certificate from the government.',
  'EFFECTIVE_DATE': 'Date when this policy takes effect (e.g. "January 1, 2026")',
  'JURISDICTION': 'Country/state whose laws govern these terms. Usually where your business is registered (e.g. "State of Delaware, USA", "Netherlands", "England and Wales").',
  'SERVICE_DESCRIPTION': 'Brief description of what your service does (e.g. "an online invoicing platform for freelancers and small businesses")',
};

const TABS = [
  { id: 'privacy', label: 'Privacy Policy', icon: Shield, url: '/privacy' },
  { id: 'terms', label: 'Terms of Service', icon: FileText, url: '/terms' },
  { id: 'about', label: 'About Us', icon: Info, url: '/about' },
  { id: 'faq', label: 'FAQ', icon: HelpCircle, url: '/faq' },
];

const DEFAULTS: Record<string, string> = {
  privacy: "Last updated: {{EFFECTIVE_DATE}}\n\n{{COMPANY_NAME}} (\"we\", \"us\", or \"our\") operates {{WEBSITE_URL}} (the \"Service\"). This Privacy Policy informs you of our policies regarding the collection, use, and disclosure of personal data when you use our Service.\n\n1. Information We Collect\n\nWe collect the following types of information:\n- Account information: name, email address, and password when you create an account\n- Billing information: payment details processed securely through Stripe\n- Usage data: how you interact with our Service, including pages visited and features used\n- Device data: browser type, IP address, and operating system\n\n2. How We Use Your Information\n\nWe use collected information to:\n- Provide and maintain our Service\n- Process payments and send invoices\n- Send important updates about your account\n- Improve our Service based on usage patterns\n- Comply with legal obligations\n\n3. Data Storage and Security\n\nYour data is stored securely using industry-standard encryption. We use Supabase for database management and Stripe for payment processing. We retain your data for as long as your account is active.\n\n4. Third-Party Services\n\nWe use the following third-party services:\n- Supabase (database and authentication)\n- Stripe (payment processing)\n- Vercel (hosting)\n\nEach service has its own privacy policy governing the use of your data.\n\n5. Your Rights\n\nYou have the right to:\n- Access your personal data\n- Request correction of inaccurate data\n- Request deletion of your data\n- Export your data\n- Opt out of marketing communications\n\n6. Contact Us\n\nFor privacy-related inquiries, contact us at:\nEmail: {{CONTACT_EMAIL}}\nAddress: {{COMPANY_ADDRESS}}\nRegistration: {{COMPANY_REGISTRATION}}",
  terms: "Last updated: {{EFFECTIVE_DATE}}\n\nPlease read these Terms of Service (\"Terms\") carefully before using {{WEBSITE_URL}} operated by {{COMPANY_NAME}}.\n\n1. Acceptance of Terms\n\nBy accessing or using our Service, you agree to be bound by these Terms. If you disagree with any part, you may not access the Service.\n\n2. Description of Service\n\n{{COMPANY_NAME}} provides {{SERVICE_DESCRIPTION}}. The Service is provided \"as is\" and \"as available\" without warranties of any kind.\n\n3. User Accounts\n\n- You must provide accurate and complete registration information\n- You are responsible for maintaining the security of your account\n- You must notify us immediately of any unauthorized use\n- We reserve the right to suspend or terminate accounts that violate these Terms\n\n4. Payment Terms\n\n- Prices are listed in the currency displayed at the time of purchase\n- All payments are processed securely through Stripe\n- Subscriptions auto-renew unless cancelled before the renewal date\n- Refunds are handled on a case-by-case basis within 14 days of purchase\n\n5. Intellectual Property\n\n- The Service and its content are owned by {{COMPANY_NAME}}\n- You retain ownership of any data you input into the Service\n- You grant us a license to process your data as needed to provide the Service\n\n6. Limitation of Liability\n\n{{COMPANY_NAME}} shall not be liable for any indirect, incidental, special, or consequential damages resulting from your use of the Service.\n\n7. Governing Law\n\nThese Terms shall be governed by the laws of {{JURISDICTION}}, without regard to conflict of law provisions.\n\n8. Changes to Terms\n\nWe reserve the right to modify these Terms at any time. We will notify users of significant changes via email or through the Service.\n\n9. Contact\n\nQuestions about these Terms should be directed to:\nEmail: {{CONTACT_EMAIL}}\nAddress: {{COMPANY_ADDRESS}}",
  about: "# About {{COMPANY_NAME}}\n\n{{COMPANY_NAME}} was created to solve a real problem: {{SERVICE_DESCRIPTION}}.\n\n## Our Mission\n\nWe believe that every freelancer and small business deserves professional tools without the enterprise price tag. Our platform makes it easy to create, send, and track professional documents in minutes.\n\n## How It Works\n\n1. **Create** — Fill in your details and line items\n2. **Send** — Email directly to your clients with one click\n3. **Track** — Monitor payment status and generate reports\n\n## Contact Us\n\nHave questions or feedback? We'd love to hear from you.\n\nEmail: {{CONTACT_EMAIL}}\nWebsite: {{WEBSITE_URL}}\nAddress: {{COMPANY_ADDRESS}}\nRegistration: {{COMPANY_REGISTRATION}}",
  faq: "## Frequently Asked Questions\n\n### How do I get started?\nSign up for a free account, fill in your business details in Settings, and create your first document. It takes less than 2 minutes.\n\n### Is my data secure?\nYes. We use industry-standard encryption and secure infrastructure. Your payment data is processed by Stripe and never touches our servers.\n\n### Can I customize the look of my documents?\nYes. You can upload your logo, set your brand colors, and customize the default notes and payment instructions in Settings.\n\n### How do I export my data?\nGo to Reports and click \"Export CSV\" to download all your data in spreadsheet format. You can also download individual documents as PDF.\n\n### What payment methods are supported?\nWe accept all major credit cards through Stripe. Your clients can pay via the payment link included in each document.\n\n### Can I cancel my subscription?\nYes, you can cancel anytime from the Billing page. Your data will remain accessible until the end of your billing period.\n\n### How do I contact support?\nEmail us at {{CONTACT_EMAIL}} and we'll respond within 24 hours.\n\n### Do you offer refunds?\nYes, we offer full refunds within 14 days of purchase if you're not satisfied.",
};

export default function LegalEditorPage() {
  const t = useT();
  const [pages, setPages] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState('privacy');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hoveredPlaceholder, setHoveredPlaceholder] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(LEGAL_KEY) || '{}');
      setPages({
        privacy: stored.privacy || DEFAULTS.privacy,
        terms: stored.terms || DEFAULTS.terms,
        about: stored.about || DEFAULTS.about,
        faq: stored.faq || DEFAULTS.faq,
      });
    } catch {
      setPages({ ...DEFAULTS });
    }
  }, []);

  const currentContent = pages[activeTab] || '';

  const updateContent = (content: string) => {
    setPages(prev => ({ ...prev, [activeTab]: content }));
  };

  const handleSave = () => {
    setSaving(true);
    try {
      localStorage.setItem(LEGAL_KEY, JSON.stringify(pages));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {}
    setSaving(false);
  };

  // Find unfilled placeholders
  const placeholders: string[] = [];
  const phRegex = /\{\{([A-Z_]+)\}\}/g;
  let phMatch: RegExpExecArray | null;
  while ((phMatch = phRegex.exec(currentContent)) !== null) { placeholders.push(phMatch[1]); }
  const uniquePlaceholders = placeholders.filter((v, i, a) => a.indexOf(v) === i);

  const replaceAll = (placeholder: string, value: string) => {
    const updated = currentContent.replace(new RegExp('\\{\\{' + placeholder + '\\}\\}', 'g'), value);
    updateContent(updated);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="p-2 rounded-xl transition-all hover:bg-white/[0.06]">
            <ArrowLeft className="w-5 h-5" style={{ color: '#edf2f750' }} />
          </Link>
          <div>
            <h1 className="text-xl font-bold" style={{ fontFamily: "'Montserrat', sans-serif", color: '#edf2f7' }}>
              {t('legal.editor')}
            </h1>
            <p className="text-xs mt-0.5" style={{ color: '#edf2f740' }}>{t('legal.editorSubtitle')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {TABS.find(t => t.id === activeTab) && (
            <Link href={TABS.find(t => t.id === activeTab)!.url} target="_blank"
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-all hover:bg-white/[0.04]"
              style={{ borderColor: '#5a67d815', color: '#edf2f750' }}>
              <Eye className="w-4 h-4" /> Preview
            </Link>
          )}
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #5a67d8, #4a5568)' }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved ? 'Saved!' : 'Save All'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#ffffff08' }}>
        {TABS.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          const pageContent = pages[tab.id] || '';
          const hasUnfilled = /\{\{[A-Z_]+\}\}/.test(pageContent);
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all relative"
              style={{ background: active ? '#5a67d8' : 'transparent', color: active ? '#fff' : '#edf2f750' }}>
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              {hasUnfilled && (
                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500" />
              )}
            </button>
          );
        })}
      </div>

      {/* Unfilled Placeholders Warning */}
      {uniquePlaceholders.length > 0 && (
        <div className="rounded-2xl p-4" style={{ background: '#ef444410', border: '1px solid #ef444420' }}>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4" style={{ color: '#ef4444' }} />
            <h3 className="text-sm font-semibold" style={{ color: '#ef4444' }}>
              {uniquePlaceholders.length} placeholder{uniquePlaceholders.length > 1 ? 's' : ''} need your data
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {uniquePlaceholders.map(ph => (
              <div key={ph} className="relative group">
                <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: '#ef444408' }}>
                  <span className="text-xs font-mono font-bold" style={{ color: '#ef4444' }}>{'{{' + ph + '}}'}</span>
                  <input type="text" placeholder={'Enter ' + ph.toLowerCase().replace(/_/g, ' ')}
                    className="flex-1 text-xs px-2 py-1 rounded border bg-transparent focus:outline-none"
                    style={{ borderColor: '#ef444430', color: '#edf2f7' }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.target as HTMLInputElement).value) {
                        replaceAll(ph, (e.target as HTMLInputElement).value);
                        (e.target as HTMLInputElement).value = '';
                      }
                    }}
                  />
                </div>
                {/* Tooltip with hint */}
                <div className="absolute left-0 bottom-full mb-1 w-72 p-2 rounded-lg text-[11px] opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10"
                  style={{ background: '#ffffff12', color: '#edf2f770', boxShadow: '0 4px 12px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.2)', border: '1px solid #5a67d815' }}>
                  {PLACEHOLDER_HINTS[ph] || 'Replace this with your actual data'}
                </div>
              </div>
            ))}
          </div>
          <p className="text-[11px] mt-2" style={{ color: '#ef444480' }}>
            Type a value and press Enter to replace all occurrences. Hover for details on where to find the data.
          </p>
        </div>
      )}

      {/* Editor */}
      <div className="rounded-2xl overflow-hidden" style={{ background: '#ffffff08', boxShadow: '0 1px 2px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.15)', border: '1px solid #5a67d808' }}>
        <textarea
          ref={textareaRef}
          value={currentContent}
          onChange={(e) => updateContent(e.target.value)}
          className="w-full min-h-[500px] p-5 text-sm font-mono leading-relaxed focus:outline-none resize-y"
          style={{ background: 'transparent', color: '#edf2f7', caretColor: '#5a67d8' }}
          placeholder="Enter your content here. Use ## for headings, ### for subheadings, - for bullet points."
        />
      </div>
    </div>
  );
}
