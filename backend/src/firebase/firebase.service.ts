import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { Firestore } from '@google-cloud/firestore';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private firestore: Firestore;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const projectId = this.configService.get<string>('firebase.projectId');
    const isProduction = this.configService.get<boolean>('firebase.isProduction');

    if (!projectId) {
      throw new Error('FIREBASE_PROJECT_ID is not set');
    }

    if (!admin.apps.length) {
      // Production (Cloud Run): Use Application Default Credentials (FREE)
      // Local Dev: Use service account JSON file
      const credential = isProduction
        ? admin.credential.applicationDefault()
        : admin.credential.cert(this.configService.get<string>('firebase.credentialsPath'));

      admin.initializeApp({
        credential: credential,
        projectId: projectId
      });
    }

    this.firestore = admin.firestore();
    this.firestore.settings({ ignoreUndefinedProperties: true });
    this.logger.log('Firebase Admin initialized successfully');
  }

  getFirestore(): Firestore {
    return this.firestore;
  }
}
