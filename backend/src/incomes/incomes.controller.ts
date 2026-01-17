import { Controller, Get, Post, Body, Patch, Param, Delete, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { IncomesService } from './incomes.service';
import { CreateIncomeDto } from './dto/create-income.dto';
import { UpdateIncomeDto } from './dto/update-income.dto';
import { QueryIncomesDto } from './dto/query-incomes.dto';

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
  create(@Body() createIncomeDto: CreateIncomeDto) {
    return this.incomesService.create(createIncomeDto);
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
  findAll(@Query() query: QueryIncomesDto) {
    return this.incomesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get income by ID',
    description: 'Retrieves a single income by its ID'
  })
  @ApiParam({ name: 'id', description: 'Income ID' })
  @ApiResponse({ status: 200, description: 'Income found' })
  @ApiResponse({ status: 404, description: 'Income not found' })
  findOne(@Param('id') id: string) {
    return this.incomesService.findOne(id);
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
  update(@Param('id') id: string, @Body() updateIncomeDto: UpdateIncomeDto) {
    return this.incomesService.update(id, updateIncomeDto);
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
  remove(@Param('id') id: string) {
    return this.incomesService.remove(id);
  }
}
