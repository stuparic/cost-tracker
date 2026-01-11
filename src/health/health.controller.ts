import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Comprehensive health check with Firebase connectivity' })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy with all dependencies operational',
  })
  @ApiResponse({
    status: 503,
    description: 'Service is unhealthy or dependencies are unavailable',
  })
  async check() {
    return this.healthService.getHealthStatus();
  }
}
