import { registerAs } from '@nestjs/config';

export default registerAs('firebase', () => ({
  projectId: process.env.FIREBASE_PROJECT_ID,
  credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS,
}));
