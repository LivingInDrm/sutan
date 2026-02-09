import React, { useState } from "react";
import type { Story } from "@ladle/react";
import { HandArea } from "./HandArea";
import type { Card, Attributes } from "../../../core/types";
import { CardType, Rarity, Attribute, EquipmentType } from "../../../core/types/enums";

import portraitXuLongxiang from "../../../assets/portraits/figure01.png";
import portraitXuWeixiong from "../../../assets/portraits/figure02.png";
import portraitXuFengnian from "../../../assets/portraits/figure03.png";
import portraitWenhua from "../../../assets/portraits/figure04.png";
import portraitHongshu from "../../../assets/portraits/figure05.png";
import portraitHongXixiang from "../../../assets/portraits/figure06.png";
import portraitGuest from "../../../assets/portraits/figure07.png";

import itemScimitar from "../../../assets/items/item_scimitar_01.png";
import itemSword01 from "../../../assets/items/item_sword_01.png";
import itemSword02 from "../../../assets/items/item_sword_02.png";
import itemDaggers from "../../../assets/items/item_daggers_01.png";
import itemGourd from "../../../assets/items/item_gourd_01.png";
import itemSwordcase from "../../../assets/items/item_swordcase_01.png";

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

const portraits = [portraitXuLongxiang, portraitXuWeixiong, portraitXuFengnian, portraitWenhua, portraitHongshu, portraitHongXixiang, portraitGuest];
const items = [itemScimitar, itemSword01, itemSword02, itemDaggers, itemGourd, itemSwordcase];

const charNames = ["徐龙象", "徐渭熊", "徐凤年", "温华", "红薯", "洪洗象", "客卿"];
const equipNames = ["大凉龙雀", "绣冬", "春雷", "春秋双刀", "酒葫芦", "剑匣"];
const intelNames = ["宫廷流言", "密报", "线索", "情报"];
const consumableNames = ["丹药", "补气散", "回春丸"];
const bookNames = ["剑经", "兵法", "心经"];
const thoughtNames = ["思念故人", "壮志未酬", "归隐之心"];

function makeCharacter(i: number, rarity: Rarity): Card {
  return {
    card_id: `char_${i}`,
    name: charNames[i % charNames.length],
    type: CardType.Character,
    rarity,
    description: "来自远方的旅者",
    image: portraits[i % portraits.length],
    attributes: MOCK_ATTRS,
    tags: ["wanderer"],
  };
}

function makeEquipment(i: number, rarity: Rarity): Card {
  return {
    card_id: `equip_${i}`,
    name: equipNames[i % equipNames.length],
    type: CardType.Equipment,
    rarity,
    description: "名器之一",
    image: items[i % items.length],
    equipment_type: EquipmentType.Weapon,
    attribute_bonus: { [Attribute.Combat]: 5 + i },
  };
}

function makeIntel(i: number): Card {
  return {
    card_id: `intel_${i}`,
    name: intelNames[i % intelNames.length],
    type: CardType.Intel,
    rarity: Rarity.Stone,
    description: "一条有价值的情报",
    image: "",
  };
}

function makeConsumable(i: number): Card {
  return {
    card_id: `cons_${i}`,
    name: consumableNames[i % consumableNames.length],
    type: CardType.Consumable,
    rarity: Rarity.Copper,
    description: "可消耗品",
    image: "",
  };
}

function makeBook(i: number): Card {
  return {
    card_id: `book_${i}`,
    name: bookNames[i % bookNames.length],
    type: CardType.Book,
    rarity: Rarity.Silver,
    description: "古籍",
    image: "",
  };
}

function makeThought(i: number): Card {
  return {
    card_id: `thought_${i}`,
    name: thoughtNames[i % thoughtNames.length],
    type: CardType.Thought,
    rarity: Rarity.Stone,
    description: "内心的声音",
    image: "",
  };
}

const rarities = [Rarity.Gold, Rarity.Silver, Rarity.Copper, Rarity.Stone];

function buildDeck(charCount: number, equipCount: number, itemCount: number, otherCount: number): Card[] {
  const cards: Card[] = [];
  for (let i = 0; i < charCount; i++) cards.push(makeCharacter(i, rarities[i % 4]));
  for (let i = 0; i < equipCount; i++) cards.push(makeEquipment(i, rarities[i % 4]));
  for (let i = 0; i < itemCount; i++) {
    if (i % 3 === 0) cards.push(makeIntel(i));
    else if (i % 3 === 1) cards.push(makeConsumable(i));
    else cards.push(makeBook(i));
  }
  for (let i = 0; i < otherCount; i++) cards.push(makeThought(i));
  return cards;
}

const Wrap = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-leather min-h-screen flex flex-col justify-end">{children}</div>
);

export const Default: Story = () => {
  const cards = buildDeck(7, 4, 6, 3);
  return (
    <Wrap>
      <HandArea cards={cards} />
    </Wrap>
  );
};
Default.meta = { title: "HandArea / Default" };

export const ManyCards: Story = () => {
  const cards = buildDeck(14, 8, 12, 6);
  return (
    <Wrap>
      <HandArea cards={cards} />
    </Wrap>
  );
};
ManyCards.meta = { title: "HandArea / Many Cards" };

export const FewCards: Story = () => {
  const cards = buildDeck(2, 1, 1, 0);
  return (
    <Wrap>
      <HandArea cards={cards} />
    </Wrap>
  );
};
FewCards.meta = { title: "HandArea / Few Cards" };

export const EmptyGroup: Story = () => {
  const cards = buildDeck(5, 0, 3, 0);
  return (
    <Wrap>
      <HandArea cards={cards} />
    </Wrap>
  );
};
EmptyGroup.meta = { title: "HandArea / Empty Group" };

export const Interactive: Story = () => {
  const cards = buildDeck(10, 6, 8, 4);
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <Wrap>
      <HandArea
        cards={cards}
        selectedCardId={selected}
        onCardClick={(card) => setSelected(prev => prev === card.card_id ? null : card.card_id)}
      />
    </Wrap>
  );
};
Interactive.meta = { title: "HandArea / Interactive" };
