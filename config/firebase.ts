import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCjV86H9STLEy1SyWVyedLUlUFQB7ABIJ8",
  authDomain: "aluve-learn.firebaseapp.com",
  projectId: "aluve-learn",
  storageBucket: "aluve-learn.firebasestorage.app",
  messagingSenderId: "1080375994922",
  appId: "1:1080375994922:web:a05f433ac96eb4c086f153",
  measurementId: "G-RL0R1HKD66"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);



const db = getFirestore(app);

export {
  db
}; 