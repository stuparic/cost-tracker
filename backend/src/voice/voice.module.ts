import { Module } from '@nestjs/common';
import { VoiceController } from './voice.controller';
import { VoiceService } from './voice.service';
import { GeminiService } from './gemini.service';
import { ExpensesModule } from '../expenses/expenses.module';
import { IncomesModule } from '../incomes/incomes.module';

@Module({
  imports: [ExpensesModule, IncomesModule],
  controllers: [VoiceController],
  providers: [VoiceService, GeminiService],
  exports: [VoiceService],
})
export class VoiceModule {}