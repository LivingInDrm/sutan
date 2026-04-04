import { useState, useEffect } from 'react';
import { api } from './api';
import type { Character, Templates } from './types';
import CharacterList from './components/CharacterList';
import CharacterDetail from './components/CharacterDetail';
import TemplateSettings from './components/TemplateSettings';

type Tab = 'characters' | 'templates' | 'history';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('characters');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [templates, setTemplates] = useState<Templates | null>(null);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [chars, temps] = await Promise.all([
        api.getCharacters(),
        api.getTemplates(),
      ]);
      setCharacters(chars);
      setTemplates(temps);
      if (chars.length > 0 && !selectedCharacter) {
        setSelectedCharacter(chars[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCharacterUpdate = async () => {
    await loadData();
  };

  const handleCharacterCreated = async (newCharacter: import('./types').Character) => {
    // Reload full list from server to ensure consistency
    const chars = await api.getCharacters();
    setCharacters(chars);
    // Select the newly created character
    const found = chars.find((c) => c.figure_id === newCharacter.figure_id) || newCharacter;
    setSelectedCharacter(found);
  };

  const handleTemplateUpdate = async () => {
    const temps = await api.getTemplates();
    setTemplates(temps);
  };

  return (
    <div style={styles.app}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.logo}>
            <div style={styles.logoIcon}></div>
            <div>
              <div style={styles.logoTitle}>角色管理器</div>
              <div style={styles.logoSubtitle}>CHARACTER MANAGEMENT SYSTEM</div>
            </div>
          </div>
        </div>

        <nav style={styles.nav}>
          <button
            style={{
              ...styles.navButton,
              ...(activeTab === 'characters' ? styles.navButtonActive : {}),
            }}
            onClick={() => setActiveTab('characters')}
          >
            <span style={styles.navLabel}>角色立绘</span>
            <span style={styles.navSublabel}>CHARACTERS</span>
          </button>
          <button
            style={{
              ...styles.navButton,
              ...(activeTab === 'templates' ? styles.navButtonActive : {}),
            }}
            onClick={() => setActiveTab('templates')}
          >
            <span style={styles.navLabel}>风格模板</span>
            <span style={styles.navSublabel}>TEMPLATES</span>
          </button>
          <button
            style={{
              ...styles.navButton,
              ...(activeTab === 'history' ? styles.navButtonActive : {}),
            }}
            onClick={() => setActiveTab('history')}
          >
            <span style={styles.navLabel}>生成历史</span>
            <span style={styles.navSublabel}>HISTORY</span>
          </button>
        </nav>

        <div style={styles.headerRight}>
          <div style={styles.statusIndicator}>
            <div style={styles.statusDot}></div>
            <span style={styles.statusText}>SYSTEM ONLINE</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={styles.main}>
        {loading ? (
          <div style={styles.loading}>
            <div className="spinner"></div>
            <div style={styles.loadingText}>LOADING SYSTEM...</div>
          </div>
        ) : error ? (
          <div style={styles.error}>
            <div style={styles.errorIcon}>⚠</div>
            <div style={styles.errorText}>{error}</div>
            <button style={styles.retryButton} onClick={loadData}>
              RETRY
            </button>
          </div>
        ) : (
          <>
            {activeTab === 'characters' && (
              <div style={styles.charactersLayout}>
                <aside style={styles.sidebar}>
                  <div style={styles.sidebarHeader}>
                    <div style={styles.sidebarTitle}>CHARACTER DATABASE</div>
                    <div style={styles.sidebarCount}>{characters.length} ENTRIES</div>
                  </div>
                  <CharacterList
                    characters={characters}
                    selectedCharacter={selectedCharacter}
                    onSelectCharacter={setSelectedCharacter}
                    onCharacterCreated={handleCharacterCreated}
                  />
                </aside>
                <div style={styles.content}>
                  {selectedCharacter ? (
                    <CharacterDetail
                      character={selectedCharacter}
                      templates={templates}
                      onUpdate={handleCharacterUpdate}
                    />
                  ) : (
                    <div style={styles.emptyState}>
                      <div style={styles.emptyIcon}>◼</div>
                      <div style={styles.emptyText}>SELECT A CHARACTER</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'templates' && templates && (
              <div style={styles.templatesLayout}>
                <TemplateSettings
                  templates={templates}
                  onUpdate={handleTemplateUpdate}
                />
              </div>
            )}

            {activeTab === 'history' && (
              <div style={styles.historyLayout}>
                <div style={styles.emptyState}>
                  <div style={styles.emptyIcon}>□</div>
                  <div style={styles.emptyText}>HISTORY VIEW</div>
                  <div style={styles.emptySubtext}>Coming soon...</div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--bg-primary)',
  },
  header: {
    height: '72px',
    background: 'var(--bg-secondary)',
    borderBottom: '1px solid var(--border-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
    gap: '32px',
    position: 'relative',
  },
  headerLeft: {
    flex: '0 0 auto',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  logoIcon: {
    width: '32px',
    height: '32px',
    background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-cyan-dim))',
    clipPath: 'polygon(0 0, 100% 0, 100% 70%, 70% 100%, 0 100%)',
    boxShadow: '0 0 16px var(--accent-cyan-glow)',
  },
  logoTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '20px',
    fontWeight: '700',
    letterSpacing: '-0.02em',
    color: 'var(--text-primary)',
  },
  logoSubtitle: {
    fontFamily: 'var(--font-mono)',
    fontSize: '9px',
    fontWeight: '500',
    letterSpacing: '0.1em',
    color: 'var(--text-tertiary)',
  },
  nav: {
    flex: '1',
    display: 'flex',
    gap: '8px',
    justifyContent: 'center',
  },
  navButton: {
    padding: '8px 20px',
    background: 'transparent',
    border: '1px solid var(--border-subtle)',
    color: 'var(--text-secondary)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
    position: 'relative',
    overflow: 'hidden',
  },
  navButtonActive: {
    background: 'var(--bg-elevated)',
    borderColor: 'var(--border-accent)',
    color: 'var(--text-accent)',
  },
  navLabel: {
    fontSize: '13px',
    fontWeight: '500',
  },
  navSublabel: {
    fontSize: '9px',
    fontWeight: '400',
    letterSpacing: '0.05em',
    opacity: 0.6,
  },
  headerRight: {
    flex: '0 0 auto',
  },
  statusIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 12px',
    border: '1px solid var(--border-primary)',
    background: 'var(--bg-tertiary)',
  },
  statusDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: 'var(--success)',
    boxShadow: '0 0 8px var(--success)',
    animation: 'pulse 2s ease-in-out infinite',
  },
  statusText: {
    fontSize: '10px',
    fontWeight: '500',
    letterSpacing: '0.05em',
    color: 'var(--text-tertiary)',
  },
  main: {
    flex: '1',
    display: 'flex',
    overflow: 'hidden',
  },
  charactersLayout: {
    flex: '1',
    display: 'flex',
    overflow: 'hidden',
  },
  sidebar: {
    width: '320px',
    background: 'var(--bg-secondary)',
    borderRight: '1px solid var(--border-primary)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  sidebarHeader: {
    padding: '20px',
    borderBottom: '1px solid var(--border-primary)',
    background: 'var(--bg-tertiary)',
  },
  sidebarTitle: {
    fontSize: '11px',
    fontWeight: '600',
    letterSpacing: '0.1em',
    color: 'var(--text-accent)',
    marginBottom: '4px',
  },
  sidebarCount: {
    fontSize: '10px',
    fontWeight: '400',
    color: 'var(--text-tertiary)',
  },
  content: {
    flex: '1',
    overflow: 'auto',
  },
  templatesLayout: {
    flex: '1',
    overflow: 'auto',
  },
  historyLayout: {
    flex: '1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loading: {
    flex: '1',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
  },
  loadingText: {
    fontSize: '11px',
    fontWeight: '500',
    letterSpacing: '0.1em',
    color: 'var(--text-tertiary)',
  },
  error: {
    flex: '1',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    padding: '40px',
  },
  errorIcon: {
    fontSize: '48px',
    color: 'var(--error)',
  },
  errorText: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
  },
  retryButton: {
    marginTop: '8px',
    padding: '10px 24px',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-accent)',
    color: 'var(--text-accent)',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    padding: '80px 40px',
  },
  emptyIcon: {
    fontSize: '64px',
    color: 'var(--border-primary)',
    fontWeight: '300',
  },
  emptyText: {
    fontSize: '12px',
    fontWeight: '600',
    letterSpacing: '0.1em',
    color: 'var(--text-tertiary)',
  },
  emptySubtext: {
    fontSize: '11px',
    color: 'var(--text-tertiary)',
    opacity: 0.6,
  },
};

export default App;
