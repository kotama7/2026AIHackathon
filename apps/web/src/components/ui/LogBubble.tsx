import { Badge } from './Badge';
import { CharacterAvatar } from './CharacterAvatar';
import { cn } from './cn';

type Intent =
  | 'accuse'
  | 'defend'
  | 'suspicion'
  | 'agreement'
  | 'question'
  | 'statement'
  | 'misunderstanding';

const INTENT_LABEL: Record<Intent, string> = {
  accuse: '告発',
  defend: '弁明',
  suspicion: '疑念',
  agreement: '同意',
  question: '質問',
  statement: '主張',
  misunderstanding: '誤解',
};

const INTENT_TONE: Record<Intent, 'danger' | 'info' | 'neutral' | 'gold'> = {
  accuse: 'danger',
  defend: 'gold',
  suspicion: 'danger',
  agreement: 'info',
  question: 'neutral',
  statement: 'neutral',
  misunderstanding: 'neutral',
};

export type LogBubbleProps = {
  speakerName: string;
  speakerId?: string;
  text: string;
  intent?: Intent;
  confidence?: number;
  isWerewolfSuspect?: boolean;
  isPinned?: boolean;
  onPin?: () => void;
  timestamp?: string;
};

export function LogBubble({
  speakerName,
  speakerId,
  text,
  intent,
  confidence,
  isWerewolfSuspect,
  isPinned,
  onPin,
  timestamp,
}: LogBubbleProps) {
  return (
    <article
      className={cn(
        'flex gap-card rounded-card border bg-brand-surface p-card shadow-card transition',
        isPinned
          ? 'border-brand-gold shadow-[0_0_0_2px_rgba(200,162,75,0.25)]'
          : 'border-brand-border'
      )}
    >
      <CharacterAvatar name={speakerName} seed={speakerId} size="md" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <header className="flex flex-wrap items-center gap-2">
          <span className="font-serif text-brand-emphasis">{speakerName}</span>
          {intent && <Badge tone={INTENT_TONE[intent]}>{INTENT_LABEL[intent]}</Badge>}
          {isWerewolfSuspect && <Badge tone="danger">容疑</Badge>}
          {typeof confidence === 'number' && (
            <span className="text-xs text-brand-muted">確信度 {Math.round(confidence * 100)}%</span>
          )}
          {timestamp && <span className="ml-auto text-xs text-brand-muted">{timestamp}</span>}
        </header>
        <p className="whitespace-pre-wrap leading-relaxed text-brand-text">{text}</p>
        {onPin && (
          <button
            type="button"
            onClick={onPin}
            className={cn(
              'self-start text-xs underline-offset-2 transition hover:underline',
              isPinned ? 'text-brand-gold' : 'text-brand-muted'
            )}
          >
            {isPinned ? '★ ピン留め中' : '☆ ピン留め'}
          </button>
        )}
      </div>
    </article>
  );
}
