import { Handler } from '@netlify/functions';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import nodemailer from 'nodemailer';

// Ініціалізація Firebase Admin SDK
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = getFirestore();
const auth = getAuth();

// Конфігурація транспорту для надсилання email
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const handler: Handler = async (event) => {
  // Перевірка методу запиту
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Метод не підтримується' }),
    };
  }

  try {
    // Перевірка автентифікації
    const authHeader = event.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Необхідна автентифікація' }),
      };
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(idToken);
    const userId = decodedToken.uid;

    // Отримання даних запиту
    const { requestId, teamId } = JSON.parse(event.body || '{}');
    if (!requestId || !teamId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Відсутні обов\'язкові параметри' }),
      };
    }

    // Отримання даних запиту на приєднання
    const requestDoc = await db.collection('teamJoinRequests').doc(requestId).get();
    if (!requestDoc.exists) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Запит не знайдено' }),
      };
    }

    const requestData = requestDoc.data();
    if (!requestData) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Дані запиту відсутні' }),
      };
    }

    // Отримання даних команди
    const teamDoc = await db.collection('teams').doc(teamId).get();
    if (!teamDoc.exists) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Команду не знайдено' }),
      };
    }

    const teamData = teamDoc.data();
    if (!teamData) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Дані команди відсутні' }),
      };
    }

    // Отримання даних користувача
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Користувача не знайдено' }),
      };
    }

    const userData = userDoc.data();
    if (!userData) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Дані користувача відсутні' }),
      };
    }

    // Відправка email
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: teamData.adminEmail,
      subject: 'Новий запит на приєднання до команди',
      text: `
        Користувач ${userData.displayName} (${userData.email}) хоче приєднатися до команди ${teamData.name}.
        
        Щоб переглянути запит, перейдіть за посиланням:
        ${process.env.URL}/teams/${teamId}/requests/${requestId}
      `,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (error) {
    console.error('Error sending team join request:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Помилка при обробці запиту' }),
    };
  }
};

export { handler }; 