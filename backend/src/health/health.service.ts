import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';

export interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  environment: string;
  dependencies: {
    firebase: {
      status: 'connected' | 'disconnected';
      message?: string;
    };
  };
  system: {
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    nodeVersion: string;
  };
}

@Injectable()
export class HealthService {
  constructor(private readonly firebaseService: FirebaseService) {}

  async getHealthStatus(): Promise<HealthStatus> {
    const firebaseStatus = await this.checkFirebaseConnection();
    const memoryUsage = process.memoryUsage();
    const totalMemory = memoryUsage.heapTotal;
    const usedMemory = memoryUsage.heapUsed;

    return {
      status: firebaseStatus.status === 'connected' ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      environment: process.env.NODE_ENV || 'development',
      dependencies: {
        firebase: firebaseStatus
      },
      system: {
        memory: {
          used: Math.round(usedMemory / 1024 / 1024), // MB
          total: Math.round(totalMemory / 1024 / 1024), // MB
          percentage: Math.round((usedMemory / totalMemory) * 100)
        },
        nodeVersion: process.version
      }
    };
  }

  private async checkFirebaseConnection(): Promise<{
    status: 'connected' | 'disconnected';
    message?: string;
  }> {
    try {
      const firestore = this.firebaseService.getFirestore();

      // Try to read from a collection to verify connection
      // Use a lightweight operation
      await firestore.collection('expenses').limit(1).get();

      return {
        status: 'connected',
        message: 'Firestore connection successful'
      };
    } catch (error) {
      return {
        status: 'disconnected',
        message: error.message || 'Failed to connect to Firestore'
      };
    }
  }
}
