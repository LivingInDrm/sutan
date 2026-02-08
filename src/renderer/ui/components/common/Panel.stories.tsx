import type { Story } from "@ladle/react";
import { Panel } from "./Panel";

const Wrap = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-leather min-h-screen p-8">{children}</div>
);

const SAMPLE_TEXT = "In the heart of the desert, ancient secrets await those brave enough to seek them. The Sultan's court is rife with intrigue and danger.";

export const DarkVariant: Story = () => (
  <Wrap>
    <Panel variant="dark" title="Dark Panel" className="max-w-md">
      <p>{SAMPLE_TEXT}</p>
    </Panel>
  </Wrap>
);
DarkVariant.meta = { title: "Panel / Dark" };

export const ParchmentVariant: Story = () => (
  <Wrap>
    <Panel variant="parchment" title="Parchment Panel" className="max-w-md">
      <p>{SAMPLE_TEXT}</p>
    </Panel>
  </Wrap>
);
ParchmentVariant.meta = { title: "Panel / Parchment" };

export const GlassVariant: Story = () => (
  <Wrap>
    <Panel variant="glass" className="max-w-md">
      <p>{SAMPLE_TEXT}</p>
    </Panel>
  </Wrap>
);
GlassVariant.meta = { title: "Panel / Glass" };

export const AllVariants: Story = () => (
  <Wrap>
    <div className="flex flex-col gap-6 max-w-lg">
      <Panel variant="dark" title="Dark">
        <p>{SAMPLE_TEXT}</p>
      </Panel>
      <Panel variant="parchment" title="Parchment">
        <p>{SAMPLE_TEXT}</p>
      </Panel>
      <Panel variant="glass" title="Glass">
        <p>{SAMPLE_TEXT}</p>
      </Panel>
    </div>
  </Wrap>
);
AllVariants.meta = { title: "Panel / All Variants" };

export const NoBorder: Story = () => (
  <Wrap>
    <Panel variant="dark" title="No Border" bordered={false} className="max-w-md">
      <p>{SAMPLE_TEXT}</p>
    </Panel>
  </Wrap>
);
NoBorder.meta = { title: "Panel / No Border" };
