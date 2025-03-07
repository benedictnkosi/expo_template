import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported, Analytics } from 'firebase/analytics';
import { getReactNativePersistence } from 'firebase/auth/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

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

// Initialize Analytics with proper async handling
let analytics: Analytics | null = null;

async function initializeAnalytics() {
  try {
    // Check if analytics is supported
    const supported = await isSupported();
    if (supported) {
      // Initialize analytics only on supported platforms
      analytics = getAnalytics(app);
      console.log('Firebase Analytics initialized successfully');
    } else {
      console.log('Firebase Analytics is not supported on this platform');
    }
  } catch (error) {
    console.error('Error initializing Firebase Analytics:', error);
  }
}

// Initialize analytics immediately
if (Platform.OS !== 'web') {
  initializeAnalytics();
}

export { app, auth, db, analytics };
export type { Analytics }; 