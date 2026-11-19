const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function nodes(tree) {
  return !tree || typeof tree !== 'object' ? [] : [tree, ...[tree.props?.children].flat(Infinity).flatMap(nodes)];
}
function screen({ system = true, scheme = 'light', deviceScheme = 'light' } = {}) {
  const calls = [];
  let saving = false, backs = 0;
  const context = {
    colorScheme: scheme, isSystemMode: system,
    async setSystemMode(value) { calls.push(['system', value]); context.isSystemMode = value; if (value) context.colorScheme = deviceScheme; },
    async setTheme(value) { calls.push(['theme', value]); context.colorScheme = value; },
  };
  const theme = { background: '#f3f3f3', text: '#1e2b33', textSecondary: '#3c4a52', icon: '#63727c' };
  const mocks = {
    react: { useContext: () => context, useState: () => [saving, value => { saving = value; }] },
    'react-native': { ...Object.fromEntries(['ScrollView', 'StatusBar', 'TouchableOpacity', 'View'].map(name => [name, name])), StyleSheet: { create: value => value, hairlineWidth: 1 } },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    'expo-router': { useRouter: () => ({ back: () => { backs++; } }) },
    '@expo/vector-icons': { Ionicons: 'Icon' },
    '@/components/ui/icon-button': { IconButton: 'IconButton' }, '@/components/themed-text': { ThemedText: 'Text' },
    '@/contexts/theme-context': { ThemeContext: {} },
    '@/constants/theme': { Colors: { light: theme, dark: { ...theme, background: '#151718', text: '#ECEDEE' } } },
  };
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../app/screens/settings.tsx'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, require: name => name === 'react/jsx-runtime' ? require(name) : mocks[name] });
  const render = () => exports.default();
  const option = label => nodes(render()).find(node => node.props?.accessibilityRole === 'radio' && node.props.accessibilityLabel === label);
  return { render, option, calls, context, get backs() { return backs; } };
}

test('theme cards select Light/Dark explicitly, persist through context and disable choices during saving', async () => {
  const app = screen();
  assert.equal(app.option('System').props.accessibilityState.checked, true);
  const selection = app.option('Dark').props.onPress();
  assert.equal(app.option('Light').props.disabled, true);
  await selection;
  assert.deepEqual(app.calls, [['system', false], ['theme', 'dark']]);
  assert.equal(app.option('Dark').props.accessibilityState.checked, true);
  assert.equal(app.option('Light').props.disabled, false);
  assert.ok(nodes(app.render()).some(node => node.props?.children === 'Dark appearance'));
  await app.option('Light').props.onPress();
  assert.deepEqual(app.calls.slice(-2), [['system', false], ['theme', 'light']]);
  assert.equal(app.option('Light').props.accessibilityState.checked, true);
});

test('System follows the device and selecting the already active option does not rewrite preferences', async () => {
  const app = screen({ system: false, scheme: 'light', deviceScheme: 'dark' });
  await app.option('Light').props.onPress();
  assert.equal(app.calls.length, 0);
  await app.option('System').props.onPress();
  assert.deepEqual(app.calls, [['system', true]]);
  assert.equal(app.context.colorScheme, 'dark');
  assert.equal(app.option('System').props.accessibilityState.checked, true);
  assert.ok(nodes(app.render()).some(node => node.props?.children === 'Currently using dark mode'));
  nodes(app.render()).find(node => node.props?.label === 'Go back').props.onPress();
  assert.equal(app.backs, 1);
});
