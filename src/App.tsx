/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FlowEditor } from './components/FlowEditor';

export default function App() {
  return (
    <div className="h-screen w-screen bg-zinc-950 text-white overflow-hidden">
      <header className="h-14 border-b border-zinc-800 flex items-center px-6 bg-zinc-950">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
          <h1 className="font-bold text-lg tracking-tight text-zinc-100">FlowState</h1>
        </div>
        <div className="ml-auto flex items-center space-x-4">
          <div className="hidden md:flex items-center space-x-1 text-xs text-zinc-500 font-mono bg-zinc-900 px-3 py-1.5 rounded-full border border-zinc-800">
             <span className="w-2 h-2 rounded-full bg-zinc-600 mr-2"></span>
             <span>Enter = Rhyme Check</span>
             <span className="mx-2 text-zinc-700">|</span>
             <span>Right Click = Rhyme Explorer</span>
          </div>
          <div className="text-xs text-zinc-500 font-mono">
            v1.0.0
          </div>
        </div>
      </header>
      <main className="h-[calc(100vh-3.5rem)]">
        <FlowEditor />
      </main>
    </div>
  );
}

