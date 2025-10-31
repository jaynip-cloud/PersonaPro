import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Keyboard } from 'lucide-react';

interface Shortcut {
  keys: string[];
  description: string;
  category: string;
}

const shortcuts: Shortcut[] = [
  { keys: ['?'], description: 'Show keyboard shortcuts', category: 'General' },
  { keys: ['g', 'd'], description: 'Go to Dashboard', category: 'Navigation' },
  { keys: ['g', 'c'], description: 'Go to Clients', category: 'Navigation' },
  { keys: ['g', 's'], description: 'Go to Data Sources', category: 'Navigation' },
  { keys: ['g', 'p'], description: 'Go to Pitch Generator', category: 'Navigation' },
  { keys: ['g', 'i'], description: 'Go to Insights', category: 'Navigation' },
  { keys: ['/'], description: 'Focus search', category: 'Search' },
  { keys: ['Esc'], description: 'Close modal/dialog', category: 'General' },
  { keys: ['Ctrl', 'K'], description: 'Command palette (future)', category: 'General' }
];

export const KeyboardShortcuts: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          setIsOpen(true);
        }
      }

      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const categories = Array.from(new Set(shortcuts.map(s => s.category)));

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 left-4 z-40 p-3 bg-primary text-white rounded-full shadow-lg hover:bg-primary/90 transition-colors"
        title="Keyboard Shortcuts (Press ?)"
      >
        <Keyboard className="h-5 w-5" />
      </button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Keyboard Shortcuts">
        <div className="space-y-6">
          {categories.map(category => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                {category}
              </h3>
              <div className="space-y-2">
                {shortcuts
                  .filter(s => s.category === category)
                  .map((shortcut, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <span className="text-sm text-foreground">{shortcut.description}</span>
                      <div className="flex gap-1">
                        {shortcut.keys.map((key, i) => (
                          <React.Fragment key={i}>
                            {i > 0 && (
                              <span className="text-muted-foreground px-1">+</span>
                            )}
                            <kbd className="px-2 py-1 text-xs font-mono bg-background border border-border rounded shadow-sm">
                              {key}
                            </kbd>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </>
  );
};
