/**
 * Firebase App initialization — SDK v11 (modular API).
 *
 * All config values are read from Vite environment variables.
 * Copy `.env.example` to `.env` and fill in the values from
 * Firebase Console > Project settings > General > Your apps > SDK setup.
 *
 * IMPORTANT: variables must be prefixed with VITE_ to be exposed to
 * client-side code by Vite. See https://vite.dev/guide/env-and-mode
 */
import { initializeApp, type FirebaseApp } from "firebase/app"
import {
  getAuth,
  GoogleAuthProvider,
  type Auth,
} from "firebase/auth"
import { getFirestore, type Firestore } from "firebase/firestore"

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// Fail fast in dev if required env vars are missing.
if (import.meta.env.DEV) {
  const required: Array<keyof typeof firebaseConfig> = [
    "apiKey",
    "authDomain",
    "projectId",
    "appId",
  ]
  const missing = required.filter((key) => !firebaseConfig[key])
  if (missing.length > 0) {
    // eslint-disable-next-line no-console
    console.warn(
      `[firebase] Missing env vars: ${missing
        .map((k) => `VITE_FIREBASE_${k.replace(/[A-Z]/g, (m) => "_" + m).toUpperCase()}`)
        .join(", ")}. Copy .env.example to .env and fill in your Firebase config.`
    )
  }
}

export const app: FirebaseApp = initializeApp(firebaseConfig)
export const auth: Auth = getAuth(app)
export const db: Firestore = getFirestore(app)
export const googleProvider = new GoogleAuthProvider()
