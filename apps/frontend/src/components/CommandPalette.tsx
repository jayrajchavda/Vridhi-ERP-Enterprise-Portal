import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users, Package, FileText, LayoutDashboard, X } from 'lucide-react';


interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (open) onClose();
        else {
          setQuery('');
          // open via event or state trigger
        }
      }
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const items = [
    { label: 'Dashboard Overview', category: 'Navigation', icon: LayoutDashboard, path: '/' },
    { label: 'Customers Directory', category: 'Navigation', icon: Users, path: '/customers' },
    { label: 'Products & Inventory', category: 'Navigation', icon: Package, path: '/products' },
    { label: 'Sales Challans', category: 'Navigation', icon: FileText, path: '/challans' },
  ];

  const filtered = items.filter(
    (i) => i.label.toLowerCase().includes(query.toLowerCase()) || i.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Quick navigation search"
        className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden z-10"
      >
        <div className="flex items-center px-4 border-b border-border">
          <Search size={18} className="text-muted-foreground shrink-0" />
          <input
            id="command-palette-input"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search page... (Press Esc to close)"
            className="w-full px-3 py-4 text-sm bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
          />
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>

        <div className="max-h-72 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No matching pages or commands found
            </div>
          ) : (
            filtered.map((item, idx) => (
              <button
                key={idx}
                onClick={() => handleSelect(item.path)}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-muted/60 text-left transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted group-hover:bg-brand-100 dark:group-hover:bg-brand-900/30 text-muted-foreground group-hover:text-brand-600 transition-colors">
                    <item.icon size={16} />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">{item.label}</div>
                    <div className="text-xs text-muted-foreground">{item.category}</div>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground/60 font-mono">Jump →</span>
              </button>
            ))
          )}
        </div>

        <div className="px-4 py-2.5 border-t border-border bg-muted/30 text-[11px] text-muted-foreground flex justify-between">
          <span>Use <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">Ctrl+K</kbd> anytime</span>
          <span>Press <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">Esc</kbd> to exit</span>
        </div>
      </div>
    </div>
  );
};
