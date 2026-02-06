import { describe, it, expect, vi } from 'vitest';
import { eventBus } from '@lib/events';

describe('T1.5: Event Bus', () => {
  it('should publish and subscribe events', () => {
    const handler = vi.fn();
    eventBus.on('day:dawn', handler);
    eventBus.emit('day:dawn', { day: 1 });
    expect(handler).toHaveBeenCalledWith({ day: 1 });
    eventBus.off('day:dawn', handler);
  });

  it('should support unsubscribe', () => {
    const handler = vi.fn();
    eventBus.on('card:add', handler);
    eventBus.off('card:add', handler);
    eventBus.emit('card:add', { cardId: 'card_001' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('should support multiple subscribers', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    eventBus.on('player:gold_change', handler1);
    eventBus.on('player:gold_change', handler2);
    eventBus.emit('player:gold_change', { amount: 10, newTotal: 40 });
    expect(handler1).toHaveBeenCalledOnce();
    expect(handler2).toHaveBeenCalledOnce();
    eventBus.off('player:gold_change', handler1);
    eventBus.off('player:gold_change', handler2);
  });

  it('should support wildcard listener', () => {
    const handler = vi.fn();
    eventBus.on('*', handler);
    eventBus.emit('game:start', { difficulty: 'normal' });
    expect(handler).toHaveBeenCalledWith('game:start', { difficulty: 'normal' });
    eventBus.off('*', handler);
  });
});
