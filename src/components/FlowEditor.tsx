import React, { useCallback, useMemo, useState } from 'react';
import { createEditor, Descendant, Editor, Transforms, Text, Node, Range } from 'slate';
import { Slate, Editable, withReact, RenderElementProps, RenderLeafProps } from 'slate-react';
import { withHistory } from 'slate-history';
import { SyllableGutter } from './SyllableGutter';
import { ThesaurusMenu } from './ThesaurusMenu';
import { fetchRhymes, fetchThesaurus, ThesaurusData } from '@/lib/api';
import { RHYME_COLORS, cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

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

export const FlowEditor: React.FC = () => {
  const editor = useMemo(() => withHistory(withReact(createEditor())), []);
  const [value, setValue] = useState<Descendant[]>(initialValue);
  
  // Rhyme State
  const [rhymeGroups, setRhymeGroups] = useState<RhymeGroup[]>([]);
  const [analyzingWord, setAnalyzingWord] = useState<string | null>(null);

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

  const handleRhymeCheckWithRange = async (word: string, range: Range) => {
      if (!word || word.length < 2) return;
      const cleanWord = word.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      setAnalyzingWord(cleanWord);

      try {
        let colorToApply = '';
        let foundGroupIndex = -1;
        
        // 1. Check existing
        rhymeGroups.forEach((group, index) => {
          if (group.rhymes.has(cleanWord)) foundGroupIndex = index;
        });

        if (foundGroupIndex !== -1) {
          colorToApply = rhymeGroups[foundGroupIndex].color;
        } else {
          // 2. Fetch
          const data = await fetchRhymes(cleanWord);
          let matchedGroupIndex = -1;
          for (let i = 0; i < rhymeGroups.length; i++) {
             for (const rhyme of data.rhymes) {
               if (rhymeGroups[i].rhymes.has(rhyme)) {
                 matchedGroupIndex = i;
                 break;
               }
             }
             if (matchedGroupIndex !== -1) break;
          }

          if (matchedGroupIndex !== -1) {
            const group = rhymeGroups[matchedGroupIndex];
            const newRhymes = new Set(group.rhymes);
            newRhymes.add(cleanWord);
            data.rhymes.forEach(r => newRhymes.add(r));
            const newGroups = [...rhymeGroups];
            newGroups[matchedGroupIndex] = { ...group, rhymes: newRhymes };
            setRhymeGroups(newGroups);
            colorToApply = group.color;
          } else {
            const colorIndex = rhymeGroups.length % RHYME_COLORS.length;
            const newColor = RHYME_COLORS[colorIndex];
            const newRhymes = new Set(data.rhymes);
            newRhymes.add(cleanWord);
            setRhymeGroups(prev => [...prev, { color: newColor, rhymes: newRhymes }]);
            colorToApply = newColor;
          }
        }

        if (colorToApply) {
          // Apply color to the specific range
          Transforms.setNodes(
            editor,
            { rhymeColor: colorToApply },
            { at: range, match: n => Text.isText(n), split: true }
          );
        }

      } catch (err) {
        console.error(err);
      } finally {
        setAnalyzingWord(null);
      }
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
    
    // Use native selection to get the word
    const selection = window.getSelection();
    let wordToQuery = selection ? selection.toString().trim() : '';
    
    // If no selection, try to get word at cursor position (simplified)
    if (!wordToQuery) {
       // This is a bit complex to do perfectly without range expansion.
       // For now, we rely on the user selecting the word.
       // Or we can use the leaf text if it's a single word (which happens after coloring).
       const target = event.target as HTMLElement;
       if (target.innerText && target.innerText.split(' ').length === 1) {
          wordToQuery = target.innerText;
       }
    }

    if (wordToQuery) {
      setMenuPosition({ x: event.clientX, y: event.clientY });
      setSelectedWord(wordToQuery);
      setLoadingThesaurus(true);
      setThesaurusData(null);
      
      fetchThesaurus(wordToQuery)
        .then(setThesaurusData)
        .catch(console.error)
        .finally(() => setLoadingThesaurus(false));
    }
  };

  const handleThesaurusSelect = (word: string) => {
    if (editor.selection) {
       editor.insertText(word);
    }
    setMenuPosition(null);
  };

  return (
    <div className="flex h-full bg-zinc-950 text-zinc-100 font-sans overflow-hidden">
      {/* Gutter */}
      <div className="w-16 bg-zinc-900 border-r border-zinc-800 flex-shrink-0 pt-8">
        <SyllableGutter nodes={value} />
      </div>

      {/* Editor Area */}
      <div className="flex-1 flex flex-col relative">
        <div className="absolute top-4 right-4 z-10 pointer-events-none">
           {analyzingWord && (
             <div className="flex items-center text-xs text-indigo-400 bg-zinc-900/80 px-2 py-1 rounded-full border border-indigo-500/30 backdrop-blur-sm">
               <Loader2 className="animate-spin mr-1.5" size={12} />
               Analyzing rhymes...
             </div>
           )}
        </div>

        <Slate editor={editor} initialValue={initialValue} onChange={setValue}>
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
