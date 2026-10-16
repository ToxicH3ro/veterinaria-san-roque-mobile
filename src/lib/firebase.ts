import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBS5FZImGRuKlO6G3esHC2rtsTddhTqPVw',
  authDomain: 'veterinaria-san-roque.firebaseapp.com',
  projectId: 'veterinaria-san-roque',
  storageBucket: 'veterinaria-san-roque.firebasestorage.app',
  messagingSenderId: '358287432264',
  appId: '1:358287432264:web:8ee3ea909258805bf9d67d',
  measurementId: 'G-4N2PR770LR',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export const db = getFirestore(app);

export default app;
