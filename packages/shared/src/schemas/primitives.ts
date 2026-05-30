import { z } from 'zod';

/**
 * Firestore Timestamp の structural schema。
 * 実体は client SDK と Admin SDK で異なるが、共通フィールドで扱う。
 * 検証用途で読み取り時に使うため緩めに定義。
 */
export const firebaseTimestampSchema = z
  .object({
    seconds: z.number(),
    nanoseconds: z.number(),
  })
  .passthrough();

/** "HH:MM" (24h 表記) を検証 */
export const timeStringSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, '"HH:MM" 形式 (24h) で指定してください');

export const idSchema = z.string().min(1).max(64);
