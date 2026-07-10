import { BadRequestException, Body, Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { StatementsService } from './statements.service';
import { ImportStatementDto } from './dto/import-statement.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import { requireHousehold, type AuthenticatedUser } from '../auth/firebase-auth.guard';

function ctxOf(user: AuthenticatedUser) {
  return { householdId: requireHousehold(user), uid: user.uid, displayName: user.displayName };
}

const MAX_STATEMENT_SIZE_BYTES = 15 * 1024 * 1024;

@ApiTags('statements')
@Controller('statements')
export class StatementsController {
  constructor(private readonly statementsService: StatementsService) {}

  @Post('parse')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_STATEMENT_SIZE_BYTES } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Parse an uploaded bank statement PDF',
    description:
      'Extracts transactions from the PDF and flags duplicates against already-recorded expenses (by bank reference, then by amount + date proximity).'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } }
    }
  })
  async parse(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: AuthenticatedUser) {
    if (!file) {
      throw new BadRequestException('No file uploaded (expected multipart field "file")');
    }
    if (file.mimetype !== 'application/pdf' && !file.originalname?.toLowerCase().endsWith('.pdf')) {
      throw new BadRequestException('Only PDF bank statements are supported');
    }

    try {
      return await this.statementsService.parseAndMatch(file.buffer, ctxOf(user));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to parse the statement';
      throw new BadRequestException(message);
    }
  }

  @Post('import')
  @ApiOperation({
    summary: 'Import reviewed statement transactions as expenses/incomes',
    description:
      'Creates an expense for each debit and an income for each credit. Transactions whose bank reference was already imported are skipped.'
  })
  async import(@Body() dto: ImportStatementDto, @CurrentUser() user: AuthenticatedUser) {
    return this.statementsService.import(dto, ctxOf(user));
  }
}
