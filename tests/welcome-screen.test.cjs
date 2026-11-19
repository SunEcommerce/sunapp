const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function moduleFrom(file, mocks = {}, globals = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(code, { exports, require: id => id in mocks ? mocks[id] : require(id), console, URL, ...globals });
  return exports;
}
const helpers = moduleFrom('utils/welcome-screen.ts');
function nodes(tree) {
  return !tree || typeof tree !== 'object' ? [] : [tree, ...[tree.props?.children].flat(Infinity).flatMap(nodes)];
}
function screen(failStorage = false, display = true) {
  let waiting;
  let cursor = 0, now = 0, tick, back, removed = 0, cleared = 0, unavailable = 0;
  const states = [], effects = [], writes = [], routes = [];
  class Clock extends Date { static now() { return now; } }
  const Component = moduleFrom('components/welcome-screen.tsx', {
    '@/utils/welcome-screen': helpers,
    '@/assets/images/welcome-tech.png': 1,
    '@/assets/images/sun-logo.png': 2,
    '@/components/welcome-skip-button': { WelcomeSkipButton: 'Skip' },
    '@expo/vector-icons': { Ionicons: 'Icon' },
    '@react-native-async-storage/async-storage': { default: { setItem: async (...args) => { writes.push(args); if (failStorage) throw new Error('Unavailable'); } } },
    'expo-router': { useRouter: () => ({ replace: route => routes.push(route) }), useLocalSearchParams: () => ({ returnTo: '/ProductDetail?productId=7' }) },
    'expo-image': { Image: 'CachedImage' },
    'expo-status-bar': { StatusBar: 'StatusBar' },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    'react-native': { Image: 'Image', Pressable: 'Button', ScrollView: 'ScrollView', Text: 'Text', View: 'View', StyleSheet: { create: x => x }, BackHandler: { addEventListener: (_event, handler) => { back = handler; return { remove: () => removed++ }; } } },
    react: {
      useCallback: fn => fn, useEffect: fn => effects.push(fn),
      useRef(value) { const index = cursor++; return states[index] ??= { current: value }; },
      useState(value) { const index = cursor++; if (!(index in states)) states[index] = value; return [states[index], next => states[index] = next]; },
    },
  }, { Date: Clock, setInterval: fn => { tick = fn; return 1; }, clearInterval: () => cleared++, setTimeout: fn => { waiting = fn; return 2; }, clearTimeout() { waiting = undefined; }, console: { warn() {} } }).WelcomeScreen;
  const render = () => { cursor = 0; effects.length = 0; return nodes(Component({ image: { width: 100, height: 100 }, readyBy: 1000,
    onReady() {}, onDismiss: () => routes.push('/ProductDetail?productId=7'), onUnavailable: () => unavailable++ })); };
  const initial = render();
  const stopWaiting = effects[0]();
  assert.ok(!initial.some(node => node.props?.accessibilityRole === 'checkbox'));
  assert.equal(tick, undefined);
  if (display) initial.find(node => node.type === 'CachedImage').props.onDisplay();
  render();
  let stopTimer = effects[1]();
  const cleanup = () => { stopWaiting?.(); stopTimer?.(); };
  return { render, writes, routes,
    display() {
      initial.find(node => node.type === 'CachedImage').props.onDisplay();
      stopWaiting(); render(); stopTimer = effects[1]();
    },
    failImage() { initial.find(node => node.type === 'CachedImage').props.onError(); },
    expire() { waiting?.(); },
    advance(ms) { now += ms; tick?.(); }, back: () => back(), cleanup,
    get unavailable() { return unavailable; }, get removed() { return removed; }, get cleared() { return cleared; } };
}
const settle = () => new Promise(resolve => setImmediate(resolve));
test('startup preserves web, Expo and custom deep links and rejects recursive/external destinations', () => {
  for (const url of ['https://sun.test/ProductDetail?productId=7', 'exp://localhost:8081/--/ProductDetail?productId=7', 'SunStore://ProductDetail?productId=7']) {
    assert.equal(helpers.resolveWelcomeTarget(url), '/ProductDetail?productId=7');
  }
  assert.equal(helpers.resolveWelcomeTarget(null, '/cart'), '/cart');
  for (const target of ['//external.test', 'https://external.test', '/interstitial', '/interstitial?returnTo=/cart']) {
    assert.equal(helpers.safeWelcomeTarget(target), '/(tabs)');
  }
});
test('welcome starts unchecked, remains open before five seconds, then closes once without suppressing today', async () => {
  const app = screen();
  assert.equal(app.render().find(node => node.props?.accessibilityRole === 'checkbox').props.accessibilityState.checked, false);
  app.advance(4800);
  assert.equal(app.routes.length, 0);
  app.advance(200);
  await settle();
  app.advance(200);
  assert.deepEqual(app.routes, ['/ProductDetail?productId=7']);
  assert.deepEqual(app.writes, []);
  app.cleanup();
  assert.equal(app.cleared, 1);
  assert.equal(app.removed, 1);
});
test('checked opt-out persists only the local day before manual close and prevents duplicate navigation', async () => {
  const app = screen();
  app.render().find(node => node.props?.accessibilityRole === 'checkbox').props.onPress();
  assert.equal(app.render().find(node => node.props?.accessibilityRole === 'checkbox').props.accessibilityState.checked, true);
  app.render().find(node => node.type === 'Skip').props.onPress();
  app.advance(5000);
  await settle();
  assert.deepEqual(app.writes, [[helpers.WELCOME_HIDDEN_DATE_KEY, new Date().toDateString()]]);
  assert.deepEqual(app.routes, ['/ProductDetail?productId=7']);
});
test('unchecking before automatic dismissal leaves today unsuppressed', async () => {
  const app = screen();
  for (let i = 0; i < 2; i++) app.render().find(node => node.props?.accessibilityRole === 'checkbox').props.onPress();
  app.advance(5000);
  await settle();
  assert.deepEqual(app.writes, []);
});
test('Android back closes immediately even if saving the preference fails', async () => {
  const app = screen(true);
  app.render().find(node => node.props?.accessibilityRole === 'checkbox').props.onPress();
  assert.equal(app.back(), true);
  await settle();
  assert.deepEqual(app.routes, ['/ProductDetail?productId=7']);
});

test('skip border uses the remaining deadline, honors Reduce Motion changes and cleans up animation', async () => {
  const states = [], effects = [], animations = [];
  let cursor = 0, preferenceChanged, listenerRemoved = 0, pressed = 0;
  class Progress {
    setValue() {}
    interpolate(config) { return config; }
  }
  const Component = moduleFrom('components/welcome-skip-button.tsx', {
    react: {
      useEffect: fn => effects.push(fn),
      useRef(value) { return states[cursor++] ??= { current: value }; },
      useState(value) { const index = cursor++; if (!(index in states)) states[index] = value; return [states[index], next => states[index] = typeof next === 'function' ? next(states[index]) : next]; },
    },
    'react-native-svg': { default: 'Svg', Rect: 'Rect' },
    'react-native': {
      Pressable: 'Button', Text: 'Text', StyleSheet: { create: value => value }, Easing: { linear: 'linear' },
      AccessibilityInfo: {
        isReduceMotionEnabled: async () => false,
        addEventListener: (_event, handler) => { preferenceChanged = handler; return { remove: () => listenerRemoved++ }; },
      },
      Animated: { Value: Progress, createAnimatedComponent: () => 'AnimatedRect',
        timing: (_value, config) => { const record = { ...config, stopped: false }; animations.push(record); return { start() {}, stop() { record.stopped = true; } }; } },
    },
  }, { Date: { now: () => 1200 } }).WelcomeSkipButton;
  const render = seconds => { cursor = 0; effects.length = 0; return nodes(Component({ seconds, deadline: 5000, onPress: () => pressed++ })); };
  assert.ok(!render(5).some(node => node.type === 'AnimatedRect'));
  const removeListener = effects[0]();
  effects[1]();
  assert.equal(animations.length, 0);
  await settle();
  const running = render(4);
  assert.ok(running.some(node => node.type === 'AnimatedRect'));
  const stopAnimation = effects[1]();
  assert.equal(animations[0].duration, 3800);
  assert.equal(animations[0].easing, 'linear');
  assert.equal(animations[0].useNativeDriver, false);
  running.find(node => node.type === 'Button').props.onPress();
  assert.equal(pressed, 1);
  stopAnimation();
  preferenceChanged(true);
  assert.ok(!render(3).some(node => node.type === 'AnimatedRect'));
  effects[1]();
  assert.equal(animations.length, 1);
  assert.equal(animations[0].stopped, true);
  removeListener();
  assert.equal(listenerRemoved, 1);
});


test('countdown begins at actual image display, and missing/late images never expose controls', async () => {
  const waiting = screen(false, false);
  waiting.advance(800);
  assert.deepEqual(waiting.routes, []);
  assert.ok(!waiting.render().some(node => node.type === 'Skip'));
  waiting.display();
  waiting.advance(4999);
  assert.deepEqual(waiting.routes, []);
  waiting.advance(1);
  await settle();
  assert.deepEqual(waiting.routes, ['/ProductDetail?productId=7']);
  const failed = screen(false, false);
  failed.failImage();
  assert.equal(failed.unavailable, 1);
  assert.ok(!failed.render().some(node => node.type === 'Skip'));
  const late = screen(false, false);
  late.advance(1001); late.expire(); late.display();
  assert.ok(!late.render().some(node => node.type === 'Skip'));
  assert.equal(late.routes.length, 0);
});
