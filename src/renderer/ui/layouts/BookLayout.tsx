import React from 'react';
import bronzeTexture from '../../assets/textures/bronze-512.webp';
import ricePaperTexture from '../../assets/textures/rice-paper-1024.webp';
import { BtnPrimary, DividerLine } from '../components/common/svg';

interface BookLayoutProps {
  leftContent: React.ReactNode;
  rightContent: React.ReactNode;
  rightTitle?: string;
}

export function BookLayout({ leftContent, rightContent, rightTitle }: BookLayoutProps) {
  return (
    <div className="h-full flex">
      <div
        className="w-[40%] h-full overflow-auto relative"
        style={{
          backgroundImage: `url(${bronzeTexture})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-black/40 pointer-events-none" />
        <div className="relative z-10 h-full flex flex-col p-5">
          {leftContent}
        </div>
      </div>

      <div className="w-px bg-gold-dim/40 shrink-0" />

      <div
        className="flex-1 h-full overflow-hidden relative flex flex-col"
        style={{
          backgroundImage: `url(${ricePaperTexture})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {rightTitle && (
          <div className="shrink-0">
            <div className="relative flex items-center justify-center py-2.5 px-6">
              <BtnPrimary
                className="absolute inset-0 w-full h-full text-gold-dim/50 pointer-events-none"
                preserveAspectRatio="none"
              />
              <span className="relative z-10 text-sm font-bold text-leather font-[family-name:var(--font-display)] tracking-widest">
                {rightTitle}
              </span>
            </div>
            <DividerLine
              className="w-full h-1 text-gold-dim/30 pointer-events-none"
              preserveAspectRatio="none"
            />
          </div>
        )}
        <div className="flex-1 overflow-auto">
          {rightContent}
        </div>
      </div>
    </div>
  );
}
