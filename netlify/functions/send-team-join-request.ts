import { Handler } from '@netlify/functions';
import * as nodemailer from 'nodemailer';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Ініціалізація Firebase Admin
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

// Налаштування транспорту для відправки email
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
  try {
    // Перевірка методу
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method not allowed' }),
      };
    }

    // Отримання даних з запиту
    const { requestId, teamId } = JSON.parse(event.body || '{}');
    
    if (!requestId || !teamId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' }),
      };
    }

    // Отримання даних про запит
    const requestDoc = await db.collection('teamJoinRequests').doc(requestId).get();
    if (!requestDoc.exists) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Request not found' }),
      };
    }

    const request = requestDoc.data();
    if (!request) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Request data is missing' }),
      };
    }
    
    // Отримання даних про команду
    const teamDoc = await db.collection('teams').doc(teamId).get();
    if (!teamDoc.exists) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Team not found' }),
      };
    }

    const team = teamDoc.data();
    if (!team) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Team data is missing' }),
      };
    }

    // Отримання адміністраторів команди
    const adminSnapshot = await db.collection('teamMembers')
      .where('teamId', '==', teamId)
      .where('role', '==', 'admin')
      .get();

    if (adminSnapshot.empty) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'No team administrators found' }),
      };
    }

    // Відправка email кожному адміністратору
    const emailPromises = adminSnapshot.docs.map(async (adminDoc) => {
      const admin = adminDoc.data();
      
      const approveUrl = `${process.env.SITE_URL}/team-requests/${requestId}?action=approve`;
      const rejectUrl = `${process.env.SITE_URL}/team-requests/${requestId}?action=reject`;

      const mailOptions = {
        from: process.env.SMTP_FROM,
        to: admin.email,
        subject: `Новий запит на приєднання до команди ${team.name}`,
        html: `
          <h2>Новий запит на приєднання до команди</h2>
          <p>Користувач ${request.userName} (${request.userEmail}) хоче приєднатися до команди ${team.name}.</p>
          <div style="margin: 20px 0;">
            <a href="${approveUrl}" style="
              background-color: #4CAF50;
              color: white;
              padding: 10px 20px;
              text-decoration: none;
              border-radius: 5px;
              margin-right: 10px;
            ">Підтвердити</a>
            <a href="${rejectUrl}" style="
              background-color: #f44336;
              color: white;
              padding: 10px 20px;
              text-decoration: none;
              border-radius: 5px;
            ">Відхилити</a>
          </div>
          <p>Або перейдіть за посиланням для управління запитами: ${process.env.SITE_URL}/team-requests</p>
        `,
      };

      await transporter.sendMail(mailOptions);
    });

    await Promise.all(emailPromises);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Emails sent successfully' }),
    };
  } catch (error) {
    console.error('Error sending team join request:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

export { handler }; 