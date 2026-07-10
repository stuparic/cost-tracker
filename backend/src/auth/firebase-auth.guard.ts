import { CanActivate, ExecutionContext, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as admin from 'firebase-admin';
import { IS_PUBLIC_KEY } from './public.decorator';
import { UsersRepository } from '../users/users.repository';

export interface AuthenticatedUser {
  uid: string;
  email?: string;
  name?: string;
  picture?: string;
  /** From the user profile (missing only before the first /me call) */
  householdId?: string;
  displayName?: string;
}

/**
 * Global guard: every route requires a valid Firebase ID token
 * (Authorization: Bearer <token>) unless marked with @Public().
 * On success it also attaches the profile's householdId so services
 * can scope every query to the caller's household.
 */
@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(FirebaseAuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly usersRepository: UsersRepository
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const header: string | undefined = request.headers?.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;

    if (!token) {
      throw new UnauthorizedException('Missing Authorization bearer token');
    }

    try {
      const decoded = await admin.auth().verifyIdToken(token);
      const profile = await this.usersRepository.findUserCached(decoded.uid);
      const user: AuthenticatedUser = {
        uid: decoded.uid,
        email: decoded.email,
        name: (decoded.name as string) || decoded.email,
        picture: decoded.picture,
        householdId: profile?.householdId,
        displayName: profile?.displayName || (decoded.name as string) || decoded.email
      };
      request.user = user;
      return true;
    } catch (error) {
      this.logger.warn(`Token verification failed: ${error instanceof Error ? error.message : error}`);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}

/** Throws unless the profile exists; returns the household id for scoping queries. */
export function requireHousehold(user: AuthenticatedUser): string {
  if (!user?.householdId) {
    throw new UnauthorizedException('Profil nije inicijalizovan — pozovi /me posle prijave');
  }
  return user.householdId;
}
