/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { sendEmail } from './email';

admin.initializeApp();

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

export const sendTeamJoinRequest = functions.https.onRequest(async (req, res) => {
  try {
    // Перевірка автентифікації
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new functions.https.HttpsError('unauthenticated', 'Необхідна автентифікація');
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const userId = decodedToken.uid;

    // Отримання даних запиту
    const { requestId, teamId } = req.body;
    if (!requestId || !teamId) {
      throw new functions.https.HttpsError('invalid-argument', 'Відсутні обов\'язкові параметри');
    }

    // Отримання даних запиту на приєднання
    const requestDoc = await admin.firestore()
      .collection('teamJoinRequests')
      .doc(requestId)
      .get();

    if (!requestDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Запит не знайдено');
    }

    const requestData = requestDoc.data();
    if (!requestData) {
      throw new functions.https.HttpsError('not-found', 'Дані запиту відсутні');
    }

    // Отримання даних команди
    const teamDoc = await admin.firestore()
      .collection('teams')
      .doc(teamId)
      .get();

    if (!teamDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Команду не знайдено');
    }

    const teamData = teamDoc.data();
    if (!teamData) {
      throw new functions.https.HttpsError('not-found', 'Дані команди відсутні');
    }

    // Отримання даних користувача
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(userId)
      .get();

    if (!userDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Користувача не знайдено');
    }

    const userData = userDoc.data();
    if (!userData) {
      throw new functions.https.HttpsError('not-found', 'Дані користувача відсутні');
    }

    // Відправка email адміністратору команди
    await sendEmail({
      to: teamData.adminEmail,
      subject: 'Новий запит на приєднання до команди',
      html: `
        <h2>Новий запит на приєднання до команди</h2>
        <p>Користувач ${userData.displayName} (${userData.email}) хоче приєднатися до команди "${teamData.name}".</p>
        <p>Щоб переглянути запит, перейдіть за посиланням: <a href="${process.env.SITE_URL}/teams/${teamId}/requests/${requestId}">Переглянути запит</a></p>
      `
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error sending team join request:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', 'Помилка при обробці запиту');
  }
});
