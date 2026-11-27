'use client';
import dynamic from 'next/dynamic';

// Loaded after the page is interactive so it does not block first paint.
const Widget = dynamic(() => import('./ResearchAssistantWidget'), { ssr: false });

export default function LazyAssistant() {
  return <Widget />;
}
