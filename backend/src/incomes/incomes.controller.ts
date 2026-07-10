import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Res, HttpCode, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { IncomesService } from './incomes.service';
import { CreateIncomeDto } from './dto/create-income.dto';
import { UpdateIncomeDto } from './dto/update-income.dto';
import { QueryIncomesDto } from './dto/query-incomes.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import { requireHousehold, type AuthenticatedUser } from '../auth/firebase-auth.guard';

function ctxOf(user: AuthenticatedUser) {
  return { householdId: requireHousehold(user), uid: user.uid, displayName: user.displayName };
}
import { ExportIncomesDto } from './dto/export-incomes.dto';

@ApiTags('incomes')
@Controller('incomes')
export class IncomesController {
  constructor(private readonly incomesService: IncomesService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new income',
    description: 'Creates a new income record. Automatically calculates the amount in both EUR and RSD based on the currency provided.'
  })
  @ApiResponse({
    status: 201,
    description: 'Income successfully created'
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  create(@Body() createIncomeDto: CreateIncomeDto, @CurrentUser() user: AuthenticatedUser) {
    return this.incomesService.create(createIncomeDto, ctxOf(user));
  }

  @Get()
  @ApiOperation({
    summary: 'Get all incomes',
    description: 'Retrieves a paginated list of incomes with optional filtering by type, source, date range, etc.'
  })
  @ApiResponse({
    status: 200,
    description: 'List of incomes with pagination info'
  })
  findAll(@Query() query: QueryIncomesDto, @CurrentUser() user: AuthenticatedUser) {
    return this.incomesService.findAll(query, ctxOf(user));
  }

  @Get('export/csv')
  @ApiOperation({
    summary: 'Export incomes as CSV',
    description: 'Exports all incomes matching the given filters (no pagination) as a downloadable CSV file.'
  })
  @ApiResponse({ status: 200, description: 'CSV file' })
  async exportCsv(@Query() query: ExportIncomesDto, @Res() res: Response, @CurrentUser() user: AuthenticatedUser) {
    const csv = await this.incomesService.exportCsv(query, ctxOf(user));
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="prihodi-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csv);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get income by ID',
    description: 'Retrieves a single income by its ID'
  })
  @ApiParam({ name: 'id', description: 'Income ID' })
  @ApiResponse({ status: 200, description: 'Income found' })
  @ApiResponse({ status: 404, description: 'Income not found' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.incomesService.findOne(id, ctxOf(user));
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update income',
    description: 'Updates an existing income. If amount or currency is changed, recalculates both currency amounts.'
  })
  @ApiParam({ name: 'id', description: 'Income ID' })
  @ApiResponse({ status: 200, description: 'Income successfully updated' })
  @ApiResponse({ status: 404, description: 'Income not found' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  update(@Param('id') id: string, @Body() updateIncomeDto: UpdateIncomeDto, @CurrentUser() user: AuthenticatedUser) {
    return this.incomesService.update(id, updateIncomeDto, ctxOf(user));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete income',
    description: 'Deletes an income by its ID'
  })
  @ApiParam({ name: 'id', description: 'Income ID' })
  @ApiResponse({ status: 204, description: 'Income successfully deleted' })
  @ApiResponse({ status: 404, description: 'Income not found' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.incomesService.remove(id, ctxOf(user));
  }
}
