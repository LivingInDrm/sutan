import { useEffect, useState } from 'react';
import { api } from '../api';
import type { GenerationProgress, SampleImage, FreeGenRequest } from '../types';
import Gallery from './Gallery';

const SIZE_OPTIONS: FreeGenRequest['size'][] = ['1024x1024', '1536x1024', '1024x1536'];
const BACKGROUND_OPTIONS: FreeGenRequest['background'][] = ['transparent', 'opaque', 'auto'];
const QUALITY_OPTIONS: FreeGenRequest['quality'][] = ['high', 'medium', 'low'];
const COUNT_OPTIONS: FreeGenRequest['count'][] = [1, 2, 4];

const DEFAULT_FORM: FreeGenRequest = {
  prompt: '',
  size: '1024x1024',
  background: 'auto',
  quality: 'high',
  count: 1,
};

export default function FreeGenTab() {
  const [form, setForm] = useState<FreeGenRequest>(DEFAULT_FORM);
  const [samples, setSamples] = useState<SampleImage[]>([]);
  const [loadingSamples, setLoadingSamples] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<GenerationProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadSamples = async () => {
    try {
      setLoadingSamples(true);
      const images = await api.getFreeGenSamples();
      setSamples(images);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载图库失败');
    } finally {
      setLoadingSamples(false);
    }
  };

  useEffect(() => {
    loadSamples();
  }, []);

  const updateField = <K extends keyof FreeGenRequest>(key: K, value: FreeGenRequest[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleGenerate = async () => {
    if (!form.prompt.trim()) {
      setError('请输入 prompt');
      return;
    }
    try {
      setIsGenerating(true);
      setError(null);
      setProgress(null);
      await api.generateFreeGenImages(form, (nextProgress) => {
        setProgress(nextProgress);
      });
      await loadSamples();
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div style={styles.container}>
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <div style={styles.sectionTitle}>FREE GEN PROMPT</div>
          <div style={styles.sectionMeta}>RAW PROMPT PASSTHROUGH</div>
        </div>
        <textarea
          style={styles.promptInput}
          value={form.prompt}
          onChange={(event) => updateField('prompt', event.target.value)}
          placeholder="直接输入 prompt，系统将原样透传给 gpt-image-1"
          rows={8}
        />
        <div style={styles.controlsGrid}>
          <OptionGroup
            label="尺寸"
            value={form.size}
            options={SIZE_OPTIONS}
            onChange={(value) => updateField('size', value as FreeGenRequest['size'])}
          />
          <OptionGroup
            label="背景"
            value={form.background}
            options={BACKGROUND_OPTIONS}
            onChange={(value) => updateField('background', value as FreeGenRequest['background'])}
          />
          <OptionGroup
            label="质量"
            value={form.quality}
            options={QUALITY_OPTIONS}
            onChange={(value) => updateField('quality', value as FreeGenRequest['quality'])}
          />
          <OptionGroup
            label="数量"
            value={String(form.count)}
            options={COUNT_OPTIONS.map(String)}
            onChange={(value) => updateField('count', Number(value) as FreeGenRequest['count'])}
          />
        </div>
        <div style={styles.actionsRow}>
          <button
            style={{
              ...styles.generateButton,
              ...((isGenerating || !form.prompt.trim()) ? styles.generateButtonDisabled : {}),
            }}
            onClick={handleGenerate}
            disabled={isGenerating || !form.prompt.trim()}
          >
            {isGenerating ? '生成中...' : '生成图片 / GENERATE'}
          </button>
          {progress && (
            <div style={styles.progressText}>
              {progress.message || (progress.type === 'done' ? '生成完成' : '处理中')}
            </div>
          )}
        </div>
        {error && <div style={styles.error}>⚠ {error}</div>}
      </section>

      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <div style={styles.sectionTitle}>FREE GEN GALLERY</div>
          <button style={styles.refreshButton} onClick={loadSamples} disabled={loadingSamples}>
            {loadingSamples ? '...' : '刷新'}
          </button>
        </div>
        <Gallery
          images={samples}
          characterName="free-gen"
          onSelect={loadSamples}
          selectLabel="查看"
        />
      </section>
    </div>
  );
}

function OptionGroup({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div style={styles.optionGroup}>
      <div style={styles.optionLabel}>{label}</div>
      <div style={styles.optionButtons}>
        {options.map((option) => (
          <button
            key={option}
            style={{
              ...styles.optionButton,
              ...(value === option ? styles.optionButtonActive : {}),
            }}
            onClick={() => onChange(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: '32px 40px', display: 'flex', flexDirection: 'column', gap: '32px' },
  section: { background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', padding: '24px' },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    paddingBottom: '12px',
    borderBottom: '1px solid var(--border-subtle)',
  },
  sectionTitle: { fontSize: '11px', fontWeight: '700', letterSpacing: '0.1em', color: 'var(--text-accent)' },
  sectionMeta: { fontSize: '10px', color: 'var(--text-tertiary)' },
  promptInput: {
    width: '100%',
    boxSizing: 'border-box',
    minHeight: '180px',
    resize: 'vertical',
    fontFamily: 'var(--font-mono)',
    fontSize: '13px',
    lineHeight: '1.6',
    background: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-primary)',
    padding: '14px 16px',
    marginBottom: '20px',
  },
  controlsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' },
  optionGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
  optionLabel: { fontSize: '10px', fontWeight: '600', letterSpacing: '0.05em', color: 'var(--text-tertiary)' },
  optionButtons: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
  optionButton: {
    padding: '10px 14px',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-primary)',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontSize: '12px',
  },
  optionButtonActive: {
    background: 'var(--bg-elevated)',
    borderColor: 'var(--border-accent)',
    color: 'var(--text-accent)',
  },
  actionsRow: { display: 'flex', alignItems: 'center', gap: '16px', marginTop: '20px' },
  generateButton: {
    padding: '12px 24px',
    background: 'var(--accent-cyan)',
    border: '1px solid var(--accent-cyan)',
    color: 'var(--bg-primary)',
    fontWeight: '700',
    cursor: 'pointer',
  },
  generateButtonDisabled: { opacity: 0.5, cursor: 'not-allowed' },
  progressText: { fontSize: '12px', color: 'var(--text-secondary)' },
  error: { marginTop: '12px', color: 'var(--error)', fontSize: '12px' },
  refreshButton: {
    padding: '6px 14px',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-primary)',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontSize: '12px',
  },
};