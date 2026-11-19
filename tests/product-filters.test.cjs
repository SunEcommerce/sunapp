const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function nodes(tree) {
  return !tree || typeof tree !== 'object' ? [] : [tree, ...[tree.props?.children].flat(Infinity).flatMap(nodes)];
}

function sheet(initial, colorScheme, brandResponse = []) {
  const state = [], effects = [];
  let cursor = 0, applied, closed = 0, resets = 0;
  const colors = { text: '#123', textSecondary: '#456', background: '#fff', card: '#fff', icon: '#456' };
  const mocks = {
    react: {
      useContext: () => ({ colorScheme }), useMemo: fn => fn(), useEffect: fn => effects.push(fn),
      useState(value) {
        const index = cursor++;
        if (!(index in state)) state[index] = value;
        return [state[index], next => { state[index] = typeof next === 'function' ? next(state[index]) : next; }];
      },
    },
    'react-native': { Image: 'Image', View: 'View', ScrollView: 'ScrollView', TouchableOpacity: 'Button', StyleSheet: { create: value => value } },
    'react-native-modal': { __esModule: true, default: 'Modal' },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    'react-redux': { useSelector: () => [{ slug: 'phones', name: 'Phones' }] },
    '@expo/vector-icons': { Ionicons: 'Icon' },
    '@ptomasroos/react-native-multi-slider': { __esModule: true, default: 'Slider' },
    '@/components/ui/text-input': { TextInput: 'Input' },
    '@/components/themed-text': { ThemedText: 'Text' },
    '@/constants/theme': { Colors: { light: colors, dark: colors } },
    '@/contexts/theme-context': { ThemeContext: {} },
    '@/store/categoriesSlice': {}, '@/utils/api': { fetchBrands: async () => brandResponse },
  };
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../components/FilterBottomSheet.tsx'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, require: name => name === 'react/jsx-runtime' ? require(name) : mocks[name] });
  return {
    get applied() { return applied; }, get closed() { return closed; }, get resets() { return resets; },
    async loadBrands() {
      effects[0]();
      await new Promise(resolve => setImmediate(resolve));
    },
    render() {
      cursor = 0;
      return nodes(exports.default({ initial, visible: true, onApply: value => { applied = value; }, onClose: () => closed++, onReset: () => resets++ }));
    },
  };
}

for (const theme of ['light', 'dark']) {
  test(`${theme}: category selection does not implicitly apply a price limit; reset clears restrictions`, () => {
    const app = sheet({ category: 'all', brands: [], sortBy: 'best' }, theme);
    const button = label => app.render().find(node => node.type === 'Button' && nodes(node).some(child => child.props?.children === label));
    button('Phones').props.onPress();
    button('Show products').props.onPress();
    assert.equal(app.applied.category, 'phones');
    assert.equal(app.applied.priceRange, undefined);
    assert.equal(app.closed, 1);
    button('Reset').props.onPress();
    button('Show products').props.onPress();
    assert.equal(app.applied.category, 'all');
    assert.equal(app.applied.priceRange, undefined);
    assert.equal(app.resets, 1);
  });
}

test('price inputs validate before applying and slider width follows the available space', () => {
  const app = sheet({ category: 'all', brands: [], sortBy: 'best', priceRange: [10, 100] }, 'light');
  let tree = app.render();
  const apply = () => app.render().find(node => node.type === 'Button' && nodes(node).some(child => child.props?.children === 'Show products'));
  tree.find(node => node.props?.accessibilityLabel === 'Minimum price').props.onChangeText('200');
  assert.equal(apply().props.disabled, true);
  apply().props.onPress();
  assert.equal(app.applied, undefined);
  app.render().find(node => node.props?.accessibilityLabel === 'Maximum price').props.onChangeText('300');
  assert.equal(apply().props.disabled, false);
  apply().props.onPress();
  assert.deepEqual(Array.from(app.applied.priceRange), [200, 300]);
  tree.find(node => node.props?.onLayout).props.onLayout({ nativeEvent: { layout: { width: 288 } } });
  assert.equal(app.render().find(node => node.type === 'Slider').props.sliderLength, 260);
});

test('brand section is absent for empty responses and appears with selectable API brands', async () => {
  const initial = { category: 'all', brands: [], sortBy: 'best' };
  for (const response of [[], { data: [] }, {}]) {
    const app = sheet(initial, 'light', response);
    app.render();
    await app.loadBrands();
    assert.ok(!app.render().some(node => node.props?.children === 'Brand'));
  }
  const app = sheet(initial, 'light', { data: [{ id: 7, name: 'Sun', slug: 'sun' }] });
  app.render();
  await app.loadBrands();
  assert.ok(app.render().some(node => node.props?.children === 'Brand'));
  app.render().find(node => node.props?.accessibilityLabel === 'Sun').props.onPress();
  assert.equal(app.render().find(node => node.props?.accessibilityLabel === 'Sun').props.accessibilityState.checked, true);
});

test('price sorting shows distinct direction icons and selected state and applies either direction', () => {
  const app = sheet({ category: 'all', brands: [], sortBy: 'best' }, 'light');
  for (const [label, direction, sort] of [
    ['Price Low → High', 'arrow-up-outline', 'price_low_high'],
    ['Price High → Low', 'arrow-down-outline', 'price_high_low'],
  ]) {
    const option = () => app.render().find(node => node.props?.accessibilityRole === 'radio' && nodes(node).some(child => child.props?.children === label));
    assert.ok(nodes(option()).some(node => node.type === 'Icon' && node.props.name === direction));
    option().props.onPress();
    assert.equal(option().props.accessibilityState.checked, true);
    app.render().find(node => node.type === 'Button' && nodes(node).some(child => child.props?.children === 'Show products')).props.onPress();
    assert.equal(app.applied.sortBy, sort);
  }
});


test('brand logos fall back from cover to thumbnail to initials without clearing selection', async () => {
  const app = sheet({ brands: ['sun'], category: 'all', sortBy: 'best' }, 'dark', {
    data: [{ id: 7, name: 'Sun Mobile', slug: 'sun', cover: 'https://example.test/cover.png', thumb: 'https://example.test/thumb.png' }],
  });
  app.render();
  await app.loadBrands();
  const logo = () => app.render().find(node => node.type === 'Image');
  assert.equal(logo().props.source.uri, 'https://example.test/cover.png');
  assert.equal(logo().props.resizeMode, 'contain');
  logo().props.onError();
  assert.equal(logo().props.source.uri, 'https://example.test/thumb.png');
  logo().props.onError();
  assert.equal(logo(), undefined);
  assert.ok(app.render().some(node => node.props?.children === 'SM'));
  const option = () => app.render().find(node => node.props?.accessibilityLabel === 'Sun Mobile');
  assert.equal(option().props.accessibilityState.checked, true);
  option().props.onPress();
  assert.equal(option().props.accessibilityState.checked, false);
  option().props.onPress();
  app.render().find(node => node.type === 'Button' && nodes(node).some(child => child.props?.children === 'Show products')).props.onPress();
  assert.deepEqual(Array.from(app.applied.brands), ['7']);
});
