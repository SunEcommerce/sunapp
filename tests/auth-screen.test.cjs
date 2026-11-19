const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function nodes(element) {
  if (!element || typeof element !== 'object') return [];
  return [element, ...[element.props?.children].flat(Infinity).flatMap(nodes)];
}

function screen(mode = 'login') {
  const state = [], requests = [], routes = [], stored = [];
  let cursor = 0;
  const react = require('react');
  const theme = { background: '#f3f3f3', text: '#1e2b33', textSecondary: '#3c4a52' };
  const mocks = {
    '@/components/ui/text-input': { TextInput: 'TextInput' },
    react: { ...react, useContext: () => ({ colorScheme: 'light' }), useRef: () => ({ current: null }),
      useState: initial => { const index = cursor++; if (!(index in state)) state[index] = initial;
        return [state[index], next => { state[index] = typeof next === 'function' ? next(state[index]) : next; }]; } },
    'react-native': { ...Object.fromEntries(['ActivityIndicator', 'KeyboardAvoidingView', 'ScrollView', 'Text', 'TextInput', 'TouchableOpacity', 'View'].map(name => [name, name])),
      Platform: { OS: 'web' }, StyleSheet: { create: value => value, hairlineWidth: 1 } },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    '@/components/ui/icon-button': { IconButton: 'IconButton' },
    '@/constants/theme': { Colors: { light: theme } }, '@/contexts/theme-context': { ThemeContext: {} },
    '@expo/vector-icons': { Ionicons: 'Icon' },
    '@react-native-async-storage/async-storage': { __esModule: true, default: { setItem: async (...args) => stored.push(args) } },
    'expo-router': { useLocalSearchParams: () => ({ mode }), useRouter: () => ({ push: route => routes.push(route), canGoBack: () => false, replace: route => routes.push(route) }) },
    '@/utils/api': Object.fromEntries(['login', 'register', 'requestPasswordResetOTP', 'verifyPasswordResetOTP', 'resetPassword'].map(name => [name, async (...args) => {
      requests.push({ name, args }); return name === 'login' ? { user: { name: 'Test Shopper' } } : {};
    }])),
  };
  const exports = {};
  const source = fs.readFileSync(require('node:path').join(__dirname, '../app/Auth.tsx'), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText,
    { exports, require: name => name === 'react/jsx-runtime' ? require(name) : mocks[name] });
  const render = () => { cursor = 0; return exports.default(); };
  const field = label => nodes(render()).find(node => typeof node.type === 'function' && node.props?.label === label);
  const fill = (label, value) => { const entry = field(label); assert.ok(entry, label); entry.props.onChangeText(value); };
  const press = async label => {
    const button = nodes(render()).find(node => node.props?.accessibilityRole === 'button' && (node.props.accessibilityLabel === label || nodes(node).some(child => child.type === 'Text' && child.props.children === label)));
    assert.ok(button, label); button.props.onPress(); await new Promise(resolve => setImmediate(resolve));
  };
  return { render, field, fill, press, requests, routes, stored };
}

test('sign in displays inline validation, then preserves login, profile storage and navigation', async () => {
  const app = screen();
  await app.press('Sign in');
  assert.equal(app.requests.length, 0);
  assert.ok(nodes(app.render()).some(node => node.props?.children === 'Please fill in all fields'));
  app.fill('Email', 'shopper@example.test'); app.fill('Password', 'test-password');
  await app.press('Sign in');
  assert.equal(app.requests[0].name, 'login');
  assert.deepEqual(app.requests[0].args, ['shopper@example.test', 'test-password']);
  assert.equal(app.stored[0][0], 'user_profile');
  assert.deepEqual(app.routes, ['/']);
});

test('registration deep link, password visibility, mismatch validation and API contract remain intact', async () => {
  const app = screen('register');
  app.fill('Full name', 'Test Shopper'); app.fill('Email', 'shopper@example.test'); app.fill('Phone number', '091234567');
  app.fill('Password', 'test-password'); app.fill('Confirm password', 'different'); app.fill('OTP code', '123456');
  app.field('Password').props.onToggle();
  assert.equal(app.field('Password').props.visible, true);
  await app.press('Create account');
  assert.equal(app.requests.length, 0);
  assert.ok(nodes(app.render()).some(node => node.props?.children === 'Passwords do not match'));
  app.fill('Confirm password', 'test-password'); await app.press('Create account');
  assert.equal(app.requests[0].name, 'register');
  assert.deepEqual(app.requests[0].args, ['Test Shopper', 'shopper@example.test', '091234567', 'test-password', 'test-password', '123456']);
  assert.ok(app.field('Email'));
  assert.equal(app.field('Full name'), undefined);
});

test('password recovery keeps request, verification and reset steps and payloads', async () => {
  const app = screen();
  await app.press('Forgot password?');
  app.fill('Email', 'shopper@example.test'); await app.press('Send reset code');
  assert.equal(app.requests[0].name, 'requestPasswordResetOTP');
  assert.deepEqual(app.requests[0].args, ['email', 'shopper@example.test', '', '+95']);
  app.fill('OTP code', '123456'); await app.press('Verify code');
  assert.equal(app.requests[1].name, 'verifyPasswordResetOTP');
  app.fill('New password', 'new-test-password'); app.fill('Confirm new password', 'new-test-password');
  await app.press('Save new password');
  assert.equal(app.requests[2].name, 'resetPassword');
  assert.deepEqual(app.requests[2].args, ['email', '123456', 'new-test-password', 'new-test-password', 'shopper@example.test', '', '+95']);
  assert.ok(nodes(app.render()).some(node => node.props?.children === 'Welcome back'));
});
