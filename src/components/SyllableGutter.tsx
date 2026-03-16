import React, { useEffect, useRef, useState } from 'react';
import { syllable } from 'syllable';
import { Node } from 'slate';
import { ReactEditor } from 'slate-react';
import { cn } from '@/lib/utils';

interface SyllableGutterProps {
  editor: ReactEditor;
  className?: string;
}

export const SyllableGutter: React.FC<SyllableGutterProps> = ({ editor, className }) => {
  const [lineHeights, setLineHeights] = useState<number[]>([]);
  const gutterRef = useRef<HTMLDivElement>(null);

  // Measure line heights from the editor DOM
  useEffect(() => {
    const updateHeights = () => {
      const heights: number[] = [];
      editor.children.forEach((node) => {
        try {
          const domNode = ReactEditor.toDOMNode(editor, node);
          if (domNode) {
            // Get the full height including margins if any (though Slate usually uses line-height)
            // clientHeight is usually enough for block elements in Slate
            heights.push(domNode.getBoundingClientRect().height);
          } else {
             heights.push(28); // Fallback (approx 1.75rem line-height)
          }
        } catch (e) {
          heights.push(28); // Fallback
        }
      });
      setLineHeights(prev => {
        if (prev.length === heights.length && prev.every((h, i) => Math.abs(h - heights[i]) < 1)) {
          return prev;
        }
        return heights;
      });
    };

    // Run initially and on resize
    updateHeights();
    window.addEventListener('resize', updateHeights);
    
    // Also run on every render (which happens when editor content changes)
    // We can't easily subscribe to "layout changes" other than render
    
    return () => window.removeEventListener('resize', updateHeights);
  }, [editor.children]); // Run when editor content changes

  // Sync scroll with editor
  useEffect(() => {
    try {
        // The scroll container in Slate Editable is the element itself if it has overflow
        const scrollContainer = ReactEditor.toDOMNode(editor, editor);
        
        const handleScroll = () => {
           if (gutterRef.current) {
             gutterRef.current.scrollTop = scrollContainer.scrollTop;
           }
        };
        
        scrollContainer.addEventListener('scroll', handleScroll);
        // Initial sync
        handleScroll();
        
        return () => scrollContainer.removeEventListener('scroll', handleScroll);
    } catch (e) {
        // Editor might not be mounted yet
    }
  }, [editor]);

  return (
    <div 
      ref={gutterRef}
      className={cn(
        "flex flex-col py-8 pr-2 text-right select-none text-gray-500 font-mono text-sm leading-relaxed overflow-hidden h-full", 
        className
      )}
    >
      {editor.children.map((node, index) => {
        const text = Node.string(node);
        const count = text.trim() ? syllable(text) : 0;
        // Use measured height or default
        // We add some buffer or ensure it matches exactly. 
        // Slate paragraphs usually have some margin-bottom? 
        // In FlowEditor, we used `my-1` on paragraphs.
        // getBoundingClientRect().height includes padding and border, but not margin.
        // If `my-1` is used, we need to account for it?
        // Wait, `getBoundingClientRect` on the element *includes* the content height.
        // If the element has `my-1` (margin), that's outside the element.
        // We need to match the visual height occupied by the line.
        // Let's check FlowEditor renderElement: `className="relative leading-relaxed my-1"`
        // `my-1` is 0.25rem (4px) top and bottom. So 8px total margin.
        // We should add that to the height if we are just stacking divs.
        
        const measuredHeight = lineHeights[index];
        const heightStyle = measuredHeight ? { height: `${measuredHeight + 8}px` } : { minHeight: '28px' }; 
        // +8 for the my-1 (4px top + 4px bottom)
        
        return (
          <div 
            key={index} 
            className="flex items-center justify-end"
            style={heightStyle}
          >
            {count > 0 ? count : '-'}
          </div>
        );
      })}
    </div>
  );
};
