import { Controller, Post, Get, Patch, Delete, Body, Param, Query, Headers, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { RecurringOccurrencesRepository } from './recurring-occurrences.repository';
import { RecurringService } from './recurring.service';
import { CreateRecurringOccurrenceDto } from './dto/create-recurring-occurrence.dto';
import { UpdateRecurringOccurrenceDto } from './dto/update-recurring-occurrence.dto';

@ApiTags('recurring-occurrences')
@Controller('recurring-occurrences')
export class RecurringOccurrencesController {
  constructor(
    private repository: RecurringOccurrencesRepository,
    private recurringService: RecurringService
  ) {}

  @Post('process-due')
  @ApiOperation({
    summary: 'Process all due recurring occurrences',
    description:
      'Invoked by Cloud Scheduler (in-process cron does not fire on scale-to-zero Cloud Run). Creates one record per missed period, dated with its occurrence date. Guarded by the x-cron-secret header when CRON_SECRET is configured.'
  })
  @ApiHeader({ name: 'x-cron-secret', required: false })
  async processDue(@Headers('x-cron-secret') cronSecret?: string) {
    const expected = process.env.CRON_SECRET;
    if (expected && cronSecret !== expected) {
      throw new UnauthorizedException('Invalid cron secret');
    }
    return this.recurringService.processRecurringOccurrences();
  }

  @Post()
  @ApiOperation({ summary: 'Create a new recurring occurrence template' })
  async create(@Body() dto: CreateRecurringOccurrenceDto) {
    return this.repository.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all recurring occurrences for a user' })
  async findAll(@Query('userId') userId: string) {
    return this.repository.findAll(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a recurring occurrence by ID' })
  async findOne(@Param('id') id: string) {
    return this.repository.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a recurring occurrence (e.g., disable)' })
  async update(@Param('id') id: string, @Body() updates: UpdateRecurringOccurrenceDto) {
    await this.repository.update(id, updates);
    return { success: true };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a recurring occurrence template' })
  async delete(@Param('id') id: string) {
    await this.repository.delete(id);
    return { success: true };
  }
}
