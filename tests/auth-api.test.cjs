const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function client(os = 'android', handler = () => ({ token: 'issued', user: { id: 7 } })) {
  const secure = new Map();
  const local = new Map();
  const requests = [];
  const storage = map => ({
    getItem: async key => map.get(key) ?? null,
    setItem: async (key, value) => { map.set(key, value); },
    removeItem: async key => { map.delete(key); },
  });
  const native = storage(secure);
  const api = {};
  const source = fs.readFileSync(path.join(__dirname, '../utils/api.ts'), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports: api, process: { env: {} }, console: { error() {} },
    require(name) {
      if (name === 'react-native') return { Platform: { OS: os } };
      if (name === '@react-native-async-storage/async-storage') return { default: storage(local) };
      if (name === 'expo-secure-store') return {
        getItemAsync: native.getItem, setItemAsync: native.setItem, deleteItemAsync: native.removeItem,
      };
      throw new Error(`Unexpected import: ${name}`);
    },
    async fetch(url, options) {
      requests.push({ url, ...options });
      const result = await handler(url, options);
      const status = result.statusCode ?? 200;
      return { ok: status < 400, status, text: async () => JSON.stringify(result) };
    },
  });
  return { api, secure, local, requests };
}

test('New Arrivals requests active products in newest-first order', async () => {
  const { api, requests } = client();
  await api.fetchNewArrivals();
  const url = new URL(requests[0].url);
  assert.equal(url.pathname, '/api/frontend/product');
  assert.equal(url.searchParams.get('order_column'), 'id');
  assert.equal(url.searchParams.get('order_type'), 'desc');
  assert.equal(url.searchParams.get('status'), '5');
});

for (const os of ['android', 'web']) {
  test(`${os} login stores backend token and authenticates the next request`, async () => {
    const { api, secure, local, requests } = client(os);
    await api.login('test@example.com', 'Password1');
    await api.fetchWishlist();
    assert.equal(requests.at(-1).headers.Authorization, 'Bearer issued');
    assert.equal((os === 'web' ? local : secure).get('access_token'), 'issued');
    if (os !== 'web') assert.equal(local.has('access_token'), false);
  });
}

test('native upgrades migrate old plaintext credentials once', async () => {
  const { api, local, secure } = client();
  local.set('access_token', 'legacy');
  assert.equal(await api.getAccessToken(), 'legacy');
  assert.equal(secure.get('access_token'), 'legacy');
  assert.equal(local.has('access_token'), false);
});

test('refresh uses the current token and the backend request/response contract', async () => {
  const { api, secure, requests } = client();
  await api.storeTokens('current');
  assert.equal(await api.refreshAccessToken(), true);
  assert.deepEqual(JSON.parse(requests[0].body), { token: 'current' });
  assert.equal(secure.get('access_token'), 'issued');
});

test('simultaneous 401s share one rotation and retry using the replacement token', async () => {
  let rotations = 0;
  const { api } = client('android', (url, options) => {
    if (url.includes('refresh-token')) { rotations++; return { token: 'new' }; }
    return options.headers.Authorization === 'Bearer new' ? { data: [] } : { statusCode: 401 };
  });
  await api.storeTokens('old');
  await Promise.all([api.fetchWishlist(), api.fetchWishlist()]);
  assert.equal(rotations, 1);
});

test('a second 401 stops retrying and clears credentials', async () => {
  const { api, secure, requests } = client('android', url => url.includes('refresh-token')
    ? { token: 'new' } : { statusCode: 401 });
  await api.storeTokens('old');
  await assert.rejects(api.fetchWishlist());
  assert.equal(requests.length, 3);
  assert.equal(secure.has('access_token'), false);
});

test('invalid refresh tokens clear both old storage locations', async () => {
  const { api, secure, local } = client('android', () => ({ statusCode: 422 }));
  await api.storeTokens('old', 'old-refresh');
  local.set('access_token', 'stale');
  assert.equal(await api.refreshAccessToken(), false);
  assert.equal(secure.size, 0);
  assert.equal(local.has('access_token'), false);
});

test('logout revokes the server token and clears native/local credentials and user cache', async () => {
  const { api, secure, local, requests } = client();
  await api.storeTokens('old');
  local.set('user_profile', 'cached');
  local.set('wishlist_products', 'cached');
  await api.logout();
  assert.equal(requests[0].url, 'http://localhost/api/auth/logout');
  assert.equal(requests[0].headers.Authorization, 'Bearer old');
  assert.equal(secure.size, 0);
  assert.equal(local.has('user_profile'), false);
  assert.equal(local.has('wishlist_products'), false);
});

test('failed logout still removes local credentials', async () => {
  const { api, secure } = client('android', () => ({ statusCode: 500 }));
  await api.storeTokens('old');
  await api.logout();
  assert.equal(secure.size, 0);
});

test('profile uses the API prefix and POST multipart without a manual content type', async () => {
  const { api, requests } = client();
  await api.storeTokens('current');
  await api.fetchProfile();
  const form = { multipart: true };
  await api.updateProfile(form);
  assert.equal(requests[0].url, 'http://localhost/api/profile');
  assert.equal(requests[1].url, 'http://localhost/api/profile');
  assert.equal(requests[1].method, 'POST');
  assert.equal(requests[1].body, form);
  assert.equal(requests[1].headers['Content-Type'], undefined);
});

test('checkout quote authenticates and serializes product lines for the backend', async () => {
  const { api, requests } = client();
  await api.storeTokens('current');
  const products = [{ product_id: 1, variation_id: 0, quantity: 1, price: 100, subtotal: 100 }];
  await api.fetchOrderQuote({ order_type: 5, shipping_id: 1, billing_id: 1, products });
  assert.equal(requests[0].url, 'http://localhost/api/frontend/order/quote');
  assert.equal(requests[0].headers.Authorization, 'Bearer current');
  assert.deepEqual(JSON.parse(JSON.parse(requests[0].body).products), products);
});
