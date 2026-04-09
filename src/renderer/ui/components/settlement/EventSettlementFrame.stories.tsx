import React, { useState } from 'react';
import type { Story } from '@ladle/react';
import { EventSettlementFrame } from './EventSettlementFrame';
import { SettlementLeftPanel, SettlementRightPanel } from './SettlementPanels';
import type { Card, NarrativeNode } from '../../../core/types';
import type { StageSettlementResult } from '../../../core/settlement/SettlementExecutor';
import { Rarity, CardType, Attribute, CalcMode, CheckResult } from '../../../core/types/enums';

/* ─── 图片资源 ─── */
import figure01 from '../../../assets/portraits/figure01.png';
import figure02 from '../../../assets/portraits/figure02.png';
import figure03 from '../../../assets/portraits/figure03.png';

/* ─── Mock Card 数据（符合游戏真实 Card 类型）─── */
const MOCK_CARDS: Card[] = [
  {
    card_id: 'c_xu_longxiang',
    name: '徐龙象',
    type: CardType.Character,
    rarity: Rarity.Gold,
    description: '武功盖世，力能扛鼎，重情重义的北凉猛将。',
    image: figure01,
    attributes: {
      [Attribute.Physique]: 48,
      [Attribute.Combat]: 52,
      [Attribute.Charm]: 20,
      [Attribute.Wisdom]: 15,
      [Attribute.Social]: 12,
      [Attribute.Survival]: 35,
      [Attribute.Stealth]: 8,
      [Attribute.Magic]: 5,
    },
    tags: ['北凉', '武将'],
  },
  {
    card_id: 'c_daliang_longque',
    name: '大凉龙雀',
    type: CardType.Equipment,
    rarity: Rarity.Gold,
    description: '天下第一刀，寒光凛冽，持此刀者无往不胜。',
    image: figure02,
    attributes: {
      [Attribute.Physique]: 0,
      [Attribute.Combat]: 60,
      [Attribute.Charm]: 10,
      [Attribute.Wisdom]: 0,
      [Attribute.Social]: 0,
      [Attribute.Survival]: 0,
      [Attribute.Stealth]: 0,
      [Attribute.Magic]: 0,
    },
    tags: ['武器', '传说'],
  },
  {
    card_id: 'c_xiudong',
    name: '绣冬',
    type: CardType.Equipment,
    rarity: Rarity.Silver,
    description: '宫廷秘宝，轻灵而锋利。',
    image: figure03,
    attributes: {
      [Attribute.Physique]: 0,
      [Attribute.Combat]: 35,
      [Attribute.Charm]: 5,
      [Attribute.Wisdom]: 0,
      [Attribute.Social]: 0,
      [Attribute.Survival]: 0,
      [Attribute.Stealth]: 15,
      [Attribute.Magic]: 0,
    },
    tags: ['武器'],
  },
];

/* ─── Mock 叙事节点 ─── */
const NARRATIVE_NODES: NarrativeNode[] = [
  {
    type: 'narration',
    text: '西域黄沙之中，烽烟四起。北莽铁骑悄然集结，意图截断北凉王归路。',
  },
  {
    type: 'dialogue',
    speaker: '拓跋菩萨',
    text: '徐凤年，今日便是你的死期。',
    portrait: figure01,
  },
  {
    type: 'narration',
    text: '徐凤年缓缓拔出大凉龙雀，刀光在月色下映出一片寒芒。',
  },
  {
    type: 'dialogue',
    speaker: '徐凤年',
    text: '北凉的刀，从不认输。',
    portrait: figure02,
  },
];

const HISTORY_NODES: NarrativeNode[] = [
  {
    type: 'narration',
    text: '自北凉出发，一路向西，越过祁连山口，深入大漠腹地……',
  },
  {
    type: 'dialogue',
    speaker: '徐龙象',
    text: '王爷，前方发现北莽斥候，约莫百人。',
    portrait: figure01,
  },
];

/* ─── Mock 结算结果 ─── */
const MOCK_SETTLEMENT_SUCCESS: StageSettlementResult = {
  type: 'dice_check',
  result_key: CheckResult.Success,
  effects_applied: {
    gold: 30,
    reputation: 15,
  },
  narrative:
    '一刀破敌，北莽三路人马皆溃。徐凤年以寡敌众，名震西域。此役过后，北凉王之名将传遍大漠南北。',
  dice_check_state: {
    config: {
      attribute: Attribute.Combat,
      calc_mode: CalcMode.Max,
      target: 3,
    },
    pool_size: 5,
    initial_roll: {
      dice: [6, 5, 4, 3, 2],
      exploded_dice: [6],
      all_dice: [6, 5, 4, 3, 2, 6],
      successes: 4,
      reroll_available: 0,
    },
    golden_dice_used: 0,
    final_successes: 4,
    result: CheckResult.Success,
  },
};

const MOCK_SETTLEMENT_FAILURE: StageSettlementResult = {
  type: 'dice_check',
  result_key: CheckResult.Failure,
  effects_applied: {
    gold: -10,
    reputation: -5,
  },
  narrative:
    '北莽铁骑人数太多，徐凤年勉强突围，却损失了不少随从。此番失利，须得从长计议。',
  dice_check_state: {
    config: {
      attribute: Attribute.Combat,
      calc_mode: CalcMode.Max,
      target: 4,
    },
    pool_size: 4,
    initial_roll: {
      dice: [3, 5, 2, 1],
      exploded_dice: [],
      all_dice: [3, 5, 2, 1],
      successes: 0,
      reroll_available: 0,
    },
    golden_dice_used: 0,
    final_successes: 0,
    result: CheckResult.Failure,
  },
};

/* ═══════════════════════════════════════════════════════
   Story 1：叙事进行中
   右栏有对话文字，左栏有投入卡牌，还未开始鉴定
   ═══════════════════════════════════════════════════════ */
export const NarrativeInProgress: Story = () => {
  const [narrativeIndex, setNarrativeIndex] = useState(2);

  const leftContent = (
    <SettlementLeftPanel
      sceneName="西域遭伏"
      investedCards={MOCK_CARDS.slice(0, 2)}
      hasSettlement={true}
      isNarrativeComplete={false}
      settlementResult={null}
      onExecute={() => {}}
    />
  );

  const rightContent = (
    <SettlementRightPanel
      narrative={NARRATIVE_NODES}
      narrativeIndex={narrativeIndex}
      onAdvance={() => setNarrativeIndex(i => Math.min(i + 1, NARRATIVE_NODES.length))}
      onChoice={() => {}}
      settlementResult={null}
      onContinue={() => {}}
      isNarrativeComplete={narrativeIndex >= NARRATIVE_NODES.length}
      hasSettlement={true}
      historyNodes={[]}
    />
  );

  return (
    <div className="w-[900px] h-[560px]">
      <EventSettlementFrame
        backgroundAssetId="ui_004"
        rightTitle="西域遭伏"
        leftContent={leftContent}
        rightContent={rightContent}
      />
    </div>
  );
};
NarrativeInProgress.meta = { title: 'EventSettlementFrame / 叙事进行中' };

/* ═══════════════════════════════════════════════════════
   Story 2：鉴定完成 - 大成功
   左栏有骰子结果+效果徽章，右栏有结算叙事+继续按钮
   ═══════════════════════════════════════════════════════ */
export const SettlementSuccess: Story = () => {
  const leftContent = (
    <SettlementLeftPanel
      sceneName="西域遭伏"
      investedCards={MOCK_CARDS.slice(0, 2)}
      hasSettlement={true}
      isNarrativeComplete={true}
      settlementResult={MOCK_SETTLEMENT_SUCCESS}
      onExecute={() => {}}
    />
  );

  const rightContent = (
    <SettlementRightPanel
      narrative={NARRATIVE_NODES}
      narrativeIndex={NARRATIVE_NODES.length}
      onAdvance={() => {}}
      onChoice={() => {}}
      settlementResult={MOCK_SETTLEMENT_SUCCESS}
      onContinue={() => alert('继续！')}
      isNarrativeComplete={true}
      hasSettlement={true}
      historyNodes={HISTORY_NODES}
    />
  );

  return (
    <div className="w-[900px] h-[560px]">
      <EventSettlementFrame
        backgroundAssetId="ui_004"
        rightTitle="西域遭伏"
        leftContent={leftContent}
        rightContent={rightContent}
      />
    </div>
  );
};
SettlementSuccess.meta = { title: 'EventSettlementFrame / 鉴定完成 - 大成功' };

/* ═══════════════════════════════════════════════════════
   Story 3：鉴定完成 - 失败
   ═══════════════════════════════════════════════════════ */
export const SettlementFailure: Story = () => {
  const leftContent = (
    <SettlementLeftPanel
      sceneName="西域遭伏"
      investedCards={MOCK_CARDS}
      hasSettlement={true}
      isNarrativeComplete={true}
      settlementResult={MOCK_SETTLEMENT_FAILURE}
      onExecute={() => {}}
    />
  );

  const rightContent = (
    <SettlementRightPanel
      narrative={NARRATIVE_NODES}
      narrativeIndex={NARRATIVE_NODES.length}
      onAdvance={() => {}}
      onChoice={() => {}}
      settlementResult={MOCK_SETTLEMENT_FAILURE}
      onContinue={() => alert('继续！')}
      isNarrativeComplete={true}
      hasSettlement={true}
      historyNodes={HISTORY_NODES}
    />
  );

  return (
    <div className="w-[900px] h-[560px]">
      <EventSettlementFrame
        backgroundAssetId="ui_004"
        rightTitle="西域遭伏"
        leftContent={leftContent}
        rightContent={rightContent}
      />
    </div>
  );
};
SettlementFailure.meta = { title: 'EventSettlementFrame / 鉴定完成 - 失败' };

/* ═══════════════════════════════════════════════════════
   Story 4：等待鉴定（叙事已完成，鉴定未触发）
   ═══════════════════════════════════════════════════════ */
export const AwaitingCheck: Story = () => {
  const leftContent = (
    <SettlementLeftPanel
      sceneName="西域遭伏"
      investedCards={MOCK_CARDS.slice(0, 1)}
      hasSettlement={true}
      isNarrativeComplete={true}
      settlementResult={null}
      onExecute={() => alert('开始鉴定！')}
    />
  );

  const rightContent = (
    <SettlementRightPanel
      narrative={NARRATIVE_NODES}
      narrativeIndex={NARRATIVE_NODES.length}
      onAdvance={() => {}}
      onChoice={() => {}}
      settlementResult={null}
      onContinue={() => {}}
      isNarrativeComplete={true}
      hasSettlement={true}
      historyNodes={HISTORY_NODES}
    />
  );

  return (
    <div className="w-[900px] h-[560px]">
      <EventSettlementFrame
        backgroundAssetId="ui_004"
        rightTitle="西域遭伏"
        leftContent={leftContent}
        rightContent={rightContent}
      />
    </div>
  );
};
AwaitingCheck.meta = { title: 'EventSettlementFrame / 等待鉴定' };

/* ═══════════════════════════════════════════════════════
   Story 5：全屏预览（可交互，叙事可点击推进）
   ═══════════════════════════════════════════════════════ */
export const FullScreenInteractive: Story = () => {
  const [narrativeIndex, setNarrativeIndex] = useState(0);
  const [settlementResult, setSettlementResult] = useState<StageSettlementResult | null>(null);
  const isNarrativeComplete = narrativeIndex >= NARRATIVE_NODES.length;

  const leftContent = (
    <SettlementLeftPanel
      sceneName="西域遭伏"
      investedCards={MOCK_CARDS.slice(0, 2)}
      hasSettlement={true}
      isNarrativeComplete={isNarrativeComplete}
      settlementResult={settlementResult}
      onExecute={() => setSettlementResult(MOCK_SETTLEMENT_SUCCESS)}
    />
  );

  const rightContent = (
    <SettlementRightPanel
      narrative={NARRATIVE_NODES}
      narrativeIndex={narrativeIndex}
      onAdvance={() => setNarrativeIndex(i => Math.min(i + 1, NARRATIVE_NODES.length))}
      onChoice={() => {}}
      settlementResult={settlementResult}
      onContinue={() => alert('游戏继续！')}
      isNarrativeComplete={isNarrativeComplete}
      hasSettlement={true}
      historyNodes={[]}
    />
  );

  return (
    <div className="w-screen h-screen">
      <EventSettlementFrame
        backgroundAssetId="ui_004"
        rightTitle="西域遭伏"
        leftContent={leftContent}
        rightContent={rightContent}
      />
    </div>
  );
};
FullScreenInteractive.meta = { title: 'EventSettlementFrame / 全屏可交互' };
