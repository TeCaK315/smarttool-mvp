import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _sb: SupabaseClient | null = null;
function getSupabase() {
  if (!_sb) {
    _sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _sb;
}

interface SupplyChainData {
  inventory?: {
    totalValue: number;
    turnoverRate: number;
    categories: Array<{
      name: string;
      value: number;
      turnover: number;
    }>;
  };
  transportation?: {
    totalCost: number;
    routes: Array<{
      origin: string;
      destination: string;
      cost: number;
      frequency: number;
    }>;
  };
  procurement?: {
    totalSpend: number;
    suppliers: Array<{
      name: string;
      spend: number;
      leadTime: number;
      quality: number;
    }>;
  };
  operations?: {
    totalCost: number;
    facilities: Array<{
      name: string;
      cost: number;
      utilization: number;
      efficiency: number;
    }>;
  };
}

interface CostOptimization {
  id: string;
  category: 'inventory' | 'transportation' | 'procurement' | 'operations';
  title: string;
  description: string;
  potentialSavings: number;
  implementationCost: number;
  timeToImplement: string;
  priority: 'high' | 'medium' | 'low';
  impact: 'high' | 'medium' | 'low';
  difficulty: 'easy' | 'moderate' | 'complex';
  details: {
    currentState: string;
    proposedSolution: string;
    steps: string[];
    risks: string[];
    kpis: string[];
  };
}

export async function generateCostOptimizations(
  userId: string,
  supplyChainData: SupplyChainData
): Promise<CostOptimization[]> {
  const optimizations: CostOptimization[] = [];

  // Analyze inventory optimizations
  if (supplyChainData.inventory) {
    const inventoryOpts = analyzeInventoryOptimizations(supplyChainData.inventory);
    optimizations.push(...inventoryOpts);
  }

  // Analyze transportation optimizations
  if (supplyChainData.transportation) {
    const transportOpts = analyzeTransportationOptimizations(supplyChainData.transportation);
    optimizations.push(...transportOpts);
  }

  // Analyze procurement optimizations
  if (supplyChainData.procurement) {
    const procurementOpts = analyzeProcurementOptimizations(supplyChainData.procurement);
    optimizations.push(...procurementOpts);
  }

  // Analyze operations optimizations
  if (supplyChainData.operations) {
    const operationsOpts = analyzeOperationsOptimizations(supplyChainData.operations);
    optimizations.push(...operationsOpts);
  }

  // Store optimizations in database
  await storeCostOptimizations(userId, optimizations);

  return optimizations.sort((a, b) => {
    // Sort by priority (high first), then by potential savings
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    }
    return b.potentialSavings - a.potentialSavings;
  });
}

function analyzeInventoryOptimizations(inventory: NonNullable<SupplyChainData['inventory']>): CostOptimization[] {
  const optimizations: CostOptimization[] = [];

  // Check for slow-moving inventory
  const slowMovingCategories = inventory.categories.filter(cat => cat.turnover < 4);
  if (slowMovingCategories.length > 0) {
    const totalSlowMovingValue = slowMovingCategories.reduce((sum, cat) => sum + cat.value, 0);
    const potentialSavings = totalSlowMovingValue * 0.15; // 15% reduction potential

    optimizations.push({
      id: crypto.randomUUID(),
      category: 'inventory',
      title: 'Optimize Slow-Moving Inventory',
      description: 'Reduce carrying costs by optimizing slow-moving inventory categories',
      potentialSavings,
      implementationCost: potentialSavings * 0.1,
      timeToImplement: '2-3 months',
      priority: 'high',
      impact: 'high',
      difficulty: 'moderate',
      details: {
        currentState: `${slowMovingCategories.length} inventory categories have turnover rates below 4x annually, representing $${totalSlowMovingValue.toLocaleString()} in tied-up capital.`,
        proposedSolution: 'Implement demand forecasting improvements, liquidation strategies, and supplier collaboration to reduce slow-moving stock.',
        steps: [
          'Analyze demand patterns for slow-moving categories',
          'Implement improved forecasting models',
          'Negotiate supplier return agreements',
          'Create liquidation channels for excess inventory',
          'Establish monitoring dashboards'
        ],
        risks: [
          'Potential stockouts during transition',
          'Supplier relationship impacts',
          'Customer service disruptions'
        ],
        kpis: [
          'Inventory turnover rate improvement',
          'Carrying cost reduction',
          'Cash flow improvement',
          'Stockout frequency'
        ]
      }
    });
  }

  // Check for high inventory value
  if (inventory.totalValue > 1000000 && inventory.turnoverRate < 6) {
    const potentialSavings = inventory.totalValue * 0.08; // 8% reduction potential

    optimizations.push({
      id: crypto.randomUUID(),
      category: 'inventory',
      title: 'Implement Just-in-Time Inventory',
      description: 'Reduce inventory holding costs through JIT implementation',
      potentialSavings,
      implementationCost: 50000,
      timeToImplement: '4-6 months',
      priority: 'medium',
      impact: 'high',
      difficulty: 'complex',
      details: {
        currentState: `Current inventory value of $${inventory.totalValue.toLocaleString()} with ${inventory.turnoverRate}x annual turnover indicates opportunity for optimization.`,
        proposedSolution: 'Implement Just-in-Time inventory management with supplier integration and demand-driven replenishment.',
        steps: [
          'Map current inventory flows',
          'Identify JIT implementation candidates',
          'Develop supplier partnerships',
          'Implement demand sensing technology',
          'Gradual rollout with monitoring'
        ],
        risks: [
          'Supply chain disruption vulnerability',
          'Supplier reliability dependency',
          'Initial implementation complexity'
        ],
        kpis: [
          'Days of inventory outstanding',
          'Inventory carrying costs',
          'Supplier delivery performance',
          'Customer fill rates'
        ]
      }
    });
  }

  return optimizations;
}

function analyzeTransportationOptimizations(transportation: NonNullable<SupplyChainData['transportation']>): CostOptimization[] {
  const optimizations: CostOptimization[] = [];

  // Analyze route efficiency
  const highCostRoutes = transportation.routes.filter(route => route.cost > transportation.totalCost * 0.1);
  if (highCostRoutes.length > 0) {
    const routeOptimizationSavings = transportation.totalCost * 0.12; // 12% potential savings

    optimizations.push({
      id: crypto.randomUUID(),
      category: 'transportation',
      title: 'Optimize Transportation Routes',
      description: 'Reduce transportation costs through route optimization and consolidation',
      potentialSavings: routeOptimizationSavings,
      implementationCost: 25000,
      timeToImplement: '1-2 months',
      priority: 'high',
      impact: 'medium',
      difficulty: 'easy',
      details: {
        currentState: `${highCostRoutes.length} high-cost routes account for significant portion of $${transportation.totalCost.toLocaleString()} annual transportation spend.`,
        proposedSolution: 'Implement route optimization software and consolidate shipments to reduce per-unit transportation costs.',
        steps: [
          'Analyze current route performance',
          'Implement route optimization software',
          'Consolidate shipments where possible',
          'Negotiate better carrier rates',
          'Monitor and adjust routes regularly'
        ],
        risks: [
          'Service level impacts',
          'Carrier relationship changes',
          'Technology implementation challenges'
        ],
        kpis: [
          'Cost per mile/kilometer',
          'On-time delivery performance',
          'Load utilization rates',
          'Fuel efficiency metrics'
        ]
      }
    });
  }

  // Check for consolidation opportunities
  if (transportation.routes.length > 10) {
    const consolidationSavings = transportation.totalCost * 0.08; // 8% potential savings

    optimizations.push({
      id: crypto.randomUUID(),
      category: 'transportation',
      title: 'Consolidate Shipping Networks',
      description: 'Reduce costs through strategic network consolidation',
      potentialSavings: consolidationSavings,
      implementationCost: 15000,
      timeToImplement: '2-3 months',
      priority: 'medium',
      impact: 'medium',
      difficulty: 'moderate',
      details: {
        currentState: `Current network has ${transportation.routes.length} routes with potential consolidation opportunities.`,
        proposedSolution: 'Consolidate shipping networks to reduce complexity and achieve economies of scale.',
        steps: [
          'Map current shipping network',
          'Identify consolidation opportunities',
          'Redesign network architecture',
          'Implement consolidated routing',
          'Monitor performance metrics'
        ],
        risks: [
          'Service disruption during transition',
          'Increased complexity in some areas',
          'Customer communication needs'
        ],
        kpis: [
          'Network complexity reduction',
          'Average shipment size',
          'Transportation cost per unit',
          'Delivery performance'
        ]
      }
    });
  }

  return optimizations;
}

function analyzeProcurementOptimizations(procurement: NonNullable<SupplyChainData['procurement']>): CostOptimization[] {
  const optimizations: CostOptimization[] = [];

  // Analyze supplier consolidation opportunities
  if (procurement.suppliers.length > 20) {
    const consolidationSavings = procurement.totalSpend * 0.06; // 6% potential savings

    optimizations.push({
      id: crypto.randomUUID(),
      category: 'procurement',
      title: 'Consolidate Supplier Base',
      description: 'Reduce procurement costs through strategic supplier consolidation',
      potentialSavings: consolidationSavings,
      implementationCost: 30000,
      timeToImplement: '3-4 months',
      priority: 'medium',
      impact: 'medium',
      difficulty: 'moderate',
      details: {
        currentState: `Current supplier base of ${procurement.suppliers.length} suppliers with total spend of $${procurement.totalSpend.toLocaleString()} presents consolidation opportunities.`,
        proposedSolution: 'Consolidate supplier base to achieve better pricing, improved relationships, and reduced administrative costs.',
        steps: [
          'Analyze current supplier performance',
          'Identify consolidation candidates',
          'Negotiate volume-based pricing',
          'Implement preferred supplier programs',
          'Monitor supplier performance'
        ],
        risks: [
          'Supplier dependency risks',
          'Quality consistency challenges',
          'Negotiation complexity'
        ],
        kpis: [
          'Supplier count reduction',
          'Average spend per supplier',
          'Cost savings achieved',
          'Supplier performance scores'
        ]
      }
    });
  }

  // Check for high-cost, low-quality suppliers
  const underperformingSuppliers = procurement.suppliers.filter(
    supplier => supplier.quality < 85 && supplier.spend > procurement.totalSpend * 0.05
  );
  
  if (underperformingSuppliers.length > 0) {
    const qualityImprovementSavings = underperformingSuppliers.reduce((sum, s) => sum + s.spend, 0) * 0.15;

    optimizations.push({
      id: crypto.randomUUID(),
      category: 'procurement',
      title: 'Improve Supplier Quality Performance',
      description: 'Reduce costs associated with poor quality suppliers',
      potentialSavings: qualityImprovementSavings,
      implementationCost: 20000,
      timeToImplement: '2-3 months',
      priority: 'high',
      impact: 'high',
      difficulty: 'moderate',
      details: {
        currentState: `${underperformingSuppliers.length} suppliers with quality scores below 85% account for significant quality-related costs.`,
        proposedSolution: 'Implement supplier development programs or replace underperforming suppliers with higher-quality alternatives.',
        steps: [
          'Assess supplier quality performance',
          'Develop improvement plans',
          'Implement supplier audits',
          'Source alternative suppliers',
          'Monitor quality metrics'
        ],
        risks: [
          'Supply disruption during transition',
          'Supplier relationship impacts',
          'Quality validation time'
        ],
        kpis: [
          'Supplier quality scores',
          'Defect rates',
          'Cost of quality',
          'Supplier development success'
        ]
      }
    });
  }

  return optimizations;
}

function analyzeOperationsOptimizations(operations: NonNullable<SupplyChainData['operations']>): CostOptimization[] {
  const optimizations: CostOptimization[] = [];

  // Check for underutilized facilities
  const underutilizedFacilities = operations.facilities.filter(facility => facility.utilization < 70);
  if (underutilizedFacilities.length > 0) {
    const utilizationSavings = underutilizedFacilities.reduce((sum, f) => sum + f.cost, 0) * 0.2;

    optimizations.push({
      id: crypto.randomUUID(),
      category: 'operations',
      title: 'Optimize Facility Utilization',
      description: 'Reduce operational costs through improved facility utilization',
      potentialSavings: utilizationSavings,
      implementationCost: 40000,
      timeToImplement: '3-6 months',
      priority: 'high',
      impact: 'high',
      difficulty: 'complex',
      details: {
        currentState: `${underutilizedFacilities.length} facilities operating below 70% utilization, representing underutilized capacity.`,
        proposedSolution: 'Consolidate operations, improve capacity planning, or find alternative uses for underutilized facilities.',
        steps: [
          'Analyze facility utilization patterns',
          'Identify consolidation opportunities',
          'Develop capacity optimization plans',
          'Implement operational changes',
          'Monitor utilization improvements'
        ],
        risks: [
          'Operational disruption',
          'Employee impact',
          'Customer service effects'
        ],
        kpis: [
          'Facility utilization rates',
          'Cost per unit processed',
          'Operational efficiency',
          'Customer satisfaction'
        ]
      }
    });
  }

  // Check for efficiency improvements
  const inefficientFacilities = operations.facilities.filter(facility => facility.efficiency < 80);
  if (inefficientFacilities.length > 0) {
    const efficiencySavings = inefficientFacilities.reduce((sum, f) => sum + f.cost, 0) * 0.12;

    optimizations.push({
      id: crypto.randomUUID(),
      category: 'operations',
      title: 'Improve Operational Efficiency',
      description: 'Reduce costs through process improvements and automation',
      potentialSavings: efficiencySavings,
      implementationCost: 60000,
      timeToImplement: '4-8 months',
      priority: 'medium',
      impact: 'high',
      difficulty: 'complex',
      details: {
        currentState: `${inefficientFacilities.length} facilities operating below 80% efficiency present improvement opportunities.`,
        proposedSolution: 'Implement process improvements, automation, and lean manufacturing principles to increase operational efficiency.',
        steps: [
          'Conduct efficiency assessments',
          'Identify improvement opportunities',
          'Implement process changes',
          'Deploy automation where appropriate',
          'Monitor efficiency gains'
        ],
        risks: [
          'Implementation complexity',
          'Technology integration challenges',
          'Change management requirements'
        ],
        kpis: [
          'Operational efficiency rates',
          'Process cycle times',
          'Labor productivity',
          'Quality metrics'
        ]
      }
    });
  }

  return optimizations;
}

async function storeCostOptimizations(userId: string, optimizations: CostOptimization[]): Promise<void> {
  const supabase = getSupabase();
  
  try {
    // Store optimizations in the database
    const { error } = await supabase
      .from('cost_optimizations')
      .upsert(
        optimizations.map(opt => ({
          id: opt.id,
          user_id: userId,
          category: opt.category,
          title: opt.title,
          description: opt.description,
          potential_savings: opt.potentialSavings,
          implementation_cost: opt.implementationCost,
          time_to_implement: opt.timeToImplement,
          priority: opt.priority,
          impact: opt.impact,
          difficulty: opt.difficulty,
          details: opt.details,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }))
      );

    if (error) {
      console.error('Error storing cost optimizations:', error);
      throw error;
    }
  } catch (error) {
    console.error('Failed to store cost optimizations:', error);
    // Don't throw here to avoid breaking the main flow
  }
}

export async function getCostOptimizations(userId: string): Promise<CostOptimization[]> {
  const supabase = getSupabase();
  
  try {
    const { data, error } = await supabase
      .from('cost_optimizations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching cost optimizations:', error);
      return [];
    }

    return (data || []).map(row => ({
      id: row.id,
      category: row.category,
      title: row.title,
      description: row.description,
      potentialSavings: row.potential_savings,
      implementationCost: row.implementation_cost,
      timeToImplement: row.time_to_implement,
      priority: row.priority,
      impact: row.impact,
      difficulty: row.difficulty,
      details: row.details
    }));
  } catch (error) {
    console.error('Failed to fetch cost optimizations:', error);
    return [];
  }
}