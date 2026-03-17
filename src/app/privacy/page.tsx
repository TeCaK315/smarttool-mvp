'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Shield } from 'lucide-react';
import { useT } from '@/lib/i18n';

const LEGAL_KEY = 'SmartTool MVP_legal_pages';

export default function PrivacyPage() {
  const t = useT();
  const [content, setContent] = useState('');

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(LEGAL_KEY) || '{}');
      setContent(stored.privacy || "Last updated: {{EFFECTIVE_DATE}}\n\n{{COMPANY_NAME}} (\"we\", \"us\", or \"our\") operates {{WEBSITE_URL}} (the \"Service\"). This Privacy Policy informs you of our policies regarding the collection, use, and disclosure of personal data when you use our Service.\n\n1. Information We Collect\n\nWe collect the following types of information:\n- Account information: name, email address, and password when you create an account\n- Billing information: payment details processed securely through Stripe\n- Usage data: how you interact with our Service, including pages visited and features used\n- Device data: browser type, IP address, and operating system\n\n2. How We Use Your Information\n\nWe use collected information to:\n- Provide and maintain our Service\n- Process payments and send invoices\n- Send important updates about your account\n- Improve our Service based on usage patterns\n- Comply with legal obligations\n\n3. Data Storage and Security\n\nYour data is stored securely using industry-standard encryption. We use Supabase for database management and Stripe for payment processing. We retain your data for as long as your account is active.\n\n4. Third-Party Services\n\nWe use the following third-party services:\n- Supabase (database and authentication)\n- Stripe (payment processing)\n- Vercel (hosting)\n\nEach service has its own privacy policy governing the use of your data.\n\n5. Your Rights\n\nYou have the right to:\n- Access your personal data\n- Request correction of inaccurate data\n- Request deletion of your data\n- Export your data\n- Opt out of marketing communications\n\n6. Contact Us\n\nFor privacy-related inquiries, contact us at:\nEmail: {{CONTACT_EMAIL}}\nAddress: {{COMPANY_ADDRESS}}\nRegistration: {{COMPANY_REGISTRATION}}");
    } catch {
      setContent("Last updated: {{EFFECTIVE_DATE}}\n\n{{COMPANY_NAME}} (\"we\", \"us\", or \"our\") operates {{WEBSITE_URL}} (the \"Service\"). This Privacy Policy informs you of our policies regarding the collection, use, and disclosure of personal data when you use our Service.\n\n1. Information We Collect\n\nWe collect the following types of information:\n- Account information: name, email address, and password when you create an account\n- Billing information: payment details processed securely through Stripe\n- Usage data: how you interact with our Service, including pages visited and features used\n- Device data: browser type, IP address, and operating system\n\n2. How We Use Your Information\n\nWe use collected information to:\n- Provide and maintain our Service\n- Process payments and send invoices\n- Send important updates about your account\n- Improve our Service based on usage patterns\n- Comply with legal obligations\n\n3. Data Storage and Security\n\nYour data is stored securely using industry-standard encryption. We use Supabase for database management and Stripe for payment processing. We retain your data for as long as your account is active.\n\n4. Third-Party Services\n\nWe use the following third-party services:\n- Supabase (database and authentication)\n- Stripe (payment processing)\n- Vercel (hosting)\n\nEach service has its own privacy policy governing the use of your data.\n\n5. Your Rights\n\nYou have the right to:\n- Access your personal data\n- Request correction of inaccurate data\n- Request deletion of your data\n- Export your data\n- Opt out of marketing communications\n\n6. Contact Us\n\nFor privacy-related inquiries, contact us at:\nEmail: {{CONTACT_EMAIL}}\nAddress: {{COMPANY_ADDRESS}}\nRegistration: {{COMPANY_REGISTRATION}}");
    }
  }, []);

  return (
    <div className="min-h-screen" style={{ background: '#1a202c' }}>
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link href="/" className="inline-flex items-center gap-2 text-sm mb-8 hover:opacity-80 transition-opacity" style={{ color: '#5a67d8' }}>
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-6 h-6" style={{ color: '#5a67d8' }} />
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Montserrat', sans-serif", color: '#edf2f7' }}>{t('legal.privacyPolicy')}</h1>
        </div>
        <div className="prose prose-sm max-w-none" style={{ color: '#edf2f770' }}>
          {content.split('\n').map((line, i) => {
            // Highlight unfilled placeholders in red
            const hasPlaceholder = /\{\{[A-Z_]+\}\}/.test(line);
            if (line.startsWith('# ')) return <h1 key={i} className="text-xl font-bold mt-8 mb-4" style={{ color: '#edf2f7' }}>{line.replace('# ', '')}</h1>;
            if (line.startsWith('## ')) return <h2 key={i} className="text-lg font-semibold mt-6 mb-3" style={{ color: '#edf2f7' }}>{line.replace('## ', '')}</h2>;
            if (line.startsWith('- ')) return <li key={i} className="ml-4 mb-1" style={{ color: hasPlaceholder ? '#ef4444' : '#edf2f770' }}>{line.replace('- ', '')}</li>;
            if (line.match(/^\d+\./)) return <h3 key={i} className="text-base font-semibold mt-5 mb-2" style={{ color: '#edf2f7' }}>{line}</h3>;
            if (!line.trim()) return <br key={i} />;
            return <p key={i} className="mb-2" style={{ color: hasPlaceholder ? '#ef4444' : '#edf2f770' }}>{line}</p>;
          })}
        </div>
      </div>
    </div>
  );
}
