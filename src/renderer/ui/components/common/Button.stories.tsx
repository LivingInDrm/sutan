import type { Story } from "@ladle/react";
import { Button } from "./Button";

const Wrap = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-leather min-h-screen p-8">{children}</div>
);

export const AllVariants: Story = () => (
  <Wrap>
    <div className="flex flex-wrap items-center gap-4">
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="confirm">Confirm</Button>
      <Button variant="icon">+</Button>
    </div>
  </Wrap>
);
AllVariants.meta = { title: "Button / All Variants" };

export const Sizes: Story = () => (
  <Wrap>
    <div className="flex flex-wrap items-center gap-4">
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </div>
    <div className="flex flex-wrap items-center gap-4 mt-4">
      <Button variant="secondary" size="sm">Small</Button>
      <Button variant="secondary" size="md">Medium</Button>
      <Button variant="secondary" size="lg">Large</Button>
    </div>
  </Wrap>
);
Sizes.meta = { title: "Button / Sizes" };

export const WithIcons: Story = () => (
  <Wrap>
    <div className="flex flex-wrap items-center gap-4">
      <Button leftIcon={<span>&#9670;</span>}>Left Icon</Button>
      <Button rightIcon={<span>&#9654;</span>}>Right Icon</Button>
      <Button leftIcon={<span>&#9733;</span>} rightIcon={<span>&#8594;</span>}>Both Icons</Button>
      <Button variant="secondary" leftIcon={<span>&#9670;</span>}>Option A</Button>
    </div>
  </Wrap>
);
WithIcons.meta = { title: "Button / With Icons" };

export const States: Story = () => (
  <Wrap>
    <div className="flex flex-wrap items-center gap-4">
      <Button disabled>Disabled</Button>
      <Button loading>Loading</Button>
      <Button glow>With Glow</Button>
      <Button variant="secondary" disabled>Disabled Secondary</Button>
      <Button variant="ghost" disabled>Disabled Ghost</Button>
      <Button variant="confirm" glow>Confirm Glow</Button>
    </div>
  </Wrap>
);
States.meta = { title: "Button / States" };
