import React from 'react';
import { syllable } from 'syllable';
import { Node } from 'slate';
import { cn } from '@/lib/utils';

interface SyllableGutterProps {
  nodes: Node[];
  className?: string;
}

export const SyllableGutter: React.FC<SyllableGutterProps> = ({ nodes, className }) => {
  return (
    <div className={cn("flex flex-col py-4 pr-2 text-right select-none text-gray-500 font-mono text-sm leading-relaxed", className)}>
      {nodes.map((node, index) => {
        const text = Node.string(node);
        const count = text.trim() ? syllable(text) : 0;
        return (
          <div key={index} className="h-6 flex items-center justify-end">
            {count > 0 ? count : '-'}
          </div>
        );
      })}
    </div>
  );
};
