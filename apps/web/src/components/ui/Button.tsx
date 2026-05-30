import { type ButtonHTMLAttributes, forwardRef, type ReactNode } from 'react';

import { cn } from './cn';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand-gold text-brand-bg hover:bg-brand-gold-strong border border-brand-gold',
  secondary: 'bg-brand-surface text-brand-text hover:bg-brand-bg border border-brand-border',
  danger: 'bg-brand-danger text-brand-bg hover:bg-brand-danger-strong border border-brand-danger',
  ghost: 'bg-transparent text-brand-text hover:bg-brand-surface',
};

const SIZES: Record<Size, string> = {
  sm: 'px-card py-1 text-sm',
  md: 'px-page py-2 text-base',
  lg: 'px-page py-3 text-lg',
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'primary', size = 'md', className, children, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-card font-serif transition disabled:cursor-not-allowed disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
});
