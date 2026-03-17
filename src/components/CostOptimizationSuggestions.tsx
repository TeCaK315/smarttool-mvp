'use client';

import React, { useState } from 'react';
import { TrendingDown, DollarSign, Package, Truck, Clock, ChevronDown, ChevronUp, AlertCircle, CheckCircle } from 'lucide-react';

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

interface CostOptimizationSuggestionsProps {
  optimizations: CostOptimization[];
  totalPotentialSavings: number;
  className?: string;
}

const categoryIcons = {
  inventory: Package,
  transportation: Truck,
  procurement: DollarSign,
  operations: Clock,
};

const categoryColors = {
  inventory: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  transportation: 'bg-green-500/10 text-green-400 border-green-500/20',
  procurement: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  operations: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
};

const priorityColors = {
  high: 'bg-red-500/10 text-red-400 border-red-500/20',
  medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  low: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
};

const impactColors = {
  high: 'text-green-400',
  medium: 'text-yellow-400',
  low: 'text-gray-400',
};

const difficultyColors = {
  easy: 'text-green-400',
  moderate: 'text-yellow-400',
  complex: 'text-red-400',
};

export default function CostOptimizationSuggestions({ 
  optimizations, 
  totalPotentialSavings,
  className = '' 
}: CostOptimizationSuggestionsProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const filteredOptimizations = optimizations.filter(opt => {
    const categoryMatch = selectedCategory === 'all' || opt.category === selectedCategory;
    const priorityMatch = selectedPriority === 'all' || opt.priority === selectedPriority;
    return categoryMatch && priorityMatch;
  });

  const categories = Array.from(new Set(optimizations.map(opt => opt.category)));
  const priorities = Array.from(new Set(optimizations.map(opt => opt.priority)));

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="bg-[#1a1625] border border-[#4b3d66]/20 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-[#ff5c00]/10 rounded-lg">
            <TrendingDown className="w-6 h-6 text-[#ff5c00]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#e4e4e4] font-[family-name:var(--font-cabinet)]">
              Cost Optimization Suggestions
            </h2>
            <p className="text-[#6a5b8a]">
              AI-powered recommendations to reduce supply chain costs
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#0c0a1d] border border-[#4b3d66]/20 rounded-lg p-4">
            <div className="text-2xl font-bold text-[#ff5c00] font-[family-name:var(--font-cabinet)]">
              ${totalPotentialSavings.toLocaleString()}
            </div>
            <div className="text-sm text-[#6a5b8a]">Total Potential Savings</div>
          </div>
          <div className="bg-[#0c0a1d] border border-[#4b3d66]/20 rounded-lg p-4">
            <div className="text-2xl font-bold text-[#e4e4e4] font-[family-name:var(--font-cabinet)]">
              {optimizations.length}
            </div>
            <div className="text-sm text-[#6a5b8a]">Optimization Opportunities</div>
          </div>
          <div className="bg-[#0c0a1d] border border-[#4b3d66]/20 rounded-lg p-4">
            <div className="text-2xl font-bold text-[#e4e4e4] font-[family-name:var(--font-cabinet)]">
              {optimizations.filter(opt => opt.priority === 'high').length}
            </div>
            <div className="text-sm text-[#6a5b8a]">High Priority Items</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div>
          <label className="block text-sm font-medium text-[#e4e4e4] mb-2">Category</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-[#1a1625] border border-[#4b3d66]/20 rounded-lg px-3 py-2 text-[#e4e4e4] focus:outline-none focus:ring-2 focus:ring-[#ff5c00]/50"
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#e4e4e4] mb-2">Priority</label>
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="bg-[#1a1625] border border-[#4b3d66]/20 rounded-lg px-3 py-2 text-[#e4e4e4] focus:outline-none focus:ring-2 focus:ring-[#ff5c00]/50"
          >
            <option value="all">All Priorities</option>
            {priorities.map(priority => (
              <option key={priority} value={priority}>
                {priority.charAt(0).toUpperCase() + priority.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Optimization Cards */}
      <div className="space-y-4">
        {filteredOptimizations.map((optimization) => {
          const CategoryIcon = categoryIcons[optimization.category];
          const isExpanded = expandedItems.has(optimization.id);
          const roi = ((optimization.potentialSavings - optimization.implementationCost) / optimization.implementationCost * 100);

          return (
            <div
              key={optimization.id}
              className="bg-[#1a1625] border border-[#4b3d66]/20 rounded-lg overflow-hidden"
            >
              {/* Card Header */}
              <div
                className="p-6 cursor-pointer hover:bg-[#1a1625]/80 transition-colors"
                onClick={() => toggleExpanded(optimization.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`p-2 rounded-lg border ${categoryColors[optimization.category]}`}>
                      <CategoryIcon className="w-5 h-5" />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-[#e4e4e4] font-[family-name:var(--font-cabinet)]">
                          {optimization.title}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs border ${priorityColors[optimization.priority]}`}>
                          {optimization.priority.toUpperCase()}
                        </span>
                      </div>
                      
                      <p className="text-[#6a5b8a] mb-3">
                        {optimization.description}
                      </p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <div className="text-lg font-bold text-[#ff5c00]">
                            ${optimization.potentialSavings.toLocaleString()}
                          </div>
                          <div className="text-xs text-[#6a5b8a]">Potential Savings</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-[#e4e4e4]">
                            {roi > 0 ? '+' : ''}{roi.toFixed(0)}%
                          </div>
                          <div className="text-xs text-[#6a5b8a]">ROI</div>
                        </div>
                        <div>
                          <div className={`text-lg font-bold ${impactColors[optimization.impact]}`}>
                            {optimization.impact.toUpperCase()}
                          </div>
                          <div className="text-xs text-[#6a5b8a]">Impact</div>
                        </div>
                        <div>
                          <div className={`text-lg font-bold ${difficultyColors[optimization.difficulty]}`}>
                            {optimization.difficulty.toUpperCase()}
                          </div>
                          <div className="text-xs text-[#6a5b8a]">Difficulty</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="ml-4">
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-[#6a5b8a]" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-[#6a5b8a]" />
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="border-t border-[#4b3d66]/20 p-6 bg-[#0c0a1d]/50">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Current State & Solution */}
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-semibold text-[#e4e4e4] mb-2 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-[#ff5c00]" />
                          Current State
                        </h4>
                        <p className="text-[#6a5b8a] text-sm">
                          {optimization.details.currentState}
                        </p>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-semibold text-[#e4e4e4] mb-2 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-400" />
                          Proposed Solution
                        </h4>
                        <p className="text-[#6a5b8a] text-sm">
                          {optimization.details.proposedSolution}
                        </p>
                      </div>
                    </div>

                    {/* Implementation Details */}
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-semibold text-[#e4e4e4] mb-2">
                          Implementation Steps
                        </h4>
                        <ul className="space-y-1">
                          {optimization.details.steps.map((step, index) => (
                            <li key={index} className="text-[#6a5b8a] text-sm flex items-start gap-2">
                              <span className="text-[#ff5c00] font-bold min-w-[20px]">
                                {index + 1}.
                              </span>
                              {step}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-sm font-semibold text-[#e4e4e4] mb-2">
                            Key Risks
                          </h4>
                          <ul className="space-y-1">
                            {optimization.details.risks.map((risk, index) => (
                              <li key={index} className="text-[#6a5b8a] text-sm flex items-start gap-2">
                                <span className="text-red-400 min-w-[8px] mt-1.5">•</span>
                                {risk}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <h4 className="text-sm font-semibold text-[#e4e4e4] mb-2">
                            Success KPIs
                          </h4>
                          <ul className="space-y-1">
                            {optimization.details.kpis.map((kpi, index) => (
                              <li key={index} className="text-[#6a5b8a] text-sm flex items-start gap-2">
                                <span className="text-green-400 min-w-[8px] mt-1.5">•</span>
                                {kpi}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Implementation Timeline */}
                  <div className="mt-6 pt-4 border-t border-[#4b3d66]/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div>
                          <span className="text-sm text-[#6a5b8a]">Implementation Cost:</span>
                          <span className="ml-2 font-semibold text-[#e4e4e4]">
                            ${optimization.implementationCost.toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-sm text-[#6a5b8a]">Timeline:</span>
                          <span className="ml-2 font-semibold text-[#e4e4e4]">
                            {optimization.timeToImplement}
                          </span>
                        </div>
                      </div>
                      
                      <button className="px-4 py-2 bg-[#ff5c00] text-white rounded-lg hover:bg-[#ff5c00]/80 transition-colors text-sm font-medium">
                        Start Implementation
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredOptimizations.length === 0 && (
        <div className="text-center py-12">
          <div className="text-[#6a5b8a] mb-2">No optimizations found</div>
          <div className="text-sm text-[#6a5b8a]">
            Try adjusting your filters or check back later for new suggestions.
          </div>
        </div>
      )}
    </div>
  );
}