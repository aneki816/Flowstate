import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ThesaurusData } from '@/lib/api';
import { Loader2, X } from 'lucide-react';

interface ThesaurusMenuProps {
  position: { x: number; y: number } | null;
  word: string | null;
  data: ThesaurusData | null;
  loading: boolean;
  onClose: () => void;
  onSelect: (word: string) => void;
}

export const ThesaurusMenu: React.FC<ThesaurusMenuProps> = ({
  position,
  word,
  data,
  loading,
  onClose,
  onSelect,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  if (!position) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        ref={menuRef}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        style={{
          position: 'fixed',
          top: position.y,
          left: position.x,
          zIndex: 50,
        }}
        className="w-80 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden text-zinc-100 font-sans"
      >
        <div className="flex items-center justify-between p-3 border-b border-zinc-800 bg-zinc-950/50">
          <span className="font-medium text-sm text-zinc-400 uppercase tracking-wider">
            Context: <span className="text-white font-bold">{word}</span>
          </span>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-zinc-500">
              <Loader2 className="animate-spin mr-2" size={20} />
              <span>Analyzing semantics...</span>
            </div>
          ) : data ? (
            <div className="space-y-4">
              {/* Lyrical Alternatives (Means Like) */}
              {data.meansLike.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-indigo-400 uppercase mb-2 px-2">Lyrical Alternatives</h4>
                  <div className="flex flex-wrap gap-1">
                    {data.meansLike.slice(0, 15).map((item) => (
                      <button
                        key={item.word}
                        onClick={() => onSelect(item.word)}
                        className="px-2 py-1 text-sm bg-zinc-800 hover:bg-indigo-900/50 hover:text-indigo-200 rounded-md transition-colors"
                      >
                        {item.word}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Synonyms */}
              {data.synonyms.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-emerald-400 uppercase mb-2 px-2">Synonyms</h4>
                  <div className="flex flex-wrap gap-1">
                    {data.synonyms.slice(0, 10).map((item) => (
                      <button
                        key={item.word}
                        onClick={() => onSelect(item.word)}
                        className="px-2 py-1 text-sm bg-zinc-800 hover:bg-emerald-900/50 hover:text-emerald-200 rounded-md transition-colors"
                      >
                        {item.word}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Associated Adjectives */}
              {data.adjectives.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-amber-400 uppercase mb-2 px-2">Descriptive (Adjectives)</h4>
                  <div className="flex flex-wrap gap-1">
                    {data.adjectives.slice(0, 10).map((item) => (
                      <button
                        key={item.word}
                        onClick={() => onSelect(item.word)}
                        className="px-2 py-1 text-sm bg-zinc-800 hover:bg-amber-900/50 hover:text-amber-200 rounded-md transition-colors"
                      >
                        {item.word}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {data.meansLike.length === 0 && data.synonyms.length === 0 && data.adjectives.length === 0 && (
                 <div className="text-center py-4 text-zinc-500 text-sm">No results found.</div>
              )}
            </div>
          ) : null}
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};
