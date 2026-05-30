'use client';

import type { CharacterPublic, DialogueLog, EvidencePublic } from '@village/shared';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';

import { Badge, Button, CharacterAvatar, EvidenceCard, LogBubble, Modal } from '@/components/ui';
import { useGameStore } from '@/stores/gameStore';

type Props = {
  character: CharacterPublic | null;
  onClose: () => void;
  gameId: string;
};

const INTENT_TONES: Record<DialogueLog['intent'], 'danger' | 'gold' | 'info' | 'neutral'> = {
  accuse: 'danger',
  defend: 'gold',
  suspicion: 'danger',
  observation: 'neutral',
  question: 'info',
  agree: 'info',
  disagree: 'danger',
  evasive: 'neutral',
};

const INTENT_LABELS: Record<DialogueLog['intent'], string> = {
  accuse: '告発',
  defend: '弁明',
  suspicion: '疑念',
  observation: '観察',
  question: '質問',
  agree: '同意',
  disagree: '反対',
  evasive: 'はぐらかし',
};

// LogBubble の intent と DialogueLog の intent は被るが厳密には別 union なのでマップ
const BUBBLE_INTENT: Record<
  DialogueLog['intent'],
  React.ComponentProps<typeof LogBubble>['intent']
> = {
  accuse: 'accuse',
  defend: 'defend',
  suspicion: 'suspicion',
  observation: 'statement',
  question: 'question',
  agree: 'agreement',
  disagree: 'suspicion',
  evasive: 'statement',
};

export function CharacterProfileModal({ character, onClose, gameId }: Props) {
  const router = useRouter();
  const logs = useGameStore((s) => s.logs);
  const evidence = useGameStore((s) => s.evidence);
  const charsById = useGameStore((s) => s.characters);

  const ownLogs = useMemo<DialogueLog[]>(() => {
    if (!character) return [];
    return logs
      .filter((l) => l.speakerId === character.id)
      .slice()
      .sort((a, b) => b.day - a.day || b.turn - a.turn);
  }, [logs, character]);

  const related = useMemo<EvidencePublic[]>(() => {
    if (!character) return [];
    return evidence.filter((e) => e.relatedCharacters.includes(character.id));
  }, [evidence, character]);

  const speakerLookup = useMemo(() => new Map(charsById.map((c) => [c.id, c.name])), [charsById]);

  return (
    <Modal
      open={character !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      className="max-w-2xl"
      title={
        character ? (
          <span className="flex items-center gap-card">
            <CharacterAvatar
              name={character.name}
              seed={character.id}
              size="lg"
              isAlive={character.isAlive}
            />
            <span className="flex flex-col">
              <span className="font-serif text-2xl text-brand-emphasis">{character.name}</span>
              <span className="text-xs text-brand-muted">
                {character.socialRole} / {character.publicPersonality}
              </span>
            </span>
          </span>
        ) : (
          'キャラクター'
        )
      }
      description="このキャラクターの公開情報・発言履歴・関連証拠"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            閉じる
          </Button>
          <Button
            onClick={() => {
              if (!character) return;
              router.push(`/play/${gameId}/interrogate?target=${character.id}`);
            }}
            disabled={!character?.isAlive}
          >
            {character?.isAlive ? '尋問する' : '尋問不可 (脱落)'}
          </Button>
        </>
      }
    >
      {character && (
        <div className="space-y-section">
          <TrustBar value={character.trustToPlayer} />

          {ownLogs.length > 0 && (
            <section className="space-y-card">
              <h3 className="font-serif text-sm text-brand-muted">発言履歴 ({ownLogs.length})</h3>
              <div className="max-h-[18rem] space-y-2 overflow-y-auto pr-2">
                {ownLogs.slice(0, 8).map((log) => (
                  <LogBubble
                    key={log.id}
                    speakerName={speakerLookup.get(log.speakerId) ?? log.speakerId}
                    speakerId={log.speakerId}
                    text={log.text}
                    intent={BUBBLE_INTENT[log.intent]}
                    confidence={log.confidence}
                    timestamp={`day ${log.day} / turn ${log.turn}`}
                  />
                ))}
              </div>
              {ownLogs.length > 8 && (
                <p className="text-xs text-brand-muted">
                  …他 {ownLogs.length - 8} 件は議論ログで確認
                </p>
              )}
            </section>
          )}

          {related.length > 0 && (
            <section className="space-y-card">
              <h3 className="font-serif text-sm text-brand-muted">
                関連する証拠 ({related.length})
              </h3>
              <div className="grid grid-cols-1 gap-card md:grid-cols-2">
                {related.slice(0, 4).map((ev) => (
                  <EvidenceCard key={ev.id} evidence={ev} />
                ))}
              </div>
            </section>
          )}

          {ownLogs.length === 0 && related.length === 0 && (
            <p className="text-sm text-brand-muted">
              このキャラクターの発言や関連証拠はまだありません。
            </p>
          )}

          <CharacterMetaList
            personality={character.publicPersonality}
            speakingStyle={character.speakingStyle}
            role={character.socialRole}
          />
        </div>
      )}
    </Modal>
  );
}

function TrustBar({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, value));
  const tone = v >= 60 ? 'success' : v >= 30 ? 'gold' : 'danger';
  const barColor =
    tone === 'success' ? 'bg-brand-success' : tone === 'gold' ? 'bg-brand-gold' : 'bg-brand-danger';
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-brand-muted">プレイヤーへの信頼度</span>
        <span className="font-mono text-brand-text">{v}/100</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-brand-border">
        <div
          className={`h-full transition-[width] duration-300 ${barColor}`}
          style={{ width: `${v}%` }}
        />
      </div>
    </div>
  );
}

function CharacterMetaList({
  personality,
  speakingStyle,
  role,
}: {
  personality: string;
  speakingStyle: string;
  role: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 rounded-card border border-brand-border bg-brand-bg p-card text-sm sm:grid-cols-3">
      <Meta label="性格" value={personality} />
      <Meta label="口調" value={speakingStyle} />
      <Meta label="立場" value={role} />
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-brand-muted">{label}</span>
      <span className="text-brand-text">
        <Badge tone="neutral">{value}</Badge>
      </span>
    </div>
  );
}
