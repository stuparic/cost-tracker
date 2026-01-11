import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getApiInfo() {
    return {
      name: 'Cost Tracker API',
      version: '1.0.1',
      description: 'Track home expenses with dual currency support (EUR/RSD)',
      docs: '/api',
      endpoints: {
        expenses: '/expenses',
        autocomplete: '/autocomplete',
        health: '/health',
      },
      features: [
        'Dual currency support (EUR/RSD)',
        'Intelligent autocomplete',
        'Firebase Firestore integration',
        'Automatic currency conversion',
      ],
    };
  }
}
