import type { Story } from "@ladle/react";
import { CardComponent } from "./CardComponent";
import type { Card, Attributes } from "../../../core/types";
import { CardType, Rarity, Attribute } from "../../../core/types/enums";

import portraitXuLongxiang from "../../../assets/portraits/figure01.png";
import portraitXuWeixiong from "../../../assets/portraits/figure02.png";
import portraitXuFengnian from "../../../assets/portraits/figure03.png";
import portraitWenhua from "../../../assets/portraits/figure04.png";

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
  card_id: `card_${rarity}`,
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

const Wrap = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-leather min-h-screen p-8">{children}</div>
);

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
