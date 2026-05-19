// Smoke test — boots the full app with mongoose connection mocked.
import mongoose from 'mongoose';

mongoose.connect = async () => ({ connection: {} });
mongoose.connection.close = async () => {};
mongoose.connection.on = () => {};

process.env.MONGODB_URI = 'mongodb://stub:27017/test';
process.env.JWT_SECRET = 'test-jwt-secret-very-long-string-min-32chars-xxxxxxxx';
process.env.PORT = '5099';
process.env.CORS_ORIGINS = 'http://localhost:5173';
process.env.NODE_ENV = 'test';
delete process.env.RAZORPAY_KEY_ID;
delete process.env.RAZORPAY_KEY_SECRET;
delete process.env.ANTHROPIC_API_KEY;

const stores = new Map();
const getStore = (n) => {
  if (!stores.has(n)) stores.set(n, []);
  return stores.get(n);
};
const nextId = () => new mongoose.Types.ObjectId().toString();

function matchFilter(doc, filter) {
  if (!filter || typeof filter !== 'object') return true;
  for (const [k, v] of Object.entries(filter)) {
    if (k === '$or') {
      if (!v.some((sub) => matchFilter(doc, sub))) return false;
      continue;
    }
    const dv = doc[k];
    if (v instanceof RegExp) {
      if (!v.test(String(dv))) return false;
    } else if (String(dv) !== String(v)) {
      return false;
    }
  }
  return true;
}
function applyUpdate(doc, update) {
  for (const [k, v] of Object.entries(update)) {
    if (k.startsWith('$')) continue;
    doc[k] = v;
  }
}
function sortDocs(arr, spec) {
  const entries = Object.entries(spec);
  return [...arr].sort((a, b) => {
    for (const [k, dir] of entries) {
      const av = a[k], bv = b[k];
      if (av < bv) return dir > 0 ? -1 : 1;
      if (av > bv) return dir > 0 ? 1 : -1;
    }
    return 0;
  });
}

function mockModel(model) {
  const name = model.modelName;
  const store = getStore(name);

  model.create = async (doc) => {
    const created = new model(doc);
    await created.validate();
    const obj = created.toObject();
    obj._id = created._id;
    obj.createdAt = new Date();
    obj.updatedAt = new Date();
    // Copy methods like toSafeJSON onto the result object so controllers can call them
    Object.setPrototypeOf(obj, Object.getPrototypeOf(created));
    obj.passwordHash = created.passwordHash;
    store.push(obj);
    return obj;
  };
  model.find = (filter = {}) => {
    let results = store.filter((d) => matchFilter(d, filter));
    const chain = {
      sort: (s) => { results = sortDocs(results, s); return chain; },
      skip: (n) => { results = results.slice(n); return chain; },
      limit: (n) => { results = results.slice(0, n); return chain; },
      select: () => chain,
      lean: () => Promise.resolve(results),
      then: (resolve) => resolve(results),
    };
    return chain;
  };
  model.findOne = async (filter) => {
    const found = store.find((d) => matchFilter(d, filter));
    return found || null;
  };
  model.findById = async (id) => store.find((d) => String(d._id) === String(id)) || null;
  model.countDocuments = async (filter = {}) => store.filter((d) => matchFilter(d, filter)).length;
  model.findOneAndUpdate = async (filter, update, opts = {}) => {
    let doc = store.find((d) => matchFilter(d, filter));
    if (!doc && opts.upsert) {
      doc = { _id: nextId(), ...filter, createdAt: new Date() };
      store.push(doc);
    }
    if (!doc) return null;
    applyUpdate(doc, update);
    doc.updatedAt = new Date();
    return doc;
  };
  model.findByIdAndUpdate = async (id, update) => {
    const doc = store.find((d) => String(d._id) === String(id));
    if (!doc) return null;
    applyUpdate(doc, update);
    doc.updatedAt = new Date();
    return doc;
  };
  model.findByIdAndDelete = async (id) => {
    const idx = store.findIndex((d) => String(d._id) === String(id));
    if (idx === -1) return null;
    return store.splice(idx, 1)[0];
  };
}

// Patch Document.prototype.save() so new docs (admin via `new Admin()`) persist
mongoose.Document.prototype.save = async function () {
  const store = getStore(this.constructor.modelName);
  const existing = store.find((d) => String(d._id) === String(this._id));
  if (existing) {
    Object.assign(existing, this.toObject());
    existing.passwordHash = this.passwordHash;
    existing.updatedAt = new Date();
    return this;
  }
  await this.validate();
  const obj = this.toObject();
  obj.createdAt = new Date();
  obj.updatedAt = new Date();
  obj.passwordHash = this.passwordHash;
  Object.setPrototypeOf(obj, Object.getPrototypeOf(this));
  store.push(obj);
  return this;
};

const { connectDB } = await import('/home/claude/backend/src/config/db.js');
await connectDB();

const { default: app } = await import('/home/claude/backend/src/app.js');
const { Admin } = await import('/home/claude/backend/src/models/Admin.js');
const { Lead } = await import('/home/claude/backend/src/models/Lead.js');
const { SiteContent } = await import('/home/claude/backend/src/models/SiteContent.js');
const { ChatSession } = await import('/home/claude/backend/src/models/ChatSession.js');
const { Payment } = await import('/home/claude/backend/src/models/Payment.js');

[Admin, Lead, SiteContent, ChatSession, Payment].forEach(mockModel);

const admin = new Admin({ email: 'test@atyant.in', name: 'Tester', role: 'superadmin' });
await admin.setPassword('TestPass123!');
await admin.save();
console.log('✅ seeded admin');

const server = app.listen(5099);
await new Promise((r) => server.once('listening', r));
console.log('✅ server booted\n');

const base = 'http://localhost:5099';
let token;
let pass = 0, fail = 0;

async function expect(label, fn) {
  try { await fn(); console.log(`  ✅ ${label}`); pass++; }
  catch (e) { console.log(`  ❌ ${label}: ${e.message}`); fail++; }
}
const j = (r) => r.json();

await expect('GET /health returns ok', async () => {
  const r = await fetch(`${base}/health`).then(j);
  if (!r.ok) throw new Error(JSON.stringify(r));
});

await expect('POST /api/auth/login rejects bad password', async () => {
  const r = await fetch(`${base}/api/auth/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'test@atyant.in', password: 'wrong' }),
  });
  if (r.status !== 401) throw new Error(`expected 401, got ${r.status}`);
});

await expect('POST /api/auth/login returns JWT', async () => {
  const r = await fetch(`${base}/api/auth/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'test@atyant.in', password: 'TestPass123!' }),
  }).then(j);
  if (!r.ok || !r.token) throw new Error(JSON.stringify(r));
  token = r.token;
});

await expect('GET /api/auth/me works with token', async () => {
  const r = await fetch(`${base}/api/auth/me`, {
    headers: { authorization: `Bearer ${token}` },
  }).then(j);
  if (!r.ok || r.admin.email !== 'test@atyant.in') throw new Error(JSON.stringify(r));
});

await expect('GET /api/auth/me rejects without token', async () => {
  const r = await fetch(`${base}/api/auth/me`);
  if (r.status !== 401) throw new Error(`expected 401, got ${r.status}`);
});

await expect('POST /api/leads creates a lead', async () => {
  const r = await fetch(`${base}/api/leads`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Nitin', email: 'nitin@example.com' }),
  }).then(j);
  if (!r.ok || !r.lead?.id) throw new Error(JSON.stringify(r));
});

await expect('POST /api/leads rejects bad email', async () => {
  const r = await fetch(`${base}/api/leads`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'X', email: 'not-an-email' }),
  });
  if (r.status !== 400) throw new Error(`expected 400, got ${r.status}`);
});

await expect('GET /api/leads lists leads (admin)', async () => {
  const r = await fetch(`${base}/api/leads`, {
    headers: { authorization: `Bearer ${token}` },
  }).then(j);
  if (!r.ok || r.total < 1) throw new Error(JSON.stringify(r));
});

await expect('GET /api/content returns empty when unset', async () => {
  const r = await fetch(`${base}/api/content`).then(j);
  if (!r.ok || typeof r.data !== 'object') throw new Error(JSON.stringify(r));
});

await expect('PUT /api/content saves overrides', async () => {
  const r = await fetch(`${base}/api/content`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ data: { heroTrustBadges: ['A', 'B'] } }),
  }).then(j);
  if (!r.ok || r.data.heroTrustBadges?.[0] !== 'A') throw new Error(JSON.stringify(r));
});

await expect('GET /api/content reflects override', async () => {
  const r = await fetch(`${base}/api/content`).then(j);
  if (r.data.heroTrustBadges?.[0] !== 'A') throw new Error(JSON.stringify(r));
});

await expect('POST /api/decision returns suggestion', async () => {
  const r = await fetch(`${base}/api/decision`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ stream: 'pcm', rank: 3000 }),
  }).then(j);
  if (!r.ok || r.result.bucket !== 'top') throw new Error(JSON.stringify(r));
});

await expect('Decision: pcm rank 60000 -> low/Medium', async () => {
  const r = await fetch(`${base}/api/decision`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ stream: 'pcm', rank: 60000 }),
  }).then(j);
  if (r.result.bucket !== 'low' || r.result.risk !== 'Medium') throw new Error(JSON.stringify(r));
});

await expect('Decision: pcb rank 500 -> top/Low', async () => {
  const r = await fetch(`${base}/api/decision`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ stream: 'pcb', rank: 500 }),
  }).then(j);
  if (r.result.bucket !== 'top' || r.result.risk !== 'Low') throw new Error(JSON.stringify(r));
});

await expect('Decision rejects bad stream', async () => {
  const r = await fetch(`${base}/api/decision`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ stream: 'arts', rank: 100 }),
  });
  if (r.status !== 400) throw new Error(`expected 400, got ${r.status}`);
});

await expect('POST /api/chat/message returns stub reply', async () => {
  const r = await fetch(`${base}/api/chat/message`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message: 'Hi' }),
  }).then(j);
  if (!r.ok || !r.reply || !r.sessionId || !r.stub) throw new Error(JSON.stringify(r));
});

await expect('Chat continues a session', async () => {
  const r1 = await fetch(`${base}/api/chat/message`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message: 'first' }),
  }).then(j);
  const r2 = await fetch(`${base}/api/chat/message`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message: 'second', sessionId: r1.sessionId }),
  }).then(j);
  if (r1.sessionId !== r2.sessionId) throw new Error('session id mismatch');
});

await expect('GET /api/payments/plans returns 4 plans', async () => {
  const r = await fetch(`${base}/api/payments/plans`).then(j);
  if (!r.ok || r.plans.length !== 4) throw new Error(JSON.stringify(r));
});

await expect('POST /api/payments/orders 500 without razorpay creds', async () => {
  const r = await fetch(`${base}/api/payments/orders`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ planId: 'combo', name: 'X', email: 'x@y.com' }),
  });
  if (r.status !== 500) throw new Error(`expected 500, got ${r.status}`);
});

await expect('POST /api/payments/orders rejects unknown plan', async () => {
  const r = await fetch(`${base}/api/payments/orders`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ planId: 'bogus', name: 'X', email: 'x@y.com' }),
  });
  if (r.status !== 400) throw new Error(`expected 400, got ${r.status}`);
});

await expect('Unknown route returns 404', async () => {
  const r = await fetch(`${base}/api/nope`);
  if (r.status !== 404) throw new Error(`expected 404, got ${r.status}`);
});

await expect('GET /api/leads/export.csv works for admin', async () => {
  const r = await fetch(`${base}/api/leads/export.csv`, {
    headers: { authorization: `Bearer ${token}` },
  });
  const text = await r.text();
  if (r.status !== 200 || !text.startsWith('Name,Email')) throw new Error(text.slice(0, 200));
});

await expect('Payment webhook rejects missing signature', async () => {
  const r = await fetch(`${base}/api/payments/webhook`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ event: 'test' }),
  });
  if (r.status !== 400) throw new Error(`expected 400, got ${r.status}`);
});

console.log(`\n${pass} passed, ${fail} failed`);
server.close();
process.exit(fail > 0 ? 1 : 0);
