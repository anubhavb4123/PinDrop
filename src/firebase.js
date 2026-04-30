import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "demo-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "demo.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "demo-project",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "demo-project.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "000000000000",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:000000000000:web:0000000000000000",
};

// Flag to check if Firebase is properly configured
export const isFirebaseConfigured = !!(
  import.meta.env.VITE_FIREBASE_API_KEY &&
  import.meta.env.VITE_FIREBASE_DATABASE_URL &&
  import.meta.env.VITE_FIREBASE_PROJECT_ID
);

let app = null;
let database = null;

try {
  app = initializeApp(firebaseConfig);

  if (isFirebaseConfigured) {
    database = getDatabase(app);
  } else {
    console.warn(
      "⚠️ Firebase is not configured. Create a .env file with your Firebase credentials. See .env.example for reference."
    );
  }
} catch (e) {
  console.warn("Firebase initialization error:", e.message);
}

export { database };
