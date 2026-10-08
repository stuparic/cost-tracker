import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { requireHousehold, type AuthenticatedUser } from '../auth/firebase-auth.guard';
import { ReportsService } from './reports.service';
import { UpdateReportCategoryDto } from './dto/update-report-category.dto';

function ctxOf(user: AuthenticatedUser) {
  return { householdId: requireHousehold(user), uid: user.uid, displayName: user.displayName };
}

const MAX_STATEMENT_SIZE_BYTES = 15 * 1024 * 1024;

@ApiTags('reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post('statements')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_STATEMENT_SIZE_BYTES } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Store a monthly bank statement PDF for the reports',
    description:
      'Parses every account and row of the statement, verifies them against the printed balances and stores them. Re-uploading a month replaces it.'
  })
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  upload(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: AuthenticatedUser) {
    if (!file) {
      throw new BadRequestException('No file uploaded (expected multipart field "file")');
    }
    if (file.mimetype !== 'application/pdf' && !file.originalname?.toLowerCase().endsWith('.pdf')) {
      throw new BadRequestException('Only PDF bank statements are supported');
    }
    return this.reportsService.upload(file.buffer, file.originalname ?? null, ctxOf(user));
  }

  @Get('statements')
  @ApiOperation({ summary: 'List stored statements' })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.reportsService.list(ctxOf(user));
  }

  @Delete('statements/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a stored statement' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.reportsService.remove(id, ctxOf(user));
  }

  @Get('year/:year')
  @ApiOperation({ summary: 'Year overview: imported/missing months, totals and year-level suggestions' })
  year(@Param('year', ParseIntPipe) year: number, @CurrentUser() user: AuthenticatedUser) {
    return this.reportsService.year(year, ctxOf(user));
  }

  @Get('month/:period')
  @ApiOperation({ summary: 'Month report (period YYYY-MM): where the money went and suggestions' })
  month(@Param('period') period: string, @CurrentUser() user: AuthenticatedUser) {
    if (!/^\d{4}-\d{2}$/.test(period)) {
      throw new BadRequestException('Period must be YYYY-MM');
    }
    return this.reportsService.month(period, ctxOf(user));
  }

  @Patch('categories')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Correct the category of a statement row or of a merchant',
    description: 'Corrections are applied when reports are built, so a merchant correction re-categorizes every month.'
  })
  updateCategory(@Body() dto: UpdateReportCategoryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.reportsService.updateCategory(dto, ctxOf(user));
  }
}
