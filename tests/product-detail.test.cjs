const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function nodes(element) {
  if (!element || typeof element !== 'object') return [];
  return [element, ...[element.props?.children].flat(Infinity).flatMap(nodes)];
}

function load(file, mocks) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(code, { exports, setTimeout, clearTimeout, console, require: name => name === 'react/jsx-runtime' ? require(name) : mocks[name] });
  return exports;
}

const product = { id: 7, name: 'Demo phone', sku: 'PHONE', price: 100, old_price: 120, stock: 3, maximum_purchase_quantity: 2, image: 'phone.webp', images: ['phone.webp'], details: 'Product description' };

function screen({ preload, options = [], details = product, children = {}, reducedMotion = false } = {}) {
  let cursor = 0, refCursor = 0, resolveDetails;
  const state = [], effects = [], added = [], refs = [], scrolls = [];
  const react = require('react');
  const { default: Detail } = load('app/ProductDetail.tsx', {
    react: { ...react, useContext: () => ({ colorScheme: 'light' }), useRef: initial => { const index = refCursor++; return refs[index] ??= { current: initial }; }, useMemo: fn => fn(),
      useEffect: fn => effects.push(fn), useState: initial => { const index = cursor++; if (!(index in state)) state[index] = initial;
        return [state[index], next => { state[index] = typeof next === 'function' ? next(state[index]) : next; }]; } },
    'react-native': { ...Object.fromEntries(['Image', 'ScrollView', 'StatusBar', 'Text', 'TouchableOpacity', 'View'].map(name => [name, name])),
      StyleSheet: { create: value => value, hairlineWidth: 1 }, useWindowDimensions: () => ({ width: 375 }),
      AccessibilityInfo: { isReduceMotionEnabled: async () => reducedMotion, addEventListener: () => ({ remove() {} }) } },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView', useSafeAreaInsets: () => ({ bottom: 0 }) },
    'expo-router': { useRouter: () => ({ back() {} }), useLocalSearchParams: () => ({ slug: 'demo-phone', preloadData: preload }) },
    '@expo/vector-icons': { Ionicons: 'Icon' },
    '@/components/ui/icon-button': { IconButton: 'IconButton' }, '@/components/themed-text': { ThemedText: 'Text' },
    'expo-blur': { BlurView: 'BlurView' },
    '@/components/product-header-title': { ProductHeaderTitle: 'ProductHeaderTitle' },
    '@/components/product-detail-skeleton': { ProductDetailSkeleton: 'Skeleton' },
    '@/utils/product-gallery': load('utils/product-gallery.ts', {}),
    '@/constants/theme': { Colors: { light: { background: '#f3f3f3', text: '#1e2b33', textSecondary: '#3c4a52', success: '#087443' } } },
    '@/contexts/theme-context': { ThemeContext: {} }, '@/contexts/cart-context': { useCart: () => ({ addToCart: item => added.push(item) }) },
    '@/utils/api': { fetchProductDetails: () => new Promise(resolve => { resolveDetails = resolve; }), fetchInitialVariations: async () => ({ data: options }),
      fetchChildrenVariations: async (_, id) => ({ data: children[id] || [] }), postWishlistToggle: async () => {} },
  });
  const render = () => {
    cursor = 0; refCursor = 0; effects.length = 0;
    const tree = Detail();
    const gallery = nodes(tree).find(node => node.type === 'ScrollView' && node.props.horizontal && node.props.ref);
    if (gallery) gallery.props.ref.current = { scrollTo: options => scrolls.push(options) };
    return tree;
  };
  const start = () => { render(); effects.slice().forEach(effect => effect()); };
  return { render, added, start, scrolls, effects,
    async ready() { start(); resolveDetails({ data: details }); await new Promise(resolve => setImmediate(resolve)); },
  };
}

test('detail skeleton reserves gallery and purchase layout; preload keeps product visible and buying disabled', () => {
  const loading = screen({ preload: '{invalid-json' });
  const placeholders = nodes(loading.render()).filter(node => node.type === 'Skeleton');
  assert.equal(placeholders.length, 2);
  assert.equal(placeholders[0].props.galleryHeight, 375 * 0.7);
  assert.equal(placeholders[1].props.variant, 'purchase');
  loading.start();
  assert.equal(nodes(loading.render()).filter(node => node.type === 'Skeleton').length, 2);
  const cached = screen({ preload: JSON.stringify({ name: product.name, image: product.image, price: 100 }) });
  const cachedNodes = nodes(cached.render());
  assert.ok(cachedNodes.some(node => node.type === 'ProductHeaderTitle' && node.props.name === product.name));
  assert.ok(!cachedNodes.some(node => node.type === 'Text' && node.props.children === product.name));
  assert.ok(cachedNodes.some(node => node.type === 'Skeleton' && node.props.variant === 'details'));
  assert.equal(cachedNodes.some(node => node.props?.accessibilityLabel === 'Add to cart'), false);
});

test('compact purchase bar keeps prices in product info, deduplicates photos and preserves quantity limits and cart totals', async () => {
  const app = screen(); await app.ready();
  const find = label => nodes(app.render()).find(node => node.props?.label === label || node.props?.accessibilityLabel === label);
  assert.equal(nodes(app.render()).filter(node => node.type === 'Image').length, 1);
  assert.equal(nodes(app.render()).find(node => node.type === 'Image').props.resizeMode, 'contain');
  assert.equal(find('Decrease quantity').props.disabled, true);
  find('Increase quantity').props.onPress();
  assert.equal(find('Increase quantity').props.disabled, true);
  find('Increase quantity').props.onPress(); // Handler also clamps programmatic presses.
  find('Add to cart').props.onPress();
  assert.equal(app.added[0].quantity, 2);
  assert.equal(app.added[0].total, 200);
  assert.equal(app.added[0].item_type, 'Product');
  assert.equal(app.added[0].item_id, 7);
  const footer = nodes(app.render()).find(node => node.props?.onLayout && node.props?.style?.[0]?.position === 'absolute');
  assert.equal(nodes(footer).some(node => typeof node.props?.children === 'string' && node.props.children.startsWith('$')), false);
  assert.equal(find('Increase quantity').props.style[0].width, 44);
});

test('variation selection uses the selected SKU and price and resets selection after adding', async () => {
  const leaf = { id: 19, sku: 'PHONE-128', price: 150, stock: 2, product_attribute: { name: 'Storage' }, product_attribute_option_name: '128GB' };
  const app = screen({ options: [leaf] }); await app.ready();
  const cta = () => nodes(app.render()).find(node => node.props?.accessibilityLabel === 'Add to cart');
  assert.equal(cta().props.disabled, true);
  await nodes(app.render()).find(node => node.props?.accessibilityLabel === '128GB').props.onPress();
  assert.equal(cta().props.disabled, false);
  assert.ok(!nodes(app.render()).some(node => [node.props?.children].flat().some(child => typeof child === 'string' && child.startsWith('Selected:'))));
  assert.ok(nodes(app.render()).some(node => node.props?.accessibilityLabel === '128GB' && node.props.accessibilityState.selected));
  cta().props.onPress();
  assert.equal(app.added[0].item_type, 'ProductVariation');
  assert.equal(app.added[0].item_id, 19);
  assert.equal(app.added[0].sku, 'PHONE-128');
  assert.equal(app.added[0].price, 150);
  assert.equal(app.added[0].variation_names, '128GB');
  assert.equal(cta().props.disabled, true);
});

test('color selection slides immediately to the mapped image, and storage choices keep that image', async () => {
  const red = { id: 20, product_attribute_option_id: '201', product_attribute: { name: 'Color' }, product_attribute_option_name: 'Red', stock: 2 };
  const storage = { id: 21, product_attribute_option_id: 301, product_attribute: { name: 'Storage' }, product_attribute_option_name: '128GB', stock: 2, price: 100 };
  const details = { ...product, images: ['phone.webp', 'blue.webp'], images_meta: [
    { preview: 'blue.webp', custom_properties: { product_attribute_option_id: 200 } },
    { preview: 'red.webp', custom_properties: { product_attribute_option_id: 201 } },
  ] };
  const app = screen({ details, options: [red], children: { 20: [storage] } }); await app.ready();
  const selection = nodes(app.render()).find(node => node.props?.accessibilityLabel === 'Red').props.onPress();
  assert.equal(app.scrolls.at(-1).x, 375 * 2); // Mapped media is appended when the base gallery omits it.
  assert.equal(app.scrolls.at(-1).animated, true);
  await selection;
  assert.ok(nodes(app.render()).some(node => node.type === 'Image' && node.props.source.uri === 'red.webp'));
  const scrollCount = app.scrolls.length;
  await nodes(app.render()).find(node => node.props?.accessibilityLabel === '128GB').props.onPress();
  assert.equal(app.scrolls.length, scrollCount);
  const gallery = nodes(app.render()).find(node => node.props?.onLayout && node.props?.style?.[0]?.overflow === 'hidden');
  gallery.props.onLayout({ nativeEvent: { layout: { width: 500 } } });
  app.render(); app.effects[0]();
  assert.equal(app.scrolls.at(-1).x, 500 * 2);
  assert.equal(app.scrolls.at(-1).animated, false);
});

test('color image switching respects Reduce Motion and leaves the gallery unchanged for unmapped options', async () => {
  const red = { id: 20, product_attribute_option_id: 201, product_attribute_option_name: 'Red', stock: 2 };
  const other = { id: 22, product_attribute_option_id: 202, product_attribute_option_name: 'Other', stock: 2 };
  const app = screen({ reducedMotion: true, options: [red, other], details: { ...product, images_meta: [{ original_url: 'red-original.webp', custom_properties: { product_attribute_option_id: 201 } }] } });
  await app.ready();
  await nodes(app.render()).find(node => node.props?.accessibilityLabel === 'Red').props.onPress();
  assert.equal(app.scrolls.at(-1).x, 375);
  assert.equal(app.scrolls.at(-1).animated, false);
  const scrollCount = app.scrolls.length;
  await nodes(app.render()).find(node => node.props?.accessibilityLabel === 'Other').props.onPress();
  assert.equal(app.scrolls.length, scrollCount);
});

test('gallery mapping matches explicit option IDs, ignores missing associations and deduplicates URLs', () => {
  const { variationImageIndex, productGalleryImages } = load('utils/product-gallery.ts', {});
  const metadata = [null, { preview: 'unassigned.webp', custom_properties: {} },
    { preview: 'red.webp', original_url: 'red-original.webp', custom_properties: { product_attribute_option_id: '201' } }];
  const images = productGalleryImages({ image: ' main.webp ', images: ['main.webp', null, ''], images_meta: metadata });
  assert.deepEqual(Array.from(images), ['main.webp', 'unassigned.webp', 'red.webp']);
  assert.equal(variationImageIndex(201, metadata, images), 2);
  assert.equal(variationImageIndex(201, metadata, ['red-original.webp']), 0);
  for (const option of [undefined, null, 0, '', 'invalid', 999]) assert.equal(variationImageIndex(option, metadata, images), -1);
});

test('out-of-stock products cannot be added from the compact purchase bar', async () => {
  const app = screen({ details: { ...product, stock: 0 } }); await app.ready();
  const button = nodes(app.render()).find(node => node.props?.accessibilityLabel === 'Add to cart');
  assert.equal(button.props.disabled, true);
  button.props.onPress();
  assert.equal(app.added.length, 0);
});

test('detail skeleton pulses only when allowed and removes its animation and preference listener', async () => {
  let reduced = true, listener, removed = false, started = 0, stopped = 0, ref;
  const effects = [];
  const { ProductDetailSkeleton } = load('components/product-detail-skeleton.tsx', {
    react: { useContext: () => ({ colorScheme: 'dark' }), useState: () => [reduced, value => { reduced = value; }],
      useRef: value => ref ??= { current: value }, useEffect: effect => effects.push(effect) },
    '@/contexts/theme-context': { ThemeContext: {} },
    'react-native': { View: 'View', StyleSheet: { create: value => value },
      AccessibilityInfo: { isReduceMotionEnabled: async () => false, addEventListener: (_, callback) => { listener = callback; return { remove: () => { removed = true; } }; } },
      Animated: { View: 'AnimatedView', Value: class { setValue() {} }, timing: () => ({}), sequence: () => ({}),
        loop: () => ({ start: () => started++, stop: () => stopped++ }) } },
  });
  const initial = ProductDetailSkeleton({ galleryHeight: 300 });
  assert.equal(initial.props.accessibilityRole, 'progressbar');
  const unsubscribe = effects[0](); effects[1]();
  assert.equal(started, 0);
  await new Promise(resolve => setImmediate(resolve));
  effects.length = 0; ProductDetailSkeleton({ variant: 'details' });
  const stop = effects[1](); assert.equal(started, 1);
  listener(true); stop();
  effects.length = 0; ProductDetailSkeleton({ variant: 'details' }); effects[1]();
  assert.equal(started, 1); assert.equal(stopped, 1);
  unsubscribe(); assert.equal(removed, true);
});
