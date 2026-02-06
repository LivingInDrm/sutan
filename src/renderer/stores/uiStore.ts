import { create } from 'zustand';

export type ScreenType = 'title' | 'map' | 'scene' | 'settlement' | 'dialog' | 'shop' | 'inventory';

interface ModalState {
  id: string;
  type: string;
  props?: Record<string, unknown>;
}

interface AnimationQueueItem {
  id: string;
  type: string;
  data?: unknown;
}

interface UIStoreState {
  currentScreen: ScreenType;
  previousScreen: ScreenType | null;
  modals: ModalState[];
  animationQueue: AnimationQueueItem[];
  isLoading: boolean;
  selectedCardId: string | null;
  selectedSceneId: string | null;
}

interface UIStoreActions {
  setScreen: (screen: ScreenType) => void;
  goBack: () => void;
  openModal: (modal: ModalState) => void;
  closeModal: (id: string) => void;
  closeAllModals: () => void;
  pushAnimation: (item: AnimationQueueItem) => void;
  shiftAnimation: () => AnimationQueueItem | undefined;
  setLoading: (loading: boolean) => void;
  selectCard: (cardId: string | null) => void;
  selectScene: (sceneId: string | null) => void;
}

type UIStore = UIStoreState & UIStoreActions;

export const useUIStore = create<UIStore>()((set, get) => ({
  currentScreen: 'title',
  previousScreen: null,
  modals: [],
  animationQueue: [],
  isLoading: false,
  selectedCardId: null,
  selectedSceneId: null,

  setScreen: (screen) => {
    set({ previousScreen: get().currentScreen, currentScreen: screen });
  },

  goBack: () => {
    const prev = get().previousScreen;
    if (prev) {
      set({ currentScreen: prev, previousScreen: null });
    }
  },

  openModal: (modal) => {
    set({ modals: [...get().modals, modal] });
  },

  closeModal: (id) => {
    set({ modals: get().modals.filter(m => m.id !== id) });
  },

  closeAllModals: () => {
    set({ modals: [] });
  },

  pushAnimation: (item) => {
    set({ animationQueue: [...get().animationQueue, item] });
  },

  shiftAnimation: () => {
    const queue = get().animationQueue;
    if (queue.length === 0) return undefined;
    const [first, ...rest] = queue;
    set({ animationQueue: rest });
    return first;
  },

  setLoading: (loading) => {
    set({ isLoading: loading });
  },

  selectCard: (cardId) => {
    set({ selectedCardId: cardId });
  },

  selectScene: (sceneId) => {
    set({ selectedSceneId: sceneId });
  },
}));
