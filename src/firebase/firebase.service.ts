import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { Firestore } from '@google-cloud/firestore';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private firestore: Firestore;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const credentialsPath = this.configService.get<string>(
      'firebase.credentialsPath',
    );
    const projectId = this.configService.get<string>('firebase.projectId');

    console.log('Initializing Firebase...');
    console.log('Credentials path:', credentialsPath);
    console.log('Project ID:', projectId);
    console.log('NODE_ENV:', process.env.NODE_ENV);

    try {
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert(credentialsPath),
          projectId: projectId,
        });
      }

      this.firestore = admin.firestore();
      console.log('Firebase Admin initialized successfully');
    } catch (error) {
      console.error('Firebase initialization failed:', error);
      throw error;
    }
  }

  getFirestore(): Firestore {
    return this.firestore;
  }
}
