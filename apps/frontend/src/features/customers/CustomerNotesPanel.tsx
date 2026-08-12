import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Send, StickyNote, Clock } from 'lucide-react';
import { customersApi, CustomerNote } from './customers.api';
import { formatDateTime, cn } from '../../lib/utils';
import { useAuthStore } from '../../store/authStore';

interface NotesPanelProps { customerId: string }

export const CustomerNotesPanel: React.FC<NotesPanelProps> = ({ customerId }) => {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [note, setNote] = useState('');
  const canAdd = user?.role === 'ADMIN' || user?.role === 'SALES';

  const { data: notes = [], isLoading } = useQuery<CustomerNote[]>({
    queryKey: ['customer-notes', customerId],
    queryFn: () => customersApi.getNotes(customerId),
    staleTime: 15_000,
  });

  const addMutation = useMutation({
    mutationFn: () => customersApi.addNote(customerId, note.trim()),
    onSuccess: () => {
      toast.success('Note added');
      setNote('');
      qc.invalidateQueries({ queryKey: ['customer-notes', customerId] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) return;
    addMutation.mutate();
  };

  return (
    <div className="space-y-3">
      {canAdd && (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            id="note-input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a follow-up note..."
            className={cn(
              'flex-1 px-3 py-2 text-sm rounded-lg border bg-background text-foreground',
              'outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 border-border'
            )}
          />
          <button
            id="note-submit"
            type="submit"
            disabled={addMutation.isPending || !note.trim()}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg
                       bg-brand-500 hover:bg-brand-600 text-white transition-colors disabled:opacity-50"
          >
            {addMutation.isPending ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send size={14} />
            )}
            Add
          </button>
        </form>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map(i => (
            <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <StickyNote size={22} className="text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No notes yet</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {notes.map((n) => (
            <div key={n.id} className="p-3 rounded-lg bg-muted/50 border border-border/60">
              <p className="text-sm text-foreground leading-snug">{n.note}</p>
              <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-muted-foreground">
                <Clock size={11} />
                <span>{formatDateTime(n.createdAt)}</span>
                <span>·</span>
                <span className="font-medium">{n.createdBy.name}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
