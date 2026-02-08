import type { Story } from "@ladle/react";
import { SlotComponent } from "./SlotComponent";
import type { Slot } from "../../../core/types";
import { SlotType } from "../../../core/types/enums";

const MOCK_EMPTY: Slot = { type: SlotType.Character, required: false, locked: false };
const MOCK_REQUIRED: Slot = { type: SlotType.Character, required: true, locked: false };
const MOCK_LOCKED: Slot = { type: SlotType.Item, required: false, locked: true };
const MOCK_FILLED: Slot = { type: SlotType.Character, required: false, locked: false, card_id: "card_1" };

const Wrap = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-leather min-h-screen p-8">{children}</div>
);

export const Empty: Story = () => (
  <Wrap><SlotComponent slot={MOCK_EMPTY} index={0} /></Wrap>
);
Empty.meta = { title: "SlotComponent / Empty" };

export const Filled: Story = () => (
  <Wrap><SlotComponent slot={MOCK_FILLED} cardName="Sultana Fatima" index={0} /></Wrap>
);
Filled.meta = { title: "SlotComponent / Filled" };

export const Required: Story = () => (
  <Wrap><SlotComponent slot={MOCK_REQUIRED} index={0} /></Wrap>
);
Required.meta = { title: "SlotComponent / Required" };

export const Locked: Story = () => (
  <Wrap><SlotComponent slot={MOCK_LOCKED} index={0} /></Wrap>
);
Locked.meta = { title: "SlotComponent / Locked" };

export const AllStates: Story = () => (
  <Wrap>
    <div className="flex flex-wrap gap-4">
      <div className="text-center">
        <SlotComponent slot={MOCK_EMPTY} index={0} />
        <div className="text-xs text-gold-dim mt-1">Empty</div>
      </div>
      <div className="text-center">
        <SlotComponent slot={MOCK_FILLED} cardName="Fatima" index={1} />
        <div className="text-xs text-gold-dim mt-1">Filled</div>
      </div>
      <div className="text-center">
        <SlotComponent slot={MOCK_REQUIRED} index={2} />
        <div className="text-xs text-gold-dim mt-1">Required</div>
      </div>
      <div className="text-center">
        <SlotComponent slot={MOCK_LOCKED} index={3} />
        <div className="text-xs text-gold-dim mt-1">Locked</div>
      </div>
    </div>
  </Wrap>
);
AllStates.meta = { title: "SlotComponent / All States" };
