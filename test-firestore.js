import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, addDoc, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDBWVzIDXGRww3wFltUHxLjoxS1NPDRqhM",
  authDomain: "webtienich-dee48.firebaseapp.com",
  projectId: "webtienich-dee48",
  storageBucket: "webtienich-dee48.firebasestorage.app",
  messagingSenderId: "603736606221",
  appId: "1:603736606221:web:6ffe42b3ca311971eaf744"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  try {
    console.log("Reading columns...");
    const cols = await getDocs(collection(db, "columns"));
    console.log("Columns count:", cols.size);
    cols.forEach(d => console.log(d.id, d.data()));
  } catch (error) {
    console.error("Error during Firestore operations:", error);
  }
}
check();
