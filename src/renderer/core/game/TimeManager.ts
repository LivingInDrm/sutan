import { PlayerState } from '../player/PlayerState';
import { eventBus } from '../../lib/events';

export class TimeManager {
  private _currentDay: number;
  private _executionCountdown: number;
  private playerState: PlayerState;
  private _previousDayState: {
    day: number;
    countdown: number;
    playerData: ReturnType<PlayerState['serialize']>;
  } | null = null;

  constructor(playerState: PlayerState, executionDays: number, startDay: number = 1) {
    this.playerState = playerState;
    this._currentDay = startDay;
    this._executionCountdown = executionDays;
  }

  get currentDay(): number { return this._currentDay; }
  get executionCountdown(): number { return this._executionCountdown; }
  get isExecutionDay(): boolean { return this._executionCountdown <= 0; }

  advanceDay(): void {
    this._previousDayState = {
      day: this._currentDay,
      countdown: this._executionCountdown,
      playerData: this.playerState.serialize(),
    };
    this._currentDay += 1;
    this._executionCountdown -= 1;
  }

  rewind(): boolean {
    if (!this._previousDayState) return false;
    if (!this.playerState.useRewindCharge()) return false;

    this._currentDay = this._previousDayState.day;
    this._executionCountdown = this._previousDayState.countdown;
    this._previousDayState = null;
    return true;
  }

  extendCountdown(days: number): void {
    this._executionCountdown += days;
  }

  serialize(): { current_day: number; execution_countdown: number } {
    return {
      current_day: this._currentDay,
      execution_countdown: this._executionCountdown,
    };
  }

  loadState(day: number, countdown: number): void {
    this._currentDay = day;
    this._executionCountdown = countdown;
  }
}
