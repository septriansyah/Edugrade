/// <reference types="vite/client" />
interface Window {
  snap: any;
}

import React from 'react';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'iconify-icon': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        icon?: string;
        width?: string | number;
        height?: string | number;
        class?: string;
        style?: React.CSSProperties;
      }, HTMLElement>;
    }
  }
}

