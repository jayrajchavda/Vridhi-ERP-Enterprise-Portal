import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Filter, Phone, Clock, PlusCircle, X } from 'lucide-react';
import { followupsApi, FollowUpCustomer } from './followups.api';
import { LoadingSkeletonTable } from '../../components/LoadingSkeletonTable';
import { ErrorBanner } from '../../components/ErrorBanner';
import { EmptyState } from '../../components/EmptyState';
import { formatDate } from '../../lib/utils';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';

export const FollowUpsDashboardPage: React.FC = () => {
  const qc = useQueryClient();
  const [range, setRange] = useState<'overdue' | 'today' | 'upcoming'>('today');

  // Quick Log Interaction modal state
  const [selectedCustomer, setSelectedCustomer] = useState<FollowUpCustomer | null>(null);
  const [type, setType] = useState('CALL');
  const [notes, setNotes] = useState('');
  const [nextFollowUpDate, setNextFollowUpDate] = useState('');

  const { data: followUpsRes, isLoading, isError } = useQuery({
    queryKey: ['follow-ups', range],
    queryFn: () => followupsApi.listFollowUps(range),
  });

  const customers: FollowUpCustomer[] = followUpsRes?.data ?? [];

  const logMutation = useMutation({
    mutationFn: (body: any) => followupsApi.createInteraction(selectedCustomer!.id, body),
    onSuccess: () => {
      toast.success(`Interaction logged for ${selectedCustomer?.name}. Checklist updated!`);
      setNotes('');
      setNextFollowUpDate('');
      setSelectedCustomer(null);
      qc.invalidateQueries({ queryKey: ['follow-ups'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to save interaction');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim()) return toast.error('Notes are required');

    logMutation.mutate({
      type,
      notes: notes.trim(),
      nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate).toISOString() : null,
    });
  };

  const getDaysDiff = (d: string) => {
    const target = new Date(d);
    target.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.floor((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Follow-up Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Track customer follow-up calls, emails, and schedule reminders
        </p>
      </div>

      {/* Tabs / Filter bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-card border border-border rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-1.5">
          <Filter size={15} className="text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-1">Checklist:</span>
          {(['overdue', 'today', 'upcoming'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                'px-3.5 py-1.5 text-xs font-semibold rounded-lg border transition-all uppercase tracking-wider',
                range === r
                  ? r === 'overdue'
                    ? 'bg-rose-500 border-rose-500 text-white shadow-sm'
                    : r === 'today'
                    ? 'bg-amber-500 border-amber-500 text-white shadow-sm'
                    : 'bg-brand-500 border-brand-500 text-white shadow-sm'
                  : 'bg-background hover:bg-muted border-border text-muted-foreground'
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Checklist Grid */}
      {isLoading ? (
        <LoadingSkeletonTable />
      ) : isError ? (
        <ErrorBanner message="Failed to load follow-up checklist" />
      ) : customers.length === 0 ? (
        <EmptyState
          title={`No ${range} Follow-ups`}
          description="Everything is current! You do not have any pending tasks in this list."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {customers.map((c) => {
            const diff = getDaysDiff(c.followUpDate);
            return (
              <div
                key={c.id}
                className="bg-card border border-border hover:border-brand-500/40 rounded-xl p-5 transition-all hover:shadow-lg flex flex-col justify-between"
              >
                <div className="space-y-3.5">
                  {/* Name and Days diff badge */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-foreground truncate max-w-[180px]">{c.name}</h3>
                      {c.businessName && <p className="text-[11px] text-muted-foreground truncate">{c.businessName}</p>}
                    </div>

                    <span className={cn(
                      'px-2 py-0.5 text-[10px] font-bold rounded uppercase border shrink-0',
                      diff < 0
                        ? 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                        : diff === 0
                        ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                        : 'bg-brand-500/10 text-brand-500 border-brand-500/20'
                    )}>
                      {diff < 0 ? `${Math.abs(diff)}d Overdue` : diff === 0 ? 'Today' : `in ${diff}d`}
                    </span>
                  </div>

                  {/* Contact details */}
                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    <p className="flex items-center gap-1.5"><Phone size={13} /> {c.mobile}</p>
                    <p className="flex items-center gap-1.5">
                      <Clock size={13} /> Scheduled: <span className="font-semibold text-foreground">{formatDate(c.followUpDate)}</span>
                    </p>
                  </div>

                  {/* Last interaction note if present */}
                  {c.lastInteraction ? (
                    <div className="bg-muted/40 border border-border/60 rounded-lg p-3 text-xs">
                      <div className="text-[9px] font-bold text-muted-foreground uppercase mb-1">Last Interaction Note:</div>
                      <p className="text-foreground leading-snug line-clamp-3">"{c.lastInteraction.notes}"</p>
                      <p className="text-[9px] text-muted-foreground mt-1.5 font-semibold">
                        Logged on {new Date(c.lastInteraction.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground italic bg-muted/20 border border-border/40 p-2.5 rounded-lg text-center">
                      No interactions recorded yet.
                    </div>
                  )}
                </div>

                <div className="mt-5 border-t border-border/40 pt-3">
                  <button
                    onClick={() => {
                      setSelectedCustomer(c);
                      setType('CALL');
                      setNotes('');
                      setNextFollowUpDate('');
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg border border-brand-200 text-brand-500 hover:bg-brand-50/50 transition-all"
                  >
                    <PlusCircle size={14} />
                    Log Interaction
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Log Interaction Modal Form */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-xl w-full max-w-md overflow-hidden shadow-2xl relative">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Log Customer Interaction</h2>
              <button onClick={() => setSelectedCustomer(null)} className="text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="bg-brand-500/10 border border-brand-500/20 p-3 rounded-lg text-xs font-semibold text-brand-500">
                Customer: {selectedCustomer.name}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Interaction Type *</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-brand-500/30 outline-none"
                  required
                >
                  <option value="CALL">☎ Phone Call</option>
                  <option value="EMAIL">✉ Email Sent</option>
                  <option value="MEETING">🤝 In-Person Meeting</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Notes / Discussion Details *</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Summarize the phone call, meeting discussion points, or next actions discussed..."
                  rows={4}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-brand-500/30 outline-none resize-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Schedule Next Follow-up Date</label>
                <input
                  type="date"
                  value={nextFollowUpDate}
                  onChange={(e) => setNextFollowUpDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-brand-500/30 outline-none font-semibold"
                />
                <p className="text-[10px] text-muted-foreground mt-1">Leave empty to remove scheduling / close task.</p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border mt-5">
                <button
                  type="button"
                  onClick={() => setSelectedCustomer(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-border hover:bg-muted text-foreground transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={logMutation.isPending}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-brand-500 hover:bg-brand-600 text-white transition-all shadow-sm"
                >
                  {logMutation.isPending ? 'Saving...' : 'Log Interaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
