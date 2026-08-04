'use client';

import { EditorLayout } from '@/components/editor/EditorLayout';
import { useEffect } from 'react';
import { useEditorStore } from '@/lib/editor/store';

export default function EditorPage() {
  const loadCapabilities = useEditorStore((s) => s.loadCapabilities);

  useEffect(() => {
    loadCapabilities();
  }, [loadCapabilities]);

  useEffect(() => {
    document.documentElement.classList.add('dark');
    return () => { document.documentElement.classList.remove('dark'); };
  }, []);

  return <EditorLayout />;
}
