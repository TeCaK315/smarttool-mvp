import Stripe from 'stripe';

let _stripe: Stripe | null = null;

/**
 * Get Stripe server instance.
 * Reads key from:
 * 1. process.env.STRIPE_SECRET_KEY (from .env)
 * 2. If not found, throws — owner must configure via Settings or .env
 */
export function getStripeServer(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error('Missing STRIPE_SECRET_KEY — configure in Settings > Payment or .env');
    }
    _stripe = new Stripe(key, { typescript: true });
  }
  return _stripe;
}

/**
 * Get Stripe server using a key from DB (for dynamic configuration).
 * Called by admin settings API after owner saves keys.
 */
export async function getStripeWithKey(secretKey: string): Promise<Stripe> {
  return new Stripe(secretKey, { typescript: true });
}

/** Try to get Stripe, returns null if not configured */
export function getStripeOptional(): Stripe | null {
  try {
    return getStripeServer();
  } catch {
    return null;
  }
}

/** @deprecated Use getStripeServer() instead */
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return (getStripeServer() as any)[prop];
  },
});

export const PLANS = [
  {
    "name": "Pro",
    "price": 9.99,
    "features": [
      "Безлимитные счета",
      "Интеграция с платежными системами"
    ],
    "limits": {}
  }
] as const;

export type PlanName = (typeof PLANS)[number]['name'];

export function getPlanByName(name: string) {
  return PLANS.find((p) => p.name.toLowerCase() === name.toLowerCase());
}

export function getPlanLimit(planName: string, limitKey: string): number {
  const plan = getPlanByName(planName);
  if (!plan) return 0;
  const limit = plan.limits[limitKey as keyof typeof plan.limits];
  return typeof limit === 'number' ? limit : 0;
}
