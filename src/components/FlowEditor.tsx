import React, { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import { createEditor, Descendant, Editor, Transforms, Text, Node, Range } from 'slate';
import { Slate, Editable, withReact, RenderElementProps, RenderLeafProps, ReactEditor } from 'slate-react';
import { withHistory } from 'slate-history';
import { SyllableGutter } from './SyllableGutter';
import { ThesaurusMenu } from './ThesaurusMenu';
import { fetchRhymes, fetchThesaurus, ThesaurusData } from '@/lib/api';
import { RHYME_COLORS, cn } from '@/lib/utils';
import { Loader2, FolderOpen, Download, Trash2, FileJson, FileText, FileType, Menu, X, Plus } from 'lucide-react';

// Define initial value
const initialValue: Descendant[] = [
  {
    type: 'paragraph',
    children: [{ text: 'Start writing your lyrics here...' }],
  },
];

interface RhymeGroup {
  color: string;
  rhymes: Set<string>; // Words that belong to this rhyme group
}

interface Song {
  id: string;
  title: string;
  content: Descendant[];
  rhymeGroups: { color: string; rhymes: string[] }[]; // Store Set as array for JSON
  updatedAt: string;
}

export const FlowEditor: React.FC = () => {
  const editor = useMemo(() => withHistory(withReact(createEditor())), []);
  const [value, setValue] = useState<Descendant[]>(initialValue);
  
  // Song Management State
  const [currentSongId, setCurrentSongId] = useState<string | null>(null);
  const [savedSongs, setSavedSongs] = useState<Song[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [editorKey, setEditorKey] = useState(0); // Key to force re-mount on load

  // Load songs from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('flowstate_songs');
    if (stored) {
      try {
        setSavedSongs(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse saved songs", e);
      }
    }
  }, []);

  // Rhyme State
  const [rhymeGroups, setRhymeGroups] = useState<RhymeGroup[]>([]);
  const [analyzingWord, setAnalyzingWord] = useState<string | null>(null);

  // Refs for race condition handling
  const rhymeGroupsRef = useRef<RhymeGroup[]>([]);
  const processingQueue = useRef<Array<{ word: string; range: Range }>>([]);
  const isProcessing = useRef(false);

  // Sync ref with state
  useEffect(() => {
    rhymeGroupsRef.current = rhymeGroups;
  }, [rhymeGroups]);

  // Save Song Logic
  const saveSong = useCallback(() => {
    const titleNode = value[0];
    let title = "Untitled Song";
    if (titleNode && 'children' in titleNode && titleNode.children.length > 0) {
       const firstLine = Node.string(titleNode).trim();
       if (firstLine) title = firstLine.substring(0, 30) + (firstLine.length > 30 ? '...' : '');
    }

    const song: Song = {
      id: currentSongId || crypto.randomUUID(),
      title,
      content: value,
      rhymeGroups: rhymeGroups.map(g => ({ ...g, rhymes: Array.from(g.rhymes) })),
      updatedAt: new Date().toISOString()
    };

    const newSongs = currentSongId 
      ? savedSongs.map(s => s.id === currentSongId ? song : s)
      : [song, ...savedSongs];
    
    setSavedSongs(newSongs);
    setCurrentSongId(song.id);
    localStorage.setItem('flowstate_songs', JSON.stringify(newSongs));
    
    // Optional: Show toast
    console.log("Saved:", title);
  }, [value, rhymeGroups, currentSongId, savedSongs]);

  // Load Song Logic
  const loadSong = (song: Song) => {
    if (confirm("Load this song? Unsaved changes to the current song will be lost.")) {
      // 1. Restore Rhyme Groups (convert array back to Set)
      const restoredGroups = song.rhymeGroups.map(g => ({
        ...g,
        rhymes: new Set(g.rhymes)
      }));
      setRhymeGroups(restoredGroups);
      
      // 2. Restore Content
      setValue(song.content);
      setCurrentSongId(song.id);
      
      // 3. Force Re-mount to apply initialValue and visual styles
      setEditorKey(prev => prev + 1);
      
      setIsSidebarOpen(false);
    }
  };

  const deleteSong = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this song?")) {
      const newSongs = savedSongs.filter(s => s.id !== id);
      setSavedSongs(newSongs);
      localStorage.setItem('flowstate_songs', JSON.stringify(newSongs));
      if (currentSongId === id) setCurrentSongId(null);
    }
  };

  const createNewSong = () => {
    if (confirm("Start new song? Unsaved changes will be lost.")) {
      setValue(initialValue);
      setRhymeGroups([]);
      setCurrentSongId(null);
      setEditorKey(prev => prev + 1);
      setIsSidebarOpen(false);
    }
  };

  // Export Logic
  const exportSong = (format: 'txt' | 'json' | 'md') => {
    if (!value) return;
    
    let content = '';
    let mimeType = 'text/plain';
    let extension = 'txt';

    if (format === 'json') {
      const data = {
        title: savedSongs.find(s => s.id === currentSongId)?.title || "Untitled",
        content: value,
        rhymeGroups: rhymeGroups.map(g => ({ ...g, rhymes: Array.from(g.rhymes) })),
        exportedAt: new Date().toISOString()
      };
      content = JSON.stringify(data, null, 2);
      mimeType = 'application/json';
      extension = 'json';
    } else if (format === 'md') {
      content = value.map(node => {
        const line = Node.string(node);
        // Add rhyme annotations if needed, for now just text
        return line;
      }).join('\n');
      extension = 'md';
    } else {
      content = value.map(node => Node.string(node)).join('\n');
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flowstate-${currentSongId || 'untitled'}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        saveSong();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveSong]);

  // Thesaurus State
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [thesaurusData, setThesaurusData] = useState<ThesaurusData | null>(null);
  const [loadingThesaurus, setLoadingThesaurus] = useState(false);

  // Render Element (Paragraphs)
  const renderElement = useCallback((props: RenderElementProps) => {
    return (
      <div {...props.attributes} className="relative leading-relaxed my-1">
        {props.children}
      </div>
    );
  }, []);

  // Render Leaf (Text with colors)
  const renderLeaf = useCallback((props: RenderLeafProps) => {
    const { attributes, children, leaf } = props;
    
    return (
      <span
        {...attributes}
        className={cn(
          "transition-colors duration-300 rounded px-0.5",
          leaf.rhymeColor ? "font-medium" : ""
        )}
        style={{
          backgroundColor: leaf.rhymeColor ? `${leaf.rhymeColor}33` : 'transparent', // 20% opacity
          color: leaf.rhymeColor ? leaf.rhymeColor : 'inherit',
          boxShadow: leaf.rhymeColor ? `0 0 0 1px ${leaf.rhymeColor}22` : 'none'
        }}
        onContextMenu={(e) => {
          handleContextMenu(e);
        }}
      >
        {children}
      </span>
    );
  }, []);

  const processQueue = async () => {
    if (isProcessing.current || processingQueue.current.length === 0) return;
    isProcessing.current = true;

    try {
      while (processingQueue.current.length > 0) {
        const { word, range } = processingQueue.current[0];
        const cleanWord = word.toLowerCase().replace(/[^a-z0-9]/g, '');

        if (!cleanWord || cleanWord.length < 2) {
          processingQueue.current.shift();
          continue;
        }

        setAnalyzingWord(cleanWord);

        try {
          const currentGroups = rhymeGroupsRef.current;
          let colorToApply = '';
          let foundGroupIndex = -1;

          // 1. Check existing
          currentGroups.forEach((group, index) => {
            if (group.rhymes.has(cleanWord)) foundGroupIndex = index;
          });

          if (foundGroupIndex !== -1) {
            colorToApply = currentGroups[foundGroupIndex].color;
          } else {
            // 2. Fetch
            const data = await fetchRhymes(cleanWord);
            
            let matchedGroupIndex = -1;
            // Re-read currentGroups in case it changed
            const latestGroups = rhymeGroupsRef.current;
            
            for (let i = 0; i < latestGroups.length; i++) {
              for (const rhyme of data.rhymes) {
                if (latestGroups[i].rhymes.has(rhyme)) {
                  matchedGroupIndex = i;
                  break;
                }
              }
              if (matchedGroupIndex !== -1) break;
            }

            if (matchedGroupIndex !== -1) {
              const group = latestGroups[matchedGroupIndex];
              const newRhymes = new Set(group.rhymes);
              newRhymes.add(cleanWord);
              data.rhymes.forEach(r => newRhymes.add(r));

              const newGroups = [...latestGroups];
              newGroups[matchedGroupIndex] = { ...group, rhymes: newRhymes };
              
              rhymeGroupsRef.current = newGroups;
              setRhymeGroups(newGroups);
              colorToApply = group.color;
            } else {
              const colorIndex = latestGroups.length % RHYME_COLORS.length;
              const newColor = RHYME_COLORS[colorIndex];
              const newRhymes = new Set(data.rhymes);
              newRhymes.add(cleanWord);

              const newGroups = [...latestGroups, { color: newColor, rhymes: newRhymes }];
              
              rhymeGroupsRef.current = newGroups;
              setRhymeGroups(newGroups);
              colorToApply = newColor;
            }
          }

          if (colorToApply) {
            Transforms.setNodes(
              editor,
              { rhymeColor: colorToApply },
              { at: range, match: n => Text.isText(n), split: true }
            );
          }
        } catch (err) {
          console.error(err);
        }
        
        // Remove processed item
        processingQueue.current.shift();
      }
    } finally {
      isProcessing.current = false;
      setAnalyzingWord(null);
    }
  };

  const handleRhymeCheckWithRange = (word: string, range: Range) => {
    processingQueue.current.push({ word, range });
    processQueue();
  };

  // Improved Rhyme Check Trigger
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      // Get the current node before the split
      const { selection } = editor;
      if (selection && Range.isCollapsed(selection)) {
        const [node, path] = Editor.node(editor, selection);
        if (Text.isText(node)) {
          const text = node.text;
          // Get text up to the cursor
          const textBeforeCursor = text.slice(0, selection.anchor.offset);
          
          // Simple regex to get the last word
          const words = textBeforeCursor.trim().split(/\s+/);
          const lastWord = words[words.length - 1];
          
          if (lastWord) {
             // Find the start of the last word
             const end = selection.anchor.offset;
             const start = text.lastIndexOf(lastWord, end); 
             
             if (start !== -1) {
                const range = {
                  anchor: { path, offset: start },
                  focus: { path, offset: start + lastWord.length }
                };
                
                // Trigger check
                handleRhymeCheckWithRange(lastWord, range);
             }
          }
        }
      }
    }
  };

  // Thesaurus Context Menu
  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    
    // 1. Try to get the Slate Range from the click position
    try {
      // Use document.caretRangeFromPoint to find where the user clicked
      // This works even if the user clicked on a styled span
      if (document.caretRangeFromPoint) {
        const domRange = document.caretRangeFromPoint(event.clientX, event.clientY);
        if (domRange) {
          // Convert DOM range to Slate range
          const range = ReactEditor.toSlateRange(editor, domRange, {
            exactMatch: false,
            suppressThrow: true,
          });

          if (range) {
            // Select the clicked point
            Transforms.select(editor, range);

            // Expand selection to the word boundary
            // We use Editor.before and Editor.after with 'word' unit
            const start = Editor.before(editor, range, { unit: 'word' });
            const end = Editor.after(editor, range, { unit: 'word' });

            if (start && end) {
              const wordRange = { anchor: start, focus: end };
              Transforms.select(editor, wordRange);
              
              const word = Editor.string(editor, wordRange);
              
              if (word && word.trim()) {
                setMenuPosition({ x: event.clientX, y: event.clientY });
                setSelectedWord(word.trim());
                setLoadingThesaurus(true);
                setThesaurusData(null);
                
                fetchThesaurus(word.trim())
                  .then(setThesaurusData)
                  .catch(console.error)
                  .finally(() => setLoadingThesaurus(false));
                return;
              }
            }
          }
        }
      }
    } catch (e) {
      console.error("Error selecting word for thesaurus:", e);
    }

    // Fallback: If we couldn't select a word, close the menu
    setMenuPosition(null);
  };

  const handleThesaurusSelect = (word: string) => {
    if (editor.selection) {
       editor.insertText(word);
    }
    setMenuPosition(null);
  };

  return (
    <div className="flex h-full bg-zinc-950 text-zinc-100 font-sans overflow-hidden relative">
      {/* Sidebar Toggle */}
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="absolute top-4 left-4 z-50 p-2 bg-zinc-900 rounded-md border border-zinc-800 hover:bg-zinc-800 transition-colors"
      >
        {isSidebarOpen ? <X size={16} /> : <Menu size={16} />}
      </button>

      {/* Sidebar */}
      <div className={cn(
        "absolute inset-y-0 left-0 w-80 bg-zinc-900 border-r border-zinc-800 z-40 transform transition-transform duration-300 ease-in-out flex flex-col",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between pt-16">
          <h2 className="font-bold text-lg">Saved Songs</h2>
          <button onClick={createNewSong} className="p-1.5 hover:bg-zinc-800 rounded-md text-indigo-400">
            <Plus size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {savedSongs.length === 0 && (
            <div className="text-zinc-500 text-sm p-4 text-center">No saved songs yet.</div>
          )}
          {savedSongs.map(song => (
            <div 
              key={song.id}
              onClick={() => loadSong(song)}
              className={cn(
                "p-3 rounded-lg cursor-pointer group flex items-center justify-between transition-colors",
                currentSongId === song.id ? "bg-indigo-900/20 border border-indigo-500/30" : "hover:bg-zinc-800 border border-transparent"
              )}
            >
              <div className="overflow-hidden">
                <div className="font-medium truncate text-sm text-zinc-200">{song.title}</div>
                <div className="text-xs text-zinc-500 truncate">{new Date(song.updatedAt).toLocaleDateString()}</div>
              </div>
              <button 
                onClick={(e) => deleteSong(song.id, e)}
                className="opacity-0 group-hover:opacity-100 p-1.5 text-zinc-500 hover:text-red-400 transition-opacity"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        {/* Export Actions */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950/50">
          <div className="text-xs font-medium text-zinc-500 mb-2 uppercase tracking-wider">Export Current</div>
          <div className="flex gap-2">
            <button onClick={() => exportSong('txt')} className="flex-1 flex items-center justify-center gap-2 p-2 bg-zinc-800 hover:bg-zinc-700 rounded text-xs border border-zinc-700">
              <FileText size={14} /> TXT
            </button>
            <button onClick={() => exportSong('json')} className="flex-1 flex items-center justify-center gap-2 p-2 bg-zinc-800 hover:bg-zinc-700 rounded text-xs border border-zinc-700">
              <FileJson size={14} /> JSON
            </button>
            <button onClick={() => exportSong('md')} className="flex-1 flex items-center justify-center gap-2 p-2 bg-zinc-800 hover:bg-zinc-700 rounded text-xs border border-zinc-700">
              <FileType size={14} /> MD
            </button>
          </div>
        </div>
      </div>

      {/* Gutter */}
      <div className="w-16 bg-zinc-900 border-r border-zinc-800 flex-shrink-0 pt-16">
        <SyllableGutter editor={editor} />
      </div>

      {/* Editor Area */}
      <div className="flex-1 flex flex-col relative pt-12">
        <div className="absolute top-4 right-4 z-10 pointer-events-none flex gap-2">
           {analyzingWord && (
             <div className="flex items-center text-xs text-indigo-400 bg-zinc-900/80 px-2 py-1 rounded-full border border-indigo-500/30 backdrop-blur-sm">
               <Loader2 className="animate-spin mr-1.5" size={12} />
               Analyzing rhymes...
             </div>
           )}
        </div>

        <div key={editorKey} className="contents">
          <Slate editor={editor} initialValue={value} onChange={setValue}>
            <Editable
              renderElement={renderElement}
              renderLeaf={renderLeaf}
              onKeyDown={handleKeyDown}
              className="flex-1 p-8 outline-none text-lg max-w-4xl mx-auto w-full overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700"
              placeholder="Start your flow..."
              spellCheck={false}
            />
          </Slate>
        </div>
      </div>

      <ThesaurusMenu
        position={menuPosition}
        word={selectedWord}
        data={thesaurusData}
        loading={loadingThesaurus}
        onClose={() => setMenuPosition(null)}
        onSelect={handleThesaurusSelect}
      />
    </div>
  );
};
