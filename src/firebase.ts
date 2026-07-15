import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBX3Eg86WBratvnn9-TyK2tjE9MrUy_Fww",
  authDomain: "gen-lang-client-0533483178.firebaseapp.com",
  projectId: "gen-lang-client-0533483178",
  storageBucket: "gen-lang-client-0533483178.firebasestorage.app",
  messagingSenderId: "35107440025",
  appId: "1:35107440025:web:0a4ff00dda667e0011bf08"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = initializeFirestore(app, {}, "ai-studio-57db957b-ec0e-485a-8a63-35a8288b9250");
