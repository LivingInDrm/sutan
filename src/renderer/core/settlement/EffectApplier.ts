import type { Effects, Card } from '../types';
import { PlayerState } from '../player/PlayerState';
import { CardManager } from '../card/CardManager';

export type CardDataResolver = (cardId: string) => Card | undefined;

export class EffectApplier {
  private playerState: PlayerState;
  private cardManager: CardManager;
  private cardDataResolver?: CardDataResolver;
  private cardAddedListener?: (card: Card) => void;
  private cardRemovedListener?: (cardId: string) => void;

  constructor(playerState: PlayerState, cardManager: CardManager) {
    this.playerState = playerState;
    this.cardManager = cardManager;
  }

  setCardDataResolver(resolver: CardDataResolver): void {
    this.cardDataResolver = resolver;
  }

  setOwnershipListeners(listeners: {
    onCardAdded?: (card: Card) => void;
    onCardRemoved?: (cardId: string) => void;
  }): void {
    this.cardAddedListener = listeners.onCardAdded;
    this.cardRemovedListener = listeners.onCardRemoved;
  }

  apply(effects: Effects, investedCardIds: string[] = []): void {
    if (effects.gold) {
      this.playerState.changeGold(effects.gold);
    }

    if (effects.reputation) {
      this.playerState.changeReputation(effects.reputation);
    }

    if (effects.cards_add) {
      for (const cardId of effects.cards_add) {
        if (this.cardManager.hasCard(cardId)) continue;
        const cardData = this.cardDataResolver?.(cardId);
        if (cardData) {
          this.cardManager.addCard(cardData);
          this.cardAddedListener?.(cardData);
        }
      }
    }

    if (effects.cards_remove) {
      for (const cardRef of effects.cards_remove) {
        const actualId = this.resolveCardReference(cardRef, investedCardIds);
        if (actualId) {
          const removed = this.cardManager.removeCard(actualId);
          if (removed) {
            this.cardRemovedListener?.(actualId);
          }
        }
      }
    }

    if (effects.tags_add) {
      for (const [cardRef, tags] of Object.entries(effects.tags_add)) {
        const actualId = this.resolveCardReference(cardRef, investedCardIds);
        if (actualId) {
          const card = this.cardManager.getCard(actualId);
          if (card) {
            for (const tag of tags) {
              card.addTag(tag);
            }
          }
        }
      }
    }

    if (effects.tags_remove) {
      for (const [cardRef, tags] of Object.entries(effects.tags_remove)) {
        const actualId = this.resolveCardReference(cardRef, investedCardIds);
        if (actualId) {
          const card = this.cardManager.getCard(actualId);
          if (card) {
            for (const tag of tags) {
              card.removeTag(tag);
            }
          }
        }
      }
    }

    if (effects.consume_invested) {
      for (const cardId of investedCardIds) {
        const removed = this.cardManager.removeCard(cardId);
        if (removed) {
          this.cardRemovedListener?.(cardId);
        }
      }
    }
  }

  private resolveCardReference(ref: string, investedCardIds: string[]): string | null {
    const match = ref.match(/^card_invested_(\d+)$/);
    if (match) {
      const index = parseInt(match[1], 10);
      return index < investedCardIds.length ? investedCardIds[index] : null;
    }
    return ref;
  }
}
