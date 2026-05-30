import { cn } from './cn';

type Size = 'sm' | 'md' | 'lg';

const SIZES: Record<Size, { box: string; text: string }> = {
  sm: { box: 'h-8 w-8', text: 'text-xs' },
  md: { box: 'h-12 w-12', text: 'text-base' },
  lg: { box: 'h-16 w-16', text: 'text-xl' },
};

// 名前から色を決定 (id 文字列のハッシュで安定)
function hashHue(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % 360;
}

type Props = {
  name: string;
  /** 表示用 ID。色決定に使う */
  seed?: string;
  size?: Size;
  isAlive?: boolean;
  className?: string;
};

export function CharacterAvatar({ name, seed, size = 'md', isAlive = true, className }: Props) {
  const initial = name.trim().charAt(0) || '?';
  const hue = hashHue(seed ?? name);
  const dim = SIZES[size];

  return (
    <span
      aria-label={`${name}${isAlive ? '' : ' (脱落)'}`}
      title={name}
      className={cn(
        'relative inline-flex items-center justify-center rounded-full border border-brand-border-strong font-serif',
        dim.box,
        dim.text,
        !isAlive && 'opacity-40 grayscale',
        className
      )}
      style={{
        backgroundColor: `hsl(${hue} 25% 22%)`,
        color: `hsl(${hue} 60% 75%)`,
      }}
    >
      {initial}
      {!isAlive && (
        <span
          aria-hidden
          className="absolute inset-0 flex items-center justify-center text-brand-danger"
        >
          ✕
        </span>
      )}
    </span>
  );
}
