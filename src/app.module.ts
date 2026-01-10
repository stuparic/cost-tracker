import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FirebaseModule } from './firebase/firebase.module';
import { ExpensesModule } from './expenses/expenses.module';
import { AutocompleteModule } from './autocomplete/autocomplete.module';
import firebaseConfig from './config/firebase.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [firebaseConfig],
    }),
    FirebaseModule,
    ExpensesModule,
    AutocompleteModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
