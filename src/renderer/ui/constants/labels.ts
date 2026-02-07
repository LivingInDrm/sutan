export const ATTR_LABELS: Record<string, string> = {
  physique: '体魄',
  charm: '魅力',
  wisdom: '智慧',
  combat: '战斗',
  social: '社交',
  survival: '生存',
  stealth: '隐匿',
  magic: '魔力',
};

export const ATTR_ICONS: Record<string, string> = {
  physique: '💪',
  charm: '✨',
  wisdom: '🧠',
  combat: '⚔️',
  social: '🗣️',
  survival: '🛡️',
  stealth: '👁️',
  magic: '🔮',
};

export const SPECIAL_ATTR_LABELS: Record<string, string> = {
  support: '支持',
  reroll: '重投',
};

export const SPECIAL_ATTR_ICONS: Record<string, string> = {
  support: '🤝',
  reroll: '🎲',
};

export const EQUIPMENT_TYPE_LABELS: Record<string, string> = {
  weapon: '武器',
  armor: '护甲',
  accessory: '饰品',
  mount: '坐骑',
};

export const CARD_TYPE_LABELS: Record<string, string> = {
  character: '角色',
  equipment: '装备',
  sultan: '苏丹',
  intel: '情报',
  consumable: '消耗品',
  book: '典籍',
  gem: '宝石',
  thought: '思绪',
};

export function getAttrLabel(attr: string): string {
  return ATTR_LABELS[attr] || SPECIAL_ATTR_LABELS[attr] || attr;
}

export function getAttrIcon(attr: string): string {
  return ATTR_ICONS[attr] || SPECIAL_ATTR_ICONS[attr] || '?';
}
