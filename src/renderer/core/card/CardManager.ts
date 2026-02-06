import { CardInstance } from './CardInstance';
import type { Card } from '../types';
import { GAME_CONSTANTS, CardType } from '../types/enums';
import { eventBus } from '../../lib/events';

export class CardManager {
  private cards: Map<string, CardInstance> = new Map();

  addCard(data: Card): CardInstance | null {
    if (this.cards.size >= GAME_CONSTANTS.MAX_HAND_SIZE) {
      return null;
    }
    const instance = new CardInstance(data);
    this.cards.set(instance.id, instance);
    eventBus.emit('card:add', { cardId: instance.id });
    return instance;
  }

  removeCard(cardId: string): boolean {
    const card = this.cards.get(cardId);
    if (!card) return false;
    if (card.isProtagonist) return false;
    this.cards.delete(cardId);
    eventBus.emit('card:remove', { cardId });
    return true;
  }

  getCard(cardId: string): CardInstance | undefined {
    return this.cards.get(cardId);
  }

  getAllCards(): CardInstance[] {
    return Array.from(this.cards.values());
  }

  getCardsByType(type: CardType): CardInstance[] {
    return this.getAllCards().filter(c => c.type === type);
  }

  getCardsByTag(tag: string): CardInstance[] {
    return this.getAllCards().filter(c => c.hasTag(tag));
  }

  hasCard(cardId: string): boolean {
    return this.cards.has(cardId);
  }

  get handSize(): number {
    return this.cards.size;
  }

  get isFull(): boolean {
    return this.cards.size >= GAME_CONSTANTS.MAX_HAND_SIZE;
  }

  getSultanCards(): CardInstance[] {
    return this.getCardsByType(CardType.Sultan);
  }

  getCharacterCards(): CardInstance[] {
    return this.getCardsByType(CardType.Character);
  }

  clear(): void {
    this.cards.clear();
  }

  getCardIds(): string[] {
    return Array.from(this.cards.keys());
  }
}
