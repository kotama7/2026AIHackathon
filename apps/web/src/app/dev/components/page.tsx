'use client';

import { useState } from 'react';

import {
  Badge,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  CharacterAvatar,
  EvidenceCard,
  LogBubble,
  Modal,
} from '@/components/ui';

const SAMPLE_CHARS = [
  { name: 'ミナ', id: 'char_001' },
  { name: 'ケンジ', id: 'char_002' },
  { name: 'リエ', id: 'char_003' },
  { name: 'タカシ', id: 'char_004' },
];

export default function ComponentsDevPage() {
  const [pinned, setPinned] = useState<Set<string>>(new Set());
  const [dismissibleOpen, setDismissibleOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const togglePin = (id: string) =>
    setPinned((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <main className="mx-auto max-w-board space-y-section p-page">
      <header>
        <h1 className="text-4xl text-brand-gold">UI Components</h1>
        <p className="mt-2 text-sm text-brand-muted">B1-07 雛形コンポーネントの開発確認。</p>
      </header>

      <section className="space-y-card">
        <h2 className="text-2xl text-brand-emphasis">Buttons</h2>
        <div className="flex flex-wrap gap-card">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="ghost">Ghost</Button>
          <Button disabled>Disabled</Button>
        </div>
        <div className="flex flex-wrap items-end gap-card">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
        </div>
      </section>

      <section className="space-y-card">
        <h2 className="text-2xl text-brand-emphasis">Badges</h2>
        <div className="flex flex-wrap gap-2">
          <Badge>neutral</Badge>
          <Badge tone="gold">gold</Badge>
          <Badge tone="danger">danger</Badge>
          <Badge tone="success">success</Badge>
          <Badge tone="info">info</Badge>
        </div>
      </section>

      <section className="space-y-card">
        <h2 className="text-2xl text-brand-emphasis">CharacterAvatar</h2>
        <div className="flex flex-wrap items-end gap-card">
          {SAMPLE_CHARS.map((c) => (
            <div key={c.id} className="flex flex-col items-center gap-1">
              <CharacterAvatar name={c.name} seed={c.id} size="lg" />
              <span className="text-xs text-brand-muted">{c.name}</span>
            </div>
          ))}
          <div className="flex flex-col items-center gap-1">
            <CharacterAvatar name="脱落" seed="dead" size="lg" isAlive={false} />
            <span className="text-xs text-brand-muted">脱落</span>
          </div>
        </div>
      </section>

      <section className="space-y-card">
        <h2 className="text-2xl text-brand-emphasis">Card</h2>
        <Card className="max-w-md">
          <CardHeader>
            <h3 className="font-serif text-lg text-brand-emphasis">カードタイトル</h3>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-brand-text">これはカードの本文です。</p>
          </CardBody>
          <CardFooter>
            <Button size="sm" variant="ghost">
              キャンセル
            </Button>
            <Button size="sm">確認</Button>
          </CardFooter>
        </Card>
      </section>

      <section className="space-y-card">
        <h2 className="text-2xl text-brand-emphasis">EvidenceCard</h2>
        <div className="grid grid-cols-1 gap-card sm:grid-cols-2">
          <EvidenceCard
            evidence={{
              id: 'ev_001',
              name: '深夜の扉ログ',
              description: '23:52 にリエの部屋の扉が開いた記録がある。',
              reliability: 'B',
              relatedCharacters: ['リエ'],
              day: 2,
            }}
            isPinned={pinned.has('ev_001')}
            onPin={togglePin}
            onPresent={(id) => alert(`提示: ${id}`)}
          />
          <EvidenceCard
            evidence={{
              id: 'ev_002',
              name: '時計塔の足跡',
              description: '雨でぬかるんだ地面に、誰かが時計塔へ向かった靴跡が残っていた。',
              reliability: 'A',
              relatedCharacters: ['不明'],
              day: 2,
            }}
            isPinned={pinned.has('ev_002')}
            onPin={togglePin}
            onPresent={(id) => alert(`提示: ${id}`)}
          />
        </div>
      </section>

      <section className="space-y-card">
        <h2 className="text-2xl text-brand-emphasis">LogBubble</h2>
        <div className="flex flex-col gap-card">
          <LogBubble
            speakerName="ミナ"
            speakerId="char_001"
            text="昨夜、リエが部屋を出るのを見た気がします。確証はないけれど。"
            intent="suspicion"
            confidence={0.65}
            isPinned={pinned.has('log_001')}
            onPin={() => togglePin('log_001')}
            timestamp="day 2 / turn 3"
          />
          <LogBubble
            speakerName="リエ"
            speakerId="char_003"
            text="私は昨夜ずっと自室にいました。誰とも会っていません。"
            intent="defend"
            confidence={0.9}
            isWerewolfSuspect
            isPinned={pinned.has('log_002')}
            onPin={() => togglePin('log_002')}
            timestamp="day 2 / turn 5"
          />
        </div>
      </section>

      <section className="space-y-card">
        <h2 className="text-2xl text-brand-emphasis">Modal</h2>
        <div className="flex flex-wrap gap-card">
          <Button onClick={() => setDismissibleOpen(true)}>通常モーダルを開く</Button>
          <Button variant="danger" onClick={() => setConfirmOpen(true)}>
            確認モーダル (dismissible=false)
          </Button>
        </div>
        <p className="text-xs text-brand-muted">
          ESC / overlay クリック / × ボタンで閉じる。確認モーダルは ESC / overlay
          無効、明示ボタンのみで閉じる。
        </p>

        <Modal
          open={dismissibleOpen}
          onOpenChange={setDismissibleOpen}
          title="証拠の詳細"
          description="深夜の扉ログについて確認します。"
          footer={
            <>
              <Button variant="ghost" onClick={() => setDismissibleOpen(false)}>
                閉じる
              </Button>
              <Button onClick={() => setDismissibleOpen(false)}>了解</Button>
            </>
          }
        >
          <p className="text-sm text-brand-text">
            23:52 にリエの部屋の扉が開いた記録。Radix のフォーカストラップと ESC 閉じが
            効いているか確認するためのデモです。
          </p>
        </Modal>

        <Modal
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          dismissible={false}
          title="処刑を確定しますか？"
          description="この判決は取り消せません。"
          footer={
            <>
              <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
                取り消し
              </Button>
              <Button variant="danger" onClick={() => setConfirmOpen(false)}>
                処刑する
              </Button>
            </>
          }
        >
          <p className="text-sm text-brand-text">
            リエを人狼として処刑します。判決が間違っていた場合、村の信頼度が大きく下がります。
          </p>
        </Modal>
      </section>
    </main>
  );
}
