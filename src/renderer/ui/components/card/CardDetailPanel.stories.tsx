import type { Story } from "@ladle/react";
import { CardDetailPanel } from "./CardDetailPanel";
import type { Card } from "../../../core/types";
import {
  CardType,
  Rarity,
  Attribute,
  SpecialAttribute,
  EquipmentType,
} from "../../../core/types/enums";

import portraitXuLongxiang from "../../../assets/portraits/figure01.png";
import portraitXuWeixiong from "../../../assets/portraits/figure02.png";
import portraitXuFengnian from "../../../assets/portraits/figure03.png";
import portraitWenhua from "../../../assets/portraits/figure04.png";
import portraitHongshu from "../../../assets/portraits/figure05.png";
import portraitHongXixiang from "../../../assets/portraits/figure06.png";

const MOCK_XU_LONGXIANG: Card = {
  card_id: "card_protagonist",
  name: "徐龙象",
  type: CardType.Character,
  rarity: Rarity.Silver,
  description: "北凉二公子，徐凤年亲弟，绰号黄蛮儿。生而金刚境，天生神力、铜筋铁骨，心智纯粹，唯兄命是从。师承龙虎山赵希抟，驭黑虎、掌龙象军，战场肉身横绝，为北凉最锐之矛。",
  image: portraitXuLongxiang,
  attributes: {
    [Attribute.Physique]: 9, [Attribute.Charm]: 5, [Attribute.Wisdom]: 3, [Attribute.Combat]: 8,
    [Attribute.Social]: 4, [Attribute.Survival]: 3, [Attribute.Stealth]: 2, [Attribute.Magic]: 2,
  },
  special_attributes: { [SpecialAttribute.Support]: 2, [SpecialAttribute.Reroll]: 1 },
  tags: ["male", "clan", "protagonist"],
  equipment_slots: 3,
};

const MOCK_XU_WEIXIONG: Card = {
  card_id: "card_002",
  name: "徐渭熊",
  type: CardType.Character,
  rarity: Rarity.Gold,
  description: "北凉二郡主，徐凤年二姐，实为春秋兵圣叶白夔之女、死士甲。胭脂副榜之首，上阴学宫学霸，棋剑双绝，掌赤螭符剑。铁门关一战后轮椅度日，坐镇梧桐院，以智谋为北凉定鼎中枢。",
  image: portraitXuWeixiong,
  attributes: {
    [Attribute.Physique]: 7, [Attribute.Charm]: 8, [Attribute.Wisdom]: 4, [Attribute.Combat]: 10,
    [Attribute.Social]: 3, [Attribute.Survival]: 6, [Attribute.Stealth]: 7, [Attribute.Magic]: 2,
  },
  special_attributes: { [SpecialAttribute.Support]: 1, [SpecialAttribute.Reroll]: 2 },
  tags: ["female", "swordsman", "wanderer"],
  equipment_slots: 2,
};

const MOCK_XU_FENGNIAN: Card = {
  card_id: "card_003",
  name: "徐凤年",
  type: CardType.Character,
  rarity: Rarity.Silver,
  description: "北凉世子，真武转世，纨绔为表、智武双绝。三千里历练成天人境，掌双刀、通百家武学，临阵守北凉、镇天下。",
  image: portraitXuFengnian,
  attributes: {
    [Attribute.Physique]: 8, [Attribute.Charm]: 3, [Attribute.Wisdom]: 5, [Attribute.Combat]: 9,
    [Attribute.Social]: 2, [Attribute.Survival]: 6, [Attribute.Stealth]: 4, [Attribute.Magic]: 5,
  },
  special_attributes: { [SpecialAttribute.Support]: -1, [SpecialAttribute.Reroll]: 1 },
  tags: ["male", "warrior", "exile"],
  equipment_slots: 2,
};

const MOCK_WENHUA: Card = {
  card_id: "card_004",
  name: "温华",
  type: CardType.Character,
  rarity: Rarity.Copper,
  description: "徐凤年兄弟，人称温不胜。出身寒微，一柄木剑闯江湖，得黄三甲传剑、名动京华。为不背叛兄弟，自断一臂、废去武功，折剑退出江湖。",
  image: portraitWenhua,
  attributes: {
    [Attribute.Physique]: 4, [Attribute.Charm]: 7, [Attribute.Wisdom]: 4, [Attribute.Combat]: 5,
    [Attribute.Social]: 8, [Attribute.Survival]: 3, [Attribute.Stealth]: 6, [Attribute.Magic]: 1,
  },
  special_attributes: { [SpecialAttribute.Support]: 3, [SpecialAttribute.Reroll]: 0 },
  tags: ["male", "merchant", "traveler"],
  equipment_slots: 1,
};

const MOCK_HONGSHU: Card = {
  card_id: "card_005",
  name: "红薯",
  type: CardType.Character,
  rarity: Rarity.Gold,
  description: "北凉王府梧桐苑的大丫鬟，眉眼温软、心思极深。看似只是侍女，实则是徐凤年身边最可靠的影子与退路。",
  image: portraitHongshu,
  attributes: {
    [Attribute.Physique]: 3, [Attribute.Charm]: 9, [Attribute.Wisdom]: 7, [Attribute.Combat]: 2,
    [Attribute.Social]: 6, [Attribute.Survival]: 2, [Attribute.Stealth]: 4, [Attribute.Magic]: 10,
  },
  special_attributes: { [SpecialAttribute.Support]: 2, [SpecialAttribute.Reroll]: 3 },
  tags: ["female", "mystic", "dancer"],
  equipment_slots: 1,
};

const MOCK_HONG_XIXIANG: Card = {
  card_id: "card_006",
  name: "洪洗象",
  type: CardType.Character,
  rarity: Rarity.Silver,
  description: "武当山掌教，吕祖转世，天道千年一遇的修行奇才。自幼骑牛悟道，不登武当绝顶，只为等待红衣。一朝悟道直入天人境，一剑破万法，愿为徐脂虎飞升，自行兵解，再修三百年换人间太平。",
  image: portraitHongXixiang,
  attributes: {
    [Attribute.Physique]: 2, [Attribute.Charm]: 6, [Attribute.Wisdom]: 10, [Attribute.Combat]: 1,
    [Attribute.Social]: 7, [Attribute.Survival]: 3, [Attribute.Stealth]: 5, [Attribute.Magic]: 6,
  },
  special_attributes: { [SpecialAttribute.Support]: 4, [SpecialAttribute.Reroll]: 2 },
  tags: ["male", "strategist", "scholar"],
  equipment_slots: 1,
};

const MOCK_EQUIPMENT: Card = {
  card_id: "equip_01",
  name: "弯刀",
  type: CardType.Equipment,
  rarity: Rarity.Copper,
  description: "锋利的阿拉伯弯刀，增强战斗力。",
  image: "",
  equipment_type: EquipmentType.Weapon,
  attribute_bonus: { [Attribute.Combat]: 4 },
  special_bonus: { [SpecialAttribute.Reroll]: 1 },
  gem_slots: 1,
  tags: ["weapon"],
};

const MOCK_INTEL: Card = {
  card_id: "intel_01",
  name: "宫廷流言",
  type: CardType.Intel,
  rarity: Rarity.Stone,
  description: "关于宫廷的流言蜚语，有助于社交场合。",
  image: "",
  attribute_bonus: { [Attribute.Social]: 3, [Attribute.Charm]: 2 },
  tags: ["intel", "consumable"],
};

const noop = () => {};
const center = { x: 40, y: 40 };

const Wrap = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-leather min-h-screen p-10 relative">{children}</div>
);

export const XuLongxiang: Story = () => (
  <Wrap><CardDetailPanel card={MOCK_XU_LONGXIANG} position={center} onClose={noop} /></Wrap>
);
XuLongxiang.meta = { title: "CardDetailPanel / 徐龙象 (Silver)" };

export const XuWeixiong: Story = () => (
  <Wrap><CardDetailPanel card={MOCK_XU_WEIXIONG} position={center} onClose={noop} /></Wrap>
);
XuWeixiong.meta = { title: "CardDetailPanel / 徐渭熊 (Gold)" };

export const XuFengnian: Story = () => (
  <Wrap><CardDetailPanel card={MOCK_XU_FENGNIAN} position={center} onClose={noop} /></Wrap>
);
XuFengnian.meta = { title: "CardDetailPanel / 徐凤年 (Silver)" };

export const Wenhua: Story = () => (
  <Wrap><CardDetailPanel card={MOCK_WENHUA} position={center} onClose={noop} /></Wrap>
);
Wenhua.meta = { title: "CardDetailPanel / 温华 (Copper)" };

export const Hongshu: Story = () => (
  <Wrap><CardDetailPanel card={MOCK_HONGSHU} position={center} onClose={noop} /></Wrap>
);
Hongshu.meta = { title: "CardDetailPanel / 红薯 (Gold)" };

export const HongXixiang: Story = () => (
  <Wrap><CardDetailPanel card={MOCK_HONG_XIXIANG} position={center} onClose={noop} /></Wrap>
);
HongXixiang.meta = { title: "CardDetailPanel / 洪洗象 (Silver)" };

export const Equipment: Story = () => (
  <Wrap><CardDetailPanel card={MOCK_EQUIPMENT} position={center} onClose={noop} /></Wrap>
);
Equipment.meta = { title: "CardDetailPanel / 装备-弯刀" };

export const Intel: Story = () => (
  <Wrap><CardDetailPanel card={MOCK_INTEL} position={center} onClose={noop} /></Wrap>
);
Intel.meta = { title: "CardDetailPanel / 情报-宫廷流言" };
