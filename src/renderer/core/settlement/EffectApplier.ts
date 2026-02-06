import type { Effects } from '../types';
import { PlayerState } from '../player/PlayerState';
import { CardManager } from '../card/CardManager';

export class EffectApplier {
  private playerState: PlayerState;
  private cardManager: CardManager;

  constructor(playerState: PlayerState, cardManager: CardManager) {
    this.playerState = playerState;
    this.cardManager = cardManager;
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
        // cards_add 引用的是配置中的卡牌ID，此处仅做添加标记
        // 实际卡牌数据由外部传入或从配置加载
      }
    }

    if (effects.cards_remove) {
      for (const cardRef of effects.cards_remove) {
        const actualId = this.resolveCardReference(cardRef, investedCardIds);
        if (actualId) {
          this.cardManager.removeCard(actualId);
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
        this.cardManager.removeCard(cardId);
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
