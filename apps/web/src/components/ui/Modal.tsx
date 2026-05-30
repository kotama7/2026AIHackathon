'use client';

import * as Dialog from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';

import { cn } from './cn';

export type ModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** 内側パディング・最大幅などを差し替えたい場合 */
  className?: string;
  /** ESC / overlay クリックを無効化したい場合 (例: 重要な操作中) */
  dismissible?: boolean;
};

/**
 * Radix Dialog ベースのモーダル。
 * - フォーカストラップ・ESC で閉じる・スクロールロックは Radix のデフォルトで提供される。
 * - 制御コンポーネント: `open` と `onOpenChange` を呼び出し側で管理。
 * - 非 dismissible モードでは ESC / overlay クリックで閉じない (確認系のフロー用)。
 */
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
  dismissible = true,
}: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-brand-overlay backdrop-blur-sm" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-card border border-brand-border bg-brand-surface p-page shadow-modal focus:outline-none',
            className
          )}
          onEscapeKeyDown={(e) => {
            if (!dismissible) e.preventDefault();
          }}
          onPointerDownOutside={(e) => {
            if (!dismissible) e.preventDefault();
          }}
          onInteractOutside={(e) => {
            if (!dismissible) e.preventDefault();
          }}
        >
          <Dialog.Title className="font-serif text-xl text-brand-emphasis">{title}</Dialog.Title>
          {description ? (
            <Dialog.Description className="mt-2 text-sm text-brand-muted">
              {description}
            </Dialog.Description>
          ) : (
            // a11y: Title だけだと Radix が Description 欠如を警告するので隠して提供
            <Dialog.Description className="sr-only">{title}</Dialog.Description>
          )}
          <div className="mt-card">{children}</div>
          {footer && <div className="mt-section flex flex-wrap justify-end gap-2">{footer}</div>}
          {dismissible && (
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="閉じる"
                className="absolute right-3 top-3 rounded p-1 text-brand-muted transition hover:bg-brand-bg hover:text-brand-text"
              >
                ✕
              </button>
            </Dialog.Close>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** 呼び出し側でカスタム close ボタンを置きたい場合のエスケープハッチ */
export const ModalClose = Dialog.Close;
