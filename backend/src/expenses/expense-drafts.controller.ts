import { Controller, Delete, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ExpenseDraftsService } from './expense-drafts.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/firebase-auth.guard';

@ApiTags('expense-drafts')
@ApiBearerAuth()
@Controller('expense-drafts')
export class ExpenseDraftsController {
  constructor(private readonly draftsService: ExpenseDraftsService) {}

  @Get()
  @ApiOperation({ summary: 'List MY pending expense drafts (other members never see them)' })
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.draftsService.findMine(user.uid);
  }

  @Post(':id/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm a draft: creates the real expense and removes the draft' })
  @ApiResponse({ status: 200, description: 'Created expense' })
  confirm(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.draftsService.confirm(id, user.uid);
  }

  @Post('confirm-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm all my drafts' })
  confirmAll(@CurrentUser() user: AuthenticatedUser) {
    return this.draftsService.confirmAll(user.uid);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Discard a draft without recording an expense' })
  discard(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.draftsService.discard(id, user.uid);
  }
}
