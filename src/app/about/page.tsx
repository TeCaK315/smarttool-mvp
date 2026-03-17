'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Info } from 'lucide-react';
import { useT } from '@/lib/i18n';

const LEGAL_KEY = 'SmartTool MVP_legal_pages';

export default function AboutPage() {
  const t = useT();
  const [content, setContent] = useState('');

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(LEGAL_KEY) || '{}');
      setContent(stored.about || "# About {{COMPANY_NAME}}\n\n{{COMPANY_NAME}} was created to solve a real problem: {{SERVICE_DESCRIPTION}}.\n\n## Our Mission\n\nWe believe that every freelancer and small business deserves professional tools without the enterprise price tag. Our platform makes it easy to create, send, and track professional documents in minutes.\n\n## How It Works\n\n1. **Create** — Fill in your details and line items\n2. **Send** — Email directly to your clients with one click\n3. **Track** — Monitor payment status and generate reports\n\n## Contact Us\n\nHave questions or feedback? We'd love to hear from you.\n\nEmail: {{CONTACT_EMAIL}}\nWebsite: {{WEBSITE_URL}}\nAddress: {{COMPANY_ADDRESS}}\nRegistration: {{COMPANY_REGISTRATION}}");
    } catch {
      setContent("# About {{COMPANY_NAME}}\n\n{{COMPANY_NAME}} was created to solve a real problem: {{SERVICE_DESCRIPTION}}.\n\n## Our Mission\n\nWe believe that every freelancer and small business deserves professional tools without the enterprise price tag. Our platform makes it easy to create, send, and track professional documents in minutes.\n\n## How It Works\n\n1. **Create** — Fill in your details and line items\n2. **Send** — Email directly to your clients with one click\n3. **Track** — Monitor payment status and generate reports\n\n## Contact Us\n\nHave questions or feedback? We'd love to hear from you.\n\nEmail: {{CONTACT_EMAIL}}\nWebsite: {{WEBSITE_URL}}\nAddress: {{COMPANY_ADDRESS}}\nRegistration: {{COMPANY_REGISTRATION}}");
    }
  }, []);

  return (
    <div className="min-h-screen" style={{ background: '#0c0a1d' }}>
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link href="/" className="inline-flex items-center gap-2 text-sm mb-8 hover:opacity-80 transition-opacity" style={{ color: '#4b3d66' }}>
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
        <div className="flex items-center gap-3 mb-6">
          <Info className="w-6 h-6" style={{ color: '#4b3d66' }} />
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Cabinet Grotesk', sans-serif", color: '#e4e4e4' }}>{t('legal.aboutUs')}</h1>
        </div>
        <div className="prose prose-sm max-w-none" style={{ color: '#e4e4e470' }}>
          {content.split('\n').map((line, i) => {
            const hasPlaceholder = /\{\{[A-Z_]+\}\}/.test(line);
            if (line.startsWith('# ')) return <h1 key={i} className="text-xl font-bold mt-8 mb-4" style={{ color: '#e4e4e4' }}>{line.replace('# ', '')}</h1>;
            if (line.startsWith('## ')) return <h2 key={i} className="text-lg font-semibold mt-6 mb-3" style={{ color: '#e4e4e4' }}>{line.replace('## ', '')}</h2>;
            if (line.startsWith('### ')) return <h3 key={i} className="text-base font-semibold mt-4 mb-2" style={{ color: '#e4e4e4' }}>{line.replace('### ', '')}</h3>;
            if (line.startsWith('- ')) return <li key={i} className="ml-4 mb-1">{line.replace('- ', '')}</li>;
            if (!line.trim()) return <br key={i} />;
            return <p key={i} className="mb-2" style={{ color: hasPlaceholder ? '#ef4444' : '#e4e4e470' }}>{line}</p>;
          })}
        </div>
      </div>
    </div>
  );
}
