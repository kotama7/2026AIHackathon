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

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
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
