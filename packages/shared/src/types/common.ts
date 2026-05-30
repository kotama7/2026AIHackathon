/**
 * Firebase Timestamp の構造的互換型。
 * client SDK (firebase/firestore) と Admin SDK (firebase-admin/firestore) の Timestamp は
 * 別クラスだが、共通フィールドで扱えるように構造的に表現する。
 */
export type FirebaseTimestamp = {
  toDate: () => Date;
  toMillis: () => number;
  readonly seconds: number;
  readonly nanoseconds: number;
};

export type CharacterId = string;
export type EvidenceId = string;
export type TestimonyId = string;
export type LogId = string;
export type TimelineEventId = string;
export type GameId = string;
export type UserId = string;
export type LocationId = string;
