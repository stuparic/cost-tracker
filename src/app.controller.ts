import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('API Info')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Get API information' })
  @ApiResponse({
    status: 200,
    description: 'API information and available endpoints',
  })
  getApiInfo() {
    return this.appService.getApiInfo();
  }
}
