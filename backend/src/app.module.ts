import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FirebaseAuthGuard } from './auth/firebase-auth.guard';
import { UsersModule } from './users/users.module';
import { FirebaseModule } from './firebase/firebase.module';
import { ExpensesModule } from './expenses/expenses.module';
import { IncomesModule } from './incomes/incomes.module';
import { AutocompleteModule } from './autocomplete/autocomplete.module';
import { HealthModule } from './health/health.module';
import { RecurringModule } from './recurring/recurring.module';
import { VoiceModule } from './voice/voice.module';
import { StatementsModule } from './statements/statements.module';
import { WebhookModule } from './webhook/webhook.module';
import { BudgetsModule } from './budgets/budgets.module';
import { BackupModule } from './backup/backup.module';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import firebaseConfig from './config/firebase.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
      load: [firebaseConfig]
    }),
    FirebaseModule,
    ExpensesModule,
    IncomesModule,
    AutocompleteModule,
    HealthModule,
    RecurringModule,
    VoiceModule,
    StatementsModule,
    WebhookModule,
    BudgetsModule,
    BackupModule,
    UsersModule
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: FirebaseAuthGuard
    }
  ]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
