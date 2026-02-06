import { describe, it, expect } from 'vitest';
import { GameManager } from '@core/game/GameManager';
import { CardType, GameEndReason, GamePhase } from '@core/types/enums';
import type { Card, Scene } from '@core/types';

const makeChar = (id: string, tags: string[] = []): Card => ({
  card_id: id, name: `Char ${id}`, type: CardType.Character,
  rarity: 'silver' as any, description: '', image: '',
  attributes: { physique: 5, charm: 5, wisdom: 5, combat: 10, social: 5, survival: 5, stealth: 5, magic: 5 },
  tags, equipment_slots: 3,
});

const makeSultanCard = (id: string): Card => ({
  card_id: id, name: 'Sultan Card', type: CardType.Sultan,
  rarity: 'gold' as any, description: '', image: '',
});

describe('T8.1: GameManager', () => {
  it('should initialize new game', () => {
    const gm = new GameManager('normal', 'test-seed');
    gm.startNewGame([makeChar('c1', ['protagonist'])]);
    
    expect(gm.playerState.gold).toBe(30);
    expect(gm.timeManager.currentDay).toBe(1);
    expect(gm.cardManager.hasCard('c1')).toBe(true);
    expect(gm.isGameOver).toBe(false);
    expect(gm.dayManager.phase).toBe(GamePhase.Action);
  });

  it('should handle difficulty settings', () => {
    const easy = new GameManager('easy');
    expect(easy.playerState.gold).toBe(50);
    expect(easy.timeManager.executionCountdown).toBe(21);

    const hard = new GameManager('hard');
    expect(hard.playerState.gold).toBe(15);
    expect(hard.timeManager.executionCountdown).toBe(7);
  });

  it('should advance days', () => {
    const gm = new GameManager('normal', 'day-test');
    gm.startNewGame([makeChar('c1', ['protagonist'])]);
    gm.nextDay();
    expect(gm.timeManager.currentDay).toBe(2);
  });

  it('should detect execution failure', () => {
    const gm = new GameManager('nightmare', 'exec-test');
    gm.startNewGame([makeChar('c1', ['protagonist']), makeSultanCard('s1')]);
    
    for (let i = 0; i < 5; i++) {
      if (gm.isGameOver) break;
      gm.nextDay();
    }
    
    expect(gm.isGameOver).toBe(true);
    expect(gm.endReason).toBe(GameEndReason.ExecutionFailure);
  });

  it('should serialize and provide save data', () => {
    const gm = new GameManager('normal', 'save-test');
    gm.startNewGame([makeChar('c1', ['protagonist'])]);
    const save = gm.serialize();
    
    expect(save.save_id).toBeDefined();
    expect(save.game_state.current_day).toBe(1);
    expect(save.game_state.gold).toBe(30);
    expect(save.cards.hand).toContain('c1');
  });

  it('should load save data', () => {
    const gm = new GameManager('normal', 'load-test');
    const cards = [makeChar('c1', ['protagonist'])];
    gm.startNewGame(cards);
    gm.nextDay();
    gm.nextDay();
    const save = gm.serialize();

    const gm2 = new GameManager('normal');
    gm2.loadSave(save, cards, []);
    expect(gm2.timeManager.currentDay).toBe(save.game_state.current_day);
    expect(gm2.cardManager.hasCard('c1')).toBe(true);
  });
});
