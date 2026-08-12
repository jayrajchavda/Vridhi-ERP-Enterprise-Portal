import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Info } from 'lucide-react';
import { procurementApi, ReorderSuggestion } from './procurement.api';
import { LoadingSkeletonTable } from '../../components/LoadingSkeletonTable';
import { ErrorBanner } from '../../components/ErrorBanner';
import { EmptyState } from '../../components/EmptyState';

export const ReorderSuggestionsPage: React.FC = () => {
  const navigate = useNavigate();

  const { data: sugRes, isLoading, isError } = useQuery({
    queryKey: ['reorder-suggestions'],
    queryFn: () => procurementApi.getReorderSuggestions(),
  });

  const suggestions: ReorderSuggestion[] = sugRes?.data ?? [];

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <button
        onClick={() => navigate('/procurement/purchase-orders')}
        className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={14} /> Back to PO List
      </button>

      <div>
        <h1 className="text-2xl font-bold text-foreground">Reorder Suggestions</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Automatic alerts for low stock products using replenishment algorithms
        </p>
      </div>

      <div className="flex items-start gap-3 bg-brand-500/10 border border-brand-500/20 p-4 rounded-xl text-brand-500 text-xs">
        <Info size={16} className="shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Replenishment Formula:</span> Suggested Reorder quantity is calculated as:
          <span className="font-mono bg-brand-500/10 px-1 py-0.5 rounded ml-1 font-bold">
            (Safety Stock Threshold × 2) - Current On-Hand Stock
          </span>
          . Use this to quickly compile draft purchase orders.
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <LoadingSkeletonTable />
      ) : isError ? (
        <ErrorBanner message="Failed to load reorder suggestions" />
      ) : suggestions.length === 0 ? (
        <EmptyState
          title="All Stock Levels Healthy"
          description="None of your active inventory products have dipped below their safety threshold."
        />
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/20 text-xs font-semibold text-muted-foreground uppercase">
                  <th className="p-4">Product Name</th>
                  <th className="p-4">SKU</th>
                  <th className="p-4 text-right">Current Stock</th>
                  <th className="p-4 text-right">Threshold</th>
                  <th className="p-4 text-right">Suggested Qty</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-foreground">
                {suggestions.map((s) => (
                  <tr key={s.productId} className="hover:bg-muted/10 transition-colors">
                    <td className="p-4">
                      <div className="font-semibold">{s.productName}</div>
                    </td>
                    <td className="p-4 font-mono text-xs">{s.sku}</td>
                    <td className="p-4 text-right font-semibold text-destructive">
                      {s.currentStock}
                    </td>
                    <td className="p-4 text-right font-medium text-muted-foreground">
                      {s.minStockAlert}
                    </td>
                    <td className="p-4 text-right font-bold text-emerald-500">
                      {s.suggestedQty}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => navigate('/procurement/purchase-orders/new')}
                        className="px-3 py-1.5 text-xs font-semibold bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition-all inline-flex items-center gap-1"
                      >
                        Create PO
                        <ArrowRight size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
