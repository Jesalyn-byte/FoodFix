/**
 * One-time migration: convert legacy order numbers (FF-YYYYMMDD-NNNN) to
 * sequential plain numbers ("1042") and seed counters/order_number.
 *
 * Safe to run after the new app has already created numeric orders: existing
 * numeric ids are never reused, and the counter is raised to cover them.
 *
 * Usage:
 *   node scripts/migrate-order-numbers.js            # dry run — prints the mapping, writes nothing
 *   node scripts/migrate-order-numbers.js --apply    # writes the new order numbers + counter
 */

const PROJECT_ID = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'lasangpinoy-mobile';
const DATABASE_ID = 'default';
const API_KEY = process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'AIzaSyAZ36rq3scKZDT5SsETJ_SYIOEB9Gcbkyk';
const ADMIN_EMAIL = process.env.MIGRATION_ADMIN_EMAIL || 'admin@foodfix.com';
const ADMIN_PASSWORD = process.env.MIGRATION_ADMIN_PASSWORD || 'admin12345';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents`;

const APPLY = process.argv.includes('--apply');

// Orders are admin-readable only (firestore.rules), so sign in first.
let authToken = null;

async function signIn() {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD, returnSecureToken: true }),
  });
  if (!res.ok) throw new Error(`Admin sign-in failed: ${res.status} ${await res.text()}`);
  authToken = (await res.json()).idToken;
}

function authHeaders(extra = {}) {
  return {
    'Content-Type': 'application/json',
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...extra,
  };
}

function toFirestoreValue(obj) {
  if (obj === null || obj === undefined) return { nullValue: null };
  if (typeof obj === 'string') return { stringValue: obj };
  if (typeof obj === 'number') {
    return Number.isInteger(obj) ? { integerValue: obj.toString() } : { doubleValue: obj };
  }
  if (typeof obj === 'boolean') return { booleanValue: obj };
  if (obj instanceof Date) return { timestampValue: obj.toISOString() };
  if (Array.isArray(obj)) return { arrayValue: { values: obj.map(toFirestoreValue) } };
  if (typeof obj === 'object') {
    const fields = {};
    for (const [key, value] of Object.entries(obj)) fields[key] = toFirestoreValue(value);
    return { mapValue: { fields } };
  }
  return { stringValue: String(obj) };
}

function fromFirestoreValue(v) {
  if (!v) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('nullValue' in v) return null;
  if ('mapValue' in v) return fromFirestoreDoc({ fields: v.mapValue.fields || {} });
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromFirestoreValue);
  return null;
}

function fromFirestoreDoc(doc) {
  const out = {};
  for (const [key, value] of Object.entries(doc.fields || {})) out[key] = fromFirestoreValue(value);
  return out;
}

async function listAll(collection) {
  const results = [];
  let pageToken = '';
  do {
    const url =
      `${BASE_URL}/${collection}?pageSize=300&key=${API_KEY}` +
      (pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : '');
    const res = await fetch(url, { headers: authHeaders() });
    if (!res.ok) throw new Error(`List ${collection} failed: ${res.status} ${await res.text()}`);
    const data = await res.json();
    for (const doc of data.documents || []) {
      results.push({ __id: doc.name.split('/').pop(), ...fromFirestoreDoc(doc) });
    }
    pageToken = data.nextPageToken || '';
  } while (pageToken);
  return results;
}

async function getDocument(collection, docId) {
  const url = `${BASE_URL}/${collection}/${docId}?key=${API_KEY}`;
  const res = await fetch(url, { headers: authHeaders() });
  if (res.status === 404) return null;
  if (res.status === 403) {
    console.warn(`[migrate-order-numbers] Cannot read ${collection}/${docId} (updated firestore.rules not deployed yet?) — treating as missing.`);
    return null;
  }
  if (!res.ok) throw new Error(`Get ${collection}/${docId} failed: ${res.status}`);
  return fromFirestoreDoc(await res.json());
}

async function patchFields(collection, docId, fields) {
  const url = `${BASE_URL}/${collection}/${docId}?key=${API_KEY}`;
  const encoded = {};
  for (const [key, value] of Object.entries(fields)) encoded[key] = toFirestoreValue(value);
  const res = await fetch(url, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ fields: encoded }),
  });
  if (!res.ok) {
    const hint =
      collection === 'counters'
        ? ' — deploy firestore.rules first: firebase deploy --only firestore:rules'
        : '';
    throw new Error(`Patch ${collection}/${docId} failed: ${res.status} ${await res.text()}${hint}`);
  }
}

function createdMs(order) {
  const v = order.created_at;
  if (!v) return 0;
  const ms = new Date(v).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

async function main() {
  console.log(`[migrate-order-numbers] project=${PROJECT_ID} mode=${APPLY ? 'APPLY' : 'DRY RUN'}`);
  await signIn();

  const orders = await listAll('orders');
  const used = new Set();
  const legacy = [];
  for (const order of orders) {
    const num = String(order.order_number ?? '');
    if (/^\d+$/.test(num)) used.add(Number(num));
    else legacy.push(order);
  }
  legacy.sort((a, b) => createdMs(a) - createdMs(b));

  let next = 1;
  const mapping = [];
  for (const order of legacy) {
    while (used.has(next)) next += 1;
    used.add(next);
    mapping.push({ id: order.__id, from: order.order_number, to: String(next) });
    next += 1;
  }

  const counter = await getDocument('counters', 'order_number');
  const currentCounter = Number(counter?.value) || 0;
  const needed = used.size ? Math.max(...used) : 0;
  const finalCounter = Math.max(needed, currentCounter, mapping.length ? Number(mapping[mapping.length - 1].to) : 0);

  console.log(`Orders: ${orders.length} total | ${orders.length - legacy.length} already numeric | ${legacy.length} legacy`);
  if (mapping.length === 0 && finalCounter === currentCounter) {
    console.log('Nothing to do.');
    return;
  }
  for (const m of mapping) console.log(`  ${m.from}  ->  #${m.to}   (${m.id})`);
  console.log(`Counter: ${currentCounter} -> ${finalCounter}`);

  if (!APPLY) {
    console.log('\nDRY RUN — nothing was written. Re-run with --apply to persist these changes.');
    return;
  }

  for (const m of mapping) {
    await patchFields('orders', m.id, { order_number: m.to });
  }
  await patchFields('counters', 'order_number', { value: finalCounter, updated_at: new Date().toISOString() });
  console.log(`\nDone. Updated ${mapping.length} orders and set counter to ${finalCounter}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
