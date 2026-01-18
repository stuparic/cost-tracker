import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VoiceParseDto {
  @ApiProperty({
    description: 'Transcribed text from voice input in Serbian',
    example: 'Kupio sam kafu za 250 dinara juče'
  })
  @IsString()
  text: string;

  @ApiProperty({
    description: 'Name of the user who created the voice input',
    example: 'Dejan'
  })
  @IsString()
  createdBy: string;
}
