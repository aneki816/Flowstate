import React, { useState, useEffect } from 'react';
import { Search, X, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { fetchRhymeExplorer, RhymeExplorerData } from '@/lib/api';
import { cn } from '@/lib/utils';

interface RhymeExplorerProps {
  initialWord?: string | null;
  onSelectWord: (word: string) => void;
  className?: string;
}

export const RhymeExplorer: React.FC<RhymeExplorerProps> = ({
  initialWord,
  onSelectWord,
  className
}) => {
  const [searchWord, setSearchWord] = useState(initialWord || '');
  const [mode, setMode] = useState<'sounds' | 'words'>('sounds');
  const [data, setData] = useState<RhymeExplorerData | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (initialWord) {
      setSearchWord(initialWord);
      handleSearch(initialWord, mode);
    }
  }, [initialWord]);

  const handleSearch = async (word: string, currentMode: 'sounds' | 'words') => {
    if (!word.trim()) return;
    setLoading(true);
    try {
      const result = await fetchRhymeExplorer(word.trim(), currentMode);
      setData(result);
      // Reset expanded states when new data comes in
      setExpandedSections({});
    } catch (error) {
      console.error('Error searching rhyme explorer:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (label: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [label]: !prev[label]
    }));
  };

  const getSectionColor = (type: string) => {
    switch (type) {
      case 'perfect': return 'text-blue-400 border-blue-400/30 bg-blue-400/10';
      case 'near': return 'text-teal-400 border-teal-400/30 bg-teal-400/10';
      case 'sound-alike': return 'text-indigo-400 border-indigo-400/30 bg-indigo-400/10';
      case 'consonant': return 'text-amber-400 border-amber-400/30 bg-amber-400/10';
      case 'synonyms': return 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10';
      case 'related': return 'text-indigo-400 border-indigo-400/30 bg-indigo-400/10';
      case 'triggers': return 'text-pink-400 border-pink-400/30 bg-pink-400/10';
      case 'descriptors': return 'text-amber-400 border-amber-400/30 bg-amber-400/10';
      default: return 'text-zinc-400 border-zinc-400/30 bg-zinc-400/10';
    }
  };

  const getPillHoverColor = (type: string) => {
    switch (type) {
      case 'perfect': return 'hover:bg-blue-900/50 hover:text-blue-200';
      case 'near': return 'hover:bg-teal-900/50 hover:text-teal-200';
      case 'sound-alike': return 'hover:bg-indigo-900/50 hover:text-indigo-200';
      case 'consonant': return 'hover:bg-amber-900/50 hover:text-amber-200';
      case 'synonyms': return 'hover:bg-emerald-900/50 hover:text-emerald-200';
      case 'related': return 'hover:bg-indigo-900/50 hover:text-indigo-200';
      case 'triggers': return 'hover:bg-pink-900/50 hover:text-pink-200';
      case 'descriptors': return 'hover:bg-amber-900/50 hover:text-amber-200';
      default: return 'hover:bg-zinc-800 hover:text-zinc-100';
    }
  };

  return (
    <div className={cn("flex flex-col h-full bg-zinc-900 border-l border-zinc-800 w-80", className)}>
      {/* Search Input */}
      <div className="p-4 border-b border-zinc-800">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
          <input
            type="text"
            value={searchWord}
            onChange={(e) => setSearchWord(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchWord, mode)}
            placeholder="Search rhymes or words..."
            className="w-full bg-zinc-950 border border-zinc-800 rounded-md py-2 pl-10 pr-10 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
          />
          {searchWord && (
            <button
              onClick={() => setSearchWord('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-zinc-800">
        <button
          onClick={() => {
            setMode('sounds');
            if (searchWord) handleSearch(searchWord, 'sounds');
          }}
          className={cn(
            "flex-1 py-3 text-sm font-medium transition-colors relative",
            mode === 'sounds' ? "text-indigo-400" : "text-zinc-500 hover:text-zinc-300"
          )}
        >
          Sounds
          {mode === 'sounds' && (
            <motion.div
              layoutId="activeTab"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500"
            />
          )}
        </button>
        <button
          onClick={() => {
            setMode('words');
            if (searchWord) handleSearch(searchWord, 'words');
          }}
          className={cn(
            "flex-1 py-3 text-sm font-medium transition-colors relative",
            mode === 'words' ? "text-indigo-400" : "text-zinc-500 hover:text-zinc-300"
          )}
        >
          Words
          {mode === 'words' && (
            <motion.div
              layoutId="activeTab"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500"
            />
          )}
        </button>
      </div>

      {/* Results Area */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 p-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-40 text-zinc-500">
            <Loader2 className="animate-spin mb-2" size={24} />
            <span className="text-sm">Finding {mode === 'sounds' ? 'rhymes' : 'words'}...</span>
          </div>
        ) : data && data.sections.length > 0 ? (
          <div className="space-y-6">
            {data.sections.map((section) => {
              const isExpanded = expandedSections[section.label] || false;
              const displayedResults = isExpanded ? section.results : section.results.slice(0, 20);
              const hasMore = section.results.length > 20;

              return (
                <div key={section.label} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className={cn(
                      "text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded border",
                      getSectionColor(section.type)
                    )}>
                      {section.label}
                    </h3>
                    <span className="text-[10px] text-zinc-600 font-mono">
                      {section.results.length} results
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {displayedResults.map((result, idx) => (
                      <button
                        key={`${result.word}-${idx}`}
                        onClick={() => onSelectWord(result.word)}
                        className={cn(
                          "px-2 py-1 bg-zinc-800 text-sm rounded-md transition-colors flex items-center gap-1",
                          getPillHoverColor(section.type)
                        )}
                      >
                        {result.word}
                        {result.numSyllables && (
                          <span className="text-[10px] opacity-50 font-mono">
                            {result.numSyllables}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  {hasMore && (
                    <button
                      onClick={() => toggleSection(section.label)}
                      className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors pt-1"
                    >
                      {isExpanded ? (
                        <>Show less <ChevronUp size={10} /></>
                      ) : (
                        <>Show {section.results.length - 20} more <ChevronDown size={10} /></>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-40 text-zinc-600 text-center">
            <p className="text-sm">
              {searchWord ? "No results found." : "Right-click a word or type above to explore."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
