'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@/hooks/useUser';
import { Spinner } from '@/components/LoadingStates';
import CostOptimizationSuggestions from '@/components/CostOptimizationSuggestions';
import ExportButtons from '@/components/ExportButtons';
import { TrendingUp, RefreshCw, Upload } from 'lucide-react';

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

interface OptimizationData {
  optimizations: CostOptimization[];
  totalPotentialSavings: number;
  count: number;
}

export default function OptimizationsPage() {
  const { user, loading: userLoading } = useUser();
  const [optimizationData, setOptimizationData] = useState<OptimizationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const fetchOptimizations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/cost-optimizations');
      if (!response.ok) {
        throw new Error('Failed to fetch optimizations');
      }
      
      const data = await response.json();
      setOptimizationData(data);
    } catch (err) {
      console.error('Error fetching optimizations:', err);
      setError('Failed to load cost optimizations');
    } finally {
      setLoading(false);
    }
  };

  const generateNewOptimizations = async () => {
    try {
      setGenerating(true);
      setError(null);

      // Sample supply chain data for demonstration
      const sampleData = {
        inventory: {
          totalValue: 2500000,
          turnoverRate: 4.2,
          categories: [
            { name: 'Raw Materials', value: 800000, turnover: 6.1 },
            { name: 'Work in Progress', value: 400000, turnover: 2.8 },
            { name: 'Finished Goods', value: 1300000, turnover: 4.5 }
          ]
        },
        transportation: {
          totalCost: 450000,
          routes: [
            { origin: 'Warehouse A', destination: 'Distribution Center 1', cost: 85000, frequency: 52 },
            { origin: 'Warehouse B', destination: 'Distribution Center 2', cost: 92000, frequency: 48 },
            { origin: 'Supplier 1', destination: 'Warehouse A', cost: 65000, frequency: 24 }
          ]
        },
        procurement: {
          totalSpend: 3200000,
          suppliers: [
            { name: 'Supplier A', spend: 850000, leadTime: 14, quality: 92 },
            { name: 'Supplier B', spend: 620000, leadTime: 21, quality: 78 },
            { name: 'Supplier C', spend: 480000, leadTime: 10, quality: 95 }
          ]
        },
        operations: {
          totalCost: 1800000,
          facilities: [
            { name: 'Manufacturing Plant 1', cost: 950000, utilization: 68, efficiency: 82 },
            { name: 'Distribution Center 1', cost: 520000, utilization: 85, efficiency: 91 },
            { name: 'Warehouse Complex', cost: 330000, utilization: 45, efficiency: 76 }
          ]
        }
      };

      const response = await fetch('/api/cost-optimizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ supplyChainData: sampleData }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate optimizations');
      }

      const data = await response.json();
      setOptimizationData(data);
    } catch (err) {
      console.error('Error generating optimizations:', err);
      setError('Failed to generate new optimizations');
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchOptimizations();
    }
  }, [user]);

  if (userLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <div className="text-[#6a5b8a] mb-2">Please log in to view optimizations</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#e4e4e4] font-[family-name:var(--font-cabinet)]">
            Cost Optimization Suggestions
          </h1>
          <p className="text-[#6a5b8a] mt-1">
            AI-powered recommendations to optimize your supply chain costs
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {optimizationData && (
            <ExportButtons
              title="Cost Optimization Report"
              data={optimizationData}
              filename="cost-optimizations"
            />
          )}
          
          <button
            onClick={generateNewOptimizations}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 bg-[#ff5c00] text-white rounded-lg hover:bg-[#ff5c00]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? (
              <>
                <Spinner size="sm" />
                Generating...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Generate New
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <div className="text-red-400 font-medium">Error</div>
          <div className="text-red-300 text-sm mt-1">{error}</div>
          <button
            onClick={fetchOptimizations}
            className="mt-3 text-sm text-red-400 hover:text-red-300 underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Empty State */}
      {!error && optimizationData && optimizationData.optimizations.length === 0 && (
        <div className="text-center py-12 bg-[#1a1625] border border-[#4b3d66]/20 rounded-lg">
          <div className="p-3 bg-[#ff5c00]/10 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <TrendingUp className="w-8 h-8 text-[#ff5c00]" />
          </div>
          <h3 className="text-lg font-semibold text-[#e4e4e4] mb-2 font-[family-name:var(--font-cabinet)]">
            No Optimizations Available
          </h3>
          <p className="text-[#6a5b8a] mb-6 max-w-md mx-auto">
            Upload your supply chain data to get AI-powered cost optimization suggestions.
          </p>
          <button
            onClick={generateNewOptimizations}
            disabled={generating}
            className="flex items-center gap-2 px-6 py-3 bg-[#ff5c00] text-white rounded-lg hover:bg-[#ff5c00]/80 transition-colors mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? (
              <>
                <Spinner size="sm" />
                Analyzing Data...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                Generate Optimizations
              </>
            )}
          </button>
        </div>
      )}

      {/* Optimizations Display */}
      {optimizationData && optimizationData.optimizations.length > 0 && (
        <CostOptimizationSuggestions
          optimizations={optimizationData.optimizations}
          totalPotentialSavings={optimizationData.totalPotentialSavings}
        />
      )}
    </div>
  );
}