import { Injectable, Logger } from '@nestjs/common';
import { VoiceParseDto } from './dto/voice-parse.dto';

@Injectable()
export class VoiceService {
  private readonly logger = new Logger(VoiceService.name);

  /**
   * Process voice input transcription
   * For now, just log the received text to console
   * TODO: Integrate with AI service (Claude Haiku) to:
   * - Determine if it's expense or income
   * - Extract: amount, currency, shop/source name, category, date
   * - Return structured data to auto-fill forms
   */
  async parseVoiceInput(dto: VoiceParseDto) {
    this.logger.log('='.repeat(50));
    this.logger.log('Voice input received:');
    this.logger.log(`Text: "${dto.text}"`);
    this.logger.log(`Timestamp: ${new Date().toISOString()}`);
    this.logger.log('AI will determine: expense/income + extract data');
    this.logger.log('='.repeat(50));

    return {
      receivedText: dto.text,
      timestamp: new Date().toISOString(),
      message: 'Voice input logged successfully (AI parsing not yet implemented)',
    };
  }
}