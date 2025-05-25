// src/config/firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from 'firebase/functions'; // Import getFunctions

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app); // Initialize and export functions

export { auth, db, storage, app, functions }; // Export app and functions
// Please create a .env file in the root directory (ai-video-translator-ui)
// and add your Firebase configuration values there.
// Example .env file:
// REACT_APP_FIREBASE_API_KEY=your_api_key
// REACT_APP_FIREBASE_AUTH_DOMAIN=your_auth_domain
// REACT_APP_FIREBASE_PROJECT_ID=your_project_id
// REACT_APP_FIREBASE_STORAGE_BUCKET=your_storage_bucket
// REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
// REACT_APP_FIREBASE_APP_ID=your_app_id
