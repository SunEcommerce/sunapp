const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, globals = {}) {
  const source = fs.readFileSync(path.join(__dirname, '../utils', file), 'utf8');
  const result = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
  const exports = {};
  vm.runInNewContext(result.outputText, { exports, process: { env: {} }, ...globals });
  return exports;
}

const { buildCouponCart } = load('coupon.ts');
test('mobile cart distinguishes simple products and variations and snapshots quantities and prices', () => {
  const cart = [
    { productId: '4', item_id: 4, item_type: 'Product', quantity: 2, price: 100 },
    { productId: '5', item_id: 9, item_type: 'ProductVariation', quantity: 1, price: 200 },
  ];
  const snapshot = buildCouponCart(cart);
  assert.equal(snapshot.items[0].variation_id, 0);
  assert.equal(snapshot.items[1].variation_id, 9);
  assert.equal(snapshot.items[0].quantity, 2);
  cart[0].quantity = 3;
  assert.notEqual(buildCouponCart(cart).signature, snapshot.signature);
  cart[0].quantity = 2;
  cart[0].price = 110;
  assert.notEqual(buildCouponCart(cart).signature, snapshot.signature);
});

test('mobile coupon preview uses the backend contract and authentication; order forwards coupon ID', async () => {
  const requests = [];
  const api = load('api.ts', {
    require(name) {
      if (name === '@react-native-async-storage/async-storage') return { default: { getItem: async () => 'test-token' } };
      if (name === 'react-native') return { Platform: { OS: 'web' } };
      if (name === 'expo-secure-store') return {};
      throw new Error(`Unexpected import: ${name}`);
    },
    async fetch(url, options) {
      requests.push({ url, options });
      return { ok: true, text: async () => JSON.stringify({ data: { id: 3, discount: 10 } }) };
    },
  });
  await api.validateCoupon('SAVE', 100, [{ product_id: 4, variation_id: 0, quantity: 1 }]);
  const preview = requests[0];
  assert.equal(preview.options.headers.Authorization, 'Bearer test-token');
  assert.deepEqual(JSON.parse(preview.options.body), { code: 'SAVE', total: 100, items: [{ product_id: 4, variation_id: 0, quantity: 1 }] });
  await api.createOrder({ coupon_id: 3, subtotal: 100, discount: 10, total: 90, products: [{ product_id: 4, quantity: 1 }] });
  const order = JSON.parse(requests[1].options.body);
  assert.equal(order.coupon_id, 3);
  assert.equal(JSON.parse(order.products)[0].product_id, 4);
});
