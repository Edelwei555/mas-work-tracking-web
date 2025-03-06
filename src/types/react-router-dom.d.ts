import { ComponentType } from 'react';
import { LinkProps as RouterLinkProps, OutletProps } from 'react-router-dom';

declare module 'react-router-dom' {
  export const Link: ComponentType<RouterLinkProps>;
  export const Outlet: ComponentType<OutletProps>;
} 