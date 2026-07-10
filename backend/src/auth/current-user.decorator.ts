import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedUser } from './firebase-auth.guard';

/** Injects the authenticated Firebase user (set by FirebaseAuthGuard) into a handler parameter. */
export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext): AuthenticatedUser => {
  const request = context.switchToHttp().getRequest();
  return request.user;
});
