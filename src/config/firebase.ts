import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, Auth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getDatabase } from 'firebase/database';
import { ref, onValue } from 'firebase/database';

// Перевіряємо наявність всіх необхідних конфігурацій
const requiredConfigs = [
  'apiKey',
  'authDomain',
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId',
  'databaseURL'
];

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || 'mas-work-tracking-8c9b9.firebaseapp.com',
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || 'mas-work-tracking-8c9b9',
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL?.trim() || 'https://mas-work-tracking-8c9b9-default-rtdb.firebaseio.com'
};

const missingConfigs = requiredConfigs.filter(
  config => !firebaseConfig[config as keyof typeof firebaseConfig]
);

if (missingConfigs.length > 0) {
  throw new Error(`Відсутні необхідні конфігурації Firebase: ${missingConfigs.join(', ')}`);
}

// Детальне логування конфігурації
console.log('Firebase конфігурація:', {
  apiKey: firebaseConfig.apiKey?.substring(0, 5) + '...',
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket,
  messagingSenderId: firebaseConfig.messagingSenderId,
  appId: firebaseConfig.appId?.substring(0, 5) + '...',
  databaseURL: firebaseConfig.databaseURL,
  currentDomain: window.location.hostname,
  currentOrigin: window.location.origin,
  currentHref: window.location.href
});

// Перевірка наявності всіх env змінних
console.log('Перевірка змінних оточення:', {
  REACT_APP_FIREBASE_API_KEY: !!process.env.REACT_APP_FIREBASE_API_KEY,
  REACT_APP_FIREBASE_AUTH_DOMAIN: !!process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  REACT_APP_FIREBASE_PROJECT_ID: !!process.env.REACT_APP_FIREBASE_PROJECT_ID,
  REACT_APP_FIREBASE_STORAGE_BUCKET: !!process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  REACT_APP_FIREBASE_MESSAGING_SENDER_ID: !!process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  REACT_APP_FIREBASE_APP_ID: !!process.env.REACT_APP_FIREBASE_APP_ID,
  REACT_APP_FIREBASE_DATABASE_URL: !!process.env.REACT_APP_FIREBASE_DATABASE_URL
});

console.log('Ініціалізація Firebase...');
// Перевіряємо чи вже є ініціалізований екземпляр
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
console.log('Firebase успішно ініціалізовано');

console.log('Ініціалізація Auth...');
const auth = getAuth(app);

// Встановлюємо authDomain явно
if (auth.config) {
  auth.config.authDomain = firebaseConfig.authDomain;
  console.log('AuthDomain встановлено:', auth.config.authDomain);
}

// Додаємо додаткові налаштування для автентифікації
auth.useDeviceLanguage();

console.log('Auth сервіс ініціалізовано');

console.log('Ініціалізація Firestore...');
const db = getFirestore(app);
console.log('Firestore сервіс ініціалізовано');

console.log('Ініціалізація Realtime Database...');
const database = getDatabase(app);

// Перевіряємо підключення до бази даних
try {
  const testRef = ref(database, '.info/connected');
  onValue(testRef, (snapshot) => {
    const connected = snapshot.val();
    console.log('Realtime Database connection status:', connected ? 'connected' : 'disconnected');
  });
} catch (error) {
  console.error('Error checking Realtime Database connection:', error);
}

console.log('Realtime Database сервіс ініціалізовано');

console.log('Ініціалізація Functions...');
const functions = getFunctions(app, 'us-central1');
console.log('Functions сервіс ініціалізовано');

// Перевіряємо, чи всі сервіси правильно ініціалізовані
if (!auth) throw new Error('Auth не ініціалізовано');
if (!db) throw new Error('Firestore не ініціалізовано');
if (!database) throw new Error('Realtime Database не ініціалізовано');
if (!functions) throw new Error('Functions не ініціалізовано');

// Встановлюємо регіон для функцій (за замовчуванням us-central1)
// functions.region = 'us-central1';

export { auth, db, database, functions };
export default app; 