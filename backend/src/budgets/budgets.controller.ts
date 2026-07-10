import { Controller, Get, Put, Body, Param, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { BudgetsService } from './budgets.service';
import { UpsertBudgetDto } from './dto/upsert-budget.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import { requireHousehold, type AuthenticatedUser } from '../auth/firebase-auth.guard';

@ApiTags('budgets')
@Controller('budgets')
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all category budgets',
    description: 'Retrieves the monthly spending limit configured for each category'
  })
  @ApiResponse({ status: 200, description: 'List of category budgets' })
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.budgetsService.findAll(requireHousehold(user));
  }

  @Put(':category')
  @ApiOperation({
    summary: 'Set (create or update) the monthly limit for a category',
    description: 'Creates the budget for this category if it does not exist yet, otherwise updates its limit'
  })
  @ApiParam({ name: 'category', description: 'Expense category' })
  @ApiResponse({ status: 200, description: 'Budget successfully set' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  setLimit(@Param('category') category: string, @Body() upsertBudgetDto: UpsertBudgetDto, @CurrentUser() user: AuthenticatedUser) {
    return this.budgetsService.setLimit(requireHousehold(user), category, upsertBudgetDto.monthlyLimit);
  }

  @Delete(':category')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove the budget for a category',
    description: 'Deletes the configured monthly limit for this category'
  })
  @ApiParam({ name: 'category', description: 'Expense category' })
  @ApiResponse({ status: 204, description: 'Budget successfully removed' })
  @ApiResponse({ status: 404, description: 'Budget not found' })
  remove(@Param('category') category: string, @CurrentUser() user: AuthenticatedUser) {
    return this.budgetsService.remove(requireHousehold(user), category);
  }
}
