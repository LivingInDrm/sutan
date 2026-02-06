import React from 'react';
import { ResourceBar } from '../components/common/ResourceBar';

export function GameLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen w-screen flex flex-col bg-gray-950">
      <ResourceBar />
      <main className="flex-1 overflow-hidden relative">
        {children}
      </main>
    </div>
  );
}
