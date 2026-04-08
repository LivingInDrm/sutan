import { useEffect, useState } from 'react';
import { api } from '../api';
import type { ItemPromptConfig, ItemPromptRarity } from '../types';

interface ItemPromptConfigProps {
  isOpen: boolean;
  onClose: () => void;
}

const rarityOrder: ItemPromptRarity[] = ['common', 'rare', 'epic', 'legendary'];

const rarityLabels: Record<ItemPromptRarity, { zh: string; en: string }> = {
  common: { zh: '平凡', en: 'COMMON' },
  rare: { zh: '稀有', en: 'RARE' },
  epic: { zh: '精英', en: 'EPIC' },
  legendary: { zh: '传奇', en: 'LEGENDARY' },
};

export default function ItemPromptConfig({ isOpen, onClose }: ItemPromptConfigProps) {
  const [config, setConfig] = useState<ItemPromptConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const loadConfig = async () => {
      try {
        setLoading(true);
        setSaved(false);
        const data = await api.getItemPromptConfig();
        setConfig(data);
      } catch (err) {
        console.error('Failed to load item prompt config:', err);
        alert('加载物品 Prompt 配置失败');
      } finally {
        setLoading(false);
      }
    };
    void loadConfig();
  }, [isOpen]);

  const updatePalette = (rarity: ItemPromptRarity, value: string) => {
    if (!config) return;
    setConfig({
      ...config,
      rarity_palettes: {
        ...config.rarity_palettes,
        [rarity]: value,
      },
    });
  };

  const handleSave = async () => {
    if (!config) return;
    try {
      setSaving(true);
      setSaved(false);
      const updated = await api.updateItemPromptConfig(config);
      setConfig(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save item prompt config:', err);
      alert('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      setResetting(true);
      setSaved(false);
      const resetConfig = await api.resetItemPromptConfig();
      setConfig(resetConfig);
    } catch (err) {
      console.error('Failed to reset item prompt config:', err);
      alert('恢复默认失败');
    } finally {
      setResetting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div>
            <div style={styles.title}>ITEM PROMPT CONFIG</div>
            <div style={styles.subtitle}>物品公共 Prompt 配置</div>
          </div>
          <button style={styles.closeButton} onClick={onClose}>✕</button>
        </div>

        <div style={styles.body}>
          {loading || !config ? (
            <div style={styles.loadingState}>
              <div className="spinner"></div>
              <div style={styles.loadingText}>LOADING CONFIG...</div>
            </div>
          ) : (
            <div style={styles.form}>
              <section style={styles.section}>
                <div style={styles.sectionHeader}>
                  <div style={styles.sectionTitle}>Variant 生成 System Prompt</div>
                  <div style={styles.sectionSubtitle}>_ITEM_VARIANT_SYSTEM_PROMPT</div>
                </div>
                <textarea
                  style={{ ...styles.textarea, minHeight: '180px' }}
                  value={config.variant_system_prompt}
                  onChange={(e) => setConfig({ ...config, variant_system_prompt: e.target.value })}
                />
              </section>

              <section style={styles.section}>
                <div style={styles.sectionHeader}>
                  <div style={styles.sectionTitle}>总体风格模板</div>
                  <div style={styles.sectionSubtitle}>ITEM_STYLE_B_TEMPLATE</div>
                </div>
                <div style={styles.sectionHint}>支持 {'{description}'} 与 {'{rarity_palette}'} 占位符</div>
                <textarea
                  style={{ ...styles.textarea, minHeight: '180px' }}
                  value={config.style_template}
                  onChange={(e) => setConfig({ ...config, style_template: e.target.value })}
                />
              </section>

              <section style={styles.section}>
                <div style={styles.sectionHeader}>
                  <div style={styles.sectionTitle}>稀有度色板</div>
                  <div style={styles.sectionSubtitle}>RARITY_VISUAL_ENHANCEMENTS</div>
                </div>
                <div style={styles.paletteGrid}>
                  {rarityOrder.map((rarity) => (
                    <div key={rarity} style={styles.paletteCard}>
                      <div style={styles.paletteHeader}>
                        <div style={styles.paletteTitle}>{rarityLabels[rarity].zh}</div>
                        <div style={styles.paletteSubtitle}>{rarityLabels[rarity].en}</div>
                      </div>
                      <textarea
                        style={{ ...styles.textarea, minHeight: '110px' }}
                        value={config.rarity_palettes[rarity]}
                        onChange={(e) => updatePalette(rarity, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>

        <div style={styles.footer}>
          <button
            style={styles.resetButton}
            onClick={handleReset}
            disabled={loading || saving || resetting}
          >
            {resetting ? 'RESETTING...' : '恢复默认'}
          </button>
          <button
            style={{
              ...styles.saveButton,
              ...(saved ? styles.saveButtonSuccess : {}),
            }}
            onClick={handleSave}
            disabled={loading || saving || resetting || !config}
          >
            {saving ? 'SAVING...' : saved ? '✓ 已保存' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(5, 8, 12, 0.72)',
    backdropFilter: 'blur(6px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1200,
    padding: '32px',
  },
  modal: {
    width: 'min(960px, 100%)',
    maxHeight: 'calc(100vh - 64px)',
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-accent)',
    boxShadow: '0 20px 80px rgba(0, 0, 0, 0.45)',
  },
  header: {
    padding: '24px 28px',
    borderBottom: '1px solid var(--border-primary)',
    background: 'var(--bg-tertiary)',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '16px',
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: '24px',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  subtitle: {
    marginTop: '4px',
    fontSize: '11px',
    letterSpacing: '0.08em',
    color: 'var(--text-accent)',
  },
  closeButton: {
    width: '32px',
    height: '32px',
    border: '1px solid var(--border-primary)',
    background: 'var(--bg-secondary)',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontSize: '14px',
  },
  body: {
    flex: '1',
    overflow: 'auto',
    padding: '28px',
  },
  loadingState: {
    minHeight: '240px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
  },
  loadingText: {
    fontSize: '11px',
    letterSpacing: '0.08em',
    color: 'var(--text-tertiary)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  section: {
    background: 'var(--bg-primary)',
    border: '1px solid var(--border-primary)',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    paddingBottom: '12px',
    borderBottom: '1px solid var(--border-subtle)',
  },
  sectionTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '18px',
    fontWeight: '600',
    color: 'var(--text-primary)',
  },
  sectionSubtitle: {
    fontSize: '10px',
    fontWeight: '600',
    letterSpacing: '0.1em',
    color: 'var(--text-accent)',
  },
  sectionHint: {
    fontSize: '11px',
    color: 'var(--text-tertiary)',
  },
  paletteGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '16px',
  },
  paletteCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  paletteHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paletteTitle: {
    fontSize: '13px',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  paletteSubtitle: {
    fontSize: '10px',
    letterSpacing: '0.08em',
    color: 'var(--text-accent)',
  },
  textarea: {
    width: '100%',
    fontFamily: 'var(--font-mono)',
    fontSize: '13px',
    lineHeight: '1.6',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-primary)',
    color: 'var(--text-primary)',
    padding: '12px',
    resize: 'vertical',
  },
  footer: {
    padding: '20px 28px',
    borderTop: '1px solid var(--border-primary)',
    background: 'var(--bg-tertiary)',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
  },
  resetButton: {
    padding: '10px 20px',
    background: 'transparent',
    border: '1px solid var(--border-primary)',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontWeight: '600',
  },
  saveButton: {
    padding: '10px 24px',
    background: 'var(--accent-cyan)',
    border: '1px solid var(--accent-cyan)',
    color: 'var(--bg-primary)',
    cursor: 'pointer',
    fontWeight: '700',
  },
  saveButtonSuccess: {
    background: 'var(--success)',
    borderColor: 'var(--success)',
  },
};