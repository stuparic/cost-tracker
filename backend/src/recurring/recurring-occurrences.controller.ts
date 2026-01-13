import { Controller, Post, Get, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { RecurringOccurrencesRepository } from './recurring-occurrences.repository';
import { CreateRecurringOccurrenceDto } from './dto/create-recurring-occurrence.dto';

@ApiTags('recurring-occurrences')
@Controller('recurring-occurrences')
export class RecurringOccurrencesController {
  constructor(private repository: RecurringOccurrencesRepository) {}

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
  async update(@Param('id') id: string, @Body() updates: any) {
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
