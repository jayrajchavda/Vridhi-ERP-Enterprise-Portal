import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Phone, Mail, Users, MessageSquare, Calendar, History, Send } from 'lucide-react';
import { followupsApi, InteractionLog } from '../followups/followups.api';
import { formatDateTime } from '../../lib/utils';
import { useAuthStore } from '../../store/authStore';

interface Props {
  customerId: string;
}

export const CustomerInteractionsPanel: React.FC<Props> = ({ customerId }) => {
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const [type, setType] = useState('CALL');
  const [notes, setNotes] = useState('');
  const [nextFollowUpDate, setNextFollowUpDate] = useState('');

  const canAdd = user?.role === 'ADMIN' || user?.role === 'SALES';

  const { data: logsRes, isLoading } = useQuery({
    queryKey: ['customer-interactions', customerId],
    queryFn: () => followupsApi.listInteractions(customerId, { limit: 50 }),
  });

  const logs: InteractionLog[] = logsRes?.data ?? [];

  const addMutation = useMutation({
    mutationFn: (body: any) => followupsApi.createInteraction(customerId, body),
    onSuccess: () => {
      toast.success('Interaction logged successfully');
      setNotes('');
      setNextFollowUpDate('');
      qc.invalidateQueries({ queryKey: ['customer-interactions', customerId] });
      qc.invalidateQueries({ queryKey: ['customer', customerId] });
      qc.invalidateQueries({ queryKey: ['follow-ups'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to save interaction');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim()) return toast.error('Notes cannot be empty');

    addMutation.mutate({
      type,
      notes: notes.trim(),
      nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate).toISOString() : null,
    });
  };

  const getIcon = (t: string) => {
    switch (t) {
      case 'CALL': return <Phone size={13} className="text-blue-500" />;
      case 'EMAIL': return <Mail size={13} className="text-amber-500" />;
      case 'MEETING': return <Users size={13} className="text-emerald-500" />;
      default: return <MessageSquare size={13} className="text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-4">
      {canAdd && (
        <form onSubmit={handleSubmit} className="bg-muted/30 border border-border p-4 rounded-xl space-y-3">
          <div className="flex gap-2 items-center flex-wrap">
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="text-xs font-semibold rounded bg-background border border-border px-2 py-1 outline-none text-foreground"
            >
              <option value="CALL">☎ Phone Call</option>
              <option value="EMAIL">✉ Email Send</option>
              <option value="MEETING">🤝 In-Person Meeting</option>
            </select>

            <div className="flex items-center gap-1.5 ml-auto">
              <Calendar size={13} className="text-muted-foreground" />
              <span className="text-[10px] font-semibold text-muted-foreground uppercase">Next Follow-up:</span>
              <input
                type="date"
                value={nextFollowUpDate}
                onChange={(e) => setNextFollowUpDate(e.target.value)}
                className="text-xs rounded bg-background border border-border px-2 py-0.5 outline-none text-foreground font-semibold"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Log notes about this interaction..."
              rows={2}
              className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground outline-none resize-none focus:ring-1 focus:ring-brand-500/30"
              required
            />
            <button
              type="submit"
              disabled={addMutation.isPending || !notes.trim()}
              className="px-3.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-bold transition-all flex flex-col justify-center items-center gap-1 shrink-0"
            >
              <Send size={13} />
              Log
            </button>
          </div>
        </form>
      )}

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
          <History size={20} className="mb-1.5 text-muted-foreground/60" />
          <p className="text-xs">No logged interactions yet.</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {logs.map((log) => (
            <div key={log.id} className="p-3 rounded-xl bg-card border border-border space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="bg-muted px-2 py-0.5 rounded text-[9px] font-bold border border-border flex items-center gap-1 uppercase tracking-wider text-muted-foreground">
                  {getIcon(log.type)}
                  {log.type}
                </span>
                <span className="text-[10px] text-muted-foreground ml-auto">
                  {formatDateTime(log.createdAt)}
                </span>
              </div>
              <p className="text-xs text-foreground leading-relaxed font-medium">
                {log.notes}
              </p>
              <div className="text-[9px] text-muted-foreground font-semibold border-t border-border/40 pt-1">
                By {log.createdBy.name}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
