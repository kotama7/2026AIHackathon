'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';

import { Button } from '@/components/ui';

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info);
  }

  reset = () => {
    this.setState({ error: null });
  };

  override render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-screen items-center justify-center p-page">
        <div className="flex max-w-prose flex-col items-center gap-card rounded-card border border-brand-danger/40 bg-brand-surface p-page text-center shadow-modal">
          <p className="font-serif text-2xl text-brand-danger">予期せぬエラーが発生しました</p>
          <p className="text-sm text-brand-muted">{this.state.error.message}</p>
          <div className="flex gap-card">
            <Button variant="secondary" onClick={this.reset}>
              この画面を再描画
            </Button>
            <Button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.location.href = '/';
                }
              }}
            >
              タイトルに戻る
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
