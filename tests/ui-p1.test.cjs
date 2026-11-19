const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, mocks, globals = {}) {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  });
  const exports = {};
  vm.runInNewContext(compiled.outputText, {
    exports,
    ...globals,
    require(name) {
      if (name in mocks) return mocks[name];
      if (name === 'react/jsx-runtime') return require(name);
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  return exports;
}

test('listing sends category slug, brand IDs, zero price boundary and backend sort; unwraps pagination', async () => {
  const requests = [];
  const { fetchFilteredProducts } = load('utils/product-listing.ts', {
    './api': {
      apiRequest: async (...args) => {
        requests.push(args);
        return { data: { products: [{ id: 7 }], current_page: 2, last_page: 3 } };
      },
    },
  });
  const result = await fetchFilteredProducts({ category: 'phones', brands: ['3', '4'], priceRange: [0, 1100], sortBy: 'price_low_high', name: ' demo ', page: 2 });
  assert.equal(requests[0][0], '/api/frontend/product/category-wise-products?page=2');
  assert.equal(requests[0][1], 'POST');
  assert.deepEqual(JSON.parse(JSON.stringify(requests[0][2])), {
    category: 'phones', brand: '["3","4"]', min_price: 0, max_price: 1100,
    sort_by: 'price_low_to_high', name: 'demo', per_page: 30,
  });
  assert.equal(requests[0][3], false);
  assert.equal(result.products[0].id, 7);
  assert.equal(result.hasMore, true);
});

test('listing resolves brand deep links and reset removes category, brand and price restrictions', async () => {
  const requests = [];
  const { fetchFilteredProducts } = load('utils/product-listing.ts', {
    './api': {
      fetchBrands: async () => ({ data: [{ id: 9, slug: 'demo-brand' }] }),
      apiRequest: async (...args) => {
        requests.push(args);
        return { data: { products: [], current_page: 1, last_page: 1 } };
      },
    },
  });
  await fetchFilteredProducts({ category: 'all', brands: ['demo-brand'], sortBy: 'newest' });
  assert.equal(requests[0][2].brand, '["9"]');
  const result = await fetchFilteredProducts({ category: 'all', brands: [], sortBy: 'best' });
  assert.equal(requests[1][2].brand, '[]');
  assert.equal(requests[1][2].sort_by, '');
  assert.equal('category' in requests[1][2], false);
  assert.equal('min_price' in requests[1][2], false);
  assert.equal('max_price' in requests[1][2], false);
  assert.equal(result.hasMore, false);
});

test('invalid price ranges never issue a listing request', async () => {
  const { fetchFilteredProducts } = load('utils/product-listing.ts', {
    './api': { apiRequest: () => assert.fail('must not request invalid filters') },
  });
  for (const priceRange of [[100, 50], [-1, 10], [NaN, 10]]) {
    await assert.rejects(fetchFilteredProducts({ category: 'all', brands: [], priceRange, sortBy: 'best' }), /valid price range/);
  }
});

function nodes(element) {
  if (!element || typeof element !== 'object') return [];
  const children = [element.props?.children].flat(Infinity);
  return [element, ...children.flatMap(nodes)];
}

function renderCart(totalAmount = 25, platform = 'android', confirm = () => false) {
  const removed = [];
  const dialogs = [];
  const theme = { background: '#fff', text: '#000', textSecondary: '#333', borderColor: '#ddd' };
  const react = require('react');
  const native = Object.fromEntries(['View', 'Text', 'TouchableOpacity', 'ScrollView', 'Image', 'Pressable'].map(name => [name, name]));
  native.StyleSheet = { create: styles => styles };
  native.Alert = { alert: (...args) => dialogs.push(args) };
  native.Platform = { OS: platform };
  const { default: CartScreen } = load('app/(tabs)/cart.tsx', {
    react: { ...react, useContext: () => ({ colorScheme: 'light' }), useState: value => [value, () => {}], useEffect: () => {}, useCallback: fn => fn },
    'react-native': native,
    '@expo/vector-icons': { Ionicons: 'Icon' },
    '@/components/themed-text': { ThemedText: 'ThemedText' },
    '@/components/themed-view': { ThemedView: 'ThemedView' },
    '@/constants/theme': { Colors: { light: theme } },
    '@/contexts/theme-context': { ThemeContext: {} },
    '@/utils/api': { getAccessToken: async () => null },
    '@/contexts/cart-context': { useCart: () => ({
      items: [{ id: 'one', name: 'Phone case', sku: 'CASE', price: totalAmount, quantity: 1 }],
      itemCount: 1, totalAmount, removeFromCart: id => removed.push(id), updateQuantity: () => {},
    }) },
    '@react-native-async-storage/async-storage': {},
    'expo-router': { useRouter: () => ({ push: () => {} }), useFocusEffect: () => {} },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
  }, { window: { confirm } });
  return { tree: CartScreen(), removed, dialogs };
}

test('cart removal waits for confirmation and Cancel preserves the item', () => {
  const { tree, removed, dialogs } = renderCart();
  const remove = nodes(tree).find(el => el.type === 'TouchableOpacity' && nodes(el).some(child => child.type === 'Icon' && child.props.name === 'trash-outline'));
  assert.ok(remove);
  remove.props.onPress();
  assert.deepEqual(removed, []);
  const actions = dialogs[0][2];
  const cancel = actions.find(action => action.text === 'Cancel');
  cancel.onPress?.();
  assert.deepEqual(removed, []);
  actions.find(action => action.text === 'Remove').onPress();
  assert.deepEqual(removed, ['one']);
});

test('cart below $40 displays its real subtotal without a fabricated discount or free delivery', () => {
  const { tree } = renderCart(25);
  const text = nodes(tree).map(el => [el.props?.children].flat().filter(value => typeof value === 'string' || typeof value === 'number').join('')).join(' ');
  assert.match(text, /25\.00/);
  assert.doesNotMatch(text, /40\.00|-15\.00|Free|Discount/);
  assert.match(text, /Coupons and delivery fees are calculated at checkout/);
});

test('web cart deletion also requires confirmation', () => {
  for (const approved of [false, true]) {
    const { tree, removed } = renderCart(25, 'web', () => approved);
    const remove = nodes(tree).find(el => el.type === 'TouchableOpacity' && nodes(el).some(child => child.type === 'Icon' && child.props.name === 'trash-outline'));
    remove.props.onPress();
    assert.deepEqual(removed, approved ? ['one'] : []);
  }
});
