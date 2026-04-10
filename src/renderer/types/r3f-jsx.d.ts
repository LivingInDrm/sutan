import type { ThreeElements } from '@react-three/fiber';
import type { JSX as ReactJSX } from 'react';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}

declare global {
  namespace React.JSX {
    interface IntrinsicElements extends ThreeElements {}
  }

  namespace JSX {
    interface IntrinsicElements extends ReactJSX.IntrinsicElements, ThreeElements {}
  }
}

export {};