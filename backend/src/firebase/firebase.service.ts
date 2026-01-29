import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { Firestore } from '@google-cloud/firestore';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private firestore: Firestore;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const credentialsPath = this.configService.get<string>('firebase.credentialsPath');
    const projectId = this.configService.get<string>('firebase.projectId');

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(credentialsPath),
        projectId: projectId
      });
    }

    this.firestore = admin.firestore();
    this.firestore.settings({ ignoreUndefinedProperties: true });
    console.log('Firebase Admin initialized successfully');
  }

  getFirestore(): Firestore {
    return this.firestore;
  }
}
