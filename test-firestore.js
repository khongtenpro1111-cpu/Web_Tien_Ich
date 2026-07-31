import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

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
  const tasks = await getDocs(collection(db, "tasks"));
  console.log("Tasks count:", tasks.size);
  tasks.forEach(d => console.log(d.id, d.data()));
}
check();
