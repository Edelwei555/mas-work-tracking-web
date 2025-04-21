import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getDatabase, connectDatabaseEmulator } from 'firebase/database';

// Перевіряємо наявність всіх необхідних змінних середовища
const requiredEnvVars = [
  'REACT_APP_FIREBASE_API_KEY',
  'REACT_APP_FIREBASE_AUTH_DOMAIN',
  'REACT_APP_FIREBASE_PROJECT_ID',
  'REACT_APP_FIREBASE_STORAGE_BUCKET',
  'REACT_APP_FIREBASE_MESSAGING_SENDER_ID',
  'REACT_APP_FIREBASE_APP_ID',
  'REACT_APP_FIREBASE_DATABASE_URL'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL
};

// Ініціалізуємо Firebase з обробкою помилок
let app;
try {
  app = initializeApp(firebaseConfig);
  console.log('Firebase успішно ініціалізовано');
} catch (error) {
  console.error('Помилка ініціалізації Firebase:', error);
  throw new Error('Не вдалося ініціалізувати Firebase. Перевірте конфігурацію.');
}

// Ініціалізуємо сервіси
const auth = getAuth(app);
const db = getFirestore(app);
const database = getDatabase(app);

// Використовуємо емулятори для локальної розробки
if (process.env.NODE_ENV === 'development') {
  try {
    connectAuthEmulator(auth, 'http://localhost:9099');
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectDatabaseEmulator(database, 'localhost', 9000);
    console.log('Емулятори Firebase підключено');
  } catch (error) {
    console.warn('Не вдалося підключити емулятори Firebase:', error);
  }
}

export { auth, db, database }; 