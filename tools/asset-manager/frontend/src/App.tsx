import { useState, useEffect } from 'react';
import { api } from './api';
import type { Character, Templates, Item, Scene, ScenesResponse, UIAsset } from './types';
import CharacterList from './components/CharacterList';
import CharacterDetail from './components/CharacterDetail';
import ItemList from './components/ItemList';
import ItemDetail from './components/ItemDetail';
import LocationList from './components/LocationList';
import LocationDetail from './components/LocationDetail';
import TemplateSettings from './components/TemplateSettings';
import UIAssetList from './components/UIAssetList';
import UIAssetDetail from './components/UIAssetDetail';
import ItemPromptConfig from './components/ItemPromptConfig';

type Tab = 'characters' | 'items' | 'scenes' | 'ui-assets' | 'templates';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('characters');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [templates, setTemplates] = useState<Templates | null>(null);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [scenesData, setScenesData] = useState<ScenesResponse | null>(null);
  const [selectedScene, setSelectedScene] = useState<Scene | null>(null);
  const [uiAssets, setUiAssets] = useState<UIAsset[]>([]);
  const [selectedUIAsset, setSelectedUIAsset] = useState<UIAsset | null>(null);
  const [showItemPromptConfig, setShowItemPromptConfig] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [chars, temps, itemList] = await Promise.all([
        api.getCharacters(),
        api.getTemplates(),
        api.getItems(),
      ]);
      setCharacters(chars);
      setTemplates(temps);
      setItems(itemList);
      if (chars.length > 0 && !selectedCharacter) {
        setSelectedCharacter(chars[0]);
      }
      // If the selected character was archived, it won't be in the list — select first
      if (selectedCharacter && !chars.find((c) => c.figure_id === selectedCharacter.figure_id)) {
        setSelectedCharacter(chars.length > 0 ? chars[0] : null);
      }
      if (itemList.length > 0 && !selectedItem) {
        setSelectedItem(itemList[0]);
      }
      // If the selected item was archived, it won't be in the list — select first
      if (selectedItem && !itemList.find((i) => i.id === selectedItem.id)) {
        setSelectedItem(itemList.length > 0 ? itemList[0] : null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadScenes = async () => {
    try {
      const data = await api.getScenes();
      setScenesData(data);
      // Refresh selectedScene from updated data
      if (selectedScene) {
        for (const mapData of Object.values(data.maps)) {
          const found = mapData.scenes.find((s) => s.location_id === selectedScene.location_id);
          if (found) {
            setSelectedScene(found);
            break;
          }
        }
      }
    } catch (err) {
      console.error('Failed to load scenes', err);
    }
  };

  // Load scenes when tab becomes active
  useEffect(() => {
    if (activeTab === 'scenes' && !scenesData) {
      loadScenes();
    }
    if (activeTab === 'ui-assets') {
      loadUIAssets();
    }
  }, [activeTab]);

  const handleCharacterUpdate = async () => {
    await loadData();
  };

  const handleCharacterCreated = async (newCharacter: import('./types').Character) => {
    const chars = await api.getCharacters();
    setCharacters(chars);
    const found = chars.find((c) => c.figure_id === newCharacter.figure_id) || newCharacter;
    setSelectedCharacter(found);
  };

  const handleTemplateUpdate = async () => {
    const temps = await api.getTemplates();
    setTemplates(temps);
  };

  const handleItemChange = async () => {
    const itemList = await api.getItems();
    setItems(itemList);
    // Refresh selected item
    if (selectedItem) {
      const updated = itemList.find((i) => i.id === selectedItem.id);
      if (updated) setSelectedItem(updated);
      else if (itemList.length > 0) setSelectedItem(itemList[0]);
    }
  };

  const handleSceneUpdate = async () => {
    await loadScenes();
  };

  const loadUIAssets = async () => {
    try {
      const assets = await api.getUIAssets();
      setUiAssets(assets);
      if (selectedUIAsset) {
        const updated = assets.find((a) => a.asset_id === selectedUIAsset.asset_id);
        if (updated) setSelectedUIAsset(updated);
      }
    } catch (err) {
      console.error('Failed to load UI assets', err);
    }
  };

  // Determine total scene count
  const totalScenes = scenesData
    ? Object.values(scenesData.maps).reduce((sum, m) => sum + m.scenes.length, 0)
    : 0;

  const totalMaps = scenesData ? Object.keys(scenesData.maps).length : 0;

  // Find the map containing the selected scene
  const selectedSceneMap = selectedScene && scenesData
    ? Object.values(scenesData.maps).find((m) => m.id === selectedScene.map_id)
    : null;

  return (
    <div style={styles.app}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.logo}>
            <div style={styles.logoIcon}></div>
            <div>
              <div style={styles.logoTitle}>资产管理器</div>
              <div style={styles.logoSubtitle}>ASSET MANAGEMENT SYSTEM</div>
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
            <span style={styles.navLabel}>角色管理</span>
            <span style={styles.navSublabel}>CHARACTERS</span>
          </button>
          <button
            style={{
              ...styles.navButton,
              ...(activeTab === 'items' ? styles.navButtonActive : {}),
            }}
            onClick={() => setActiveTab('items')}
          >
            <span style={styles.navLabel}>物品管理</span>
            <span style={styles.navSublabel}>EQUIPMENT</span>
          </button>
          <button
            style={{
              ...styles.navButton,
              ...(activeTab === 'scenes' ? styles.navButtonActive : {}),
            }}
            onClick={() => setActiveTab('scenes')}
          >
            <span style={styles.navLabel}>地点管理</span>
            <span style={styles.navSublabel}>LOCATIONS</span>
          </button>
          <button
            style={{
              ...styles.navButton,
              ...(activeTab === 'ui-assets' ? styles.navButtonActive : {}),
            }}
            onClick={() => setActiveTab('ui-assets')}
          >
            <span style={styles.navLabel}>UI 素材</span>
            <span style={styles.navSublabel}>UI ASSETS</span>
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

            {activeTab === 'items' && (
              <div style={styles.charactersLayout}>
                <aside style={styles.sidebar}>
                  <div style={styles.sidebarHeader}>
                    <div style={styles.sidebarHeaderTop}>
                      <div style={styles.sidebarTitle}>EQUIPMENT DATABASE</div>
                      <button
                        style={styles.sidebarIconButton}
                        onClick={() => setShowItemPromptConfig(true)}
                        title="配置物品 Prompt"
                        aria-label="配置物品 Prompt"
                      >
                        ⚙
                      </button>
                    </div>
                    <div style={styles.sidebarCount}>{items.length} ENTRIES</div>
                  </div>
                  <ItemList
                    items={items}
                    selectedItem={selectedItem}
                    onSelectItem={setSelectedItem}
                    onItemCreated={handleItemChange}
                  />
                </aside>
                <div style={styles.content}>
                  {selectedItem ? (
                    <ItemDetail
                      item={selectedItem}
                  templates={templates}
                      onUpdate={handleItemChange}
                    />
                  ) : (
                    <div style={styles.emptyState}>
                      <div style={styles.emptyIcon}>◈</div>
                      <div style={styles.emptyText}>SELECT AN ITEM</div>
                      <div style={styles.emptySubtext}>或点击「新增物品」创建</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'scenes' && (
              <div style={styles.charactersLayout}>
                <aside style={styles.sceneSidebar}>
                  <div style={styles.sidebarHeader}>
                    <div style={styles.sidebarTitle}>LOCATION DATABASE</div>
                    <div style={styles.sidebarCount}>{totalScenes} LOCATIONS · {totalMaps} MAPS</div>
                  </div>
                  {!scenesData ? (
                    <div style={styles.sidebarLoading}>
                      <div className="spinner"></div>
                    </div>
                  ) : (
                    <LocationList
                      maps={scenesData.maps}
                      selectedScene={selectedScene}
                      onSelectScene={setSelectedScene}
                    />
                  )}
                </aside>
                <div style={styles.content}>
                  {selectedScene && selectedSceneMap ? (
                    <LocationDetail
                      scene={selectedScene}
                      mapData={selectedSceneMap}
                      templates={templates}
                      onUpdate={handleSceneUpdate}
                    />
                  ) : (
                    <div style={styles.emptyState}>
                      <div style={styles.emptyIcon}>◈</div>
                      <div style={styles.emptyText}>SELECT A LOCATION</div>
                      <div style={styles.emptySubtext}>从左侧列表选择地点以编辑和生成图标</div>
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

            {activeTab === 'ui-assets' && (
              <div style={styles.charactersLayout}>
                <aside style={styles.sidebar}>
                  <div style={styles.sidebarHeader}>
                    <div style={styles.sidebarTitle}>UI ASSET DATABASE</div>
                    <div style={styles.sidebarCount}>{uiAssets.length} ASSETS</div>
                  </div>
                  <UIAssetList
                    assets={uiAssets}
                    selectedAsset={selectedUIAsset}
                    onSelectAsset={setSelectedUIAsset}
                    onAssetCreated={(asset) => {
                      setUiAssets((prev) => [...prev, asset]);
                      setSelectedUIAsset(asset);
                    }}
                  />
                </aside>
                <div style={styles.content}>
                  {selectedUIAsset ? (
                    <UIAssetDetail
                      key={selectedUIAsset.asset_id}
                      asset={selectedUIAsset}
                      onUpdate={loadUIAssets}
                    />
                  ) : (
                    <div style={styles.emptyState}>
                      <div style={styles.emptyIcon}>◻</div>
                      <div style={styles.emptyText}>SELECT A UI ASSET</div>
                      <div style={styles.emptySubtext}>或点击「新增 UI 素材」创建</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>
      <ItemPromptConfig
        isOpen={showItemPromptConfig}
        onClose={() => setShowItemPromptConfig(false)}
      />
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
    padding: '8px 16px',
    background: 'transparent',
    border: '1px solid var(--border-subtle)',
    color: 'var(--text-secondary)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
    position: 'relative',
    overflow: 'hidden',
    cursor: 'pointer',
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
  sceneSidebar: {
    width: '280px',
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
  sidebarHeaderTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    marginBottom: '4px',
  },
  sidebarTitle: {
    fontSize: '11px',
    fontWeight: '600',
    letterSpacing: '0.1em',
    color: 'var(--text-accent)',
  },
  sidebarIconButton: {
    width: '24px',
    height: '24px',
    border: '1px solid var(--border-primary)',
    background: 'var(--bg-secondary)',
    color: 'var(--text-accent)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    lineHeight: 1,
  },
  sidebarCount: {
    fontSize: '10px',
    fontWeight: '400',
    color: 'var(--text-tertiary)',
  },
  sidebarLoading: {
    flex: '1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: '1',
    overflow: 'auto',
  },
  templatesLayout: {
    flex: '1',
    overflow: 'auto',
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
    cursor: 'pointer',
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
