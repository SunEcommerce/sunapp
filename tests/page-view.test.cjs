const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function nodes(tree) {
  return !tree || typeof tree !== 'object' ? [] : [tree, ...[tree.props?.children].flat(Infinity).flatMap(nodes)];
}
function screen(initialSlug = 'contact-us', dark = false) {
  const state = [], effects = [], requests = [];
  let cursor = 0, slug = initialSlug, cleanup, backs = 0;
  const theme = { text: dark ? '#ECEDEE' : '#1e2b33', background: dark ? '#151718' : '#f3f3f3', textSecondary: dark ? '#C1C6C9' : '#3c4a52', icon: '#63727c' };
  const mocks = {
    react: { useContext: () => ({ colorScheme: dark ? 'dark' : 'light' }), useMemo: fn => fn(), useEffect: fn => effects.push(fn),
      useState(initial) { const index = cursor++; if (!(index in state)) state[index] = initial;
        return [state[index], next => { state[index] = typeof next === 'function' ? next(state[index]) : next; }]; },
    },
    'react-native': { ...Object.fromEntries(['View', 'ScrollView', 'StatusBar', 'TouchableOpacity', 'Image'].map(name => [name, name])),
      StyleSheet: { create: value => value, hairlineWidth: 1 }, useWindowDimensions: () => ({ width: 375 }) },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    'react-native-render-html': { __esModule: true, default: 'RenderHtml' },
    'html-entities': require('html-entities'),
    '@expo/vector-icons': { Ionicons: 'Icon' },
    'expo-router': { useLocalSearchParams: () => ({ slug }), useRouter: () => ({ back() { backs++; } }) },
    '@/components/HomeSkeleton': { HomeSkeleton: 'Skeleton' }, '@/components/ui/icon-button': { IconButton: 'IconButton' },
    '@/components/themed-text': { ThemedText: 'Text' }, '@/contexts/theme-context': { ThemeContext: {} },
    '@/constants/theme': { Colors: { light: theme, dark: theme } },
    '@/utils/api': { fetchPage: slug => new Promise((resolve, reject) => requests.push({ slug, resolve, reject })) },
  };
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../app/PageView.tsx'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, require: name => name === 'react/jsx-runtime' ? require(name) : mocks[name] });
  const render = () => { cursor = 0; effects.length = 0; return exports.default(); };
  return { render, requests, theme, get backs() { return backs; },
    run(nextSlug = slug) { slug = nextSlug; cleanup?.(); render(); cleanup = effects[0](); },
    async respond(data, index = requests.length - 1) { requests[index].resolve({ data }); await new Promise(resolve => setImmediate(resolve)); },
    async reject() { requests.at(-1).reject(new Error('offline')); await new Promise(resolve => setImmediate(resolve)); },
  };
}

for (const [slug, title] of [['contact-us', 'Contact Us'], ['privacy-policy', 'Privacy Policy'], ['terms-and-conditions', 'Terms & Conditions']]) {
  test(`${slug}: stable title, skeleton and complete HTML content use the same compact reader`, async () => {
    const app = screen(slug);
    assert.ok(nodes(app.render()).some(node => node.props?.children === title));
    assert.ok(nodes(app.render()).some(node => node.type === 'Skeleton'));
    app.run();
    const html = '<h2>Important information</h2><p>First &amp; second.</p><ul><li>Read every item.</li></ul>';
    await app.respond({ title, description: html });
    const reader = nodes(app.render()).find(node => node.type === 'RenderHtml');
    assert.equal(reader.props.source.html, html.replace('&amp;', '&'));
    assert.ok(reader.props.tagsStyles.p.marginBottom > 0);
    assert.ok(reader.props.classesStyles['info-group']);
    assert.equal(app.requests[0].slug, slug);
    nodes(app.render()).find(node => node.props?.onLayout).props.onLayout({ nativeEvent: { layout: { width: 500 } } });
    assert.equal(nodes(app.render()).find(node => node.type === 'RenderHtml').props.contentWidth, 466);
    nodes(app.render()).find(node => node.props?.label === 'Go back').props.onPress();
    assert.equal(app.backs, 1);
  });
}

test('dark HTML stays readable, removes empty spacer paragraphs and displays API artwork', async () => {
  const app = screen('contact-us', true); app.run();
  await app.respond({ title: 'Contact Us', description: '<p>Contact \\"team\\".</p><p><br></p>\\n<p>Email: shop@example.test</p>', image: 'contact.webp' });
  const tree = nodes(app.render()), reader = tree.find(node => node.type === 'RenderHtml');
  assert.equal(reader.props.baseStyle.color, '#ECEDEE');
  assert.ok(reader.props.ignoredStyles.includes('color'));
  assert.equal(reader.props.source.html, '<p>Contact "team".</p><p>Email: shop@example.test</p>');
  assert.equal(tree.find(node => node.type === 'Image').props.source.uri, 'contact.webp');
});

test('network errors support retry, missing slug makes no request and blank pages show an empty state', async () => {
  const app = screen(); app.run(); await app.reject();
  nodes(app.render()).find(node => node.props?.accessibilityLabel === 'Retry page').props.onPress();
  app.run(); await app.respond({ title: 'Contact Us', description: '' });
  assert.equal(app.requests.length, 2);
  assert.ok(nodes(app.render()).some(node => node.props?.children === 'No content available yet.'));
  const missing = screen(''); missing.run();
  assert.equal(missing.requests.length, 0);
  assert.ok(nodes(missing.render()).some(node => node.props?.children === 'No page selected'));
});

test('changing page ignores late responses for the previous slug', async () => {
  const app = screen('contact-us'); app.run();
  app.run(['privacy-policy']);
  await app.respond({ title: 'Privacy Policy', description: '<p>Privacy content.</p>' }, 1);
  await app.respond({ title: 'Contact Us', description: '<p>Old response.</p>' }, 0);
  assert.equal(nodes(app.render()).find(node => node.type === 'RenderHtml').props.source.html, '<p>Privacy content.</p>');
  assert.equal(app.requests[1].slug, 'privacy-policy');
});
