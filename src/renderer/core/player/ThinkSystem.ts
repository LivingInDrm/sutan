import { CardManager } from '../card/CardManager';
import { PlayerState } from '../player/PlayerState';
import { GAME_CONSTANTS } from '../types/enums';

export class ThinkSystem {
  private playerState: PlayerState;
  private cardManager: CardManager;
  private _usedToday: Set<string> = new Set();

  constructor(playerState: PlayerState, cardManager: CardManager) {
    this.playerState = playerState;
    this.cardManager = cardManager;
  }

  canThink(cardId: string): boolean {
    if (this.playerState.thinkCharges <= 0) return false;
    if (this._usedToday.has(cardId)) return false;
    if (!this.cardManager.hasCard(cardId)) return false;
    return true;
  }

  useThink(cardId: string): boolean {
    if (!this.canThink(cardId)) return false;
    this.playerState.useThinkCharge();
    this._usedToday.add(cardId);
    return true;
  }

  resetDaily(): void {
    this.playerState.resetThinkCharges();
    this._usedToday.clear();
  }

  get usedToday(): string[] {
    return Array.from(this._usedToday);
  }

  get remainingCharges(): number {
    return this.playerState.thinkCharges;
  }

  loadUsedToday(cardIds: string[]): void {
    this._usedToday = new Set(cardIds);
  }
}
