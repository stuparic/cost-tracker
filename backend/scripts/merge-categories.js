/* eslint-disable */
/**
 * One-off migration: fold the retired categories into the merged set.
 *
 *   Entertainment -> Dining
 *   Electronics   -> Home
 *   Clothing      -> Home
 *   CarLoan       -> Loan
 *   HomeLoan      -> Loan
 *
 * Remaps `expenses.category`, `categoryOverrides.category`, and `budgets`
 * (summing monthly limits when two old categories merge into one).
 *
 * Usage (from the backend/ folder):
 *   node scripts/merge-categories.js            # dry run
 *   node scripts/merge-categories.js --apply    # actually write
 */
const admin = require('firebase-admin');
const path = require('path');

const serviceAccount = require(path.resolve(__dirname, '..', 'service-account.json'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount), projectId: serviceAccount.project_id });
const db = admin.firestore();

const apply = process.argv.slice(2).includes('--apply');
const MAP = { Entertainment: 'Dining', Electronics: 'Home', Clothing: 'Home', CarLoan: 'Loan', HomeLoan: 'Loan' };
const OLD = Object.keys(MAP);

async function remapField(collection) {
  const snap = await db.collection(collection).where('category', 'in', OLD).get();
  console.log(`\n${collection}: ${snap.size} docs to remap`);
  const counts = {};
  let batch = db.batch();
  let n = 0;
  for (const doc of snap.docs) {
    const oldCat = doc.data().category;
    const newCat = MAP[oldCat];
    counts[`${oldCat}→${newCat}`] = (counts[`${oldCat}→${newCat}`] || 0) + 1;
    if (apply) {
      batch.update(doc.ref, { category: newCat });
      if (++n % 400 === 0) {
        await batch.commit();
        batch = db.batch();
      }
    }
  }
  if (apply && n % 400 !== 0) await batch.commit();
  Object.entries(counts).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
}

async function remapBudgets() {
  const snap = await db.collection('budgets').get();
  const toMigrate = snap.docs.filter(d => OLD.includes(d.data().category));
  console.log(`\nbudgets: ${toMigrate.length} to remap (of ${snap.size})`);
  if (toMigrate.length === 0) return;

  // Build target limits per (householdId, newCategory), starting from existing targets.
  const targets = new Map(); // key -> { householdId, category, monthlyLimit }
  const keyOf = (h, c) => `${h}__${c}`;
  for (const d of snap.docs) {
    const data = d.data();
    if (OLD.includes(data.category)) continue;
    targets.set(keyOf(data.householdId, data.category), { householdId: data.householdId, category: data.category, monthlyLimit: data.monthlyLimit || 0 });
  }
  for (const d of toMigrate) {
    const data = d.data();
    const newCat = MAP[data.category];
    const key = keyOf(data.householdId, newCat);
    const existing = targets.get(key);
    const limit = (existing?.monthlyLimit || 0) + (data.monthlyLimit || 0);
    targets.set(key, { householdId: data.householdId, category: newCat, monthlyLimit: limit });
    console.log(`  ${data.category} (${data.monthlyLimit}) -> ${newCat} = ${limit}`);
  }

  if (!apply) return;
  const now = admin.firestore.Timestamp.now();
  // Delete old docs, then write merged targets.
  for (const d of toMigrate) await d.ref.delete();
  for (const [, t] of targets) {
    if (!OLD.includes(t.category)) {
      const id = `${t.householdId}_${t.category}`;
      await db.collection('budgets').doc(id).set(
        { householdId: t.householdId, category: t.category, monthlyLimit: t.monthlyLimit, updatedAt: now, createdAt: now },
        { merge: true }
      );
    }
  }
}

(async () => {
  console.log(apply ? '>>> APPLY mode (will write)' : '>>> DRY RUN (no writes). Re-run with --apply to commit.');
  await remapField('expenses');
  await remapField('categoryOverrides');
  await remapBudgets();
  console.log(apply ? '\nDone. Categories merged.' : '\nDry run only — nothing written.');
  process.exit(0);
})().catch(err => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
