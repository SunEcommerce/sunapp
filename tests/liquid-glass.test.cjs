const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function render({ os = 'android', available = false, reduced = false } = {}) {
  const animations = [], effects = [];
  const react = require('react');
  const mocks = {
    react: { ...react, useState: () => [reduced, () => {}], useRef: value => ({ current: value }), useEffect: effect => effects.push(effect) },
    'react-native': {
      Platform: { OS: os }, View: 'View', StyleSheet: { create: value => value, absoluteFillObject: {}, absoluteFill: {} },
      Animated: { View: 'AnimatedView', Value: class { constructor(value) { this.value = value; } },
        timing: (_, options) => { animations.push(options); return { start() {}, stop() {} }; } },
      AccessibilityInfo: { isReduceMotionEnabled: async () => reduced, isReduceTransparencyEnabled: async () => reduced,
        addEventListener: () => ({ remove() {} }) },
    },
    'expo-blur': { BlurView: 'BlurView' },
    'expo-glass-effect': { GlassView: 'GlassView', isGlassEffectAPIAvailable: () => available, isLiquidGlassAvailable: () => available },
    'expo-linear-gradient': { LinearGradient: 'Gradient' },
    '@/components/haptic-tab': { HapticTab: 'TabButton' },
    './sculpted-tab-icon': { SculptedTabIcon: 'Icon' },
  };
  const source = fs.readFileSync(require('node:path').join(__dirname, '../components/liquid-glass-tab.tsx'), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } });
  const exports = {};
  vm.runInNewContext(compiled.outputText, { exports, require: name => name === 'react/jsx-runtime' ? require(name) : mocks[name] });
  return { ...exports, animations, effects };
}

function nodes(element) {
  if (!element || typeof element !== 'object') return [];
  return [element, ...[element.props?.children].flat(Infinity).flatMap(nodes)];
}

test('Android enables native blur, unsupported iOS falls back, supported iOS uses system glass', () => {
  for (const options of [{ os: 'android' }, { os: 'ios' }, { os: 'ios', available: true }]) {
    const { LiquidGlassBackground } = render(options);
    const tree = nodes(LiquidGlassBackground({ dark: true }));
    const glass = tree.find(node => node.type === 'GlassView');
    const blur = tree.find(node => node.type === 'BlurView');
    if (options.available) {
      assert.ok(glass);
      assert.equal(glass.props.colorScheme, 'dark');
      assert.equal(blur, undefined);
    } else {
      assert.ok(blur);
      assert.equal(blur.props.experimentalBlurMethod, 'dimezisBlurView');
      assert.equal(glass, undefined);
    }
  }
});

test('Reduce Transparency replaces glass and blur with an opaque surface', () => {
  const { LiquidGlassBackground } = render({ os: 'ios', available: true, reduced: true });
  const tree = LiquidGlassBackground({ dark: true });
  assert.equal(nodes(tree).some(node => ['BlurView', 'GlassView'].includes(node.type)), false);
  assert.equal(tree.props.style[1].backgroundColor, '#182733');
});

test('tab transitions respect Reduce Motion and preserve navigation, long-press and selected semantics', () => {
  for (const reduced of [false, true]) {
    const { GlassTabButton, effects, animations } = render({ reduced });
    let presses = 0, longPresses = 0;
    const tab = GlassTabButton({ dark: false, 'aria-selected': true, 'aria-label': 'Cart',
      onPress: () => presses++, onLongPress: () => longPresses++, children: 'Cart' });
    effects.forEach(effect => effect());
    assert.equal(animations[0].duration, reduced ? 0 : 220);
    assert.equal(tab.props['aria-selected'], true);
    assert.equal(tab.props['aria-label'], 'Cart');
    tab.props.onPress(); tab.props.onLongPress();
    assert.equal(presses, 1); assert.equal(longPresses, 1);
  }
});
