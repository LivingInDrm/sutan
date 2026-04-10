import type { Story } from '@ladle/react';
import { useMemo, useState } from 'react';
import { DiceBoxOverlay } from './DiceBoxOverlay';

export const DiceRollTest: Story = () => {
  const [visible, setVisible] = useState(false);
  const [result, setResult] = useState<{ dice: [number, number, number] } | null>(null);
  const [overlayResult, setOverlayResult] = useState<{ dice: [number, number, number] } | null>(null);
  const [phase, setPhase] = useState<'idle' | 'ready' | 'rolling' | 'finished'>('idle');
  const total = result ? result.dice.reduce((sum, value) => sum + value, 0) : 0;
  const target = 10;
  const resultLabel = total >= target + 3 ? '大成功' : total >= target ? '部分成功' : total <= target - 5 ? '大失败' : '失败';
  const phaseText = useMemo(() => {
    if (phase === 'ready') {
      return '阶段1：桌面已弹出，等待点击掷骰';
    }
    if (phase === 'rolling') {
      return '阶段2：命骰翻滚中';
    }
    if (phase === 'finished') {
      return '阶段3：结果停留，等待关闭';
    }
    return '点击按钮开始三阶段流程';
  }, [phase]);

  return (
    <div style={{ minHeight: '100vh', padding: 20, background: '#120c08', color: '#f4e7c1' }}>
      <h2 style={{ marginBottom: 16, fontSize: 24 }}>Dice Box 独立测试</h2>
      <p style={{ marginBottom: 16, color: '#d5c18a' }}>{phaseText}</p>
      <button
        type="button"
        onClick={() => {
          setResult(null);
          setOverlayResult(null);
          setPhase('ready');
          setVisible(true);
        }}
        style={{
          borderRadius: 10,
          border: '1px solid rgba(212, 175, 55, 0.45)',
          background: 'rgba(0,0,0,0.35)',
          padding: '10px 16px',
          color: '#f4e7c1',
          cursor: 'pointer',
        }}
      >
        开始掷骰（3颗D6）
      </button>

      {result && (
        <div style={{ marginTop: 20, lineHeight: 1.8 }}>
          <p>初始骰: {JSON.stringify(result.dice)}</p>
                  </div>
      )}

      <DiceBoxOverlay
                visible={visible}
        onPhaseChange={(nextPhase) => {
          if (nextPhase === 'rolling') {
            setPhase('rolling');
          }
        }}
        onComplete={(rollResult) => {
          setOverlayResult(rollResult);
          setResult(rollResult);
          setPhase('finished');
          setVisible(false);
        }}
        onCancel={() => {
          setVisible(false);
          setPhase('idle');
        }}
        resultSummaryText={overlayResult ? `总和: ${total} / DC ${target}` : null}
        resultLabelText={overlayResult ? resultLabel : null}
      />
    </div>
  );
};
DiceRollTest.meta = { title: 'DiceBoxOverlay / DiceRollTest' };