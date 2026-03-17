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
        background: '#0c0a1d',
        borderColor: isPro || highlighted ? '#4b3d66' : '#4b3d6640',
        ...(isPro || highlighted ? { boxShadow: '0 0 30px #4b3d6620' } : {}),
      }}
    >
      {(isPro || highlighted) && (
        <div
          className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold text-white"
          style={{ background: 'linear-gradient(135deg, #4b3d66, #6a5b8a)' }}
        >
          POPULAR
        </div>
      )}

      <h3 className="text-xl font-heading font-bold mb-2" style={{ color: '#e4e4e4' }}>
        {plan.name}
      </h3>

      <div className="mb-6">
        <span className="text-4xl font-bold" style={{ color: '#e4e4e4' }}>
          ${plan.price === 0 ? 'Free' : `$${plan.price}`}
        </span>
        {plan.price > 0 && (
          <span className="text-sm ml-1" style={{ color: '#e4e4e470' }}>/month</span>
        )}
      </div>

      <ul className="space-y-3 mb-8 flex-1">
        {plan.features.map((feature: string, i: number) => (
          <li key={i} className="flex items-start gap-2">
            <Check className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#4b3d66' }} />
            <span className="text-sm" style={{ color: '#e4e4e480' }}>{feature}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={onUpgrade}
        disabled={isCurrentPlan || loading}
        className="w-full py-3 rounded-xl font-semibold transition-all disabled:opacity-50"
        style={{
          background: isCurrentPlan ? '#4b3d6620' : '#4b3d66',
          color: isCurrentPlan ? '#e4e4e470' : 'white',
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
