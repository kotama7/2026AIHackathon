import { defineSecret } from 'firebase-functions/params';

/**
 * Gemini API キー。
 *
 * 本番: Firebase Secret Manager に登録
 *   `firebase functions:secrets:set GEMINI_API_KEY`
 *
 * Emulator: functions/.secret.local に `GEMINI_API_KEY=...` を書く
 * (このファイルは .gitignore 済み)
 *
 * 使う callable は必ず onCall({ secrets: [GEMINI_API_KEY] }, ...) で宣言すること。
 */
export const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');
