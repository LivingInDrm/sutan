import React from 'react';
import bronzeTexture from '../../../assets/textures/bronze-512.webp';
import ricePaperTexture from '../../../assets/textures/rice-paper-1024.webp';
import { BookLayout } from '../../layouts/BookLayout';

interface EventSettlementFrameProps {
  leftContent: React.ReactNode;
  rightContent: React.ReactNode;
  rightTitle?: string;
  backgroundImageUrl?: string;
  leftFooterContent?: React.ReactNode;
}

export function EventSettlementFrame({
  leftContent,
  rightContent,
  rightTitle,
  backgroundImageUrl,
  leftFooterContent,
}: EventSettlementFrameProps) {
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 flex overflow-hidden min-h-0">
        <div className="w-1/2 relative overflow-hidden shrink-0 flex flex-col">
          {backgroundImageUrl ? (
            <img
              src={backgroundImageUrl}
              alt=""
              aria-hidden
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${bronzeTexture})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
          )}

          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/60 pointer-events-none" />
          <div className="absolute inset-0 bg-black/25 pointer-events-none" />

          <div className="relative z-10 flex h-full min-h-0 flex-col">
            <div className={`min-h-0 flex-1 overflow-y-auto px-6 ${leftFooterContent ? 'pt-6 pb-3' : 'py-6'}`}>
              {leftContent}
            </div>
            {leftFooterContent && (
              <div className="shrink-0 px-6 pb-6 pt-3">
                {leftFooterContent}
              </div>
            )}
          </div>
        </div>

        <div
          className="w-1/2 flex flex-col overflow-hidden relative"
          style={{
            backgroundImage: `url(${ricePaperTexture})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(232,220,200,0.88),rgba(199,182,148,0.78))] pointer-events-none" />
          <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-gold-500/34 to-transparent pointer-events-none" />

          <div className="relative z-10 flex flex-col h-full overflow-hidden">
            {rightTitle && (
              <div className="px-7 pt-7 pb-4 shrink-0">
                <div className="mb-2 flex items-center justify-center gap-3">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gold-500/35 to-gold-500/10" />
                  <span className="text-[10px] tracking-[0.26em] text-gold-500/72 font-(family-name:--font-ui)">卷中题签</span>
                  <div className="h-px flex-1 bg-gradient-to-l from-transparent via-gold-500/35 to-gold-500/10" />
                </div>
                <h2 className="text-center text-[18px] font-bold text-[#1a0f0a] font-(family-name:--font-display) tracking-[0.1em]">
                  {rightTitle}
                </h2>
                <div className="mt-3 h-px bg-gradient-to-r from-transparent via-amber-700/40 to-transparent" />
              </div>
            )}

            <div className={`relative z-10 flex-1 overflow-hidden ${rightTitle ? 'px-7 pb-5' : 'px-7 py-5'}`}>
              {rightContent}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
