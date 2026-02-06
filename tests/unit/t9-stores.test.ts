import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '@stores/gameStore';
import { useUIStore } from '@stores/uiStore';
import { CardType, GamePhase } from '@core/types/enums';
import type { Card } from '@core/types';

const makeChar = (id: string, tags: string[] = []): Card => ({
  card_id: id, name: `Char ${id}`, type: CardType.Character,
  rarity: 'silver' as any, description: '', image: '',
  attributes: { physique: 5, charm: 5, wisdom: 5, combat: 10, social: 5, survival: 5, stealth: 5, magic: 5 },
  tags, equipment_slots: 3,
});

describe('T9.1: gameStore', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
  });

  it('should start new game and sync state', () => {
    const store = useGameStore.getState();
    store.startNewGame('normal', [makeChar('c1', ['protagonist'])], [], 'store-test');
    const state = useGameStore.getState();
    expect(state.game).not.toBeNull();
    expect(state.currentDay).toBe(1);
    expect(state.gold).toBe(30);
    expect(state.handCardIds).toContain('c1');
    expect(state.phase).toBe(GamePhase.Action);
  });

  it('should advance day and update state', () => {
    const store = useGameStore.getState();
    store.startNewGame('normal', [makeChar('c1', ['protagonist'])], [], 'advance-test');
    store.nextDay();
    const state = useGameStore.getState();
    expect(state.currentDay).toBe(2);
  });

  it('should save and load', () => {
    const cards = [makeChar('c1', ['protagonist'])];
    const store = useGameStore.getState();
    store.startNewGame('normal', cards, [], 'save-load');
    store.nextDay();
    const save = store.save()!;
    expect(save).not.toBeNull();
    
    store.reset();
    store.load(save, cards, []);
    const state = useGameStore.getState();
    expect(state.currentDay).toBe(save.game_state.current_day);
  });
});

describe('T9.3: uiStore', () => {
  beforeEach(() => {
    const state = useUIStore.getState();
    state.closeAllModals();
    state.setScreen('title');
  });

  it('should switch screens', () => {
    const store = useUIStore.getState();
    store.setScreen('map');
    expect(useUIStore.getState().currentScreen).toBe('map');
    expect(useUIStore.getState().previousScreen).toBe('title');
  });

  it('should go back', () => {
    const store = useUIStore.getState();
    store.setScreen('map');
    store.setScreen('scene');
    store.goBack();
    expect(useUIStore.getState().currentScreen).toBe('map');
  });

  it('should manage modals', () => {
    const store = useUIStore.getState();
    store.openModal({ id: 'm1', type: 'info' });
    store.openModal({ id: 'm2', type: 'confirm' });
    expect(useUIStore.getState().modals).toHaveLength(2);
    store.closeModal('m1');
    expect(useUIStore.getState().modals).toHaveLength(1);
    store.closeAllModals();
    expect(useUIStore.getState().modals).toHaveLength(0);
  });

  it('should manage animation queue (FIFO)', () => {
    const store = useUIStore.getState();
    store.pushAnimation({ id: 'a1', type: 'dice' });
    store.pushAnimation({ id: 'a2', type: 'card' });
    const first = store.shiftAnimation();
    expect(first!.id).toBe('a1');
    expect(useUIStore.getState().animationQueue).toHaveLength(1);
  });
});
