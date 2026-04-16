import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
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

export { db, storage, auth, analytics };
export default app;