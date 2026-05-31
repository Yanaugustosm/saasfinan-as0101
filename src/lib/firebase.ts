import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// ── FIREBASE CONFIG ─────────────────────────────────────────────────────────
// Para trocar de domínio (Netlify/Vercel): só adicione o novo domínio em:
// Firebase Console → Authentication → Settings → Authorized domains
// ────────────────────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyA6oApmIPmaGi3giHHIdqaOZ4XTM39f5aM",
  authDomain: "saas-finacasal.firebaseapp.com",
  projectId: "saas-finacasal",
  storageBucket: "saas-finacasal.firebasestorage.app",
  messagingSenderId: "1071784969926",
  appId: "1:1071784969926:web:1fa22117748c7bad3f79c7",
  measurementId: "G-KRF65ZS4W2",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);
