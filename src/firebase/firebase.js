import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

export const firebaseConfig = {
  apiKey: "AIzaSyA0MVMzBetsqBRY3z6wteNJznaSmznmMa8",
  authDomain: "flaxcouriers.firebaseapp.com",
  projectId: "flaxcouriers",
  storageBucket: "flaxcouriers.firebasestorage.app",
  messagingSenderId: "818356534738",
  appId: "1:818356534738:web:40f4485cf5764069665c0b",
  measurementId: "G-RRS7243HNH",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const analytics = getAnalytics(app);

// Secondary app: used to create shipper Firebase Auth accounts without
// signing the admin out of the primary session.
const secondaryApp = initializeApp(firebaseConfig, "secondary");
export const secondaryAuth = getAuth(secondaryApp);
