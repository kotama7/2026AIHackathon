import type {
  CaseTruth,
  Character,
  CharacterId,
  CharacterPublic,
  EvidenceId,
  EvidencePublic,
  GameId,
  GameMeta,
  InterrogationAction,
  TimelineEvent,
  TimelineEventId,
  TrialDecision,
  UserId,
} from '@village/shared';
import type { DialogueLog, DialogueLogMetadata } from '@village/shared';
import { COLLECTIONS } from '@village/shared';
import { getApps, initializeApp } from 'firebase-admin/app';
import {
  type CollectionReference,
  type DocumentReference,
  FieldValue,
  getFirestore,
  Timestamp,
  type Transaction,
} from 'firebase-admin/firestore';

// =============================================================================
// Admin SDK 初期化 (1 度だけ)
// =============================================================================

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

/** raw Firestore instance (transaction や複雑なクエリで使う) */
export const adminDb = db;

/** server timestamp sentinel */
export const serverTimestamp = (): FieldValue => FieldValue.serverTimestamp();

/** 任意の Date を Firestore Timestamp に */
export const toTimestamp = (date: Date): Timestamp => Timestamp.fromDate(date);

/** 現在時刻の Timestamp */
export const nowTimestamp = (): Timestamp => Timestamp.now();

// =============================================================================
// Collection path helpers
// =============================================================================

const paths = {
  userGames: (uid: UserId) => `${COLLECTIONS.USERS}/${uid}/${COLLECTIONS.GAMES}`,
  userGame: (uid: UserId, gameId: GameId) => `${paths.userGames(uid)}/${gameId}`,
  meta: (uid: UserId, gameId: GameId) => `${paths.userGame(uid, gameId)}/${COLLECTIONS.META}/state`,
  characters: (uid: UserId, gameId: GameId) =>
    `${paths.userGame(uid, gameId)}/${COLLECTIONS.CHARACTERS}`,
  publicLogs: (uid: UserId, gameId: GameId) =>
    `${paths.userGame(uid, gameId)}/${COLLECTIONS.PUBLIC_LOGS}`,
  evidence: (uid: UserId, gameId: GameId) =>
    `${paths.userGame(uid, gameId)}/${COLLECTIONS.EVIDENCE}`,
  interrogations: (uid: UserId, gameId: GameId) =>
    `${paths.userGame(uid, gameId)}/${COLLECTIONS.INTERROGATIONS}`,
  trials: (uid: UserId, gameId: GameId) => `${paths.userGame(uid, gameId)}/${COLLECTIONS.TRIALS}`,
  internal: (gameId: GameId) => `${COLLECTIONS.INTERNAL}/${gameId}`,
  caseTruth: (gameId: GameId) => `${paths.internal(gameId)}/${COLLECTIONS.CASE_TRUTH}/full`,
  characterSecrets: (gameId: GameId) =>
    `${paths.internal(gameId)}/${COLLECTIONS.CHARACTER_SECRETS}`,
  timeline: (gameId: GameId) => `${paths.internal(gameId)}/${COLLECTIONS.TIMELINE}`,
  logMetadata: (gameId: GameId) => `${paths.internal(gameId)}/${COLLECTIONS.LOG_METADATA}`,
};

// =============================================================================
// userDb — クライアント可視のコレクション (Functions 経由で書き込み)
// =============================================================================

export const userDb = {
  /** users/{uid}/games/{gameId}/meta/state */
  meta: {
    ref: (uid: UserId, gameId: GameId): DocumentReference<GameMeta> =>
      db.doc(paths.meta(uid, gameId)) as DocumentReference<GameMeta>,
    async get(uid: UserId, gameId: GameId): Promise<GameMeta | null> {
      const snap = await userDb.meta.ref(uid, gameId).get();
      return snap.exists ? (snap.data() as GameMeta) : null;
    },
    async set(uid: UserId, gameId: GameId, data: GameMeta): Promise<void> {
      await userDb.meta.ref(uid, gameId).set(data);
    },
    async update(uid: UserId, gameId: GameId, patch: Partial<GameMeta>): Promise<void> {
      await userDb.meta.ref(uid, gameId).set(patch, { merge: true });
    },
  },

  /** users/{uid}/games/{gameId}/characters/{charId} */
  characters: {
    col: (uid: UserId, gameId: GameId): CollectionReference<CharacterPublic> =>
      db.collection(paths.characters(uid, gameId)) as CollectionReference<CharacterPublic>,
    ref: (uid: UserId, gameId: GameId, charId: CharacterId): DocumentReference<CharacterPublic> =>
      userDb.characters.col(uid, gameId).doc(charId),
    async list(uid: UserId, gameId: GameId): Promise<CharacterPublic[]> {
      const snap = await userDb.characters.col(uid, gameId).get();
      return snap.docs.map((d) => d.data());
    },
    async set(
      uid: UserId,
      gameId: GameId,
      charId: CharacterId,
      data: CharacterPublic
    ): Promise<void> {
      await userDb.characters.ref(uid, gameId, charId).set(data);
    },
  },

  /** users/{uid}/games/{gameId}/publicLogs/{logId} */
  publicLogs: {
    col: (uid: UserId, gameId: GameId): CollectionReference<DialogueLog> =>
      db.collection(paths.publicLogs(uid, gameId)) as CollectionReference<DialogueLog>,
    async add(uid: UserId, gameId: GameId, log: DialogueLog): Promise<void> {
      await userDb.publicLogs.col(uid, gameId).doc(log.id).set(log);
    },
  },

  /** users/{uid}/games/{gameId}/evidence/{evidenceId} */
  evidence: {
    col: (uid: UserId, gameId: GameId): CollectionReference<EvidencePublic> =>
      db.collection(paths.evidence(uid, gameId)) as CollectionReference<EvidencePublic>,
    async add(uid: UserId, gameId: GameId, evidence: EvidencePublic): Promise<void> {
      await userDb.evidence.col(uid, gameId).doc(evidence.id).set(evidence);
    },
    async addMany(uid: UserId, gameId: GameId, evidence: EvidencePublic[]): Promise<void> {
      const batch = db.batch();
      const col = userDb.evidence.col(uid, gameId);
      for (const e of evidence) batch.set(col.doc(e.id), e);
      await batch.commit();
    },
  },

  /** users/{uid}/games/{gameId}/interrogations/{id} */
  interrogations: {
    col: (uid: UserId, gameId: GameId): CollectionReference<InterrogationAction> =>
      db.collection(paths.interrogations(uid, gameId)) as CollectionReference<InterrogationAction>,
    async add(uid: UserId, gameId: GameId, action: InterrogationAction): Promise<void> {
      await userDb.interrogations.col(uid, gameId).doc(action.id).set(action);
    },
  },

  /** users/{uid}/games/{gameId}/trials/{day} */
  trials: {
    ref: (uid: UserId, gameId: GameId, day: number): DocumentReference<TrialDecision> =>
      db.doc(`${paths.trials(uid, gameId)}/day${day}`) as DocumentReference<TrialDecision>,
    async set(uid: UserId, gameId: GameId, day: number, data: TrialDecision): Promise<void> {
      await userDb.trials.ref(uid, gameId, day).set(data);
    },
  },
};

// =============================================================================
// internalDb — Functions 専用 (rules で全拒否)
// =============================================================================

export const internalDb = {
  /** internal/{gameId}/caseTruth/full — 真相全体 */
  caseTruth: {
    ref: (gameId: GameId): DocumentReference<CaseTruth> =>
      db.doc(paths.caseTruth(gameId)) as DocumentReference<CaseTruth>,
    async get(gameId: GameId): Promise<CaseTruth | null> {
      const snap = await internalDb.caseTruth.ref(gameId).get();
      return snap.exists ? (snap.data() as CaseTruth) : null;
    },
    async set(gameId: GameId, data: CaseTruth): Promise<void> {
      await internalDb.caseTruth.ref(gameId).set(data);
    },
  },

  /** internal/{gameId}/characterSecrets/{charId} */
  characterSecrets: {
    col: (gameId: GameId): CollectionReference<Character> =>
      db.collection(paths.characterSecrets(gameId)) as CollectionReference<Character>,
    async get(gameId: GameId, charId: CharacterId): Promise<Character | null> {
      const snap = await internalDb.characterSecrets.col(gameId).doc(charId).get();
      return snap.exists ? (snap.data() as Character) : null;
    },
    async setMany(gameId: GameId, characters: Character[]): Promise<void> {
      const batch = db.batch();
      const col = internalDb.characterSecrets.col(gameId);
      for (const c of characters) batch.set(col.doc(c.id), c);
      await batch.commit();
    },
  },

  /** internal/{gameId}/timeline/{eventId} */
  timeline: {
    col: (gameId: GameId): CollectionReference<TimelineEvent> =>
      db.collection(paths.timeline(gameId)) as CollectionReference<TimelineEvent>,
    async list(gameId: GameId): Promise<TimelineEvent[]> {
      const snap = await internalDb.timeline.col(gameId).get();
      return snap.docs.map((d) => d.data());
    },
    async get(gameId: GameId, eventId: TimelineEventId): Promise<TimelineEvent | null> {
      const snap = await internalDb.timeline.col(gameId).doc(eventId).get();
      return snap.exists ? (snap.data() as TimelineEvent) : null;
    },
    async setMany(gameId: GameId, events: TimelineEvent[]): Promise<void> {
      const batch = db.batch();
      const col = internalDb.timeline.col(gameId);
      for (const e of events) batch.set(col.doc(e.id), e);
      await batch.commit();
    },
  },

  /** internal/{gameId}/logMetadata/{logId} — 発言の真偽分類など */
  logMetadata: {
    col: (gameId: GameId): CollectionReference<DialogueLogMetadata> =>
      db.collection(paths.logMetadata(gameId)) as CollectionReference<DialogueLogMetadata>,
    async add(gameId: GameId, meta: DialogueLogMetadata): Promise<void> {
      await internalDb.logMetadata.col(gameId).doc(meta.logId).set(meta);
    },
  },

  /** evidence の生 (内部) 版。CaseTruth.evidence からも参照可だが、個別 query 用 */
  evidence: {
    col: (gameId: GameId): CollectionReference<unknown> =>
      db.collection(`${paths.internal(gameId)}/evidenceFull`),
    async get(gameId: GameId, evidenceId: EvidenceId): Promise<unknown> {
      const snap = await internalDb.evidence.col(gameId).doc(evidenceId).get();
      return snap.exists ? snap.data() : null;
    },
  },
};

// =============================================================================
// Transaction ヘルパー
// =============================================================================

/**
 * Firestore transaction を型安全に実行。
 * 主な用途: 尋問ポイント減算 (A3-05) など atomic な read-modify-write。
 */
export async function runTransaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T> {
  return db.runTransaction(fn);
}

export { FieldValue, Timestamp };
