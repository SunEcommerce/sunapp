const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

test('subcategory artwork inherits the nearest real parent image through nested levels', () => {
  const { categoryDescendants } = load('utils/category-images.ts', {});
  const tree = { id: 1, cover: 'https://example.test/root.webp', children: [
    { id: 2, cover: 'https://example.test/images/default/category/cover.png', children: [{ id: 3 }] },
    { id: 4, cover: 'https://example.test/child.webp', children: [{ id: 5, thumb: '  ' }] },
  ] };
  const descendants = categoryDescendants(tree);
  assert.deepEqual(Array.from(descendants, category => category.imageSources[0]), [
    'https://example.test/root.webp', 'https://example.test/root.webp',
    'https://example.test/child.webp', 'https://example.test/child.webp',
  ]);
  assert.deepEqual(Array.from(descendants[2].imageSources), ['https://example.test/child.webp', 'https://example.test/root.webp']);
});

test('broken category thumbnails fall back to parent artwork and retry new URLs', () => {
  let failed = [];
  const react = require('react');
  const { CategoryThumbnail } = load('components/category-thumbnail.tsx', {
    react: { ...react, useState: () => [failed, next => { failed = typeof next === 'function' ? next(failed) : next; }] },
    '@expo/vector-icons/Ionicons': { __esModule: true, default: 'Icon' },
    'react-native': { View: 'View', Image: 'Image', StyleSheet: { create: value => value, absoluteFill: {} } },
  });
  const render = (sources = ['child.webp', 'parent.webp']) => CategoryThumbnail({ sources, size: 56, color: '#086b83', background: '#fff' }).props.children;
  assert.equal(render().props.source.uri, 'child.webp');
  render().props.onError();
  assert.equal(render().props.source.uri, 'parent.webp');
  render().props.onError();
  assert.equal(render().type, 'Icon');
  assert.equal(render(['new-child.webp', 'parent.webp']).props.source.uri, 'new-child.webp');
});

function load(file, mocks, globals = {}) {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const exports = {};
  vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
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

function renderProfile(signedIn = false) {
  const navigations = [];
  let stateIndex = 0;
  const react = require('react');
  const native = Object.fromEntries(['View', 'Text', 'TouchableOpacity', 'ScrollView', 'StatusBar'].map(name => [name, name]));
  native.StyleSheet = { create: value => value };
  const { default: Profile } = load('app/(tabs)/profile.tsx', {
    '@/hooks/use-tab-content-inset': { useTabContentInset: () => 108 },
    react: { ...react, useContext: () => ({ colorScheme: 'dark' }), useState: () => [[signedIn, signedIn ? { name: 'Demo Customer', phone: '1234567' } : null, null][stateIndex++], () => {}], useCallback: fn => fn },
    'react-native': native,
    '@/components/themed-text': { ThemedText: 'Text' }, '@/components/themed-view': { ThemedView: 'View' },
    '@/constants/theme': { Colors: { dark: { text: '#fff', card: '#222' } } },
    '@/components/HomeSkeleton': { HomeSkeleton: 'HomeSkeleton' },
    '@/contexts/theme-context': { ThemeContext: {} }, '@/utils/api': {},
    '@/hooks/use-tab-content-inset': { useTabContentInset: () => 0 },
    '@expo/vector-icons': { Ionicons: 'Icon' }, '@react-native-async-storage/async-storage': {},
    '@react-navigation/native': { useNavigation: () => ({}) }, 'expo-image': { Image: 'Image' },
    'expo-linear-gradient': { LinearGradient: 'Gradient' },
    'expo-router': { useFocusEffect: () => {}, useRouter: () => ({ push: route => navigations.push(route) }) },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
  });
  return { profileTree: Profile(), navigations };
}

test('Profile marks unsupported menus unavailable and opens privacy and authentication routes', () => {
  const { profileTree, navigations } = renderProfile();
  const menu = nodes(profileTree).filter(node => node.props?.label);
  for (const label of ['Language', 'Warranty', 'Apply Hire Purchase', 'Loyalty Program']) {
    const item = menu.find(node => node.props.label === label);
    assert.ok(item.props.unavailable);
    assert.equal(item.props.onPress, undefined);
    assert.equal(item.type(item.props).props.disabled, true);
  }
  menu.find(node => node.props.label === 'Privacy Policy').props.onPress();
  assert.equal(navigations[0].params.slug, 'privacy-policy');
  nodes(profileTree).find(node => node.props?.accessibilityLabel === 'Sign in').props.onPress();
  assert.equal(navigations[1], '/Auth');
  nodes(profileTree).find(node => node.props?.accessibilityLabel === 'Create account').props.onPress();
  assert.equal(navigations[2].pathname, '/Auth');
  assert.equal(navigations[2].params.mode, 'register');
});

test('signed-in profile shows real customer identity and working account shortcuts', () => {
  const { profileTree, navigations } = renderProfile(true);
  assert.ok(nodes(profileTree).some(node => node.props?.children === 'Demo Customer'));
  assert.equal(nodes(profileTree).some(node => node.props?.accessibilityLabel === 'Create account'), false);
  for (const label of ['My orders', 'Favorites', 'Addresses', 'Edit profile']) {
    nodes(profileTree).find(node => node.props?.accessibilityLabel === label).props.onPress();
  }
  assert.deepEqual(navigations, ['/OrderList', '/FavoriteProducts', '/Address', '/EditProfile']);
  assert.ok(nodes(profileTree).some(node => node.props?.accessibilityLabel === 'Sign out'));
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

test('Home supports on-demand search, compact scrolling and native/web pull-to-refresh', async () => {
  const state = [], effects = [], refs = [], routes = [];
  let cursor = 0, refCursor = 0, fail = true, categoryCalls = 0, bannerCalls = 0, pullConfig;
  const react = require('react');
  const dispatch = () => {};
  const native = Object.fromEntries(['View', 'Text', 'TouchableOpacity', 'ScrollView', 'Image', 'Modal', 'FlatList', 'TextInput', 'RefreshControl'].map(name => [name, name]));
  native.StyleSheet = { create: value => value };
  native.useWindowDimensions = () => ({ width: 375 });
  native.Platform = { OS: 'android' };
  native.Keyboard = { dismiss() {} };
  native.Animated = { View: 'View', Image: 'Image', Value: class {
    constructor(value) { this.value = value; }
    setValue(value) { this.value = value; }
    interpolate(options) { return { model: this, ...options }; }
  } };
  native.PanResponder = { create: config => { pullConfig = config; return { panHandlers: {} }; } };
  const mocks = {
    '@/assets/images/sun-logo.png': 1,
    '@/components/ui/text-input': { TextInput: 'TextInput' },
    react: { ...react, useContext: () => ({ colorScheme: 'light' }),
      useRef: value => { const index = refCursor++; return refs[index] ||= { current: value }; },
      useMemo: fn => fn(), useCallback: fn => fn,
      useEffect: callback => effects.push(callback),
      useState: value => { const index = cursor++; if (!(index in state)) state[index] = value; return [state[index], next => { state[index] = typeof next === 'function' ? next(state[index]) : next; }]; },
    },
    'react-native': native, '@expo/vector-icons': { Ionicons: 'Icon' },
    '@/components/ui/icon-button': { IconButton: 'IconButton' },
    '@/hooks/use-tab-content-inset': { useTabContentInset: () => 0 },
    '@/constants/theme': { Colors: { light: { text: '#333', background: '#fff' } } },
    '@/hooks/use-tab-content-inset': { useTabContentInset: () => 108 },
    '@/components/HomeSkeleton': { HomeSkeleton: 'HomeSkeleton' },
    '@/contexts/theme-context': { ThemeContext: {} }, '@/contexts/cart-context': { useCart: () => ({ itemCount: 0 }) },
    '@/store/categoriesSlice': { selectParentCategories: {}, setCategoriesTree: value => value, setLoading: value => value },
    'react-redux': { useDispatch: () => dispatch, useSelector: () => [] },
    'expo-router': { useRouter: () => ({ push: route => routes.push(route) }) }, 'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    '@/utils/api': {
      fetchCategoryTree: async () => { categoryCalls++; if (fail) throw new Error('offline'); return []; },
      fetchSlider: async () => { bannerCalls++; if (fail) throw new Error('offline'); return [{ id: 1, image: 'https://example.test/banner.webp' }]; },
    },
  };
  for (const section of ['CategoriesSection', 'FeaturedBrandsSection', 'HotSalesSection', 'NewArrivalsSection', 'ProductCustomSections', 'PromotionSection']) mocks[`@/components/${section}`] = { __esModule: true, default: section };
  const { default: Home } = load('app/(tabs)/index.tsx', mocks, { console: { error() {} } });
  const render = () => { cursor = 0; refCursor = 0; effects.length = 0; return Home(); };
  render();
  effects.slice(0, 2).forEach(effect => effect());
  await new Promise(resolve => setImmediate(resolve));
  const failed = nodes(render());
  assert.ok(failed.some(node => node.props?.children === 'Retry banners'));
  assert.ok(failed.some(node => node.props?.children === 'Retry categories'));
  assert.ok(!failed.some(node => node.props?.label === 'Refresh home'));
  failed.find(node => node.type === 'ScrollView' && node.props.refreshControl).props.refreshControl.props.onRefresh();
  fail = false;
  render();
  effects.slice(0, 2).forEach(effect => effect());
  await new Promise(resolve => setImmediate(resolve));
  const recovered = nodes(render());
  assert.equal(categoryCalls, 2);
  assert.equal(bannerCalls, 2);
  assert.ok(!recovered.some(node => node.props?.children === 'Retry banners'));
  for (const section of ['HotSalesSection', 'NewArrivalsSection', 'ProductCustomSections', 'FeaturedBrandsSection', 'PromotionSection']) {
    assert.equal(recovered.find(node => node.type === section).props.refreshKey, 1);
  }
  // Keep the complete desktop artwork at every container width, including after resizing.
  for (const width of [375, 1024, 1440]) {
    nodes(render()).find(node => node.props?.onLayout).props.onLayout({ nativeEvent: { layout: { width } } });
    const slider = nodes(render()).find(node => node.type === 'FlatList');
    const slide = slider.props.renderItem({ item: { image: 'https://example.test/banner.webp' } });
    assert.equal(slide.props.style[1].width, width);
    assert.equal(slide.props.style[1].height, width * 600 / 1689);
    assert.equal(slider.props.style.height, slide.props.style[1].height);
    assert.equal(slide.props.children.props.resizeMode, 'contain');
    assert.equal(slide.props.children.props.style.height, '100%');
  }
  assert.ok(!nodes(render()).some(node => node.type === 'TextInput'));
  nodes(render()).find(node => node.props?.label === 'Open search').props.onPress();
  const input = nodes(render()).find(node => node.type === 'TextInput');
  assert.equal(input.props.autoFocus, true);
  input.props.onChangeText('Phone');
  nodes(render()).find(node => node.type === 'TextInput').props.onSubmitEditing();
  assert.equal(routes.at(-1).params.name, 'Phone');
  nodes(render()).find(node => node.props?.label === 'Close search').props.onPress();
  assert.ok(!nodes(render()).some(node => node.type === 'TextInput'));
  const scroll = nodes(render()).find(node => node.type === 'ScrollView' && node.props.onScroll);
  scroll.props.onScroll({ nativeEvent: { contentOffset: { y: 200 } } });
  const logo = nodes(render()).find(node => node.props?.accessibilityLabel === 'Sun Mobile');
  assert.equal(logo.props.style[1].width.model.value, 80);
  native.Platform.OS = 'web';
  render();
  assert.equal(pullConfig.onMoveShouldSetPanResponderCapture(null, { dy: 100, dx: 0 }), false);
  scroll.props.onScroll({ nativeEvent: { contentOffset: { y: 0 } } });
  assert.equal(logo.props.style[1].width.model.value, 0);
  assert.equal(pullConfig.onMoveShouldSetPanResponderCapture(null, { dy: 10, dx: 100 }), false);
  assert.equal(pullConfig.onMoveShouldSetPanResponderCapture(null, { dy: 100, dx: 0 }), true);
  pullConfig.onPanResponderRelease(null, { dy: 100 });
  assert.equal(nodes(render()).find(node => node.type === 'PromotionSection').props.refreshKey, 2);
  assert.ok(nodes(render()).some(node => node.props?.accessibilityLabel === 'Refreshing home'));
});

test('Home categories show API images, fall back when missing or broken, and retry changed URLs', () => {
  let failedImage = null;
  const react = require('react');
  const category = { id: 1, name: 'Phones', slug: 'phones', cover: 'https://example.test/phones.webp' };
  const { default: Categories } = load('components/CategoriesSection.tsx', {
    react: { ...react, useContext: () => ({ colorScheme: 'light' }),
      useState: () => [failedImage, value => { failedImage = value; }],
    },
    'react-native': { View: 'View', Text: 'Text', TouchableOpacity: 'Button', Image: 'Image', FlatList: 'FlatList', StyleSheet: { create: value => value } },
    '@/constants/theme': { Colors: { light: { tint: '#0a7ea4' } } },
    '@/components/HomeSkeleton': { HomeSkeleton: 'HomeSkeleton' },
    '@/contexts/theme-context': { ThemeContext: {} },
    '@/store/categoriesSlice': { selectParentCategories: 'categories', selectCategoriesLoading: 'loading' },
    '@expo/vector-icons': { Ionicons: 'Icon' }, 'expo-router': { useRouter: () => ({}) },
    'react-redux': { useSelector: selector => selector === 'categories' ? [category] : false },
  });
  const list = nodes(Categories()).find(node => node.type === 'FlatList');
  const item = list.props.renderItem({ item: category });
  const imageComponent = nodes(item).find(node => typeof node.type === 'function');
  const renderImage = data => nodes(imageComponent.type({ ...imageComponent.props, item: data }));
  assert.equal(renderImage(category).find(node => node.type === 'Image').props.source.uri, category.cover);
  assert.equal(renderImage({ thumb: 'https://example.test/thumb.webp', cover: category.cover }).find(node => node.type === 'Image').props.source.uri, 'https://example.test/thumb.webp');
  for (const missing of [{}, { cover: '' }, { cover: 'https://example.test/images/default/category/cover.png' }]) {
    assert.ok(renderImage(missing).some(node => node.type === 'Icon'));
    assert.ok(!renderImage(missing).some(node => node.type === 'Image'));
  }
  renderImage(category).find(node => node.type === 'Image').props.onError();
  assert.ok(renderImage(category).some(node => node.type === 'Icon'));
  assert.ok(renderImage({ cover: 'https://example.test/updated.webp' }).some(node => node.type === 'Image'));
});

test('Home skeleton pulses only when motion is allowed and cleans up animation and preferences', async () => {
  const effects = [], timings = [];
  let reduced = true, preferenceChanged, removed = false, started = 0, stopped = 0, opacity;
  const react = require('react');
  const { HomeSkeleton } = load('components/HomeSkeleton.tsx', {
    react: { ...react, useContext: () => ({ colorScheme: 'dark' }),
      useState: () => [reduced, value => { reduced = value; }],
      useRef: value => ({ current: opacity ||= value }), useEffect: effect => effects.push(effect),
    },
    '@/contexts/theme-context': { ThemeContext: {} },
    'react-native': { View: 'View', StyleSheet: { create: value => value },
      AccessibilityInfo: {
        isReduceMotionEnabled: async () => false,
        addEventListener: (_, callback) => { preferenceChanged = callback; return { remove: () => { removed = true; } }; },
      },
      Animated: { View: 'AnimatedView', Value: class { constructor(value) { this.value = value; } setValue(value) { this.value = value; } },
        timing: (_, options) => { timings.push(options); return options; }, sequence: value => value,
        loop: () => ({ start: () => started++, stop: () => stopped++ }),
      },
    },
  });
  const render = () => { effects.length = 0; return HomeSkeleton({ variant: 'products', label: 'Loading hot sales' }); };
  const tree = render();
  assert.equal(tree.props.accessibilityRole, 'progressbar');
  assert.equal(tree.props.accessibilityState.busy, true);
  assert.equal(tree.props.accessibilityLabel, 'Loading hot sales');
  const unsubscribe = effects[0]();
  effects[1]();
  assert.equal(started, 0);
  await Promise.resolve();
  render();
  const stop = effects[1]();
  assert.equal(started, 1);
  assert.ok(timings.every(options => options.useNativeDriver));
  preferenceChanged(true);
  stop();
  render();
  effects[1]();
  assert.equal(started, 1);
  assert.equal(stopped, 1);
  assert.equal(opacity.value, 1);
  unsubscribe();
  assert.equal(removed, true);
});

test('promotion requests match web ordering, type and active status and exclude unusable banners', async () => {
  let request;
  const { fetchPromotions } = load('utils/promotions.ts', { './api': { apiRequest: async (...args) => {
    request = args;
    return { data: [
      { id: 1, slug: 'sale', status: 5, type: 5, cover: '/small.webp' },
      { id: 2, slug: 'inactive', status: 10, type: 5, cover: '/inactive.webp' },
      { id: 3, slug: 'wide', status: 5, type: 10, preview: '/wide.webp' },
      { id: 4, slug: 'no-image', status: 5, type: 5 },
    ] };
  } } });
  const result = await fetchPromotions(5);
  assert.match(request[0], /paginate=0&order_column=id&order_type=asc&type=5&status=5/);
  assert.equal(request[1], 'GET');
  assert.equal(request[3], false);
  assert.deepEqual(Array.from(result, item => item.id), [1]);
});

test('promotion banners use the web image variants and open their own product collection', () => {
  const routes = [], react = require('react');
  const { PromotionBanner } = load('components/PromotionSection.tsx', {
    react: { ...react, useContext: () => ({ colorScheme: 'light' }), useState: initial => [initial, () => {}] },
    '@/components/HomeSkeleton': {}, '@/hooks/use-promotions': {},
    '@/constants/theme': { Colors: { light: { card: '#fff' } } }, '@/contexts/theme-context': { ThemeContext: {} },
    'expo-router': { useRouter: () => ({ push: route => routes.push(route) }) },
    'react-native': { View: 'View', Text: 'Text', Image: 'Image', TouchableOpacity: 'Button', StyleSheet: { create: value => value, absoluteFill: {} } },
  });
  const promotion = { name: 'Weekend Sale', slug: 'weekend-sale', cover: '/small.webp', preview: '/wide.webp' };
  for (const small of [false, true]) {
    const tree = PromotionBanner({ promotion, small });
    assert.equal(nodes(tree).find(node => node.type === 'Image').props.source.uri, small ? promotion.cover : promotion.preview);
    tree.props.onPress();
    assert.equal(routes.at(-1).pathname, '/ProductList');
    assert.equal(routes.at(-1).params.source, 'promotion');
    assert.equal(routes.at(-1).params.promotion, promotion.slug);
  }
});

test('promotion product browsing keeps collection membership when search and price filters are applied', async () => {
  const requests = [];
  const { fetchFilteredProducts } = load('utils/product-listing.ts', { './api': { apiRequest: async (url, method, body) => {
    requests.push({ url, method, body });
    return method === 'GET' ? { data: [{ id: 2 }], meta: { current_page: 1, last_page: 1 } }
      : { data: { products: [{ id: 2 }, { id: 9 }], current_page: 1, last_page: 1 } };
  } } });
  const result = await fetchFilteredProducts({ source: 'promotion', promotion: 'weekend sale', category: 'all', name: 'Phone', brands: [], sortBy: 'price_low_high', priceRange: [0, 100] });
  assert.match(requests[0].url, /\/promotion\/products\/weekend%20sale\?page=1$/);
  assert.equal(requests[1].body.name, 'Phone');
  assert.equal(requests[1].body.max_price, 100);
  assert.deepEqual(Array.from(result.products, item => item.id), [2]);
});

test('wide promotions alternate with product sections and extra promotions stay visible', () => {
  const react = require('react');
  const sections = [{ id: 1, name: 'Section 1', products: [] }, { id: 2, name: 'Section 2', products: [] }];
  const promotions = [{ id: 3, name: 'Promo A' }, { id: 4, name: 'Promo B' }, { id: 5, name: 'Promo C' }];
  const { default: ProductSections } = load('components/ProductCustomSections.tsx', {
    react: { ...react, useContext: () => ({ colorScheme: 'light' }), useEffect: () => {}, useState: value => [Array.isArray(value) ? sections : false, () => {}] },
    '@/components/HomeSkeleton': { HomeSkeleton: 'Skeleton' },
    '@/components/PromotionSection': { PromotionBanner: 'PromotionBanner', PromotionRetry: 'Retry' },
    '@/hooks/use-promotions': { usePromotions: () => ({ promotions, loading: false, error: false }) },
    '@/contexts/theme-context': { ThemeContext: {} }, '@/constants/theme': { Colors: { light: { text: '#333' } } },
    '@/utils/api': {}, '@/utils/navigation': {}, 'expo-router': { useRouter: () => ({}) },
    'react-native': { View: 'View', Text: 'Text', Image: 'Image', FlatList: 'FlatList', TouchableOpacity: 'Button', StyleSheet: { create: value => value } },
  });
  const order = nodes(ProductSections({})).filter(node => node.type === 'PromotionBanner' || (node.type === 'Text' && /^Section /.test(node.props.children)))
    .map(node => node.type === 'PromotionBanner' ? node.props.promotion.name : node.props.children);
  assert.deepEqual(order, ['Section 1', 'Promo A', 'Section 2', 'Promo B', 'Promo C']);
});
