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

export const sendTeamJoinRequest = functions.https.onCall(async (data, context) => {
  try {
    // Check if user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Користувач не авторизований');
    }

    const { teamId, userEmail } = data;

    if (!teamId || !userEmail) {
      throw new functions.https.HttpsError('invalid-argument', 'Відсутній ID команди або email користувача');
    }

    // Get team data
    const teamDoc = await admin.firestore().collection('teams').doc(teamId).get();
    const teamData = teamDoc.data();

    if (!teamDoc.exists || !teamData) {
      throw new functions.https.HttpsError('not-found', 'Команду не знайдено');
    }

    // Get user data
    const userQuery = await admin.firestore().collection('users')
      .where('email', '==', userEmail)
      .limit(1)
      .get();

    if (userQuery.empty) {
      throw new functions.https.HttpsError('not-found', 'Користувача не знайдено');
    }

    const userData = userQuery.docs[0].data();
    const userId = userQuery.docs[0].id;

    // Create join request
    const requestRef = await admin.firestore().collection('teamJoinRequests').add({
      teamId,
      userId,
      userEmail: userData.email,
      userName: userData.displayName,
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Send email to team admin
    await sendEmail({
      to: teamData.adminEmail,
      subject: 'Новий запит на приєднання до команди',
      html: `
        <h2>Новий запит на приєднання до команди</h2>
        <p>Користувач ${userData.displayName} (${userData.email}) хоче приєднатися до команди "${teamData.name}".</p>
        <p>Щоб переглянути запит, перейдіть за посиланням: <a href="${process.env.SITE_URL}/teams/${teamId}/requests/${requestRef.id}">Переглянути запит</a></p>
      `
    });

    return { success: true, requestId: requestRef.id };
  } catch (error: any) {
    console.error('Error in sendTeamJoinRequest:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});
