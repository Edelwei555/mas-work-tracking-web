import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { sendEmail } from './email';

export const sendTeamJoinRequest = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Потрібна автентифікація'
    );
  }

  const { requestId, teamId } = data;
  if (!requestId || !teamId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Відсутній ID запиту або команди'
    );
  }

  try {
    // Отримуємо дані запиту
    const requestDoc = await admin.firestore()
      .collection('teamJoinRequests')
      .doc(requestId)
      .get();

    if (!requestDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'Запит не знайдено'
      );
    }

    const request = requestDoc.data();
    if (!request) {
      throw new functions.https.HttpsError(
        'not-found',
        'Дані запиту відсутні'
      );
    }

    // Отримуємо дані команди
    const teamDoc = await admin.firestore()
      .collection('teams')
      .doc(teamId)
      .get();

    if (!teamDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'Команду не знайдено'
      );
    }

    const team = teamDoc.data();
    if (!team) {
      throw new functions.https.HttpsError(
        'not-found',
        'Дані команди відсутні'
      );
    }

    // Отримуємо email адміністратора команди
    const adminDoc = await admin.firestore()
      .collection('users')
      .doc(team.createdBy)
      .get();

    if (!adminDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'Адміністратора команди не знайдено'
      );
    }

    const adminData = adminDoc.data();
    if (!adminData || !adminData.email) {
      throw new functions.https.HttpsError(
        'not-found',
        'Email адміністратора відсутній'
      );
    }

    // Надсилаємо email адміністратору
    await sendEmail({
      to: adminData.email,
      subject: 'Новий запит на приєднання до команди',
      html: `
        <h2>Новий запит на приєднання до команди</h2>
        <p>Користувач ${request.userName} (${request.userEmail}) хоче приєднатися до команди "${team.name}".</p>
        <p>Щоб переглянути запит, перейдіть за посиланням: <a href="${process.env.SITE_URL}/teams/${teamId}/requests/${requestId}">Переглянути запит</a></p>
      `
    });

    return { success: true };
  } catch (error) {
    console.error('Error sending team join request:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Помилка при обробці запиту'
    );
  }
}); 