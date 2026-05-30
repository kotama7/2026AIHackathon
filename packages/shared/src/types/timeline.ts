import type { CharacterId, EvidenceId, LocationId, TimelineEventId } from './common.js';

/**
 * 事件夜の各キャラクターの行動を時系列で記述するイベント。
 * Truth Compiler が生成、internal/ にのみ保存。
 */
export type TimelineEvent = {
  id: TimelineEventId;
  /** "HH:MM" (24h 表記) */
  time: string;
  character: CharacterId;
  location: LocationId;
  /** 自由記述の行動内容 */
  action: string;
  /** この event を実知識として持つキャラ ID 群 */
  knownBy: CharacterId[];
  /** この event を目撃したキャラ ID 群 */
  observedBy: CharacterId[];
  /** この event を原因として発生する証拠 ID 群 */
  causesEvidence: EvidenceId[];
};

/**
 * 場所の隣接マトリクス。Truth Compiler が事件骨格生成時に決定する。
 * Validator が「物理的到達可能か」を検証するのに使う。
 */
export type LocationGraph = {
  locations: LocationId[];
  /** locationId -> 隣接 location ID 群 */
  adjacency: Record<LocationId, LocationId[]>;
  /** locationId -> 表示名 */
  displayNames: Record<LocationId, string>;
};
