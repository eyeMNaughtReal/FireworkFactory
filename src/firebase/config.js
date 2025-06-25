// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDxR62GCGIazEc05Xv-UWNf6DZdSoB1Wa0",
  authDomain: "firework-factory.firebaseapp.com",
  projectId: "firework-factory",
  storageBucket: "firework-factory.appspot.com",
  messagingSenderId: "691307551582",
  appId: "1:691307551582:web:4b5a9462774a23bf148dcf",
  measurementId: "G-11CR88L576"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

export { app, analytics, db };
