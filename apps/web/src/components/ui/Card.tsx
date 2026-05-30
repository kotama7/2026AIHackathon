import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from './cn';

type CardProps = HTMLAttributes<HTMLDivElement> & { children: ReactNode };

export function Card({ className, children, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        'flex flex-col rounded-card border border-brand-border bg-brand-surface shadow-card',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...rest }: CardProps) {
  return (
    <div className={cn('border-b border-brand-border px-card py-card', className)} {...rest}>
      {children}
    </div>
  );
}

export function CardBody({ className, children, ...rest }: CardProps) {
  return (
    <div className={cn('flex-1 px-card py-card', className)} {...rest}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-end gap-2 border-t border-brand-border px-card py-card',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
