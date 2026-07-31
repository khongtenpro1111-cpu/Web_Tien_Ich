// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDBWVzIDXGRww3wFltUHxLjoxS1NPDRqhM",
  authDomain: "webtienich-dee48.firebaseapp.com",
  projectId: "webtienich-dee48",
  storageBucket: "webtienich-dee48.firebasestorage.app",
  messagingSenderId: "603736606221",
  appId: "1:603736606221:web:6ffe42b3ca311971eaf744"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
