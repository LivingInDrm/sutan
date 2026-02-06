import type { Slot, Card } from '../types';
import { SlotType, CardType } from '../types/enums';
import { CardInstance } from '../card/CardInstance';
import { CardManager } from '../card/CardManager';

export interface SlotState {
  config: Slot;
  cardId: string | null;
  locked: boolean;
}

export class SlotSystem {
  private slots: SlotState[] = [];
  private cardManager: CardManager;

  constructor(cardManager: CardManager) {
    this.cardManager = cardManager;
  }

  initializeSlots(slotConfigs: Slot[]): void {
    this.slots = slotConfigs.map(config => ({
      config: { ...config },
      cardId: null,
      locked: config.locked,
    }));
  }

  placeCard(slotIndex: number, cardId: string): boolean {
    if (slotIndex < 0 || slotIndex >= this.slots.length) return false;
    const slot = this.slots[slotIndex];
    if (slot.locked) return false;
    if (slot.cardId !== null) return false;

    const card = this.cardManager.getCard(cardId);
    if (!card) return false;

    if (!this.isCardTypeValid(card, slot.config.type)) return false;

    slot.cardId = cardId;
    return true;
  }

  removeCard(slotIndex: number): string | null {
    if (slotIndex < 0 || slotIndex >= this.slots.length) return null;
    const slot = this.slots[slotIndex];
    if (slot.locked) return null;
    const cardId = slot.cardId;
    slot.cardId = null;
    return cardId;
  }

  getSlotState(slotIndex: number): SlotState | undefined {
    return this.slots[slotIndex];
  }

  getAllSlots(): SlotState[] {
    return [...this.slots];
  }

  getInvestedCardIds(): string[] {
    return this.slots
      .filter(s => s.cardId !== null)
      .map(s => s.cardId!);
  }

  areRequiredSlotsFilled(): boolean {
    return this.slots
      .filter(s => s.config.required)
      .every(s => s.cardId !== null);
  }

  lockAllCards(): void {
    for (const slot of this.slots) {
      if (slot.cardId) {
        slot.locked = true;
      }
    }
  }

  unlockAllCards(): void {
    for (const slot of this.slots) {
      slot.locked = false;
    }
  }

  private isCardTypeValid(card: CardInstance, slotType: SlotType): boolean {
    switch (slotType) {
      case SlotType.Character:
        return card.isCharacter;
      case SlotType.Item:
        return card.type === CardType.Equipment || card.type === CardType.Intel ||
               card.type === CardType.Consumable || card.type === CardType.Book ||
               card.type === CardType.Gem;
      case SlotType.Sultan:
        return card.isSultan;
      case SlotType.Gold:
        return false;
      default:
        return false;
    }
  }

  clear(): void {
    this.slots = [];
  }
}
