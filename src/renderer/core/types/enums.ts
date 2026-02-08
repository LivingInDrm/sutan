export enum Rarity {
  Gold = 'gold',
  Silver = 'silver',
  Copper = 'copper',
  Stone = 'stone',
}

export enum Attribute {
  Physique = 'physique',
  Charm = 'charm',
  Wisdom = 'wisdom',
  Combat = 'combat',
  Social = 'social',
  Survival = 'survival',
  Stealth = 'stealth',
  Magic = 'magic',
}

export enum SpecialAttribute {
  Support = 'support',
  Reroll = 'reroll',
}

export enum CardType {
  Character = 'character',
  Equipment = 'equipment',
  Intel = 'intel',
  Consumable = 'consumable',
  Book = 'book',
  Thought = 'thought',
  Gem = 'gem',
  Sultan = 'sultan',
}

export enum EquipmentType {
  Weapon = 'weapon',
  Armor = 'armor',
  Accessory = 'accessory',
  Mount = 'mount',
}

export enum SceneType {
  Event = 'event',
  Shop = 'shop',
  Challenge = 'challenge',
}

export enum SceneStatus {
  Available = 'available',
  Participated = 'participated',
  Settling = 'settling',
  Completed = 'completed',
  Locked = 'locked',
}

export enum CheckResult {
  Success = 'success',
  PartialSuccess = 'partial_success',
  Failure = 'failure',
  CriticalFailure = 'critical_failure',
}

export enum CalcMode {
  Max = 'max',
  Sum = 'sum',
  Min = 'min',
  Avg = 'avg',
  First = 'first',
  Specific = 'specific',
}

export enum SlotType {
  Character = 'character',
  Item = 'item',
  Sultan = 'sultan',
  Gold = 'gold',
}

export enum ReputationLevel {
  Humble = 'humble',
  Common = 'common',
  Respected = 'respected',
  Prominent = 'prominent',
  Legendary = 'legendary',
}

export enum GamePhase {
  Dawn = 'dawn',
  Action = 'action',
  Settlement = 'settlement',
}

export enum NarrativeNodeType {
  Dialogue = 'dialogue',
  Narration = 'narration',
  Effect = 'effect',
  Choice = 'choice',
}

export enum GameEndReason {
  MainlineVictory = 'mainline_victory',
  SurvivalVictory = 'survival_victory',
  HiddenEnding = 'hidden_ending',
  ExecutionFailure = 'execution_failure',
  DeathFailure = 'death_failure',
}

export const REPUTATION_RANGES: Record<ReputationLevel, [number, number]> = {
  [ReputationLevel.Humble]: [0, 19],
  [ReputationLevel.Common]: [20, 39],
  [ReputationLevel.Respected]: [40, 59],
  [ReputationLevel.Prominent]: [60, 79],
  [ReputationLevel.Legendary]: [80, 100],
};

export const RARITY_ATTRIBUTE_RANGES: Record<Rarity, [number, number]> = {
  [Rarity.Gold]: [36, 60],
  [Rarity.Silver]: [21, 35],
  [Rarity.Copper]: [11, 20],
  [Rarity.Stone]: [5, 10],
};

export const DICE_CONFIG = {
  SIDES: 10,
  SUCCESS_THRESHOLD: 7,
  EXPLODE_ON: 10,
  MAX_POOL: 20,
  MAX_EXPLODE: 20,
} as const;

export const GAME_CONSTANTS = {
  MAX_HAND_SIZE: 512,
  THINK_CHARGES_PER_DAY: 3,
  INITIAL_REPUTATION: 50,
  REPUTATION_MIN: 0,
  REPUTATION_MAX: 100,
  INITIAL_REWIND_CHARGES: 3,
  INITIAL_GOLDEN_DICE: 0,
  SHOP_REFRESH_CYCLE: 7,
} as const;
