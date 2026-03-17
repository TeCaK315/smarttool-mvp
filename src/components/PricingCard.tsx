'use client';

import { Check, Loader2 } from 'lucide-react';

interface PricingPlan {
  name: string;
  price: number;
  features: string[];
}

interface PricingCardProps {
  plan: PricingPlan;
  isCurrentPlan: boolean;
  onUpgrade: () => void;
  loading?: boolean;
  highlighted?: boolean;
}

export default function PricingCard({ plan, isCurrentPlan, onUpgrade, loading, highlighted }: PricingCardProps) {
  const isPro = plan.name.toLowerCase() === 'pro';

  return (
    <div
      className={`relative rounded-2xl border p-6 flex flex-col transition-all hover:scale-[1.02] ${
        isPro || highlighted ? 'ring-2' : ''
      }`}
      style={{
        background: '#1a202c',
        borderColor: isPro || highlighted ? '#5a67d8' : '#5a67d840',
        ...(isPro || highlighted ? { boxShadow: '0 0 30px #5a67d820' } : {}),
      }}
    >
      {(isPro || highlighted) && (
        <div
          className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold text-white"
          style={{ background: 'linear-gradient(135deg, #5a67d8, #4a5568)' }}
        >
          POPULAR
        </div>
      )}

      <h3 className="text-xl font-heading font-bold mb-2" style={{ color: '#edf2f7' }}>
        {plan.name}
      </h3>

      <div className="mb-6">
        <span className="text-4xl font-bold" style={{ color: '#edf2f7' }}>
          ${plan.price === 0 ? 'Free' : `$${plan.price}`}
        </span>
        {plan.price > 0 && (
          <span className="text-sm ml-1" style={{ color: '#edf2f770' }}>/month</span>
        )}
      </div>

      <ul className="space-y-3 mb-8 flex-1">
        {plan.features.map((feature: string, i: number) => (
          <li key={i} className="flex items-start gap-2">
            <Check className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#5a67d8' }} />
            <span className="text-sm" style={{ color: '#edf2f780' }}>{feature}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={onUpgrade}
        disabled={isCurrentPlan || loading}
        className="w-full py-3 rounded-xl font-semibold transition-all disabled:opacity-50"
        style={{
          background: isCurrentPlan ? '#5a67d820' : '#5a67d8',
          color: isCurrentPlan ? '#edf2f770' : 'white',
        }}
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin mx-auto" />
        ) : isCurrentPlan ? (
          'Current Plan'
        ) : plan.price === 0 ? (
          'Downgrade'
        ) : (
          'Upgrade'
        )}
      </button>
    </div>
  );
}
