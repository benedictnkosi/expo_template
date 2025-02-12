import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "............",
  authDomain: "aluve-learn.firebaseapp.com",
  projectId: "aluve-learn",
  storageBucket: "aluve-learn.firebasestorage.app",
  messagingSenderId: "1080375994922",
  appId: "1:1080375994922:web:a05f433ac96eb4c086f153",
  measurementId: "G-RL0R1HKD66"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with persistence
export const auth = Platform.OS === 'web'
  ? getAuth(app)
  : initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
  });

export const googleProvider = new GoogleAuthProvider();

export const db = getFirestore(app); 