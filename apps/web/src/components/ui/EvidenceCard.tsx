import { Badge } from './Badge';
import { Button } from './Button';
import { Card, CardBody, CardFooter, CardHeader } from './Card';

export type EvidenceCardProps = {
  evidence: {
    id: string;
    name: string;
    description: string;
    reliability?: 'A' | 'B' | 'C' | 'D';
    relatedCharacters?: string[];
    day?: number;
  };
  onPin?: (id: string) => void;
  onPresent?: (id: string) => void;
  isPinned?: boolean;
};

const RELIABILITY_TONE = {
  A: 'gold',
  B: 'info',
  C: 'neutral',
  D: 'danger',
} as const;

export function EvidenceCard({ evidence, onPin, onPresent, isPinned }: EvidenceCardProps) {
  return (
    <Card>
      <CardHeader className="flex items-start justify-between gap-2">
        <h3 className="font-serif text-lg text-brand-emphasis">{evidence.name}</h3>
        {evidence.reliability && (
          <Badge tone={RELIABILITY_TONE[evidence.reliability]}>確度 {evidence.reliability}</Badge>
        )}
      </CardHeader>
      <CardBody className="space-y-2">
        <p className="text-sm text-brand-text">{evidence.description}</p>
        {evidence.relatedCharacters && evidence.relatedCharacters.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {evidence.relatedCharacters.map((char) => (
              <Badge key={char} tone="neutral">
                関連: {char}
              </Badge>
            ))}
          </div>
        )}
        {evidence.day !== undefined && (
          <p className="text-xs text-brand-muted">day {evidence.day}</p>
        )}
      </CardBody>
      {(onPin || onPresent) && (
        <CardFooter>
          {onPin && (
            <Button
              variant={isPinned ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => onPin(evidence.id)}
            >
              {isPinned ? 'ピン留め中' : 'ピン留め'}
            </Button>
          )}
          {onPresent && (
            <Button variant="ghost" size="sm" onClick={() => onPresent(evidence.id)}>
              提示
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
