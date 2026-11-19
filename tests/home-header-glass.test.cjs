const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function glass(platform) {
  let reduced = platform === 'ios', effect, changed, removed = false, reads = 0;
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../components/home-header-glass.tsx'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, require(name) {
    if (name === 'react/jsx-runtime') return require(name);
    if (name === 'react') return { useState: () => [reduced, value => { reduced = value; }], useEffect: fn => { effect = fn; } };
    if (name === 'expo-blur') return { BlurView: 'BlurView' };
    if (name === 'react-native') return { View: 'View', Platform: { OS: platform }, StyleSheet: { absoluteFill: { position: 'absolute' } },
      AccessibilityInfo: { isReduceTransparencyEnabled: async () => { reads++; return false; },
        addEventListener: (_name, listener) => { changed = listener; return { remove() { removed = true; } }; } },
    };
    throw new Error(name);
  } });
  return {
    render: dark => exports.HomeHeaderGlass({ dark }),
    start: () => effect(), change: value => changed(value),
    get removed() { return removed; }, get reads() { return reads; },
  };
}

test('iOS glass respects Reduce Transparency and removes its preference listener', async () => {
  const app = glass('ios');
  assert.equal(app.render(false).props.children, false);
  const cleanup = app.start();
  await new Promise(resolve => setImmediate(resolve));
  let tree = app.render(true);
  assert.equal(tree.props.pointerEvents, 'none');
  assert.equal(tree.props.children.props.children[0].type, 'BlurView');
  assert.equal(tree.props.children.props.children[0].props.tint, 'dark');
  app.change(true);
  tree = app.render(true);
  assert.equal(tree.props.children, false);
  assert.equal(tree.props.style[1].backgroundColor, '#1b252c');
  cleanup();
  assert.equal(app.removed, true);
});

for (const platform of ['web', 'android']) test(`${platform}: glass uses a non-interactive blur without iOS-only preference calls`, () => {
  const app = glass(platform);
  const tree = app.render(false);
  app.start();
  assert.equal(app.reads, 0);
  assert.equal(tree.props.pointerEvents, 'none');
  assert.equal(tree.props.children.props.children[0].props.tint, 'light');
});
