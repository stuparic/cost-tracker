import { Controller, Post, Body } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { VoiceService } from './voice.service';
import { VoiceParseDto } from './dto/voice-parse.dto';

@ApiTags('Voice')
@Controller('voice')
export class VoiceController {
  constructor(private readonly voiceService: VoiceService) {}

  @Post('parse')
  @ApiOperation({
    summary: 'Parse voice input transcription',
    description: 'Receives transcribed text from Web Speech API and processes it',
  })
  @ApiResponse({
    status: 201,
    description: 'Voice input received and logged successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  async parseVoiceInput(@Body() dto: VoiceParseDto) {
    return this.voiceService.parseVoiceInput(dto);
  }
}