/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { sendEmail } from './email';
import corsModule from 'cors';

const cors = corsModule({ origin: true });

admin.initializeApp();

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

export const sendTeamJoinRequest = functions.https.onRequest((request, response) => {
  return cors(request, response, async () => {
    try {
      // Get Authorization header
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        response.status(401).json({ error: 'unauthorized', message: 'No token provided' });
        return;
      }

      const idToken = authHeader.split('Bearer ')[1];
      try {
        await admin.auth().verifyIdToken(idToken);
      } catch (error) {
        response.status(401).json({ error: 'unauthorized', message: 'Invalid token' });
        return;
      }

      const { teamId, userEmail } = request.body;

      if (!teamId || !userEmail) {
        response.status(400).json({ 
          error: 'invalid-argument', 
          message: 'Відсутній ID команди або email користувача' 
        });
        return;
      }

      // Get team data
      const teamDoc = await admin.firestore().collection('teams').doc(teamId).get();
      const teamData = teamDoc.data();

      if (!teamDoc.exists || !teamData) {
        response.status(404).json({ 
          error: 'not-found', 
          message: 'Команду не знайдено' 
        });
        return;
      }

      // Get user data
      const userQuery = await admin.firestore().collection('users')
        .where('email', '==', userEmail)
        .limit(1)
        .get();

      if (userQuery.empty) {
        response.status(404).json({ 
          error: 'not-found', 
          message: 'Користувача не знайдено' 
        });
        return;
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

      response.json({ success: true, requestId: requestRef.id });
    } catch (error: any) {
      console.error('Error in sendTeamJoinRequest:', error);
      response.status(500).json({ 
        error: 'internal',
        message: error.message
      });
    }
  });
});
