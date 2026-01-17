import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { VoiceService } from './voice.service';
import { VoiceParseDto } from './dto/voice-parse.dto';

@ApiTags('Voice')
@Controller('voice')
export class VoiceController {
  constructor(private readonly voiceService: VoiceService) {}

  @Post('parse')
  @ApiOperation({
    summary: 'Parse voice transcript into expense or income data',
    description: 'Uses AI to extract structured data from Serbian voice transcripts'
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully parsed transcript',
    schema: {
      example: {
        success: true,
        type: 'expense',
        data: {
          amount: 250,
          currency: 'RSD',
          shopOrSource: 'Starbucks',
          description: 'Kupovina kafe',
          category: 'Dining',
          date: '2026-01-16'
        },
        confidence: 'high',
        originalTranscript: 'Kupio sam kafu u Starbucks za 250 dinara'
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Failed to parse',
    schema: {
      example: {
        success: false,
        message: 'Failed to parse voice input'
      }
    }
  })
  async parseVoiceInput(@Body() dto: VoiceParseDto) {
    return this.voiceService.parseVoiceInput(dto);
  }
}
