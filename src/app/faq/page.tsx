'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, HelpCircle, ChevronDown } from 'lucide-react';

const LEGAL_KEY = 'SmartTool MVP_legal_pages';

export default function FAQPage() {
  const [content, setContent] = useState('');
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(LEGAL_KEY) || '{}');
      setContent(stored.faq || "## Frequently Asked Questions\n\n### How do I get started?\nSign up for a free account, fill in your business details in Settings, and create your first document. It takes less than 2 minutes.\n\n### Is my data secure?\nYes. We use industry-standard encryption and secure infrastructure. Your payment data is processed by Stripe and never touches our servers.\n\n### Can I customize the look of my documents?\nYes. You can upload your logo, set your brand colors, and customize the default notes and payment instructions in Settings.\n\n### How do I export my data?\nGo to Reports and click \"Export CSV\" to download all your data in spreadsheet format. You can also download individual documents as PDF.\n\n### What payment methods are supported?\nWe accept all major credit cards through Stripe. Your clients can pay via the payment link included in each document.\n\n### Can I cancel my subscription?\nYes, you can cancel anytime from the Billing page. Your data will remain accessible until the end of your billing period.\n\n### How do I contact support?\nEmail us at {{CONTACT_EMAIL}} and we'll respond within 24 hours.\n\n### Do you offer refunds?\nYes, we offer full refunds within 14 days of purchase if you're not satisfied.");
    } catch {
      setContent("## Frequently Asked Questions\n\n### How do I get started?\nSign up for a free account, fill in your business details in Settings, and create your first document. It takes less than 2 minutes.\n\n### Is my data secure?\nYes. We use industry-standard encryption and secure infrastructure. Your payment data is processed by Stripe and never touches our servers.\n\n### Can I customize the look of my documents?\nYes. You can upload your logo, set your brand colors, and customize the default notes and payment instructions in Settings.\n\n### How do I export my data?\nGo to Reports and click \"Export CSV\" to download all your data in spreadsheet format. You can also download individual documents as PDF.\n\n### What payment methods are supported?\nWe accept all major credit cards through Stripe. Your clients can pay via the payment link included in each document.\n\n### Can I cancel my subscription?\nYes, you can cancel anytime from the Billing page. Your data will remain accessible until the end of your billing period.\n\n### How do I contact support?\nEmail us at {{CONTACT_EMAIL}} and we'll respond within 24 hours.\n\n### Do you offer refunds?\nYes, we offer full refunds within 14 days of purchase if you're not satisfied.");
    }
  }, []);

  // Parse FAQ into Q&A pairs
  const faqItems = content.split('###').filter(s => s.trim()).map(block => {
    const lines = block.trim().split('\n');
    const question = lines[0]?.trim() || '';
    const answer = lines.slice(1).join('\n').trim();
    return { question, answer };
  });

  return (
    <div className="min-h-screen" style={{ background: '#1a202c' }}>
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link href="/" className="inline-flex items-center gap-2 text-sm mb-8 hover:opacity-80 transition-opacity" style={{ color: '#5a67d8' }}>
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
        <div className="flex items-center gap-3 mb-6">
          <HelpCircle className="w-6 h-6" style={{ color: '#5a67d8' }} />
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Montserrat', sans-serif", color: '#edf2f7' }}>FAQ</h1>
        </div>
        <div className="space-y-2">
          {faqItems.map((item, i) => (
            <div key={i} className="rounded-xl border overflow-hidden"
              style={{ borderColor: openIndex === i ? '#5a67d820' : '#5a67d808' }}>
              <button onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between p-4 text-left transition-colors hover:bg-white/[0.02]">
                <span className="text-sm font-medium pr-4" style={{ color: '#edf2f7' }}>{item.question}</span>
                <ChevronDown className="w-4 h-4 flex-shrink-0 transition-transform"
                  style={{ color: '#edf2f750', transform: openIndex === i ? 'rotate(180deg)' : 'rotate(0deg)' }} />
              </button>
              {openIndex === i && (
                <div className="px-4 pb-4">
                  {item.answer.split('\n').map((line, j) => {
                    const hasPlaceholder = /\{\{[A-Z_]+\}\}/.test(line);
                    if (!line.trim()) return <br key={j} />;
                    return <p key={j} className="text-sm mb-1" style={{ color: hasPlaceholder ? '#ef4444' : '#edf2f770' }}>{line}</p>;
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
