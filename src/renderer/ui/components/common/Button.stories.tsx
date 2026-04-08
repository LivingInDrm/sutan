import React from "react";
import type { Story } from "@ladle/react";
import { Button } from "./Button";

const Wrap = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen bg-leather-texture p-8 text-parchment-200">
    <div className="mx-auto max-w-6xl rounded-[20px] border border-gold-500/20 bg-leather-900/70 p-6 shadow-[var(--shadow-ink-lg)]">
      {children}
    </div>
  </div>
);

export const AllVariants: Story = () => (
  <Wrap>
    <div className="space-y-6">
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-[28px] text-gold-300">Plaque Variants</h2>
        <p className="mt-2 font-[family-name:var(--font-body)] text-sm text-parchment-400">按新牌匾风规范展示主次操作、危险操作、幽灵操作与抉择按钮。</p>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <Button variant="primary">新开一卷</Button>
        <Button variant="secondary">继续旧卷</Button>
        <Button variant="danger">放弃此局</Button>
        <Button variant="ghost">返回北凉</Button>
        <Button variant="icon">关</Button>
        <Button variant="choice">静观其变</Button>
        <Button variant="confirm">兼容 Confirm</Button>
      </div>
    </div>
  </Wrap>
);
AllVariants.meta = { title: "Button / All Variants" };

export const AllSizes: Story = () => (
  <Wrap>
    <div className="space-y-5">
      <h2 className="font-[family-name:var(--font-display)] text-[28px] text-gold-300">Plaque Sizes</h2>
      <div className="flex flex-wrap items-center gap-4">
        <Button size="sm">sm 结束当日</Button>
        <Button size="md">md 确认参与</Button>
        <Button size="lg">lg 接受结果</Button>
        <Button size="xl" glow>xl 新开一卷</Button>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <Button variant="secondary" size="sm">sm 返回</Button>
        <Button variant="secondary" size="md">md 导入存档</Button>
        <Button variant="secondary" size="lg">lg 查看卷宗</Button>
        <Button variant="icon" size="xl">录</Button>
      </div>
    </div>
  </Wrap>
);
AllSizes.meta = { title: "Button / All Sizes" };

export const States: Story = () => (
  <Wrap>
    <div className="space-y-5">
      <h2 className="font-[family-name:var(--font-display)] text-[28px] text-gold-300">Plaque States</h2>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Button>default 常态</Button>
        <Button previewState="hover">hover 提笔</Button>
        <Button previewState="active">active 落印</Button>
        <Button disabled>disabled 墨色褪去</Button>
        <Button loading>loading 载入中</Button>
        <Button glow>glow 辉光</Button>
        <Button variant="secondary" previewState="hover">次按钮 hover</Button>
        <Button variant="danger" glow>危险 glow</Button>
        <Button variant="choice" selected>choice 选中</Button>
      </div>
    </div>
  </Wrap>
);
States.meta = { title: "Button / States" };

export const GameScenarios: Story = () => (
  <Wrap>
    <div className="space-y-8">
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-[28px] text-gold-300">Game Scenarios</h2>
        <p className="mt-2 font-[family-name:var(--font-body)] text-sm text-parchment-400">验证标题页、地图页与抉择场景在牌匾风按钮下的视觉一致性。</p>
      </div>

      <section className="rounded-[16px] border border-gold-500/20 bg-leather-800/45 p-5">
        <div className="mb-4 font-[family-name:var(--font-display)] text-[22px] text-gold-300">标题页按钮组</div>
        <div className="flex flex-wrap gap-4">
          <Button size="xl" glow>新开一卷</Button>
          <Button variant="secondary" size="lg">继续旧卷</Button>
          <Button variant="secondary" size="lg">导入存档</Button>
          <Button variant="ghost" size="md">导出卷宗</Button>
        </div>
      </section>

      <section className="rounded-[16px] border border-gold-500/20 bg-leather-800/45 p-5">
        <div className="mb-4 font-[family-name:var(--font-display)] text-[22px] text-gold-300">场景操作按钮</div>
        <div className="flex flex-wrap gap-4">
          <Button size="lg" glow leftIcon={<span>◇</span>}>确认参与</Button>
          <Button variant="secondary" size="lg">返回地图</Button>
          <Button variant="icon" size="md">录</Button>
        </div>
      </section>

      <section className="rounded-[16px] border border-gold-500/20 bg-parchment-texture p-5">
        <div className="mb-4 font-[family-name:var(--font-display)] text-[22px] text-leather-900">玩家抉择按钮组</div>
        <div className="grid gap-4 md:grid-cols-2">
          <Button variant="choice" size="lg" className="justify-start">先礼后兵，探其虚实</Button>
          <Button variant="choice" size="lg" selected className="justify-start">趁夜入城，快刀斩乱麻</Button>
          <Button variant="choice" size="lg" className="justify-start">联络旧部，静待回音</Button>
          <Button variant="choice" size="lg" vertical className="justify-center md:min-h-[220px]">孤身赴会</Button>
        </div>
      </section>

      <section className="rounded-[16px] border border-gold-500/20 bg-leather-800/45 p-5">
        <div className="mb-4 font-[family-name:var(--font-display)] text-[22px] text-gold-300">结算按钮</div>
        <div className="flex flex-wrap gap-4">
          <Button size="lg" glow>接受结果</Button>
          <Button variant="danger" size="lg">重试此局</Button>
        </div>
      </section>

      <section className="rounded-[16px] border border-gold-500/20 bg-leather-800/45 p-5">
        <div className="mb-4 font-[family-name:var(--font-display)] text-[22px] text-gold-300">结束当日按钮</div>
        <div className="flex flex-wrap gap-4">
          <Button size="sm" glow>结束当日</Button>
          <Button variant="ghost" size="sm">稍后再议</Button>
        </div>
      </section>
    </div>
  </Wrap>
);
GameScenarios.meta = { title: "Button / Game Scenarios" };
