import type { Story } from "@ladle/react";
import { DiceComponent, DiceResult } from "./DiceComponent";

const Wrap = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-leather min-h-screen p-8">{children}</div>
);

export const Success: Story = () => (
  <Wrap><DiceComponent value={8} isSuccess delay={0} /></Wrap>
);
Success.meta = { title: "DiceComponent / Success" };

export const Failure: Story = () => (
  <Wrap><DiceComponent value={3} isSuccess={false} delay={0} /></Wrap>
);
Failure.meta = { title: "DiceComponent / Failure" };

export const Exploded: Story = () => (
  <Wrap><DiceComponent value={10} isSuccess isExploded delay={0} /></Wrap>
);
Exploded.meta = { title: "DiceComponent / Exploded" };

export const Rerolled: Story = () => (
  <Wrap><DiceComponent value={7} isSuccess isRerolled delay={0} /></Wrap>
);
Rerolled.meta = { title: "DiceComponent / Rerolled" };

export const DiceResultMixed: Story = () => (
  <Wrap>
    <DiceResult
      dice={[8, 3, 10, 5, 7, 2, 9, 4, 10, 6]}
      explodedStartIndex={8}
      successThreshold={7}
      rerolledIndices={[1]}
    />
  </Wrap>
);
DiceResultMixed.meta = { title: "DiceComponent / Result Mixed" };
