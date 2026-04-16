import { initializeApp } from "firebase/app";
import { getAnalytics, logEvent } from "firebase/analytics";
import { getFirestore, enableIndexedDbPersistence, collection, getDocs } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBVMImcjHyIyfoGbdIlUUfuwMXDvWFxEE0",
  authDomain: "pos-system-d98.firebaseapp.com",
  databaseURL: "https://pos-system-d98-default-rtdb.firebaseio.com",
  projectId: "pos-system-d98",
  storageBucket: "pos-system-d98.firebasestorage.app",
  messagingSenderId: "834008240755",
  appId: "1:834008240755:web:39df1f05f6a3bafe679006",
  measurementId: "G-LYFRB50BLH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

// Enable offline persistence for Firestore
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.log('Multiple tabs open, persistence can only be enabled in one tab at a time.');
  } else if (err.code === 'unimplemented') {
    console.log('The current browser does not support persistence.');
  }
});

// Set auth persistence
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log('Auth persistence set to local');
  })
  .catch((error) => {
    console.error('Auth persistence error:', error);
  });

// Log app initialization
logEvent(analytics, 'app_initialized', {
  timestamp: new Date().toISOString(),
  environment: process.env.NODE_ENV
});

console.log('Firebase initialized successfully');

export { app, analytics, db, storage, auth };