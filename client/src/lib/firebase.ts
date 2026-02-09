import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBk-mJmmrueR4W52hZfQrjlcxM95mLFrso",
  authDomain: "placementprime-a9713.firebaseapp.com",
  projectId: "placementprime-a9713",
  storageBucket: "placementprime-a9713.firebasestorage.app",
  messagingSenderId: "185897548804",
  appId: "1:185897548804:web:1f9c52403f876ed2a00951",
  measurementId: "G-CM3JM6BCH1"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;
