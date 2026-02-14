import { registerAs } from '@nestjs/config';

export default registerAs('firebase', () => ({
  projectId: process.env.FIREBASE_PROJECT_ID,
  isProduction: process.env.NODE_ENV === 'production',
  // Only used in local development
  credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS || './serviceAccountKey.json'
}));
