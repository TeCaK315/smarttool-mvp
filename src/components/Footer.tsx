'use client';

import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { useT } from '@/lib/i18n';

export default function Footer() {
  const t = useT();

  return (
    <footer
      className="border-t py-8"
      style={{
        background: '#1a202c',
        borderColor: '#5a67d810',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #5a67d8, #4a5568)' }}
            >
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span
              className="text-sm font-heading font-semibold"
              style={{ color: '#edf2f7' }}
            >
              SmartTool MVP
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="text-xs transition-opacity hover:opacity-70" style={{ color: '#edf2f750' }}>{t('legal.privacyPolicy')}</Link>
            <Link href="/terms" className="text-xs transition-opacity hover:opacity-70" style={{ color: '#edf2f750' }}>{t('legal.termsOfService')}</Link>
            <Link href="/about" className="text-xs transition-opacity hover:opacity-70" style={{ color: '#edf2f750' }}>{t('legal.aboutUs')}</Link>
            <Link href="/faq" className="text-xs transition-opacity hover:opacity-70" style={{ color: '#edf2f750' }}>{t('legal.faq')}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
