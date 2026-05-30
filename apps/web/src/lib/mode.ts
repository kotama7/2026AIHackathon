/**
 * 現在のクライアント動作モードを表す共通定数。
 *
 * - 'mock'     : NEXT_PUBLIC_USE_MOCK=true。Functions 呼び出しを functionsMock に差し替え、Firestore listener は no-op
 * - 'emulator' : NEXT_PUBLIC_USE_EMULATOR=true。実コードのまま localhost emulator に接続
 * - 'prod'     : 上記いずれでもない (本番 Firebase に接続)
 */
export type ClientMode = 'mock' | 'emulator' | 'prod';

export const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';
export const USE_EMULATOR = process.env.NEXT_PUBLIC_USE_EMULATOR === 'true';

export function getClientMode(): ClientMode {
  if (USE_MOCK) return 'mock';
  if (USE_EMULATOR) return 'emulator';
  return 'prod';
}

export const MODE_LABEL: Record<ClientMode, { label: string; description: string }> = {
  mock: {
    label: 'MOCK',
    description: 'Functions 呼び出しはモック。Firestore listener は無効',
  },
  emulator: {
    label: 'EMULATOR',
    description: 'ローカル Firebase Emulator (auth:9099 / firestore:8080 / functions:5001) に接続',
  },
  prod: {
    label: 'PROD',
    description: '本番 Firebase に接続',
  },
};
