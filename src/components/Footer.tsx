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
        background: '#0c0a1d',
        borderColor: '#4b3d6610',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #4b3d66, #6a5b8a)' }}
            >
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span
              className="text-sm font-heading font-semibold"
              style={{ color: '#e4e4e4' }}
            >
              SmartTool MVP
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="text-xs transition-opacity hover:opacity-70" style={{ color: '#e4e4e450' }}>{t('legal.privacyPolicy')}</Link>
            <Link href="/terms" className="text-xs transition-opacity hover:opacity-70" style={{ color: '#e4e4e450' }}>{t('legal.termsOfService')}</Link>
            <Link href="/about" className="text-xs transition-opacity hover:opacity-70" style={{ color: '#e4e4e450' }}>{t('legal.aboutUs')}</Link>
            <Link href="/faq" className="text-xs transition-opacity hover:opacity-70" style={{ color: '#e4e4e450' }}>{t('legal.faq')}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
