const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, mocks, globals = {}) {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const exports = {};
  vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, { exports, ...globals, require(name) {
    if (name in mocks) return mocks[name];
    if (name === 'react/jsx-runtime') return require(name);
    throw new Error(`Unexpected import: ${name}`);
  } });
  return exports;
}

test('Hot Sales View All excludes unrelated products and skips empty collection pages', async () => {
  const requests = [];
  const { fetchFilteredProducts } = load('utils/product-listing.ts', { './api': {
    fetchHotSales: async () => ({ data: [{ id: 7 }] }),
    apiRequest: async (url, method, body) => {
      requests.push({ url, method, body });
      const page = Number(url.split('page=')[1]);
      return { data: { products: page === 1 ? [{ id: 1 }] : [{ id: 7 }, { id: 8 }], current_page: page, last_page: 3 } };
    },
  } });
  const result = await fetchFilteredProducts({ source: 'hot_sales', category: 'phones', brands: [], sortBy: 'price_low_high', priceRange: [10, 100] });
  assert.deepEqual(Array.from(result.products, p => p.id), [7]);
  assert.equal(requests.length, 2);
  assert.equal(requests[0].body.category, 'phones');
  assert.equal(requests[0].body.min_price, 10);
  assert.equal(result.nextPage, 3);
  assert.equal(result.hasMore, true);
});

test('custom section membership includes every page without leaking other products', async () => {
  const requests = [];
  const { fetchFilteredProducts } = load('utils/product-listing.ts', { './api': {
    apiRequest: async (url, method) => {
      requests.push(url);
      const page = Number(url.split('page=')[1]);
      return method === 'GET'
        ? { data: [{ id: page + 8 }], meta: { current_page: page, last_page: 2 } }
        : { data: { products: [{ id: 9 }, { id: 10 }, { id: 11 }], current_page: 1, last_page: 1 } };
    },
  } });
  const result = await fetchFilteredProducts({ source: 'section', section: 'phone picks', category: 'all', brands: [], sortBy: 'best' });
  assert.match(requests[0], /phone%20picks\?page=1$/);
  assert.match(requests[1], /page=2$/);
  assert.deepEqual(Array.from(result.products, p => p.id), [9, 10]);
  assert.equal(result.hasMore, false);
});

test('icon buttons expose a name, button role and a minimum 44px touch target', () => {
  const { IconButton } = load('components/ui/icon-button.tsx', { 'react-native': { TouchableOpacity: 'button', StyleSheet: { create: value => value } } });
  const node = IconButton({ label: 'Go back', disabled: true, style: { width: 28, height: 28 }, children: 'icon' });
  assert.equal(node.props.accessibilityRole, 'button');
  assert.equal(node.props.accessibilityLabel, 'Go back');
  assert.equal(node.props.accessibilityState.disabled, true);
  const style = Object.assign({}, ...node.props.style);
  assert.equal(style.minWidth, 44);
  assert.equal(style.minHeight, 44);
});

function nodes(element) {
  if (!element || typeof element !== 'object') return [];
  return [element, ...[element.props?.children].flat(Infinity).flatMap(nodes)];
}

test('Profile marks unsupported menus unavailable and opens the real privacy page', () => {
  const navigations = [];
  const react = require('react');
  const native = Object.fromEntries(['View', 'Text', 'TouchableOpacity', 'ScrollView', 'StatusBar'].map(name => [name, name]));
  native.StyleSheet = { create: value => value };
  const { default: Profile } = load('app/(tabs)/profile.tsx', {
    '@/hooks/use-tab-content-inset': { useTabContentInset: () => 108 },
    react: { ...react, useContext: () => ({ colorScheme: 'dark' }), useState: value => [value, () => {}], useCallback: fn => fn },
    'react-native': native,
    '@/components/themed-text': { ThemedText: 'Text' }, '@/components/themed-view': { ThemedView: 'View' },
    '@/constants/theme': { Colors: { dark: { text: '#fff', card: '#222' } } },
    '@/contexts/theme-context': { ThemeContext: {} }, '@/utils/api': {},
    '@/hooks/use-tab-content-inset': { useTabContentInset: () => 0 },
    '@expo/vector-icons': { Ionicons: 'Icon' }, '@react-native-async-storage/async-storage': {},
    '@react-navigation/native': { useNavigation: () => ({}) }, 'expo-image': { Image: 'Image' },
    'expo-linear-gradient': { LinearGradient: 'Gradient' },
    'expo-router': { useFocusEffect: () => {}, useRouter: () => ({ push: route => navigations.push(route) }) },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
  });
  const menu = nodes(Profile()).filter(node => node.props?.label);
  for (const label of ['Language', 'Warranty', 'Apply Hire Purchase', 'Loyalty Program']) {
    const item = menu.find(node => node.props.label === label);
    assert.ok(item.props.unavailable);
    assert.equal(item.props.onPress, undefined);
    assert.equal(item.type(item.props).props.disabled, true);
  }
  menu.find(node => node.props.label === 'Privacy Policy').props.onPress();
  assert.equal(navigations[0].params.slug, 'privacy-policy');
});

test('secondary text and price colors meet 4.5:1 contrast in both themes', () => {
  const { Colors } = load('constants/theme.ts', { 'react-native': { Platform: { select: value => value.default } } });
  const luminance = hex => {
    const rgb = hex.slice(1, 7).match(/../g).map(value => parseInt(value, 16) / 255).map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  };
  for (const theme of Object.values(Colors)) for (const color of [theme.textSecondary, theme.success]) {
    const a = luminance(color), b = luminance(theme.card);
    assert.ok((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) >= 4.5);
  }
});

test('Home retries failed categories and banners and refreshes all product sections', async () => {
  const state = [], effects = [];
  let cursor = 0, fail = true, categoryCalls = 0, bannerCalls = 0;
  const react = require('react');
  const dispatch = () => {};
  const native = Object.fromEntries(['View', 'Text', 'TouchableOpacity', 'ScrollView', 'Image', 'Modal', 'FlatList', 'TextInput', 'RefreshControl'].map(name => [name, name]));
  native.StyleSheet = { create: value => value };
  native.useWindowDimensions = () => ({ width: 375 });
  const mocks = {
    react: { ...react, useContext: () => ({ colorScheme: 'light' }), useRef: value => ({ current: value }),
      useEffect: callback => effects.push(callback),
      useState: value => { const index = cursor++; if (!(index in state)) state[index] = value; return [state[index], next => { state[index] = typeof next === 'function' ? next(state[index]) : next; }]; },
    },
    'react-native': native, '@expo/vector-icons': { Ionicons: 'Icon' },
    '@/components/ui/icon-button': { IconButton: 'IconButton' },
    '@/hooks/use-tab-content-inset': { useTabContentInset: () => 0 },
    '@/constants/theme': { Colors: { light: { text: '#333', background: '#fff' } } },
    '@/hooks/use-tab-content-inset': { useTabContentInset: () => 108 },
    '@/contexts/theme-context': { ThemeContext: {} }, '@/contexts/cart-context': { useCart: () => ({ itemCount: 0 }) },
    '@/store/categoriesSlice': { selectParentCategories: {}, setCategoriesTree: value => value, setLoading: value => value },
    'react-redux': { useDispatch: () => dispatch, useSelector: () => [] },
    'expo-router': { useRouter: () => ({}) }, 'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    '@/utils/api': {
      fetchCategoryTree: async () => { categoryCalls++; if (fail) throw new Error('offline'); return []; },
      fetchSlider: async () => { bannerCalls++; if (fail) throw new Error('offline'); return []; },
    },
  };
  for (const section of ['CategoriesSection', 'FeaturedBrandsSection', 'HotSalesSection', 'NewArrivalsSection', 'ProductCustomSections']) mocks[`@/components/${section}`] = { __esModule: true, default: section };
  const { default: Home } = load('app/(tabs)/index.tsx', mocks, { console: { error() {} } });
  const render = () => { cursor = 0; effects.length = 0; return Home(); };
  render();
  effects.slice(0, 2).forEach(effect => effect());
  await new Promise(resolve => setImmediate(resolve));
  const failed = nodes(render());
  assert.ok(failed.some(node => node.props?.children === 'Retry banners'));
  assert.ok(failed.some(node => node.props?.children === 'Retry categories'));
  failed.find(node => node.props?.label === 'Refresh home').props.onPress();
  fail = false;
  render();
  effects.slice(0, 2).forEach(effect => effect());
  await new Promise(resolve => setImmediate(resolve));
  const recovered = nodes(render());
  assert.equal(categoryCalls, 2);
  assert.equal(bannerCalls, 2);
  assert.ok(!recovered.some(node => node.props?.children === 'Retry banners'));
  for (const section of ['HotSalesSection', 'NewArrivalsSection', 'ProductCustomSections', 'FeaturedBrandsSection']) {
    assert.equal(recovered.find(node => node.type === section).props.refreshKey, 1);
  }
});
