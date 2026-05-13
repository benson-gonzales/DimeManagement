
import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBIEUS3U-9BcNK8XJBomb9noUC-nkvBwQM",
  authDomain: "budgeting-pro.firebaseapp.com",
  projectId: "budgeting-pro",
  storageBucket: "budgeting-pro.firebasestorage.app",
  messagingSenderId: "1072155761794",
  appId: "1:1072155761794:web:6d29e7a4731c6af1f6a89b",
  measurementId: "G-7BF5H5JLN9"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

// Initialize Analytics conditionally
isSupported().then(yes => {
  if (yes) getAnalytics(app);
});

export { auth, db, app };
