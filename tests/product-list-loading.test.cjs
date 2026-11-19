const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function screen() {
  const state = [], effects = [], requests = [];
  let cursor = 0;
  const mocks = {
    react: {
      useState(initial) {
        const index = cursor++;
        if (!(index in state)) state[index] = initial;
        return [state[index], value => { state[index] = typeof value === 'function' ? value(state[index]) : value; }];
      },
      useContext: () => ({ colorScheme: 'light' }),
      useMemo: fn => fn(),
      useEffect: fn => effects.push(fn),
    },
    'react-native': Object.assign(Object.fromEntries(['FlatList', 'Image', 'StatusBar', 'Text', 'TouchableOpacity', 'View'].map(name => [name, name])), {
      StyleSheet: { create: value => value }, useWindowDimensions: () => ({ width: 375 }),
    }),
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    'expo-router': { useLocalSearchParams: () => ({}), useRouter: () => ({}) },
    '@expo/vector-icons': { Ionicons: 'Icon' },
    '@/components/ui/text-input': { TextInput: 'Input' },
    '@/components/ui/icon-button': { IconButton: 'Button' },
    '@/components/FilterBottomSheet': { __esModule: true, default: 'Filter' },
    '@/components/HomeSkeleton': { HomeSkeleton: 'Skeleton' },
    '@/components/themed-text': { ThemedText: 'Text' },
    '@/constants/theme': { Colors: { light: {} } },
    '@/contexts/theme-context': { ThemeContext: {} },
    '@/utils/navigation': { navigateToProductDetail() {} },
    '@/utils/product-listing': { fetchFilteredProducts: params => new Promise(resolve => requests.push({ params, resolve })) },
  };
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../app/ProductList.tsx'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, require: name => name === 'react/jsx-runtime' ? require(name) : mocks[name] });
  return {
    requests,
    render() {
      cursor = 0;
      effects.length = 0;
      return exports.default().props.children.find(child => child?.type === 'FlatList').props;
    },
    fetch() { effects.at(-1)(); },
    async respond(products, hasMore, nextPage) {
      requests.at(-1).resolve({ products, hasMore, nextPage });
      await new Promise(resolve => setImmediate(resolve));
    },
  };
}

test('ProductList uses skeletons initially and during pagination, then announces the end', async () => {
  const app = screen();
  let list = app.render();
  assert.equal(list.ListEmptyComponent.type, 'Skeleton');
  assert.equal(list.ListEmptyComponent.props.variant, 'grid');
  assert.equal(list.ListEmptyComponent.props.cardWidth, 169.5);
  assert.equal(list.data.length, 0);
  assert.equal(list.ListFooterComponent, null);
  app.fetch();
  await app.respond([{ id: 1 }], true, 2);
  list = app.render();
  assert.equal(list.ListFooterComponent.props.children.props.children, 'Load More');
  list.ListFooterComponent.props.onPress();
  app.render();
  app.fetch();
  list = app.render();
  assert.equal(app.requests.at(-1).params.page, 2);
  assert.equal(list.data[0].id, 1);
  assert.equal(list.ListFooterComponent.type, 'Skeleton');
  assert.equal(list.ListFooterComponent.props.rows, 1);
  await app.respond([{ id: 2 }], false, 3);
  list = app.render();
  assert.deepEqual(Array.from(list.data, item => item.id), [1, 2]);
  assert.equal(list.ListFooterComponent.props.children, 'No more products');
  assert.equal(list.ListFooterComponent.props.accessibilityLiveRegion, 'polite');
});

test('an empty result shows the empty state without an end-of-products footer', async () => {
  const app = screen();
  app.render();
  app.fetch();
  await app.respond([], false, 2);
  const list = app.render();
  assert.equal(list.ListEmptyComponent.type, 'View');
  assert.equal(list.ListFooterComponent, null);
});
