import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { BackupService } from './backup.service';

@ApiTags('backup')
@Controller('backup')
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Get('json')
  @ApiOperation({
    summary: 'Full JSON backup',
    description:
      'Exports every expense, income and budget with no filters as a single downloadable JSON file. Intended for manual, one-click backups.'
  })
  @ApiResponse({ status: 200, description: 'JSON backup file' })
  async exportJson(@Res() res: Response) {
    const backup = await this.backupService.buildFullBackup();
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="troskic-backup-${new Date().toISOString().slice(0, 10)}.json"`);
    res.send(JSON.stringify(backup, null, 2));
  }
}
