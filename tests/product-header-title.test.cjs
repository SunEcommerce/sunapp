const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

test('header title scrolls only overflowing names, stops on cleanup and supports Reduce Motion', () => {
  const state = [], effects = [], timings = [];
  let cursor = 0, started = 0, stopped = 0;
  const offset = { setValue() {} };
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../components/product-header-title.tsx'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, require(name) {
    if (name === 'react/jsx-runtime') return require(name);
    if (name === 'react') return {
      useRef: () => ({ current: offset }), useEffect: effect => effects.push(effect),
      useState(value) { const index = cursor++; if (!(index in state)) state[index] = value;
        return [state[index], value => { state[index] = value; }]; },
    };
    if (name === 'react-native') return {
      View: 'View', ScrollView: 'ScrollView', StyleSheet: { create: value => value }, Easing: { linear: 'linear' },
      Animated: { Text: 'AnimatedText', Value: function () {}, delay() {}, sequence: value => value,
        timing(_offset, options) { timings.push(options); return options; },
        loop: () => ({ start() { started++; }, stop() { stopped++; } }),
      },
    };
    throw new Error(name);
  } });
  const render = reducedMotion => { cursor = 0; effects.length = 0;
    return exports.ProductHeaderTitle({ name: 'A long product name', color: '#123', reducedMotion }); };
  let title = render(false);
  const layout = width => ({ nativeEvent: { layout: { width } } });
  title.props.onLayout(layout(200));
  title.props.children.props.children.props.onLayout(layout(500));
  render(false);
  const cleanup = effects[0]();
  assert.equal(started, 1);
  assert.equal(timings[0].toValue, -300);
  assert.equal(timings[1].toValue, 0);
  assert.equal(timings[0].useNativeDriver, true);
  cleanup(); assert.equal(stopped, 1);
  title = render(true); effects[0]();
  assert.equal(started, 1);
  assert.equal(title.props.children.props.scrollEnabled, true);
  assert.equal(title.props.children.props.accessibilityLabel, 'A long product name');
  title.props.children.props.children.props.onLayout(layout(100));
  render(false); effects[0]();
  assert.equal(started, 1);
});
