'use client';

import dynamic from 'next/dynamic';

// The Live Architect Studio editor is the only user-visible route.
// Loaded with ssr:false because the Three.js viewport cannot SSR.
const EditorLayout = dynamic(() => import('@/components/editor/EditorLayout'), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-full items-center justify-center bg-[#1a1a2e]">
      <div className="flex flex-col items-center gap-3 text-[#5a5a8a]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#2a2a4a] border-t-emerald-500" />
        <span className="font-mono text-xs uppercase tracking-widest">Loading Live Architect Studio…</span>
      </div>
    </div>
  ),
});

export default function Home() {
  return <EditorLayout />;
}
