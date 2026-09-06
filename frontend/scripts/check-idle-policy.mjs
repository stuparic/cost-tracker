/**
 * Checks the "sign in once a day" rule in src/auth/idle-policy.ts.
 *
 * Run with `npm run test:idle` (compiles that one file, then runs this). The
 * frontend has no test runner and this deliberately does not add one - the rule
 * is small, but one part of it is subtle enough to be worth guarding:
 *
 *   On every app start Firebase restores the session and the app immediately
 *   calls `/me`, which stamps a fresh activity timestamp. A plain "is it stale
 *   right now?" check therefore always says no, and the session never expires.
 *   That bug was written once already; scenario 5 below is there so it cannot
 *   come back unnoticed.
 */
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const HOUR = 3600e3;
const DAY = 24 * HOUR;
const KEY = 'costTracker:lastAuthenticatedRequestAt';
const COMPILED = resolve(process.cwd(), '.tmp-idle/idle-policy.js');

let store = {};
globalThis.window = {
  localStorage: {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => {
      store[k] = String(v);
    },
    removeItem: k => {
      delete store[k];
    }
  }
};

let pass = 0;
let fail = 0;
const eq = (got, want, label) => {
  if (got === want) {
    pass++;
    console.log(`  ok    ${label}`);
  } else {
    fail++;
    console.log(`  FAIL  ${label} - got ${got}, want ${want}`);
  }
};

/**
 * Re-imports the module with an empty (or seeded) store, so its load-time
 * verdict is recomputed - that verdict is the whole point of the rule.
 */
let loadCount = 0;
async function freshModule(seed) {
  store = {};
  if (seed) seed();
  loadCount += 1;
  return import(`${pathToFileURL(COMPILED).href}?load=${loadCount}`);
}

const now = Date.now();

console.log('1) no timestamp yet (new install, or a session predating this rule)');
{
  const p = await freshModule();
  eq(p.isIdleExpired(now), false, 'not expired');
  eq(p.shouldEndSession(true, now), false, 'session kept');
}

console.log('2) used recently');
{
  const p = await freshModule(() => {
    store[KEY] = String(now - 5 * HOUR);
  });
  eq(p.isIdleExpired(now), false, '5h idle is fine');
  eq(p.shouldEndSession(true, now), false, 'session kept');
}

console.log('3) idle for 25h');
{
  const p = await freshModule(() => {
    store[KEY] = String(now - 25 * HOUR);
  });
  eq(p.isIdleExpired(now), true, 'expired');
  eq(p.shouldEndSession(true, now), true, 'session ended');
}

console.log('4) boundary at exactly 24h');
{
  const a = await freshModule(() => {
    store[KEY] = String(now - DAY);
  });
  eq(a.isIdleExpired(now), false, 'exactly 24h still valid');
  const b = await freshModule(() => {
    store[KEY] = String(now - DAY - 1000);
  });
  eq(b.isIdleExpired(now), true, '24h + 1s expired');
}

console.log('5) REGRESSION: the boot `/me` call must not revive a dead session');
{
  const p = await freshModule(() => {
    store[KEY] = String(now - 30 * HOUR);
  });
  p.touchActivity(now); // what the request interceptor does on `/me`
  eq(p.isIdleExpired(now), false, 'a live check now reports "fresh"');
  eq(p.shouldEndSession(true, now), true, 'but the startup verdict still stands');
  p.consumeRestoredSessionVerdict();
  eq(p.shouldEndSession(true, now), false, 'verdict consumed after signing out');
}

console.log('6) nobody signed in');
{
  const p = await freshModule(() => {
    store[KEY] = String(now - 99 * HOUR);
  });
  eq(p.shouldEndSession(false, now), false, 'nothing to do without a user');
}

console.log('7) corrupt value in storage');
{
  const p = await freshModule(() => {
    store[KEY] = 'not-a-number';
  });
  eq(p.isIdleExpired(now), false, 'garbage is ignored, user is not kicked out');
}

console.log(`\n  passed: ${pass}   failed: ${fail}`);
process.exit(fail ? 1 : 0);
