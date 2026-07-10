import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route as accessible without a Firebase ID token.
 * Used for health checks, the webhook (own shared-secret) and the cron endpoint (own secret).
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
