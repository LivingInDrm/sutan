import type { Story } from '@ladle/react';
import React, { useState, useCallback, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, ContactShadows, Float } from '@react-three/drei';
import { D20Mesh } from './D20Mesh';
import { FACE_NUMBERS } from './D20Geometry';

const DARK_BG = '#0d0a0e';

function SceneWrap({
  children,
  height = '600px',
}: {
  children: React.ReactNode;
  height?: string;
}) {
  return (
    <div style={{ width: '100%', height, background: DARK_BG, borderRadius: 12, overflow: 'hidden', position: 'relative' }}>
      {children}
    </div>
  );
}

function PageWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-leather min-h-screen p-6">
      {children}
    </div>
  );
}

function ResultBanner({ value, visible }: { value: number | null; visible: boolean }) {
  if (!visible || value === null) return null;

  const isNat20 = value === 20;
  const isNat1 = value === 1;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 80,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10,
        textAlign: 'center',
        animation: 'fadeInUp 0.4s ease-out',
      }}
    >
      {(isNat20 || isNat1) && (
        <div style={{
          fontSize: 14,
          fontWeight: 'bold',
          color: isNat20 ? '#4ade80' : '#ef4444',
          letterSpacing: 4,
          marginBottom: 4,
          textTransform: 'uppercase',
          textShadow: isNat20 ? '0 0 12px rgba(74,222,128,0.6)' : '0 0 12px rgba(239,68,68,0.6)',
        }}>
          {isNat20 ? 'NATURAL 20' : 'CRITICAL FAIL'}
        </div>
      )}
      <div style={{
        fontSize: 56,
        fontWeight: 'bold',
        fontFamily: 'Georgia, serif',
        color: isNat20 ? '#4ade80' : isNat1 ? '#ef4444' : '#e8dcc8',
        textShadow: `0 0 20px ${isNat20 ? 'rgba(74,222,128,0.5)' : isNat1 ? 'rgba(239,68,68,0.5)' : 'rgba(201,168,76,0.4)'}`,
      }}>
        {value}
      </div>
    </div>
  );
}

function RollButton({ onClick, disabled, label }: { onClick: () => void; disabled?: boolean; label?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        position: 'absolute',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10,
        padding: '10px 32px',
        background: 'linear-gradient(135deg, rgba(201,168,76,0.15), rgba(201,168,76,0.05))',
        border: '1px solid rgba(201,168,76,0.4)',
        borderRadius: 8,
        color: '#c9a84c',
        fontSize: 15,
        fontWeight: 'bold',
        fontFamily: "'Ma Shan Zheng', Georgia, serif",
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'all 0.2s',
        letterSpacing: 3,
      }}
    >
      {label ?? '点击骰子'}
    </button>
  );
}

const styleTag = document.createElement('style');
styleTag.textContent = `
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateX(-50%) translateY(10px); }
    to { opacity: 1; transform: translateX(-50%) translateY(0); }
  }
`;
if (!document.querySelector('[data-d20-styles]')) {
  styleTag.setAttribute('data-d20-styles', '');
  document.head.appendChild(styleTag);
}

// ===== Story A: Showcase =====
export const Showcase: Story = () => (
  <PageWrap>
    <div className="text-center mb-4">
      <h2 className="text-gold text-xl font-bold font-[family-name:var(--font-display)] text-glow-gold">
        D20 水晶骰子展示
      </h2>
      <p className="text-parchment/50 text-xs mt-1">自动旋转，鼠标悬停缩放</p>
    </div>
    <SceneWrap>
      <Canvas camera={{ position: [0, 2, 4], fov: 45 }}>
        <ambientLight intensity={0.3} />
        <directionalLight position={[5, 5, 5]} intensity={1} color="#fff5e0" />
        <directionalLight position={[-3, 2, -3]} intensity={0.4} color="#8080ff" />
        <pointLight position={[0, 3, 0]} intensity={0.8} color="#c9a84c" />
        <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.5}>
          <D20Mesh spinning spinSpeed={0.4} scale={1.4} />
        </Float>
        <ContactShadows
          position={[0, -1.5, 0]}
          opacity={0.4}
          scale={6}
          blur={2}
          far={3}
          color="#1a0f0a"
        />
        <Environment preset="night" />
      </Canvas>
    </SceneWrap>
  </PageWrap>
);
Showcase.meta = { title: 'D20 3D / Showcase' };

// ===== Story B: Face Selector =====
export const FaceSelector: Story = () => {
  const [selected, setSelected] = useState(20);

  return (
    <PageWrap>
      <div className="text-center mb-4">
        <h2 className="text-gold text-xl font-bold font-[family-name:var(--font-display)] text-glow-gold">
          面选择器
        </h2>
        <p className="text-parchment/50 text-xs mt-1">点击数字查看对应面朝上</p>
      </div>
      <SceneWrap height="500px">
        <Canvas camera={{ position: [0, 2.5, 3.5], fov: 45 }}>
          <ambientLight intensity={0.3} />
          <directionalLight position={[5, 5, 5]} intensity={1} color="#fff5e0" />
          <directionalLight position={[-3, 2, -3]} intensity={0.4} color="#8080ff" />
          <pointLight position={[0, 3, 0]} intensity={0.8} color="#c9a84c" />
          <D20Mesh targetNumber={selected} scale={1.3} />
          <ContactShadows position={[0, -1.5, 0]} opacity={0.3} scale={5} blur={2} far={3} />
          <Environment preset="night" />
        </Canvas>
        <div style={{
          position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', maxWidth: 400,
          zIndex: 10,
        }}>
          {FACE_NUMBERS.sort((a, b) => a - b).map(n => (
            <button
              key={n}
              onClick={() => setSelected(n)}
              style={{
                width: 36, height: 36, borderRadius: 6,
                background: n === selected
                  ? 'linear-gradient(135deg, rgba(201,168,76,0.3), rgba(201,168,76,0.1))'
                  : 'rgba(255,255,255,0.05)',
                border: n === selected ? '1px solid rgba(201,168,76,0.6)' : '1px solid rgba(255,255,255,0.1)',
                color: n === selected ? '#c9a84c' : '#888',
                fontSize: 13, fontWeight: 'bold', cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {n}
            </button>
          ))}
        </div>
      </SceneWrap>
    </PageWrap>
  );
};
FaceSelector.meta = { title: 'D20 3D / Face Selector' };

// ===== Story C: Click to Roll (BG3 Style) =====
export const ClickToRoll: Story = () => {
  const [rolling, setRolling] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [targetNum, setTargetNum] = useState<number | undefined>(undefined);

  const handleClick = useCallback(() => {
    if (rolling) return;
    const num = FACE_NUMBERS[Math.floor(Math.random() * 20)];
    setTargetNum(num);
    setRolling(true);
    setShowResult(false);
    setResult(null);
  }, [rolling]);

  const handleRollComplete = useCallback((num: number) => {
    setResult(num);
    setShowResult(true);
    setRolling(false);
  }, []);

  return (
    <PageWrap>
      <div className="text-center mb-4">
        <h2 className="text-gold text-xl font-bold font-[family-name:var(--font-display)] text-glow-gold">
          点击投骰 (BG3 风格)
        </h2>
        <p className="text-parchment/50 text-xs mt-1">点击骰子或按钮投掷</p>
      </div>
      <SceneWrap height="650px">
        <Canvas camera={{ position: [0, 2, 3.5], fov: 45 }}>
          <ambientLight intensity={0.3} />
          <directionalLight position={[5, 5, 5]} intensity={1} color="#fff5e0" />
          <pointLight position={[0, 3, 0]} intensity={0.6} color="#4ade80" />
          <Float speed={2} rotationIntensity={0.4} floatIntensity={0.3}>
            <D20Mesh
              rolling={rolling}
              targetNumber={targetNum}
              scale={1.1}
              onClick={handleClick}
              onRollComplete={handleRollComplete}
              crystalColor="#2a5a3a"
              edgeColor="#4ade80"
            />
          </Float>
          <Environment preset="night" />
        </Canvas>

        <ResultBanner value={result} visible={showResult} />
        <RollButton onClick={handleClick} disabled={rolling} />
      </SceneWrap>
    </PageWrap>
  );
};
ClickToRoll.meta = { title: 'D20 3D / Click to Roll' };

// ===== Story D: Multi Dice =====
function MultiDieInstance({
  index,
  total,
  rolling,
  onComplete,
}: {
  index: number;
  total: number;
  rolling: boolean;
  onComplete: (idx: number, val: number) => void;
}) {
  const spread = Math.min(total, 6);
  const cols = Math.min(spread, 3);
  const row = Math.floor(index / cols);
  const col = index % cols;
  const offsetX = (col - (cols - 1) / 2) * 2.2;
  const offsetZ = (row - (Math.ceil(total / cols) - 1) / 2) * 2.2;

  const [target] = useState(() => FACE_NUMBERS[Math.floor(Math.random() * 20)]);

  return (
    <D20Mesh
      position={[offsetX, 0, offsetZ]}
      rolling={rolling}
      targetNumber={target}
      scale={0.8}
      onRollComplete={(val) => onComplete(index, val)}
    />
  );
}

export const MultiDice: Story = () => {
  const [diceCount, setDiceCount] = useState(3);
  const [rolling, setRolling] = useState(false);
  const [results, setResults] = useState<(number | null)[]>([]);
  const completedRef = useRef(0);

  const handleRoll = useCallback(() => {
    if (rolling) return;
    setResults(new Array(diceCount).fill(null));
    completedRef.current = 0;
    setRolling(true);
  }, [rolling, diceCount]);

  const handleDieComplete = useCallback((idx: number, val: number) => {
    setResults(prev => {
      const next = [...prev];
      next[idx] = val;
      return next;
    });
    completedRef.current++;
    if (completedRef.current >= diceCount) {
      setTimeout(() => setRolling(false), 100);
    }
  }, [diceCount]);

  const total = results.filter(r => r !== null).reduce((a, b) => a + (b ?? 0), 0);
  const allDone = results.length > 0 && results.every(r => r !== null);

  return (
    <PageWrap>
      <div className="text-center mb-4">
        <h2 className="text-gold text-xl font-bold font-[family-name:var(--font-display)] text-glow-gold">
          多骰投掷
        </h2>
        <p className="text-parchment/50 text-xs mt-1">同时投掷多颗 D20</p>
      </div>
      <SceneWrap height="600px">
        <Canvas camera={{ position: [0, 6, 6], fov: 50 }}>
          <ambientLight intensity={0.3} />
          <directionalLight position={[5, 8, 5]} intensity={1} color="#fff5e0" />
          <directionalLight position={[-3, 4, -3]} intensity={0.4} color="#8080ff" />
          <pointLight position={[0, 5, 0]} intensity={0.6} color="#c9a84c" />
          {Array.from({ length: diceCount }).map((_, i) => (
            <MultiDieInstance
              key={`${diceCount}-${i}-${rolling}`}
              index={i}
              total={diceCount}
              rolling={rolling}
              onComplete={handleDieComplete}
            />
          ))}
          <ContactShadows
            position={[0, -1.5, 0]}
            opacity={0.3}
            scale={12}
            blur={2}
            far={5}
          />
          <Environment preset="night" />
        </Canvas>

        <div style={{
          position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', alignItems: 'center', gap: 12, zIndex: 10,
        }}>
          <span style={{ color: '#8a6d2b', fontSize: 13 }}>骰子数</span>
          {[1, 2, 3, 4, 5, 6].map(n => (
            <button
              key={n}
              onClick={() => { if (!rolling) { setDiceCount(n); setResults([]); } }}
              style={{
                width: 32, height: 32, borderRadius: 6,
                background: n === diceCount
                  ? 'linear-gradient(135deg, rgba(201,168,76,0.3), rgba(201,168,76,0.1))'
                  : 'rgba(255,255,255,0.05)',
                border: n === diceCount ? '1px solid rgba(201,168,76,0.5)' : '1px solid rgba(255,255,255,0.08)',
                color: n === diceCount ? '#c9a84c' : '#666',
                fontSize: 14, fontWeight: 'bold', cursor: rolling ? 'not-allowed' : 'pointer',
              }}
            >
              {n}
            </button>
          ))}
        </div>

        {allDone && (
          <div style={{
            position: 'absolute', bottom: 70, left: '50%', transform: 'translateX(-50%)',
            zIndex: 10, textAlign: 'center',
            animation: 'fadeInUp 0.4s ease-out',
          }}>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 8 }}>
              {results.map((r, i) => (
                <span key={i} style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 40, height: 40, borderRadius: 8,
                  background: r === 20 ? 'rgba(74,222,128,0.15)' : r === 1 ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${r === 20 ? 'rgba(74,222,128,0.4)' : r === 1 ? 'rgba(239,68,68,0.4)' : 'rgba(201,168,76,0.2)'}`,
                  color: r === 20 ? '#4ade80' : r === 1 ? '#ef4444' : '#e8dcc8',
                  fontSize: 16, fontWeight: 'bold', fontFamily: 'Georgia, serif',
                }}>
                  {r}
                </span>
              ))}
            </div>
            <div style={{
              fontSize: 13, color: '#8a6d2b',
            }}>
              合计: <span style={{ color: '#c9a84c', fontWeight: 'bold', fontSize: 18 }}>{total}</span>
            </div>
          </div>
        )}

        <RollButton onClick={handleRoll} disabled={rolling} label="投掷" />
      </SceneWrap>
    </PageWrap>
  );
};
MultiDice.meta = { title: 'D20 3D / Multi Dice' };

// ===== Story E: Color Variants =====
export const ColorVariants: Story = () => {
  const variants: { label: string; crystal: string; edge: string }[] = [
    { label: '幽蓝水晶', crystal: '#4a4a7a', edge: '#8080ff' },
    { label: '琥珀金', crystal: '#7a5a2a', edge: '#c9a84c' },
    { label: '血红宝石', crystal: '#6a2a2a', edge: '#ff4444' },
    { label: '翡翠', crystal: '#2a5a3a', edge: '#4ade80' },
    { label: '暗影', crystal: '#2a2a2e', edge: '#888' },
    { label: '皇家紫', crystal: '#5a2a6a', edge: '#c084fc' },
  ];

  return (
    <PageWrap>
      <div className="text-center mb-4">
        <h2 className="text-gold text-xl font-bold font-[family-name:var(--font-display)] text-glow-gold">
          配色方案
        </h2>
        <p className="text-parchment/50 text-xs mt-1">不同材质风格的 D20</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {variants.map(v => (
          <div key={v.label}>
            <div style={{
              height: 260, background: DARK_BG, borderRadius: 10, overflow: 'hidden',
              border: '1px solid rgba(201,168,76,0.15)',
            }}>
              <Canvas camera={{ position: [0, 2, 3.5], fov: 45 }}>
                <ambientLight intensity={0.3} />
                <directionalLight position={[5, 5, 5]} intensity={1} color="#fff5e0" />
                <pointLight position={[0, 3, 0]} intensity={0.6} color={v.edge} />
                <Float speed={2} rotationIntensity={0.4} floatIntensity={0.3}>
                  <D20Mesh
                    spinning
                    spinSpeed={0.3}
                    scale={1.1}
                    crystalColor={v.crystal}
                    edgeColor={v.edge}
                  />
                </Float>
                <Environment preset="night" />
              </Canvas>
            </div>
            <div style={{
              textAlign: 'center', marginTop: 8,
              color: v.edge, fontSize: 13, fontWeight: 'bold',
            }}>
              {v.label}
            </div>
          </div>
        ))}
      </div>
    </PageWrap>
  );
};
ColorVariants.meta = { title: 'D20 3D / Color Variants' };

// ===== Story F: Skill Check (BG3 Full UI) =====
export const SkillCheck: Story = () => {
  const [rolling, setRolling] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [targetNum, setTargetNum] = useState<number | undefined>(undefined);

  const DC = 15;
  const modifier = 3;
  const finalResult = result !== null ? result + modifier : null;
  const passed = finalResult !== null && finalResult >= DC;

  const handleRoll = useCallback(() => {
    if (rolling) return;
    const num = FACE_NUMBERS[Math.floor(Math.random() * 20)];
    setTargetNum(num);
    setRolling(true);
    setShowResult(false);
    setResult(null);
  }, [rolling]);

  const handleComplete = useCallback((num: number) => {
    setResult(num);
    setShowResult(true);
    setRolling(false);
  }, []);

  return (
    <PageWrap>
      <div className="text-center mb-4">
        <h2 className="text-gold text-xl font-bold font-[family-name:var(--font-display)] text-glow-gold">
          技能鉴定 (BG3 完整 UI)
        </h2>
        <p className="text-parchment/50 text-xs mt-1">模拟博德之门3风格的完整鉴定界面</p>
      </div>
      <SceneWrap height="700px">
        <Canvas camera={{ position: [0, 2, 4], fov: 45 }}>
          <ambientLight intensity={0.2} />
          <directionalLight position={[5, 5, 5]} intensity={1.2} color="#fff5e0" />
          <directionalLight position={[-3, 2, -3]} intensity={0.5} color="#6a6aff" />
          <pointLight position={[0, 4, 0]} intensity={1} color="#c9a84c" />
          <spotLight position={[0, 6, 2]} angle={0.25} penumbra={0.6} intensity={2} color="#fff5e0" />
          <D20Mesh
            rolling={rolling}
            targetNumber={targetNum}
            scale={1.4}
            onClick={handleRoll}
            onRollComplete={handleComplete}
            crystalColor="#5a5a7a"
          />
          <ContactShadows position={[0, -1.5, 0]} opacity={0.5} scale={8} blur={2.5} far={4} />
          <Environment preset="night" />
        </Canvas>

        {/* Top: Check info */}
        <div style={{
          position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)',
          zIndex: 10, textAlign: 'center',
        }}>
          <div style={{
            padding: '8px 24px', borderRadius: 8,
            background: 'linear-gradient(135deg, rgba(26,15,10,0.9), rgba(26,26,46,0.9))',
            border: '1px solid rgba(201,168,76,0.3)',
          }}>
            <div style={{ color: '#8a6d2b', fontSize: 11, letterSpacing: 2, marginBottom: 2 }}>
              战斗鉴定
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div>
                <span style={{ color: '#666', fontSize: 11 }}>DC</span>
                <span style={{ color: '#e8dcc8', fontSize: 22, fontWeight: 'bold', fontFamily: 'Georgia, serif', marginLeft: 4 }}>
                  {DC}
                </span>
              </div>
              <div style={{ width: 1, height: 24, background: 'rgba(201,168,76,0.2)' }} />
              <div>
                <span style={{ color: '#666', fontSize: 11 }}>修正</span>
                <span style={{ color: '#4ade80', fontSize: 18, fontWeight: 'bold', fontFamily: 'Georgia, serif', marginLeft: 4 }}>
                  +{modifier}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Result panel */}
        {showResult && finalResult !== null && (
          <div style={{
            position: 'absolute', bottom: 80, left: '50%', transform: 'translateX(-50%)',
            zIndex: 10, textAlign: 'center',
            animation: 'fadeInUp 0.4s ease-out',
          }}>
            <div style={{
              padding: '16px 32px', borderRadius: 12,
              background: `linear-gradient(135deg, ${passed ? 'rgba(74,222,128,0.1)' : 'rgba(239,68,68,0.1)'}, rgba(26,26,46,0.95))`,
              border: `1px solid ${passed ? 'rgba(74,222,128,0.4)' : 'rgba(239,68,68,0.4)'}`,
            }}>
              <div style={{
                fontSize: 14, fontWeight: 'bold',
                color: passed ? '#4ade80' : '#ef4444',
                letterSpacing: 3, marginBottom: 8,
                textShadow: `0 0 10px ${passed ? 'rgba(74,222,128,0.4)' : 'rgba(239,68,68,0.4)'}`,
              }}>
                {passed ? '鉴定成功' : '鉴定失败'}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 4 }}>
                <span style={{ color: '#e8dcc8', fontSize: 40, fontWeight: 'bold', fontFamily: 'Georgia, serif' }}>
                  {result}
                </span>
                <span style={{ color: '#4ade80', fontSize: 20, fontWeight: 'bold' }}>+{modifier}</span>
                <span style={{ color: '#666', fontSize: 16, margin: '0 4px' }}>=</span>
                <span style={{
                  color: passed ? '#4ade80' : '#ef4444',
                  fontSize: 40, fontWeight: 'bold', fontFamily: 'Georgia, serif',
                }}>
                  {finalResult}
                </span>
              </div>
              <div style={{ color: '#666', fontSize: 12, marginTop: 4 }}>
                vs DC {DC}
              </div>
            </div>
          </div>
        )}

        <RollButton onClick={handleRoll} disabled={rolling} />
      </SceneWrap>
    </PageWrap>
  );
};
SkillCheck.meta = { title: 'D20 3D / Skill Check' };
