const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

test('price slider imports with real React Native Web styles without deprecated shadow warnings', () => {
  const nativeWeb = require('react-native-web');
  const filename = require.resolve('@ptomasroos/react-native-multi-slider/DefaultMarker');
  const source = fs.readFileSync(filename, 'utf8');
  const exports = {};
  const warnings = [];
  const originalWarn = console.warn;
  try {
    console.warn = (...args) => { if (args.join(' ').includes('"shadow*"')) warnings.push(args.join(' ')); };
    const compiled = ts.transpileModule(source, {
      fileName: 'DefaultMarker.jsx',
      compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, allowJs: true },
    });
    vm.runInNewContext(compiled.outputText, { exports, require: name => name === 'react-native' ? nativeWeb : require(name) }, { filename });
    assert.deepEqual(warnings, [], 'The dependency must use boxShadow in its web marker styles');
    const marker = new exports.default({ enabled: true });
    assert.equal(marker.render().props.children.props.style[0].boxShadow, '0px 3px 1px rgba(0, 0, 0, 0.2)');
  } finally {
    console.warn = originalWarn;
  }
});
