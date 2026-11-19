const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function nodes(tree) {
  return !tree || typeof tree !== 'object' ? [] : [tree, ...[tree.props?.children].flat(Infinity).flatMap(nodes)];
}
function load(file, mocks) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, { exports, setTimeout() {}, console: { error() {} }, require: name => name === 'react/jsx-runtime' ? require(name) : mocks[name] });
  return exports;
}
const cartItem = { id: 'item-1', productId: '7', name: 'Demo phone', price: 100, quantity: 2, image: 'phone.webp', item_type: 'ProductVariation', item_id: 70, sku: 'PHONE-BLACK', variation_names: 'Black | 128 GB' };
const address = { id: 3, full_name: 'Shopper', country_code: '+95', phone: '123456', address: 'Main Street', city: 'Yangon', state: 'Yangon', country: 'Myanmar', zip_code: '11011', isDefault: true };

function screen({ colorScheme = 'light', addresses = [address], payments = [{ id: 1, name: 'Cash On Delivery', status: 5 }, { id: 2, name: 'Credit', status: 5 }], items = [cartItem], savedAddress = '3', quoteFailure = false, dataFailure = false } = {}) {
  const state = [], refs = [], memos = [], effects = [], pending = [], orders = [], quotes = [], routes = [], coupons = [];
  let cursor = 0, refCursor = 0, memoCursor = 0, effectCursor = 0, focus;
  let failQuote = quoteFailure, failData = dataFailure;
  const same = (a, b) => a && b && a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
  const react = {
    useContext: () => ({ colorScheme }),
    useState(initial) { const index = cursor++; if (!(index in state)) state[index] = initial;
      return [state[index], next => { state[index] = typeof next === 'function' ? next(state[index]) : next; }]; },
    useRef(initial) { const index = refCursor++; return refs[index] ??= { current: initial }; },
    useMemo(fn, deps) { const index = memoCursor++; if (!same(memos[index]?.deps, deps)) memos[index] = { deps, value: fn() }; return memos[index].value; },
    useCallback(fn, deps) { return react.useMemo(() => fn, deps); },
    useEffect(fn, deps) { const index = effectCursor++; if (!same(effects[index]?.deps, deps)) {
      const previous = effects[index]; effects[index] = { deps };
      pending.push(() => { previous?.cleanup?.(); effects[index].cleanup = fn(); });
    } },
  };
  const theme = { background: '#f3f3f3', text: '#1e2b33', textSecondary: '#3c4a52', icon: '#63727c', success: '#087443' };
  const api = {
    fetchAddresses: async () => { if (failData) throw new Error('offline'); return { data: addresses }; },
    fetchOrderAreas: async () => ({ data: [] }), fetchPaymentGateways: async () => ({ data: payments }),
    fetchOrderQuote: async request => {
      quotes.push(request);
      if (failQuote) throw new Error('Unable to calculate total');
      return { data: { subtotal: 200, discount: request.coupon_id ? 20 : 0, shipping_charge: 5, tax: 2, total: request.coupon_id ? 187 : 207, products: [{ product_id: 7, variation_id: 70, quantity: 2, total: 200 }] } };
    },
    validateCoupon: async (...args) => { coupons.push(args); return { data: { id: 9, discount: 20 } }; },
    createOrder: async payload => { orders.push(payload); return { data: { id: 1 } }; },
  };
  const { default: Checkout } = load('app/Checkout.tsx', {
    react, 'expo-router': { useRouter: () => ({ back() {}, push: route => routes.push(route) }), useFocusEffect: fn => { focus = fn; } },
    'react-native': { ...Object.fromEntries(['ActivityIndicator', 'Image', 'KeyboardAvoidingView', 'Modal', 'ScrollView', 'StatusBar', 'TouchableOpacity', 'View'].map(name => [name, name])),
      StyleSheet: { create: value => value, hairlineWidth: 1 }, Platform: { OS: 'web' }, Alert: { alert() {} } },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView', useSafeAreaInsets: () => ({ bottom: 20 }) },
    '@expo/vector-icons': { Ionicons: 'Icon' }, '@/components/themed-text': { ThemedText: 'Text' },
    '@/components/ui/text-input': { TextInput: 'Input' }, '@/components/ui/icon-button': { IconButton: 'IconButton' }, '@/components/HomeSkeleton': { HomeSkeleton: 'Skeleton' },
    '@/components/slide-to-confirm': { SlideToConfirm: 'SlideToConfirm' },
    '@/constants/theme': { Colors: { light: theme, dark: { ...theme, text: '#ECEDEE', background: '#151718', textSecondary: '#C1C6C9' } } },
    '@/contexts/theme-context': { ThemeContext: {} }, '@/contexts/cart-context': { useCart: () => ({ items, totalAmount: 200, clearCart() {} }) },
    '@/utils/api': api, '../utils/coupon': load('utils/coupon.ts', {}),
    '@react-native-async-storage/async-storage': { getItem: async () => savedAddress, setItem: async () => {} },
  });
  const render = () => { cursor = refCursor = memoCursor = effectCursor = 0; return Checkout(); };
  const settle = async () => { for (let count = 0; count < 4; count++) {
    render(); while (pending.length) pending.shift()(); await new Promise(resolve => setImmediate(resolve));
  } };
  const find = label => nodes(render()).find(node => node.props?.accessibilityLabel === label || node.props?.label === label);
  return { render, find, orders, quotes, coupons, routes,
    async ready() { render(); focus(); await settle(); },
    async press(label) { const button = find(label); assert.ok(button, label); assert.ok(!button.props.disabled, label); await button.props.onPress(); await settle(); },
    async confirmOrder() { const slider = nodes(render()).find(node => node.type === 'SlideToConfirm');
      assert.ok(slider && !slider.props.disabled); await slider.props.onConfirm(); await settle(); },
    async fill(label, value) { find(label).props.onChangeText(value); await settle(); },
    recoverQuote() { failQuote = false; }, recoverData() { failData = false; },
  };
}

for (const colorScheme of ['light', 'dark']) {
  test(`${colorScheme}: checkout keeps optional fields collapsed and submits quoted products, payment and note`, async () => {
    const app = screen({ colorScheme });
    assert.ok(nodes(app.render()).some(node => node.type === 'Skeleton'));
    await app.ready();
    assert.equal(app.find('Place order').props.disabled, false);
    assert.equal(app.find('Enter promo code'), undefined);
    assert.equal(app.find('Order instructions'), undefined);
    await app.press('Change delivery address');
    assert.equal(app.routes.at(-1), '/Address?fromCheckout=true');
    await app.press('Credit');
    assert.equal(app.find('Credit').props.accessibilityState.checked, true);
    await app.press('Order note'); await app.fill('Order instructions', 'Call on arrival');
    await app.press('Place order');
    assert.equal(app.orders.length, 0);
    assert.equal(nodes(app.render()).find(node => node.type === 'Modal').props.visible, true);
    await app.confirmOrder();
    const order = app.orders[0];
    assert.equal(order.total, 207); assert.equal(order.shipping_charge, 5); assert.equal(order.tax, 2);
    assert.equal(order.payment_method, 2); assert.equal(order.shipping_id, 3);
    assert.equal(order.note, 'Call on arrival'); assert.equal(order.products[0].variation_id, 70);
    assert.ok(nodes(app.render()).some(node => node.props?.children === 'Thank you!'));
  });
}

test('promo disclosure preserves coupon validation, refreshed total and removal', async () => {
  const app = screen(); await app.ready();
  await app.press('Promo code'); await app.fill('Enter promo code', 'SAVE20'); await app.press('Apply promo code');
  assert.equal(app.coupons[0][2][0].variation_id, 70);
  assert.equal(app.quotes.at(-1).coupon_id, 9);
  assert.ok(nodes(app.render()).some(node => node.props?.children === '$187.00'));
  await app.press('Remove coupon');
  assert.equal(app.quotes.at(-1).coupon_id, undefined);
  assert.ok(nodes(app.render()).some(node => node.props?.children === '$207.00'));
});

test('missing address or active payment prevents submission, and inactive default gateways are skipped', async () => {
  const noAddress = screen({ addresses: [], savedAddress: '999' }); await noAddress.ready();
  assert.equal(noAddress.find('Place order').props.disabled, true);
  await noAddress.press('Choose delivery address');
  assert.equal(noAddress.routes.at(-1), '/Address?fromCheckout=true');
  const noPayment = screen({ payments: [] }); await noPayment.ready();
  assert.equal(noPayment.find('Place order').props.disabled, true);
  const inactiveDefault = screen({ payments: [{ id: 1, name: 'Inactive', status: 10 }, { id: 2, name: 'Credit', status: 5 }] });
  await inactiveDefault.ready();
  assert.equal(inactiveDefault.find('Credit').props.accessibilityState.checked, true);
  assert.equal(inactiveDefault.find('Inactive'), undefined);
});

test('quote and data errors offer retry without presenting an unconfirmed free delivery', async () => {
  const app = screen({ quoteFailure: true }); await app.ready();
  assert.equal(app.find('Place order').props.disabled, true);
  assert.ok(!nodes(app.render()).some(node => node.props?.children === 'Free'));
  app.recoverQuote(); await app.press('Retry order total');
  assert.equal(app.find('Place order').props.disabled, false);
  const offline = screen({ dataFailure: true }); await offline.ready();
  assert.ok(offline.find('Retry checkout'));
  offline.recoverData(); await offline.press('Retry checkout');
  assert.equal(offline.find('Place order').props.disabled, false);
});
