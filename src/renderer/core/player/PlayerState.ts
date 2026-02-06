import { GAME_CONSTANTS, ReputationLevel, REPUTATION_RANGES } from '../types/enums';
import { eventBus } from '../../lib/events';

export class PlayerState {
  private _gold: number;
  private _reputation: number;
  private _goldenDice: number;
  private _rewindCharges: number;
  private _thinkCharges: number;

  constructor(
    gold: number = 30,
    reputation: number = GAME_CONSTANTS.INITIAL_REPUTATION,
    goldenDice: number = GAME_CONSTANTS.INITIAL_GOLDEN_DICE,
    rewindCharges: number = GAME_CONSTANTS.INITIAL_REWIND_CHARGES,
    thinkCharges: number = GAME_CONSTANTS.THINK_CHARGES_PER_DAY
  ) {
    this._gold = gold;
    this._reputation = Math.max(GAME_CONSTANTS.REPUTATION_MIN, Math.min(GAME_CONSTANTS.REPUTATION_MAX, reputation));
    this._goldenDice = goldenDice;
    this._rewindCharges = rewindCharges;
    this._thinkCharges = thinkCharges;
  }

  get gold(): number { return this._gold; }
  get reputation(): number { return this._reputation; }
  get goldenDice(): number { return this._goldenDice; }
  get rewindCharges(): number { return this._rewindCharges; }
  get thinkCharges(): number { return this._thinkCharges; }

  get reputationLevel(): ReputationLevel {
    for (const [level, [min, max]] of Object.entries(REPUTATION_RANGES)) {
      if (this._reputation >= min && this._reputation <= max) {
        return level as ReputationLevel;
      }
    }
    return ReputationLevel.Common;
  }

  changeGold(amount: number): void {
    this._gold += amount;
    eventBus.emit('player:gold_change', { amount, newTotal: this._gold });
  }

  changeReputation(amount: number): void {
    const oldReputation = this._reputation;
    this._reputation = Math.max(
      GAME_CONSTANTS.REPUTATION_MIN,
      Math.min(GAME_CONSTANTS.REPUTATION_MAX, this._reputation + amount)
    );
    const actualChange = this._reputation - oldReputation;
    eventBus.emit('player:reputation_change', { amount: actualChange, newTotal: this._reputation });
  }

  useGoldenDice(count: number = 1): boolean {
    if (this._goldenDice < count) return false;
    this._goldenDice -= count;
    return true;
  }

  addGoldenDice(count: number = 1): void {
    this._goldenDice += count;
  }

  useRewindCharge(): boolean {
    if (this._rewindCharges <= 0) return false;
    this._rewindCharges -= 1;
    return true;
  }

  addRewindCharge(count: number = 1): void {
    this._rewindCharges += count;
  }

  useThinkCharge(): boolean {
    if (this._thinkCharges <= 0) return false;
    this._thinkCharges -= 1;
    return true;
  }

  resetThinkCharges(): void {
    this._thinkCharges = GAME_CONSTANTS.THINK_CHARGES_PER_DAY;
  }

  serialize(): {
    gold: number;
    reputation: number;
    golden_dice: number;
    rewind_charges: number;
    think_charges: number;
  } {
    return {
      gold: this._gold,
      reputation: this._reputation,
      golden_dice: this._goldenDice,
      rewind_charges: this._rewindCharges,
      think_charges: this._thinkCharges,
    };
  }

  static deserialize(data: {
    gold: number;
    reputation: number;
    golden_dice: number;
    rewind_charges: number;
    think_charges: number;
  }): PlayerState {
    return new PlayerState(
      data.gold,
      data.reputation,
      data.golden_dice,
      data.rewind_charges,
      data.think_charges
    );
  }
}
