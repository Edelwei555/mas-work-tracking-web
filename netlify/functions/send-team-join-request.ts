import { Handler } from '@netlify/functions';
import * as nodemailer from 'nodemailer';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Ініціалізуємо Firebase Admin тільки якщо ще не ініціалізовано
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

// Налаштування транспорту для nodemailer
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
  // Перевіряємо метод
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { teamId, email } = JSON.parse(event.body || '{}');

    // Перевіряємо обов'язкові параметри
    if (!teamId || !email) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Team ID and email are required' }),
      };
    }

    // Отримуємо інформацію про команду
    const teamDoc = await db.collection('teams').doc(teamId).get();
    if (!teamDoc.exists) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Team not found' }),
      };
    }

    const team = teamDoc.data();

    // Перевіряємо чи користувач вже є членом команди
    const memberQuery = await db.collection('teamMembers')
      .where('teamId', '==', teamId)
      .where('email', '==', email)
      .get();

    if (!memberQuery.empty) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'User is already a team member' }),
      };
    }

    // Створюємо URL для приєднання до команди
    const joinUrl = `${process.env.SITE_URL}/teams/${teamId}`;

    // Відправляємо email
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: `Запрошення приєднатися до команди ${team?.name}`,
      html: `
        <h2>Вас запрошено приєднатися до команди ${team?.name}</h2>
        <p>Для приєднання до команди перейдіть за посиланням нижче:</p>
        <p><a href="${joinUrl}">Приєднатися до команди</a></p>
        <p>Якщо ви не очікували це запрошення, просто проігноруйте цей лист.</p>
      `,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Invitation sent successfully' }),
    };
  } catch (error) {
    console.error('Error sending invitation:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to send invitation' }),
    };
  }
};

export { handler }; 