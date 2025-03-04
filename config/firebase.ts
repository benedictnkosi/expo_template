import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyA19oZVV-JIleL-XlEbDK8k-KPNk1vod8E",
  authDomain: "exam-quiz-b615e.firebaseapp.com",
  projectId: "exam-quiz-b615e",
  storageBucket: "exam-quiz-b615e.firebasestorage.app",
  messagingSenderId: "619089624841",
  appId: "1:619089624841:web:8cdb542ea7c8eb22681dd8",
  measurementId: "G-MR80CKN8H9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with AsyncStorage persistence
const auth = getAuth(app);

const db = getFirestore(app);

export { auth, db }; 