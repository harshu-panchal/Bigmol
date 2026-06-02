import admin from 'firebase-admin';

let firebaseApp = null;

const parseServiceAccount = () => {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (parsed?.private_key) {
      parsed.private_key = String(parsed.private_key).replace(/\\n/g, '\n');
    }
    return parsed;
  } catch (error) {
    console.error('[FCM] Invalid FIREBASE_SERVICE_ACCOUNT JSON:', error.message);
    return null;
  }
};

export const getFirebaseAdmin = () => {
  if (firebaseApp) return firebaseApp;
  if (admin.apps.length) {
    firebaseApp = admin.app();
    return firebaseApp;
  }

  const serviceAccount = parseServiceAccount();
  if (!serviceAccount) return null;

  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  return firebaseApp;
};

export const getMessaging = () => {
  const app = getFirebaseAdmin();
  return app ? admin.messaging(app) : null;
};

export default getFirebaseAdmin;
