import { useState } from 'react';
import type { Templates } from '../types';
import { api } from '../api';

interface TemplateSettingsProps {
  templates: Templates;
  onUpdate: () => void;
}

export default function TemplateSettings({
  templates: initialTemplates,
  onUpdate,
}: TemplateSettingsProps) {
  const [templates, setTemplates] = useState<Templates>(initialTemplates);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    try {
      setSaving(true);
      setSaved(false);
      await api.updateTemplates(templates);
      setSaved(true);
      onUpdate();
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save templates:', err);
      alert('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const fields: Array<{ key: keyof Templates; label: string; sublabel: string }> = [
    { key: 'style_base', label: '风格基础', sublabel: 'STYLE BASE' },
    { key: 'no_text_constraint', label: '无文字约束', sublabel: 'NO TEXT CONSTRAINT' },
    { key: 'style_negative', label: '负面约束', sublabel: 'NEGATIVE PROMPT' },
    { key: 'portrait_template', label: '人物模板', sublabel: 'PORTRAIT TEMPLATE' },
    { key: 'item_template', label: '道具模板', sublabel: 'ITEM TEMPLATE' },
    { key: 'scene_template', label: '场景模板', sublabel: 'SCENE TEMPLATE' },
  ];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>风格模板配置</h2>
          <div style={styles.subtitle}>TEMPLATE CONFIGURATION</div>
        </div>
        <button
          style={{
            ...styles.saveButton,
            ...(saved ? styles.saveButtonSuccess : {}),
          }}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <>
              <div className="spinner"></div>
              <span>SAVING...</span>
            </>
          ) : saved ? (
            <>
              <span>✓ 已保存</span>
              <span style={styles.buttonLabel}>SAVED</span>
            </>
          ) : (
            <>
              <span>保存</span>
              <span style={styles.buttonLabel}>SAVE</span>
            </>
          )}
        </button>
      </div>

      <div style={styles.content}>
        <div style={styles.form}>
          {fields.map((field) => (
            <div key={field.key} style={styles.field}>
              <div style={styles.fieldHeader}>
                <label style={styles.label}>{field.label}</label>
                <div style={styles.sublabel}>{field.sublabel}</div>
              </div>
              <textarea
                style={styles.textarea}
                value={templates[field.key]}
                onChange={(e) =>
                  setTemplates({ ...templates, [field.key]: e.target.value })
                }
                rows={4}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--bg-primary)',
  },
  header: {
    padding: '32px 40px',
    borderBottom: '1px solid var(--border-primary)',
    background: 'var(--bg-secondary)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: '32px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    marginBottom: '4px',
  },
  subtitle: {
    fontSize: '11px',
    fontWeight: '400',
    color: 'var(--text-tertiary)',
    letterSpacing: '0.05em',
  },
  saveButton: {
    padding: '12px 32px',
    background: 'var(--accent-cyan)',
    border: '1px solid var(--accent-cyan)',
    color: 'var(--bg-primary)',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontWeight: '700',
    fontSize: '13px',
    transition: 'all 0.2s ease',
  },
  saveButtonSuccess: {
    background: 'var(--success)',
    borderColor: 'var(--success)',
  },
  buttonLabel: {
    fontSize: '9px',
    opacity: 0.7,
    letterSpacing: '0.05em',
  },
  content: {
    flex: '1',
    overflow: 'auto',
    padding: '40px',
  },
  form: {
    maxWidth: '1000px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '32px',
  },
  field: {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-primary)',
    padding: '24px',
  },
  fieldHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
    paddingBottom: '12px',
    borderBottom: '1px solid var(--border-subtle)',
  },
  label: {
    fontFamily: 'var(--font-display)',
    fontSize: '18px',
    fontWeight: '600',
    color: 'var(--text-primary)',
  },
  sublabel: {
    fontSize: '10px',
    fontWeight: '600',
    letterSpacing: '0.1em',
    color: 'var(--text-accent)',
  },
  textarea: {
    width: '100%',
    minHeight: '100px',
    fontFamily: 'var(--font-mono)',
    fontSize: '13px',
    lineHeight: '1.6',
    background: 'var(--bg-primary)',
    border: '1px solid var(--border-primary)',
    color: 'var(--text-primary)',
    padding: '12px',
    resize: 'vertical',
  },
};
