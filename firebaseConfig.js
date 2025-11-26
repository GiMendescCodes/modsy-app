// firebaseConfig.js
import { initializeApp } from "firebase/app";
import {
  initializeAuth,
  getReactNativePersistence,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyCs_bMXV0gwTT7y8QJgv-lZK127JWfPRcE",
  authDomain: "modsy-ia-app.firebaseapp.com",
  projectId: "modsy-ia-app",
  storageBucket: "modsy-ia-app.firebasestorage.app",
  messagingSenderId: "449116139523",
  appId: "1:449116139523:web:15379f94799e0468cd1e36",
};

const app = initializeApp(firebaseConfig);

const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

const db = getFirestore(app);
const functions = getFunctions(app);

// Exporte TUDO, inclusive o app, para evitar problemas em outros arquivos
export { app, auth, db, functions };