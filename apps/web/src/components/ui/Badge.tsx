import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from './cn';

type Tone = 'neutral' | 'gold' | 'danger' | 'success' | 'info';

const TONES: Record<Tone, string> = {
  neutral: 'bg-brand-bg text-brand-muted border-brand-border',
  gold: 'bg-brand-gold/15 text-brand-gold border-brand-gold/40',
  danger: 'bg-brand-danger/15 text-brand-danger-strong border-brand-danger/40',
  success: 'bg-brand-success/15 text-brand-success border-brand-success/40',
  info: 'bg-brand-info/15 text-brand-info border-brand-info/40',
};

type Props = HTMLAttributes<HTMLSpanElement> & {
  tone?: Tone;
  children: ReactNode;
};

export function Badge({ tone = 'neutral', className, children, ...rest }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs',
        TONES[tone],
        className
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
