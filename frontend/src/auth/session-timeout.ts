import { signOut } from 'firebase/auth';
import { firebaseAuth } from '@/firebase';
import {
  IDLE_CHECK_INTERVAL_MS,
  clearActivity,
  consumeRestoredSessionVerdict,
  shouldEndSession
} from './idle-policy';

/**
 * Idle session policy: you sign in once and stay signed in while you keep using
 * the app; the session only ends after a full day with no authenticated API
 * calls.
 *
 * Why this exists: Firebase persists the session in localStorage and silently
 * refreshes ID tokens, and its refresh token does not expire on its own. So by
 * default a signed-in browser stays signed in forever - a household finance app
 * left open on a shared, borrowed or lost device stays open with it.
 *
 * "Activity" is deliberately an *authenticated API call*, not a mouse move or a
 * keypress: the point is to keep the session alive for someone actually using
 * their data, not for a tab idling in the background.
 *
 * The decision itself lives in idle-policy.ts; this module only applies it.
 */

export { IDLE_LIMIT_MS, touchActivity, clearActivity } from './idle-policy';

/**
 * Ends the session if it has gone idle. Returns true when it actually signed
 * the user out, so the caller can redirect.
 */
export async function signOutIfIdle(): Promise<boolean> {
  const user = firebaseAuth.currentUser;
  if (!shouldEndSession(user !== null)) return false;

  consumeRestoredSessionVerdict();
  clearActivity();
  await signOut(firebaseAuth);
  return true;
}

/**
 * Watches an already-open tab. Without this a tab left open overnight would go
 * on showing data until the next navigation; the interval catches it, and
 * `visibilitychange` catches the common "laptop reopened next morning" case
 * right away instead of up to a minute later.
 *
 * Returns a stop function.
 */
export function startIdleWatch(onExpired: () => void): () => void {
  let stopped = false;

  const check = async () => {
    if (stopped) return;
    if (await signOutIfIdle()) onExpired();
  };

  const timer = window.setInterval(() => void check(), IDLE_CHECK_INTERVAL_MS);
  const onVisible = () => {
    if (document.visibilityState === 'visible') void check();
  };
  document.addEventListener('visibilitychange', onVisible);

  return () => {
    stopped = true;
    window.clearInterval(timer);
    document.removeEventListener('visibilitychange', onVisible);
  };
}
