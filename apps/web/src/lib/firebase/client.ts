'use client';

import { type FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import {
  type Auth,
  connectAuthEmulator,
  getAuth as _getAuth,
} from 'firebase/auth';
import {
  type Firestore,
  connectFirestoreEmulator,
  getFirestore as _getFirestore,
} from 'firebase/firestore';
import {
  type Functions,
  connectFunctionsEmulator,
  getFunctions as _getFunctions,
} from 'firebase/functions';

const REGION = 'asia-northeast1';
const USE_EMULATOR = process.env.NEXT_PUBLIC_USE_EMULATOR === 'true';

// Firebase Web 設定は公開値 (ブラウザに配信される。保護は Firestore rules / App Check)。
// CI/本番ビルドで NEXT_PUBLIC_* が未設定でも動くよう、aihackathon-8b383 の既定値を
// フォールバックに持つ。env があればそちらが優先される (emulator / 別プロジェクト用)。
const DEFAULT_CONFIG = {
  apiKey: 'AIzaSyCevOxi1ngjsxXRxZ6wcd78ZA_W5Co4lNQ',
  authDomain: 'aihackathon-8b383.firebaseapp.com',
  projectId: 'aihackathon-8b383',
  storageBucket: 'aihackathon-8b383.firebasestorage.app',
  messagingSenderId: '820514003058',
  appId: '1:820514003058:web:60c26696dd04e5ef964aeb',
  measurementId: 'G-3PWRB4JQTY',
} as const;

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? DEFAULT_CONFIG.apiKey,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? DEFAULT_CONFIG.authDomain,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? DEFAULT_CONFIG.projectId,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? DEFAULT_CONFIG.storageBucket,
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? DEFAULT_CONFIG.messagingSenderId,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? DEFAULT_CONFIG.appId,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? DEFAULT_CONFIG.measurementId,
};

let cachedApp: FirebaseApp | undefined;
let cachedAuth: Auth | undefined;
let cachedFirestore: Firestore | undefined;
let cachedFunctions: Functions | undefined;

export function getFirebaseApp(): FirebaseApp {
  if (cachedApp) return cachedApp;
  cachedApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  return cachedApp;
}

export function getAuth(): Auth {
  if (cachedAuth) return cachedAuth;
  cachedAuth = _getAuth(getFirebaseApp());
  if (USE_EMULATOR) {
    connectAuthEmulator(cachedAuth, 'http://127.0.0.1:9099', {
      disableWarnings: true,
    });
  }
  return cachedAuth;
}

export function getFirestore(): Firestore {
  if (cachedFirestore) return cachedFirestore;
  cachedFirestore = _getFirestore(getFirebaseApp());
  if (USE_EMULATOR) {
    connectFirestoreEmulator(cachedFirestore, '127.0.0.1', 8080);
  }
  return cachedFirestore;
}

export function getFunctions(): Functions {
  if (cachedFunctions) return cachedFunctions;
  cachedFunctions = _getFunctions(getFirebaseApp(), REGION);
  if (USE_EMULATOR) {
    connectFunctionsEmulator(cachedFunctions, '127.0.0.1', 5001);
  }
  return cachedFunctions;
}
