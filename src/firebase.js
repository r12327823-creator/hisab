import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, updateDoc, doc, query, orderBy } from 'firebase/firestore';

const firebaseConfig = {
  // Replace with your Firebase config
  // Get this from Firebase Console → Project Settings → General → Your apps
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db, collection, addDoc, getDocs, updateDoc, doc, query, orderBy };
