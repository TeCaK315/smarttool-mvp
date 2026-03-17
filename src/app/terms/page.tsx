'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText } from 'lucide-react';
import { useT } from '@/lib/i18n';

const LEGAL_KEY = 'SmartTool MVP_legal_pages';

export default function TermsPage() {
  const t = useT();
  const [content, setContent] = useState('');

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(LEGAL_KEY) || '{}');
      setContent(stored.terms || "Last updated: {{EFFECTIVE_DATE}}\n\nPlease read these Terms of Service (\"Terms\") carefully before using {{WEBSITE_URL}} operated by {{COMPANY_NAME}}.\n\n1. Acceptance of Terms\n\nBy accessing or using our Service, you agree to be bound by these Terms. If you disagree with any part, you may not access the Service.\n\n2. Description of Service\n\n{{COMPANY_NAME}} provides {{SERVICE_DESCRIPTION}}. The Service is provided \"as is\" and \"as available\" without warranties of any kind.\n\n3. User Accounts\n\n- You must provide accurate and complete registration information\n- You are responsible for maintaining the security of your account\n- You must notify us immediately of any unauthorized use\n- We reserve the right to suspend or terminate accounts that violate these Terms\n\n4. Payment Terms\n\n- Prices are listed in the currency displayed at the time of purchase\n- All payments are processed securely through Stripe\n- Subscriptions auto-renew unless cancelled before the renewal date\n- Refunds are handled on a case-by-case basis within 14 days of purchase\n\n5. Intellectual Property\n\n- The Service and its content are owned by {{COMPANY_NAME}}\n- You retain ownership of any data you input into the Service\n- You grant us a license to process your data as needed to provide the Service\n\n6. Limitation of Liability\n\n{{COMPANY_NAME}} shall not be liable for any indirect, incidental, special, or consequential damages resulting from your use of the Service.\n\n7. Governing Law\n\nThese Terms shall be governed by the laws of {{JURISDICTION}}, without regard to conflict of law provisions.\n\n8. Changes to Terms\n\nWe reserve the right to modify these Terms at any time. We will notify users of significant changes via email or through the Service.\n\n9. Contact\n\nQuestions about these Terms should be directed to:\nEmail: {{CONTACT_EMAIL}}\nAddress: {{COMPANY_ADDRESS}}");
    } catch {
      setContent("Last updated: {{EFFECTIVE_DATE}}\n\nPlease read these Terms of Service (\"Terms\") carefully before using {{WEBSITE_URL}} operated by {{COMPANY_NAME}}.\n\n1. Acceptance of Terms\n\nBy accessing or using our Service, you agree to be bound by these Terms. If you disagree with any part, you may not access the Service.\n\n2. Description of Service\n\n{{COMPANY_NAME}} provides {{SERVICE_DESCRIPTION}}. The Service is provided \"as is\" and \"as available\" without warranties of any kind.\n\n3. User Accounts\n\n- You must provide accurate and complete registration information\n- You are responsible for maintaining the security of your account\n- You must notify us immediately of any unauthorized use\n- We reserve the right to suspend or terminate accounts that violate these Terms\n\n4. Payment Terms\n\n- Prices are listed in the currency displayed at the time of purchase\n- All payments are processed securely through Stripe\n- Subscriptions auto-renew unless cancelled before the renewal date\n- Refunds are handled on a case-by-case basis within 14 days of purchase\n\n5. Intellectual Property\n\n- The Service and its content are owned by {{COMPANY_NAME}}\n- You retain ownership of any data you input into the Service\n- You grant us a license to process your data as needed to provide the Service\n\n6. Limitation of Liability\n\n{{COMPANY_NAME}} shall not be liable for any indirect, incidental, special, or consequential damages resulting from your use of the Service.\n\n7. Governing Law\n\nThese Terms shall be governed by the laws of {{JURISDICTION}}, without regard to conflict of law provisions.\n\n8. Changes to Terms\n\nWe reserve the right to modify these Terms at any time. We will notify users of significant changes via email or through the Service.\n\n9. Contact\n\nQuestions about these Terms should be directed to:\nEmail: {{CONTACT_EMAIL}}\nAddress: {{COMPANY_ADDRESS}}");
    }
  }, []);

  return (
    <div className="min-h-screen" style={{ background: '#0c0a1d' }}>
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link href="/" className="inline-flex items-center gap-2 text-sm mb-8 hover:opacity-80 transition-opacity" style={{ color: '#4b3d66' }}>
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
        <div className="flex items-center gap-3 mb-6">
          <FileText className="w-6 h-6" style={{ color: '#4b3d66' }} />
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Cabinet Grotesk', sans-serif", color: '#e4e4e4' }}>{t('legal.termsOfService')}</h1>
        </div>
        <div className="prose prose-sm max-w-none" style={{ color: '#e4e4e470' }}>
          {content.split('\n').map((line, i) => {
            const hasPlaceholder = /\{\{[A-Z_]+\}\}/.test(line);
            if (line.startsWith('# ')) return <h1 key={i} className="text-xl font-bold mt-8 mb-4" style={{ color: '#e4e4e4' }}>{line.replace('# ', '')}</h1>;
            if (line.startsWith('## ')) return <h2 key={i} className="text-lg font-semibold mt-6 mb-3" style={{ color: '#e4e4e4' }}>{line.replace('## ', '')}</h2>;
            if (line.startsWith('- ')) return <li key={i} className="ml-4 mb-1" style={{ color: hasPlaceholder ? '#ef4444' : '#e4e4e470' }}>{line.replace('- ', '')}</li>;
            if (line.match(/^\d+\./)) return <h3 key={i} className="text-base font-semibold mt-5 mb-2" style={{ color: '#e4e4e4' }}>{line}</h3>;
            if (!line.trim()) return <br key={i} />;
            return <p key={i} className="mb-2" style={{ color: hasPlaceholder ? '#ef4444' : '#e4e4e470' }}>{line}</p>;
          })}
        </div>
      </div>
    </div>
  );
}
