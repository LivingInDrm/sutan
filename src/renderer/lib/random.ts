import seedrandom from 'seedrandom';

export class RandomManager {
  private rng: seedrandom.PRNG;
  private _seed: string;

  constructor(seed?: string) {
    this._seed = seed || Date.now().toString();
    this.rng = seedrandom(this._seed);
  }

  get seed(): string {
    return this._seed;
  }

  next(): number {
    return this.rng();
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  rollD10(): number {
    return this.nextInt(1, 10);
  }

  setSeed(seed: string): void {
    this._seed = seed;
    this.rng = seedrandom(seed);
  }

  getState(): string {
    return this._seed;
  }

  clone(): RandomManager {
    return new RandomManager(this._seed);
  }
}
