'use client';

import dynamic from 'next/dynamic';

const EditorLayout = dynamic(() => import('@/components/editor/EditorLayout'), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-full items-center justify-center bg-[#1a1a2e]">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#2a2a4a] border-t-emerald-500" />
        <p className="text-sm text-[#8888aa]">Summoning the Live Architect Studio…</p>
      </div>
    </div>
  ),
});

export default function Home() {
  return <EditorLayout />;
}
