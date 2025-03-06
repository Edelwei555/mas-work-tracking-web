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

// Логуємо конфігурацію для перевірки
console.log('Firebase конфігурація:', {
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId
});

const app = initializeApp(firebaseConfig);
console.log('Firebase успішно ініціалізовано');

const auth: Auth = getAuth(app);
console.log('Auth сервіс ініціалізовано');

const db: Firestore = getFirestore(app);
console.log('Firestore сервіс ініціалізовано');

export { auth, db };
export default app; 