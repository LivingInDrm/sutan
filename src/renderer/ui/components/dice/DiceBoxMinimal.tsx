import { useEffect, useRef } from 'react';
import DiceBox from '@3d-dice/dice-box';

type DiceBoxInstance = {
  init: () => Promise<void>;
  roll: (notation: string) => Promise<unknown>;
  onRollComplete?: (results?: unknown) => void;
};

export function DiceBoxMinimal() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const box = new (DiceBox as any)({
      container: '#dice-minimal',
      assetPath: '/dice-box/assets/',
      theme: 'chinese-pip',
      externalThemes: { 'chinese-pip': '/dice-box/external-themes/chinese-pip' },
      offscreen: false,
      throwForce: 9,
    }) as DiceBoxInstance;

    box.init().then(() => {
      if (import.meta.env.DEV) {
        console.log('[Minimal] init done');
      }
      const canvas = containerRef.current?.querySelector('canvas');
      if (canvas) {
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.background = 'transparent';
      }
      box.onRollComplete = (results: unknown) => {
        if (import.meta.env.DEV) {
          console.log('[Minimal] roll complete', results);
        }
      };
      box.roll('3d6');
    });
  }, []);

  return (
    <div
      style={{
        width: '100%',
        height: '500px',
        backgroundImage: 'url(/dice-box/table-bg-4.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div ref={containerRef} id="dice-minimal" style={{ width: '100%', height: '100%' }} />
    </div>
  );
}