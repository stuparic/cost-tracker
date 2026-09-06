/**
 * The "sign in once a day" rule, with no Firebase or DOM framework in it.
 *
 * Kept separate from session-timeout.ts (which does the actual signing out) so
 * this decision logic can be exercised on its own - it is subtle enough to be
 * worth it. The subtlety: on every app start Firebase restores the session and
 * the app immediately calls `/me`, which stamps a fresh activity timestamp. A
 * naive "is it stale right now?" check therefore always says no, and the
 * session never expires. The verdict has to be taken once, at startup, before
 * anything can touch the clock.
 */

/** A session with no authenticated requests for this long is over. */
export const IDLE_LIMIT_MS = 24 * 60 * 60 * 1000;

/** How often an open tab re-checks the clock. */
export const IDLE_CHECK_INTERVAL_MS = 60 * 1000;

const STORAGE_KEY = 'costTracker:lastAuthenticatedRequestAt';

/**
 * Storage can throw rather than return null - Safari private mode and browsers
 * with site data blocked raise on access - so every read and write is guarded.
 * If storage is unusable the session simply never expires by idling, which is
 * the behaviour that existed before this policy and is no worse than it.
 */
function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readLastActivity(): number | null {
  try {
    const raw = storage()?.getItem(STORAGE_KEY) ?? null;
    if (raw === null) return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

/** Marks "the session was used just now". Called on every authenticated call. */
export function touchActivity(now: number = Date.now()): void {
  try {
    storage()?.setItem(STORAGE_KEY, String(now));
  } catch {
    // Ignore - see storage().
  }
}

export function clearActivity(): void {
  try {
    storage()?.removeItem(STORAGE_KEY);
  } catch {
    // Ignore - see storage().
  }
}

/**
 * Has the session been idle past the limit?
 *
 * No stored timestamp means "not expired". That covers a session that predates
 * this feature and the moment right after signing in; treating it as expired
 * would sign everyone out the first time this ships.
 */
export function isIdleExpired(now: number = Date.now()): boolean {
  const last = readLastActivity();
  if (last === null) return false;
  return now - last > IDLE_LIMIT_MS;
}

/**
 * Verdict for the session being restored right now, captured at module load -
 * before Firebase restores anything and before the first request can stamp a
 * new timestamp. See the note at the top of this file.
 */
let restoredSessionExpired = isIdleExpired();

/**
 * True while the session restored at startup is still known to be too old.
 * Stays true until consumed, because Firebase may not have restored the user
 * yet the first time this is asked.
 */
export function isRestoredSessionExpired(): boolean {
  return restoredSessionExpired;
}

export function consumeRestoredSessionVerdict(): void {
  restoredSessionExpired = false;
}

/** Re-reads the clock as if the app had just started. For tests. */
export function recomputeRestoredSessionVerdict(): void {
  restoredSessionExpired = isIdleExpired();
}

/**
 * The whole rule in one place: should this session be ended now?
 *
 * `hasUser` is passed in rather than read from Firebase so the decision stays
 * free of that dependency.
 */
export function shouldEndSession(hasUser: boolean, now: number = Date.now()): boolean {
  if (!hasUser) return false;
  return restoredSessionExpired || isIdleExpired(now);
}
