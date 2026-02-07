import type { Story } from "@ladle/react";
import { AttrBadge } from "./AttrBadge";

const Wrap = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-leather min-h-screen p-10">{children}</div>
);

export const DefaultVariant: Story = () => (
  <Wrap>
    <div className="w-80 grid grid-cols-4 gap-x-3 gap-y-1">
      <AttrBadge attr="physique" value={31} />
      <AttrBadge attr="charm" value={18} />
      <AttrBadge attr="wisdom" value={21} />
      <AttrBadge attr="combat" value={31} />
      <AttrBadge attr="social" value={17} />
      <AttrBadge attr="survival" value={16} />
      <AttrBadge attr="stealth" value={10} />
      <AttrBadge attr="magic" value={23} />
      <AttrBadge attr="support" value={2} />
      <AttrBadge attr="reroll" value={1} />
    </div>
  </Wrap>
);
DefaultVariant.meta = { title: "AttrBadge / Default" };

export const BonusVariant: Story = () => (
  <Wrap>
    <div className="w-80 grid grid-cols-4 gap-x-3 gap-y-1">
      <AttrBadge attr="physique" value={5} variant="bonus" />
      <AttrBadge attr="combat" value={3} variant="bonus" />
      <AttrBadge attr="survival" value={2} variant="bonus" />
      <AttrBadge attr="support" value={1} variant="bonus" />
    </div>
  </Wrap>
);
BonusVariant.meta = { title: "AttrBadge / Bonus" };

export const CompactVariant: Story = () => (
  <Wrap>
    <div className="w-48 grid grid-cols-4 gap-1">
      <AttrBadge attr="physique" value={31} compact />
      <AttrBadge attr="charm" value={18} compact />
      <AttrBadge attr="wisdom" value={21} compact />
      <AttrBadge attr="combat" value={31} compact />
      <AttrBadge attr="social" value={17} compact />
      <AttrBadge attr="survival" value={16} compact />
      <AttrBadge attr="stealth" value={10} compact />
      <AttrBadge attr="magic" value={23} compact />
    </div>
  </Wrap>
);
CompactVariant.meta = { title: "AttrBadge / Compact" };
