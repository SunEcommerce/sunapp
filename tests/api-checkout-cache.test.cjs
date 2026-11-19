const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync(require.resolve('../utils/api.ts'), 'utf8');

function client({ storage = new Map(), clock = { now: 1_000_000 }, handler = () => ({ data: [] }) } = {}) {
  const secure = new Map();
  const requests = [];
  const local = {
    getItem: async key => storage.get(key) ?? null,
    setItem: async (key, value) => { storage.set(key, value); },
    removeItem: async key => { storage.delete(key); },
  };
  const api = {};
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports: api, Date: { now: () => clock.now }, process: { env: {} }, console: { error() {} },
    require(name) {
      if (name === 'react-native') return { Platform: { OS: 'android' } };
      if (name === '@react-native-async-storage/async-storage') return { default: local };
      if (name === 'expo-secure-store') return {
        getItemAsync: async key => secure.get(key) ?? null,
        setItemAsync: async (key, value) => { secure.set(key, value); },
        deleteItemAsync: async key => { secure.delete(key); },
      };
      throw new Error(`Unexpected import: ${name}`);
    },
    async fetch(url, options) {
      requests.push({ url, ...options });
      const result = await handler(url, options);
      return { ok: true, status: 200, text: async () => JSON.stringify(result) };
    },
  });
  return { api, requests, storage, clock };
}

test('three checkout GETs share concurrent requests and stay cached for five minutes across reloads', async () => {
  const storage = new Map(), clock = { now: 1_000_000 };
  let revision = 1;
  const handler = url => ({ data: [{ path: new URL(url).pathname, revision }] });
  const first = client({ storage, clock, handler });
  const reads = [first.api.fetchPaymentGateways, first.api.fetchOrderAreas, first.api.fetchAddresses];
  await Promise.all(reads.flatMap(read => [read(), read()]));
  assert.equal(first.requests.length, 3);
  revision = 2;
  clock.now += 299_999;
  const reloaded = client({ storage, clock, handler });
  for (const read of [reloaded.api.fetchPaymentGateways, reloaded.api.fetchOrderAreas, reloaded.api.fetchAddresses]) {
    assert.equal((await read()).data[0].revision, 1);
  }
  assert.equal(reloaded.requests.length, 0);
  clock.now += 1;
  for (const read of [reloaded.api.fetchPaymentGateways, reloaded.api.fetchOrderAreas, reloaded.api.fetchAddresses]) {
    assert.equal((await read()).data[0].revision, 2);
  }
  assert.equal(reloaded.requests.length, 3);
});

test('address mutations and account changes invalidate only the private address cache', async () => {
  const app = client({ handler: url => url.endsWith('/api/auth/login') ? { token: 'new' } : { data: [] } });
  await Promise.all([app.api.fetchPaymentGateways(), app.api.fetchOrderAreas(), app.api.fetchAddresses()]);
  await app.api.createAddress({ label: 'Home', address: 'Street', city: 'Yangon', state: 'Yangon', country: 'Myanmar', zip_code: '10001' });
  await app.api.fetchAddresses();
  assert.equal(app.requests.filter(request => request.url.endsWith('/api/frontend/address') && request.method === 'GET').length, 2);
  assert.equal(app.requests.filter(request => request.url.endsWith('/api/frontend/payment-gateway')).length, 1);
  await app.api.updateAddress(1, { label: 'Office', address: 'Street', city: 'Yangon', state: 'Yangon', country: 'Myanmar', zip_code: '10001' });
  await app.api.fetchAddresses();
  await app.api.patchAddress(1, { label: 'Home' });
  await app.api.fetchAddresses();
  await app.api.deleteAddress(1);
  await app.api.fetchAddresses();
  assert.equal(app.requests.filter(request => request.url.endsWith('/api/frontend/address') && request.method === 'GET').length, 5);
  await app.api.login('user@example.com', 'password');
  await app.api.fetchAddresses();
  assert.equal(app.requests.filter(request => request.url.endsWith('/api/frontend/address') && request.method === 'GET').length, 6);
  await app.api.clearTokens();
  assert.equal(app.storage.has('api-cache:v1:address'), false);
});

test('explicit address refresh checks the API and replaces the cached response', async () => {
  let revision = 1;
  const app = client({ handler: () => ({ data: [{ revision }] }) });
  assert.equal((await app.api.fetchAddresses()).data[0].revision, 1);
  revision = 2;
  assert.equal((await app.api.fetchAddresses()).data[0].revision, 1);
  assert.equal((await app.api.fetchAddresses(true)).data[0].revision, 2);
  assert.equal((await app.api.fetchAddresses()).data[0].revision, 2);
  assert.equal(app.requests.length, 2);
});

test('failed address mutation keeps the existing five-minute cache', async () => {
  const app = client({ handler: (_url, options) => {
    if (options.method === 'DELETE') throw new Error('offline');
    return { data: [{ id: 1 }] };
  } });
  await app.api.fetchAddresses();
  await assert.rejects(app.api.deleteAddress(1), /offline/);
  assert.equal((await app.api.fetchAddresses()).data[0].id, 1);
  assert.equal(app.requests.filter(request => request.method === 'GET').length, 1);
});
