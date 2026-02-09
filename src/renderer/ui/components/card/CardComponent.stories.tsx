import React, { useState } from "react";
import type { Story } from "@ladle/react";
import { CardComponent } from "./CardComponent";
import type { Card, Attributes } from "../../../core/types";
import { CardType, Rarity, Attribute, EquipmentType, SpecialAttribute } from "../../../core/types/enums";

import portraitXuLongxiang from "../../../assets/portraits/figure01.png";
import portraitXuWeixiong from "../../../assets/portraits/figure02.png";
import portraitXuFengnian from "../../../assets/portraits/figure03.png";
import portraitWenhua from "../../../assets/portraits/figure04.png";
import portraitHongshu from "../../../assets/portraits/figure05.png";
import portraitHongXixiang from "../../../assets/portraits/figure06.png";

import itemScimitar from "../../../assets/items/item_scimitar_01.png";
import itemSword01 from "../../../assets/items/item_sword_01.png";

const MOCK_ATTRS: Attributes = {
  [Attribute.Physique]: 5,
  [Attribute.Charm]: 8,
  [Attribute.Wisdom]: 6,
  [Attribute.Combat]: 3,
  [Attribute.Social]: 7,
  [Attribute.Survival]: 4,
  [Attribute.Stealth]: 2,
  [Attribute.Magic]: 9,
};

const makeCard = (rarity: Rarity, name: string, image = ""): Card => ({
  card_id: `card_${rarity}_${name}`,
  name,
  type: CardType.Character,
  rarity,
  description: "A mysterious traveler from distant lands, skilled in the arts of negotiation and survival.",
  image,
  attributes: MOCK_ATTRS,
  tags: ["merchant", "wanderer"],
});

const MOCK_GOLD = makeCard(Rarity.Gold, "徐渭熊", portraitXuWeixiong);
const MOCK_SILVER = makeCard(Rarity.Silver, "徐龙象", portraitXuLongxiang);
const MOCK_COPPER = makeCard(Rarity.Copper, "温华", portraitWenhua);
const MOCK_STONE = makeCard(Rarity.Stone, "徐凤年", portraitXuFengnian);

const MOCK_EQUIP_GOLD: Card = {
  card_id: "equip_gold",
  name: "大凉龙雀",
  type: CardType.Equipment,
  rarity: Rarity.Gold,
  description: "北凉王妃吴素佩剑",
  image: itemSword01,
  equipment_type: EquipmentType.Weapon,
  attribute_bonus: { [Attribute.Combat]: 10 },
};

const MOCK_EQUIP_SILVER: Card = {
  card_id: "equip_silver",
  name: "绣冬",
  type: CardType.Equipment,
  rarity: Rarity.Silver,
  description: "南宫仆射佩刀",
  image: itemScimitar,
  equipment_type: EquipmentType.Weapon,
  attribute_bonus: { [Attribute.Combat]: 7 },
};

const MOCK_INTEL: Card = {
  card_id: "intel_01",
  name: "宫廷流言",
  type: CardType.Intel,
  rarity: Rarity.Stone,
  description: "关于宫廷的流言蜚语",
  image: "",
  attribute_bonus: { [Attribute.Social]: 3 },
};

const MOCK_HONGSHU = makeCard(Rarity.Gold, "红薯", portraitHongshu);
const MOCK_HONGXIXIANG = makeCard(Rarity.Silver, "洪洗象", portraitHongXixiang);

const ALL_COMPACT: Card[] = [
  MOCK_GOLD, MOCK_HONGSHU, MOCK_EQUIP_GOLD,
  MOCK_SILVER, MOCK_HONGXIXIANG, MOCK_EQUIP_SILVER,
  MOCK_COPPER,
  MOCK_STONE, MOCK_INTEL,
];

const Wrap = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-leather min-h-screen p-8">{children}</div>
);

export const CompactPlayground: Story = () => {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <Wrap>
      <div className="mb-6">
        <h3 className="text-parchment/60 text-xs mb-3 tracking-widest uppercase">Hand Cards</h3>
        <div className="flex gap-2 flex-wrap">
          {ALL_COMPACT.map(card => (
            <CardComponent
              key={card.card_id}
              card={card}
              compact
              selected={selectedId === card.card_id}
              onClick={() => setSelectedId(prev => prev === card.card_id ? null : card.card_id)}
            />
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-parchment/60 text-xs mb-3 tracking-widest uppercase">Locked Cards</h3>
        <div className="flex gap-2">
          <CardComponent card={MOCK_GOLD} compact locked />
          <CardComponent card={MOCK_SILVER} compact locked />
          <CardComponent card={MOCK_COPPER} compact locked />
        </div>
      </div>
    </Wrap>
  );
};
CompactPlayground.meta = { title: "CardComponent / Compact Playground" };

export const Compact: Story = () => (
  <Wrap>
    <div className="flex gap-2">
      <CardComponent card={MOCK_GOLD} compact />
      <CardComponent card={MOCK_SILVER} compact />
      <CardComponent card={MOCK_COPPER} compact />
      <CardComponent card={MOCK_STONE} compact />
    </div>
  </Wrap>
);
Compact.meta = { title: "CardComponent / Compact" };

export const GoldRarity: Story = () => (
  <Wrap><CardComponent card={MOCK_GOLD} /></Wrap>
);
GoldRarity.meta = { title: "CardComponent / Gold" };

export const SilverRarity: Story = () => (
  <Wrap><CardComponent card={MOCK_SILVER} /></Wrap>
);
SilverRarity.meta = { title: "CardComponent / Silver" };

export const CopperRarity: Story = () => (
  <Wrap><CardComponent card={MOCK_COPPER} /></Wrap>
);
CopperRarity.meta = { title: "CardComponent / Copper" };

export const StoneRarity: Story = () => (
  <Wrap><CardComponent card={MOCK_STONE} /></Wrap>
);
StoneRarity.meta = { title: "CardComponent / Stone" };

export const Selected: Story = () => (
  <Wrap><CardComponent card={MOCK_GOLD} selected /></Wrap>
);
Selected.meta = { title: "CardComponent / Selected" };

export const Locked: Story = () => (
  <Wrap><CardComponent card={MOCK_SILVER} locked /></Wrap>
);
Locked.meta = { title: "CardComponent / Locked" };

export const AllRarities: Story = () => (
  <Wrap>
    <div className="flex flex-wrap gap-4">
      <CardComponent card={MOCK_GOLD} />
      <CardComponent card={MOCK_SILVER} />
      <CardComponent card={MOCK_COPPER} />
      <CardComponent card={MOCK_STONE} />
    </div>
  </Wrap>
);
AllRarities.meta = { title: "CardComponent / All Rarities" };
