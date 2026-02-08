import type { Story } from "@ladle/react";
import { DecoratedFrame } from "./DecoratedFrame";

const Wrap = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-leather min-h-screen p-8">{children}</div>
);

const INNER = (
  <div className="text-parchment-light">
    <h3 className="text-gold font-bold mb-2">Scene Title</h3>
    <p className="text-sm">The ancient marketplace buzzes with activity. Merchants hawk their wares while shadowy figures watch from the alleyways.</p>
  </div>
);

export const Default: Story = () => (
  <Wrap>
    <DecoratedFrame className="w-[500px] h-[300px]">
      {INNER}
    </DecoratedFrame>
  </Wrap>
);
Default.meta = { title: "DecoratedFrame / Default" };

export const Ornate: Story = () => (
  <Wrap>
    <DecoratedFrame variant="ornate" className="w-[500px] h-[300px]">
      {INNER}
    </DecoratedFrame>
  </Wrap>
);
Ornate.meta = { title: "DecoratedFrame / Ornate" };

export const Simple: Story = () => (
  <Wrap>
    <DecoratedFrame variant="simple" className="w-[500px] h-[300px]">
      {INNER}
    </DecoratedFrame>
  </Wrap>
);
Simple.meta = { title: "DecoratedFrame / Simple" };

export const WithGlow: Story = () => (
  <Wrap>
    <DecoratedFrame variant="default" glow className="w-[500px] h-[300px]">
      {INNER}
    </DecoratedFrame>
  </Wrap>
);
WithGlow.meta = { title: "DecoratedFrame / With Glow" };

export const AllVariants: Story = () => (
  <Wrap>
    <div className="flex flex-col gap-8">
      <DecoratedFrame variant="default" className="w-[500px] h-[250px]">
        <p className="text-gold text-sm">Default</p>
      </DecoratedFrame>
      <DecoratedFrame variant="ornate" className="w-[500px] h-[250px]">
        <p className="text-gold text-sm">Ornate</p>
      </DecoratedFrame>
      <DecoratedFrame variant="simple" className="w-[500px] h-[250px]">
        <p className="text-gold text-sm">Simple</p>
      </DecoratedFrame>
    </div>
  </Wrap>
);
AllVariants.meta = { title: "DecoratedFrame / All Variants" };
