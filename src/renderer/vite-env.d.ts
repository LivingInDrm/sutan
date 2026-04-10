/// <reference types="vite/client" />
/// <reference types="@react-three/fiber" />
/// <reference path="./types/r3f-jsx.d.ts" />

declare module '*.svg?react' {
  import React from 'react';
  const SVGComponent: React.FC<React.SVGProps<SVGSVGElement>>;
  export default SVGComponent;
}

declare module '*.png' {
  const src: string;
  export default src;
}
