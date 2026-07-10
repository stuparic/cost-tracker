import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Res, HttpCode, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ExpensesService } from './expenses.service';
import { CreateExpenseManualDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { QueryExpensesDto } from './dto/query-expenses.dto';
import { ExportExpensesDto } from './dto/export-expenses.dto';

@ApiTags('expenses')
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new expense',
    description: 'Creates a new expense record. Automatically calculates the amount in both EUR and RSD based on the currency provided.'
  })
  @ApiResponse({
    status: 201,
    description: 'Expense successfully created'
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  create(@Body() createExpenseDto: CreateExpenseManualDto) {
    return this.expensesService.create(createExpenseDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all expenses',
    description: 'Retrieves a paginated list of expenses with optional filtering by category, shop, date range, etc.'
  })
  @ApiResponse({
    status: 200,
    description: 'List of expenses with pagination info'
  })
  findAll(@Query() query: QueryExpensesDto) {
    return this.expensesService.findAll(query);
  }

  @Get('export/csv')
  @ApiOperation({
    summary: 'Export expenses as CSV',
    description: 'Exports all expenses matching the given filters (no pagination) as a downloadable CSV file.'
  })
  @ApiResponse({ status: 200, description: 'CSV file' })
  async exportCsv(@Query() query: ExportExpensesDto, @Res() res: Response) {
    const csv = await this.expensesService.exportCsv(query);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="troskovi-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csv);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get expense by ID',
    description: 'Retrieves a single expense by its ID'
  })
  @ApiParam({ name: 'id', description: 'Expense ID' })
  @ApiResponse({ status: 200, description: 'Expense found' })
  @ApiResponse({ status: 404, description: 'Expense not found' })
  findOne(@Param('id') id: string) {
    return this.expensesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update expense',
    description: 'Updates an existing expense. If amount or currency is changed, recalculates both currency amounts.'
  })
  @ApiParam({ name: 'id', description: 'Expense ID' })
  @ApiResponse({ status: 200, description: 'Expense successfully updated' })
  @ApiResponse({ status: 404, description: 'Expense not found' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  update(@Param('id') id: string, @Body() updateExpenseDto: UpdateExpenseDto) {
    return this.expensesService.update(id, updateExpenseDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete expense',
    description: 'Deletes an expense by its ID'
  })
  @ApiParam({ name: 'id', description: 'Expense ID' })
  @ApiResponse({ status: 204, description: 'Expense successfully deleted' })
  @ApiResponse({ status: 404, description: 'Expense not found' })
  remove(@Param('id') id: string) {
    return this.expensesService.remove(id);
  }
}
