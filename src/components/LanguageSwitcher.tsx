'use client';

import { useState, useRef, useEffect } from 'react';
import { Globe, Check } from 'lucide-react';
import { useLocale, LOCALE_OPTIONS } from '@/lib/i18n';

export default function LanguageSwitcher({ compact }: { compact?: boolean } = {}) {
  const { locale, setLocale } = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const current = LOCALE_OPTIONS.find(l => l.code === locale) || LOCALE_OPTIONS[0];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm transition-all hover:bg-white/[0.06]"
        style={{ color: '#edf2f770' }}
        title="Language"
      >
        <Globe className="w-4 h-4" />
        {!compact && <span className="hidden sm:inline">{current.flag} {current.name}</span>}
        {compact && <span>{current.flag}</span>}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 w-40 rounded-xl border shadow-lg z-50 py-1 overflow-hidden"
          style={{ background: '#1a202c', borderColor: '#5a67d820', boxShadow: '0 4px 12px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.2)' }}
        >
          {LOCALE_OPTIONS.map(opt => (
            <button
              key={opt.code}
              onClick={() => { setLocale(opt.code); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-all hover:bg-white/[0.04]"
              style={{
                color: opt.code === locale ? '#5a67d8' : '#edf2f7',
                background: opt.code === locale ? '#5a67d808' : 'transparent',
              }}
            >
              <span>{opt.flag}</span>
              <span className="flex-1">{opt.name}</span>
              {opt.code === locale && <Check className="w-3.5 h-3.5" style={{ color: '#5a67d8' }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
