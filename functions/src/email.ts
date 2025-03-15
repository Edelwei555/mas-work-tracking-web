import * as functions from 'firebase-functions';
import * as nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: functions.config().smtp.host,
    port: functions.config().smtp.port,
    secure: false,
    auth: {
      user: functions.config().smtp.user,
      pass: functions.config().smtp.pass,
    },
  });

  try {
    await transporter.sendMail({
      from: functions.config().smtp.from,
      to: options.to,
      subject: options.subject,
      text: options.text,
    });
    console.log(`Email sent successfully to ${options.to}`);
  } catch (error) {
    console.error('Error sending email:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Помилка при відправці email'
    );
  }
} 