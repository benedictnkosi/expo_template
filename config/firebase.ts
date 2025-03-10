import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getReactNativePersistence } from 'firebase/auth/react-native';

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

// Initialize Auth with React Native persistence
const auth = getAuth(app);
setPersistence(auth, getReactNativePersistence(AsyncStorage))
  .catch((error) => {
    console.error("Error setting auth persistence:", error);
  });

// Initialize Firestore
const db = getFirestore(app);

export { app, auth, db }; 