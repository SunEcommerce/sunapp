const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function createSlider(onConfirm) {
  const state = [], refs = [];
  let stateIndex = 0, refIndex = 0, responder;
  const react = {
    useState(initial) { const index = stateIndex++; if (!(index in state)) state[index] = initial;
      return [state[index], value => { state[index] = value; }]; },
    useRef(initial) { const index = refIndex++; return refs[index] ??= { current: initial }; },
    useCallback: fn => fn, useMemo: fn => fn(), useEffect() {},
  };
  class Value { setValue(value) { this.value = value; } }
  const native = {
    Animated: { Value, View: 'AnimatedView', spring: (value, options) => ({ start() { value.setValue(options.toValue); } }),
      timing: (value, options) => ({ start(done) { value.setValue(options.toValue); done({ finished: true }); } }) },
    PanResponder: { create(config) { responder = config; return { panHandlers: {} }; } },
    StyleSheet: { create: value => value }, View: 'View',
  };
  const exports = {};
  const source = fs.readFileSync(require.resolve('../components/slide-to-confirm.tsx'), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText,
    { exports, require: name => ({ react, 'react-native': native, '@expo/vector-icons': { Ionicons: 'Icon' }, '@/components/themed-text': { ThemedText: 'Text' }, 'react/jsx-runtime': require('react/jsx-runtime') })[name] });
  const render = (disabled = false) => { stateIndex = refIndex = 0; return exports.SlideToConfirm({ disabled, onConfirm, accent: 'blue', onAccent: 'white', trackColor: 'lightblue', textColor: 'blue' }); };
  return { render, responder: () => responder };
}

test('short drag resets; completed drag confirms once; disabled slider cannot start', () => {
  let confirmations = 0;
  const slider = createSlider(() => confirmations++);
  slider.render().props.onLayout({ nativeEvent: { layout: { width: 300 } } });
  slider.render();
  assert.equal(slider.responder().onStartShouldSetPanResponder(), true);
  slider.responder().onPanResponderRelease(null, { dx: 100 });
  assert.equal(confirmations, 0);
  slider.responder().onPanResponderRelease(null, { dx: 220 });
  assert.equal(confirmations, 1);
  slider.responder().onPanResponderRelease(null, { dx: 220 });
  assert.equal(confirmations, 1);
  slider.render(true);
  assert.equal(slider.responder().onStartShouldSetPanResponder(), false);
});
