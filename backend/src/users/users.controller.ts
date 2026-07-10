import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';
import { UsersService } from './users.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/firebase-auth.guard';

class JoinHouseholdDto {
  @IsString()
  @MinLength(4)
  code: string;
}

@ApiTags('users')
@ApiBearerAuth()
@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Profile + household for the signed-in user (created on first sign-in)' })
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getOrCreateMe(user);
  }

  @Post('households/join')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Join a household using its invite code' })
  join(@CurrentUser() user: AuthenticatedUser, @Body() dto: JoinHouseholdDto) {
    return this.usersService.joinHousehold(user, dto.code);
  }

  @Post('households/regenerate-invite')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate a fresh invite code for the caller household' })
  regenerate(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.regenerateInviteCode(user);
  }
}
