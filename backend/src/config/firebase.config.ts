import { registerAs } from '@nestjs/config';

export default registerAs('firebase', () => ({
  projectId: process.env.FIREBASE_PROJECT_ID,
  // In production (Cloud Run), use the secret-mounted path
  // In development, use the local file
  credentialsPath:
    process.env.NODE_ENV === 'production'
      ? '/secrets/serviceAccountKey.json'
      : process.env.GOOGLE_APPLICATION_CREDENTIALS ||
        './serviceAccountKey.json',
}));
