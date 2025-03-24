import { Handler } from '@netlify/functions';
import * as nodemailer from 'nodemailer';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as crypto from 'crypto';

// Ініціалізуємо Firebase Admin тільки якщо ще не ініціалізовано
if (!getApps().length) {
  try {
    console.log('Initializing Firebase Admin...');
    
    // Логуємо наявність змінних середовища
    console.log('Environment variables check:', {
      FIREBASE_PROJECT_ID: !!process.env.FIREBASE_PROJECT_ID,
      REACT_APP_FIREBASE_PROJECT_ID: !!process.env.REACT_APP_FIREBASE_PROJECT_ID,
      FIREBASE_CLIENT_EMAIL: !!process.env.FIREBASE_CLIENT_EMAIL,
      FIREBASE_PRIVATE_KEY: !!process.env.FIREBASE_PRIVATE_KEY,
    });
    
    // Використовуємо React змінні середовища, якщо основні не знайдено
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.REACT_APP_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    console.log('Credential values:', {
      projectId,
      clientEmail: clientEmail ? 'Present' : 'Missing',
      privateKey: privateKey ? 'Present' : 'Missing'
    });

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error('Missing Firebase credentials. Required: projectId, clientEmail, privateKey');
    }

    const credentials = {
      projectId,
      clientEmail,
      privateKey,
    };

    console.log('Initializing with credentials:', {
      ...credentials,
      privateKey: 'Present'
    });

    initializeApp({
      credential: cert(credentials),
    });
    console.log('Firebase Admin initialized successfully');
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    throw error;
  }
}

const db = getFirestore();

// Налаштування транспорту для nodemailer
const createTransporter = () => {
  console.log('Creating SendGrid transport with config:', {
    auth: {
      user: 'apikey',
      pass: process.env.SMTP_PASS ? 'Present' : 'Missing'
    }
  });

  return nodemailer.createTransport({
    host: 'smtp.sendgrid.net',
    port: 587,
    secure: false,
    auth: {
      user: 'apikey',
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

const handler: Handler = async (event) => {
  console.log('Function invoked with event method:', event.httpMethod);
  
  // Додаємо CORS заголовки
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Обробляємо OPTIONS запит для CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Перевіряємо метод
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    console.log('Request body:', event.body);
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
        headers,
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
        headers,
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
        headers,
        body: JSON.stringify({ error: 'User is already a team member' }),
      };
    }

    // Генеруємо унікальний токен для запрошення
    const inviteToken = crypto.randomBytes(32).toString('hex');
    console.log('Generated invite token');

    // Створюємо запис про запрошення
    await db.collection('teamJoinRequests').add({
      teamId,
      email,
      status: 'pending',
      createdAt: new Date().toISOString(),
      teamName: team?.name,
      token: inviteToken
    });
    console.log('Created team join request record');

    // Створюємо URL для приєднання до команди з токеном
    const joinUrl = `${process.env.SITE_URL}/join/${inviteToken}`;
    console.log('Join URL:', joinUrl);

    // Відправляємо email
    console.log('Sending email invitation');
    const transporter = createTransporter();

    console.log('Attempting to send email:', {
      from: process.env.SMTP_FROM,
      to: email,
      subject: `Запрошення приєднатися до команди ${team?.name}`
    });

    await transporter.verify();
    console.log('SMTP connection verified');

    const info = await transporter.sendMail({
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
    console.log('Email sent successfully:', info);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'Invitation sent successfully' }),
    };
  } catch (error) {
    console.error('Error in function:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      name: error.name,
    });
    console.log('Environment variables status:', {
      FIREBASE_PROJECT_ID: !!process.env.FIREBASE_PROJECT_ID,
      FIREBASE_CLIENT_EMAIL: !!process.env.FIREBASE_CLIENT_EMAIL,
      FIREBASE_PRIVATE_KEY: !!process.env.FIREBASE_PRIVATE_KEY,
      SMTP_HOST: !!process.env.SMTP_HOST,
      SMTP_PORT: !!process.env.SMTP_PORT,
      SMTP_USER: !!process.env.SMTP_USER,
      SMTP_PASS: !!process.env.SMTP_PASS,
      SMTP_FROM: !!process.env.SMTP_FROM,
      SITE_URL: !!process.env.SITE_URL,
    });
    
    return {
      statusCode: 500,
      headers,
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