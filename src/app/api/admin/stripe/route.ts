import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Admin API for Stripe configuration.
 * Only the first registered user (admin/owner) can access.
 *
 * GET — check if Stripe is configured (returns masked key)
 * POST — save Stripe keys to app_settings table
 * DELETE — remove Stripe keys
 */

async function isAdmin(supabase: any): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  // Check if user is the first registered (admin)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id')
    .order('created_at', { ascending: true })
    .limit(1);

  return profiles?.[0]?.id === user.id;
}

export async function GET() {
  try {
    const supabase = await createClient();

    if (!(await isAdmin(supabase))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check .env first
    const envKey = process.env.STRIPE_SECRET_KEY;
    const envPubKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

    if (envKey) {
      return NextResponse.json({
        configured: true,
        source: 'env',
        publishable_key_masked: envPubKey ? envPubKey.slice(0, 7) + '...' + envPubKey.slice(-4) : '',
        secret_key_masked: 'sk_....' + envKey.slice(-4),
      });
    }

    // Check DB
    const { data: settings } = await supabase
      .from('app_settings')
      .select('key, value')
      .in('key', ['stripe_publishable_key', 'stripe_secret_key']);

    const dbKeys: Record<string, string> = {};
    for (const s of settings || []) {
      dbKeys[s.key] = s.value;
    }

    if (dbKeys.stripe_secret_key) {
      return NextResponse.json({
        configured: true,
        source: 'database',
        publishable_key_masked: dbKeys.stripe_publishable_key
          ? dbKeys.stripe_publishable_key.slice(0, 7) + '...' + dbKeys.stripe_publishable_key.slice(-4)
          : '',
        secret_key_masked: 'sk_....' + dbKeys.stripe_secret_key.slice(-4),
      });
    }

    return NextResponse.json({ configured: false });
  } catch (error: any) {
    return NextResponse.json({ configured: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    if (!(await isAdmin(supabase))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { publishable_key, secret_key } = await req.json();

    if (!secret_key || !secret_key.startsWith('sk_')) {
      return NextResponse.json(
        { error: 'Invalid secret key. Must start with sk_' },
        { status: 400 }
      );
    }

    if (publishable_key && !publishable_key.startsWith('pk_')) {
      return NextResponse.json(
        { error: 'Invalid publishable key. Must start with pk_' },
        { status: 400 }
      );
    }

    // Test the connection
    try {
      const Stripe = (await import('stripe')).default;
      const testStripe = new Stripe(secret_key, { typescript: true });
      await testStripe.balance.retrieve();
    } catch (stripeErr: any) {
      return NextResponse.json(
        { error: 'Invalid Stripe key: ' + (stripeErr.message || 'connection failed') },
        { status: 400 }
      );
    }

    // Save to app_settings (upsert)
    const keys = [
      { key: 'stripe_secret_key', value: secret_key },
      { key: 'stripe_publishable_key', value: publishable_key || '' },
    ];

    for (const item of keys) {
      const { error } = await supabase
        .from('app_settings')
        .upsert(
          { key: item.key, value: item.value, updated_at: new Date().toISOString() },
          { onConflict: 'key' }
        );
      if (error) {
        console.error('Failed to save setting:', item.key, error);
        return NextResponse.json({ error: 'Failed to save: ' + error.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      publishable_key_masked: publishable_key
        ? publishable_key.slice(0, 7) + '...' + publishable_key.slice(-4)
        : '',
      secret_key_masked: 'sk_....' + secret_key.slice(-4),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to save keys' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const supabase = await createClient();

    if (!(await isAdmin(supabase))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await supabase
      .from('app_settings')
      .delete()
      .in('key', ['stripe_secret_key', 'stripe_publishable_key']);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
