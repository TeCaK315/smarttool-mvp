import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateCostOptimizations, getCostOptimizations } from '@/lib/cost-optimization';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const optimizations = await getCostOptimizations(user.id);
    
    const totalPotentialSavings = optimizations.reduce(
      (sum, opt) => sum + opt.potentialSavings, 
      0
    );

    return NextResponse.json({
      optimizations,
      totalPotentialSavings,
      count: optimizations.length
    });
  } catch (error) {
    console.error('Error fetching cost optimizations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cost optimizations' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { supplyChainData } = body;

    if (!supplyChainData) {
      return NextResponse.json(
        { error: 'Supply chain data is required' },
        { status: 400 }
      );
    }

    // Generate cost optimizations based on supply chain data
    const optimizations = await generateCostOptimizations(user.id, supplyChainData);
    
    const totalPotentialSavings = optimizations.reduce(
      (sum, opt) => sum + opt.potentialSavings, 
      0
    );

    return NextResponse.json({
      optimizations,
      totalPotentialSavings,
      count: optimizations.length,
      message: 'Cost optimizations generated successfully'
    });
  } catch (error) {
    console.error('Error generating cost optimizations:', error);
    return NextResponse.json(
      { error: 'Failed to generate cost optimizations' },
      { status: 500 }
    );
  }
}