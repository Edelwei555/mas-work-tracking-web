import { initializeApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

const firebaseConfig = {
  // TODO: Додати конфігурацію Firebase
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// Детальне логування конфігурації
console.log('Firebase повна конфігурація:', {
  apiKey: firebaseConfig.apiKey?.substring(0, 5) + '...',
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket,
  messagingSenderId: firebaseConfig.messagingSenderId,
  hasAppId: !!firebaseConfig.appId
});

console.log('Ініціалізація Firebase...');
const app = initializeApp(firebaseConfig);
console.log('Firebase успішно ініціалізовано');

console.log('Ініціалізація Auth...');
const auth: Auth = getAuth(app);
console.log('Auth сервіс ініціалізовано');

console.log('Ініціалізація Firestore...');
const db: Firestore = getFirestore(app);
console.log('Firestore сервіс ініціалізовано');

// Перевіряємо, чи всі сервіси правильно ініціалізовані
if (!auth) throw new Error('Auth не ініціалізовано');
if (!db) throw new Error('Firestore не ініціалізовано');

export { auth, db };
export default app; 