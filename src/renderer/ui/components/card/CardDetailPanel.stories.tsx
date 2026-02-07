import type { Story } from "@ladle/react";
import { CardDetailPanel } from "./CardDetailPanel";
import type { Card, Attributes } from "../../../core/types";
import {
  CardType,
  Rarity,
  Attribute,
  SpecialAttribute,
  EquipmentType,
} from "../../../core/types/enums";

import portraitAertu from "../../../assets/portraits/figure01.png";
import portraitHongying from "../../../assets/portraits/figure02.png";
import portraitChangfeng from "../../../assets/portraits/figure03.png";
import portraitMingxi from "../../../assets/portraits/figure04.png";
import portraitShuangyue from "../../../assets/portraits/figure05.png";
import portraitYunjue from "../../../assets/portraits/figure06.png";

const CHAR_ATTRS: Attributes = {
  [Attribute.Physique]: 31,
  [Attribute.Charm]: 18,
  [Attribute.Wisdom]: 21,
  [Attribute.Combat]: 31,
  [Attribute.Social]: 17,
  [Attribute.Survival]: 16,
  [Attribute.Stealth]: 10,
  [Attribute.Magic]: 23,
};

const MOCK_CHARACTER_GOLD: Card = {
  card_id: "card_005",
  name: "霜月",
  type: CardType.Character,
  rarity: Rarity.Gold,
  description: "身着橙衣的神秘女子，擅长以舞蹈施展秘术。据传她能预见三日之内的未来，却从不为自己占卜。",
  image: portraitShuangyue,
  attributes: {
    [Attribute.Physique]: 3,
    [Attribute.Charm]: 9,
    [Attribute.Wisdom]: 7,
    [Attribute.Combat]: 2,
    [Attribute.Social]: 6,
    [Attribute.Survival]: 2,
    [Attribute.Stealth]: 4,
    [Attribute.Magic]: 10,
  },
  special_attributes: {
    [SpecialAttribute.Support]: 2,
    [SpecialAttribute.Reroll]: 3,
  },
  tags: ["female", "mystic", "dancer"],
  equipment_slots: 1,
};

const MOCK_CHARACTER_SILVER: Card = {
  card_id: "card_protagonist",
  name: "阿尔图",
  type: CardType.Character,
  rarity: Rarity.Silver,
  description: "你自己，一个卷入苏丹游戏的可悲之人。虽然年纪尚轻，却已经历过刀光剑影的洗礼。",
  image: portraitAertu,
  attributes: {
    [Attribute.Physique]: 9,
    [Attribute.Charm]: 5,
    [Attribute.Wisdom]: 3,
    [Attribute.Combat]: 8,
    [Attribute.Social]: 4,
    [Attribute.Survival]: 3,
    [Attribute.Stealth]: 2,
    [Attribute.Magic]: 2,
  },
  special_attributes: {
    [SpecialAttribute.Support]: 2,
    [SpecialAttribute.Reroll]: 1,
  },
  tags: ["male", "clan", "protagonist"],
  equipment_slots: 3,
};

const MOCK_EQUIPMENT: Card = {
  card_id: "equip_01",
  name: "实传铠",
  type: CardType.Equipment,
  rarity: Rarity.Gold,
  description: "传承自古代苏丹的珍贵铠甲，蕴含着不可思议的防护之力。",
  image: "",
  equipment_type: EquipmentType.Armor,
  attribute_bonus: {
    [Attribute.Physique]: 5,
    [Attribute.Combat]: 3,
    [Attribute.Survival]: 2,
  },
  special_bonus: {
    [SpecialAttribute.Support]: 1,
  },
  gem_slots: 2,
  tags: ["护甲", "传说"],
};

const MOCK_INTEL: Card = {
  card_id: "intel_01",
  name: "密道地图",
  type: CardType.Intel,
  rarity: Rarity.Copper,
  description: "一张标注了宫殿密道的古老地图，也许能在关键时刻派上用场。",
  image: "",
  attribute_bonus: {
    [Attribute.Stealth]: 4,
    [Attribute.Wisdom]: 2,
  },
  tags: ["情报", "宫殿"],
};

const MOCK_CONSUMABLE: Card = {
  card_id: "consumable_01",
  name: "治愈药水",
  type: CardType.Consumable,
  rarity: Rarity.Stone,
  description: "普通的治愈药水，能恢复少量体力。",
  image: "",
  attribute_bonus: {
    [Attribute.Physique]: 3,
  },
  tags: ["消耗品"],
};

const noop = () => {};
const center = { x: 40, y: 40 };

const Wrap = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-leather min-h-screen p-10 relative">{children}</div>
);

export const CharacterGold: Story = () => (
  <Wrap>
    <CardDetailPanel card={MOCK_CHARACTER_GOLD} position={center} onClose={noop} />
  </Wrap>
);
CharacterGold.meta = { title: "CardDetailPanel / Character Gold" };

export const CharacterSilver: Story = () => (
  <Wrap>
    <CardDetailPanel card={MOCK_CHARACTER_SILVER} position={center} onClose={noop} />
  </Wrap>
);
CharacterSilver.meta = { title: "CardDetailPanel / Character Silver" };

export const Equipment: Story = () => (
  <Wrap>
    <CardDetailPanel card={MOCK_EQUIPMENT} position={center} onClose={noop} />
  </Wrap>
);
Equipment.meta = { title: "CardDetailPanel / Equipment" };

export const Intel: Story = () => (
  <Wrap>
    <CardDetailPanel card={MOCK_INTEL} position={center} onClose={noop} />
  </Wrap>
);
Intel.meta = { title: "CardDetailPanel / Intel" };

export const Consumable: Story = () => (
  <Wrap>
    <CardDetailPanel card={MOCK_CONSUMABLE} position={center} onClose={noop} />
  </Wrap>
);
Consumable.meta = { title: "CardDetailPanel / Consumable" };
