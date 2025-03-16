import { Handler } from '@netlify/functions';
import * as nodemailer from 'nodemailer';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Ініціалізуємо Firebase Admin тільки якщо ще не ініціалізовано
if (!getApps().length) {
  try {
    console.log('Initializing Firebase Admin...');
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
    console.log('Firebase Admin initialized successfully');
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
    throw error;
  }
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
  console.log('Function invoked with event:', {
    method: event.httpMethod,
    body: event.body,
  });

  // Перевіряємо метод
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { teamId, email } = JSON.parse(event.body || '{}');
    console.log('Parsed request data:', { teamId, email });

    // Перевіряємо змінні середовища
    const envVars = {
      FIREBASE_PROJECT_ID: !!process.env.FIREBASE_PROJECT_ID,
      FIREBASE_CLIENT_EMAIL: !!process.env.FIREBASE_CLIENT_EMAIL,
      FIREBASE_PRIVATE_KEY: !!process.env.FIREBASE_PRIVATE_KEY,
      SMTP_HOST: !!process.env.SMTP_HOST,
      SMTP_PORT: !!process.env.SMTP_PORT,
      SMTP_USER: !!process.env.SMTP_USER,
      SMTP_PASS: !!process.env.SMTP_PASS,
      SMTP_FROM: !!process.env.SMTP_FROM,
      SITE_URL: !!process.env.SITE_URL,
    };
    console.log('Environment variables present:', envVars);

    // Перевіряємо обов'язкові параметри
    if (!teamId || !email) {
      console.log('Missing required fields');
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Team ID and email are required' }),
      };
    }

    // Отримуємо інформацію про команду
    console.log('Fetching team data for ID:', teamId);
    const teamDoc = await db.collection('teams').doc(teamId).get();
    if (!teamDoc.exists) {
      console.log('Team not found');
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Team not found' }),
      };
    }

    const team = teamDoc.data();
    console.log('Team data:', team);

    // Перевіряємо чи користувач вже є членом команди
    console.log('Checking if user is already a team member');
    const memberQuery = await db.collection('teamMembers')
      .where('teamId', '==', teamId)
      .where('email', '==', email)
      .get();

    if (!memberQuery.empty) {
      console.log('User is already a team member');
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'User is already a team member' }),
      };
    }

    // Створюємо URL для приєднання до команди
    const joinUrl = `${process.env.SITE_URL}/teams/${teamId}`;
    console.log('Join URL:', joinUrl);

    // Відправляємо email
    console.log('Sending email invitation');
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
    console.log('Email sent successfully');

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Invitation sent successfully' }),
    };
  } catch (error) {
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      name: error.name,
      envVars: {
        FIREBASE_PROJECT_ID: !!process.env.FIREBASE_PROJECT_ID,
        FIREBASE_CLIENT_EMAIL: !!process.env.FIREBASE_CLIENT_EMAIL,
        FIREBASE_PRIVATE_KEY: !!process.env.FIREBASE_PRIVATE_KEY,
        SMTP_HOST: !!process.env.SMTP_HOST,
        SMTP_PORT: !!process.env.SMTP_PORT,
        SMTP_USER: !!process.env.SMTP_USER,
        SMTP_PASS: !!process.env.SMTP_PASS,
        SMTP_FROM: !!process.env.SMTP_FROM,
        SITE_URL: !!process.env.SITE_URL,
      }
    });
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to send invitation',
        details: error.message,
        name: error.name,
        code: error.code
      }),
    };
  }
};

export { handler }; 