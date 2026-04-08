import React, { useRef, useState, useCallback, useEffect } from 'react';
import { getUiAssetUrl } from '../../../lib/assetPaths';
import { BookLayout } from '../../layouts/BookLayout';

interface EventSettlementFrameProps {
  leftContent: React.ReactNode;
  rightContent: React.ReactNode;
  rightTitle?: string;
  backgroundAssetId?: string;
}

interface ImageBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function EventSettlementFrame({
  leftContent,
  rightContent,
  rightTitle,
  backgroundAssetId = 'ui_004',
}: EventSettlementFrameProps) {
  const bgUrl = getUiAssetUrl(backgroundAssetId);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [imageBounds, setImageBounds] = useState<ImageBounds | null>(null);

  /**
   * Recalculate the actual pixel area that the background image occupies
   * inside the container when rendered with `object-contain`.
   *
   * object-contain letterboxes/pillarboxes the image to preserve aspect ratio.
   * The content overlay must match this exact area — not the full container —
   * so that all content stays inside the decorative ink border.
   */
  const computeImageBounds = useCallback(() => {
    const container = containerRef.current;
    const img = imgRef.current;
    if (!container || !img || !img.naturalWidth || !img.naturalHeight) return;

    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const imgAspect = img.naturalWidth / img.naturalHeight;
    const containerAspect = cw / ch;

    let w: number, h: number, left: number, top: number;
    if (imgAspect > containerAspect) {
      // Image wider than container: letterboxed (blank bars top & bottom)
      w = cw;
      h = cw / imgAspect;
      left = 0;
      top = (ch - h) / 2;
    } else {
      // Image taller than container: pillarboxed (blank bars left & right)
      h = ch;
      w = ch * imgAspect;
      left = (cw - w) / 2;
      top = 0;
    }

    setImageBounds({ left, top, width: w, height: h });
  }, []);

  // Re-measure whenever the container is resized (e.g. window resize)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(computeImageBounds);
    ro.observe(container);
    return () => ro.disconnect();
  }, [computeImageBounds]);

  if (!bgUrl) {
    return (
      <BookLayout
        leftContent={leftContent}
        rightContent={rightContent}
        rightTitle={rightTitle}
      />
    );
  }

  return (
    /* Outer centering shell — lets the dark game background show around the panel */
    <div className="h-full w-full flex items-center justify-center p-4">

      {/* Settlement panel — slightly larger than before to use more screen real estate */}
      <div ref={containerRef} className="relative w-[95%] h-[92%]">

        {/* Background image — object-contain keeps the decorative border fully visible */}
        <img
          ref={imgRef}
          src={bgUrl}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
          onLoad={computeImageBounds}
        />

        {/*
          Content overlay — absolutely positioned to match the EXACT pixel bounds
          of the rendered image (not the full container). This ensures no content
          ever escapes the decorative ink border, even after window resize.
        */}
        {imageBounds && (
          <div
            className="absolute z-10 overflow-hidden"
            style={{
              left: imageBounds.left,
              top: imageBounds.top,
              width: imageBounds.width,
              height: imageBounds.height,
            }}
          >
            {/* Inner padding keeps text/cards away from the ink border */}
            <div className="flex w-full h-full px-[8%] py-[10%]">

              {/* Left panel — transparent, background image shows through */}
              <div className="w-1/2 h-full overflow-auto relative rounded-sm">
                <div className="relative h-full flex flex-col p-3">
                  {leftContent}
                </div>
              </div>

              {/* Vertical divider */}
              <div className="w-px bg-amber-700/30 shrink-0 mx-1" />

              {/* Right panel — transparent, background image shows through */}
              <div className="w-1/2 h-full overflow-hidden relative flex flex-col rounded-sm">

                {rightTitle && (
                  <div className="shrink-0 pt-4 px-5 pb-2">
                    <h2 className="text-center text-sm font-bold text-amber-950 font-(family-name:--font-display) tracking-widest">
                      {rightTitle}
                    </h2>
                    <div className="mt-2 h-px bg-amber-700/40" />
                  </div>
                )}

                <div className={`flex-1 overflow-auto px-5 ${rightTitle ? 'pb-4' : 'py-4'}`}>
                  {rightContent}
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
