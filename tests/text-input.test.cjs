const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.join(__dirname, '..');
function input(platform, props, ref) {
  const exports = {};
  const source = fs.readFileSync(path.join(root, 'components/ui/text-input.tsx'), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, require(name) {
    if (name === 'react') return { forwardRef: render => render };
    if (name === 'react/jsx-runtime') return require(name);
    if (name === 'react-native') return { Platform: { OS: platform }, TextInput: 'NativeTextInput', StyleSheet: { create: value => value } };
    throw new Error(`Unexpected import: ${name}`);
  } });
  return exports.TextInput(props, ref);
}

for (const platform of ['web', 'android', 'ios']) {
  test(`${platform}: removes platform decoration while preserving borders, events, password props and refs`, () => {
    const events = [];
    const ref = { current: null };
    const field = input(platform, {
      style: [{ borderWidth: 1, borderColor: '#63727c', padding: 12 }],
      secureTextEntry: true, returnKeyType: 'done', accessibilityLabel: 'Password',
      onFocus: event => events.push(event), onChangeText: value => events.push(value),
    }, ref);
    const style = Object.assign({}, ...field.props.style.flat(Infinity).filter(Boolean));
    assert.equal(field.type, 'NativeTextInput');
    assert.equal(field.props.ref, ref);
    assert.equal(field.props.underlineColorAndroid, 'transparent');
    assert.equal(style.outlineWidth, platform === 'web' ? 0 : undefined);
    assert.equal(style.outlineStyle, platform === 'web' ? 'solid' : undefined);
    assert.equal(style.borderWidth, 1);
    assert.equal(style.borderColor, '#63727c');
    assert.equal(field.props.secureTextEntry, true);
    assert.equal(field.props.returnKeyType, 'done');
    field.props.onFocus('focus');
    field.props.onChangeText('password');
    assert.deepEqual(events, ['focus', 'password']);
    assert.equal(input(platform, { multiline: true }, ref).props.multiline, true);
  });
}

test('all application TextInputs use the shared platform reset', () => {
  for (const dir of ['app', 'components', 'examples']) {
    for (const relative of fs.readdirSync(path.join(root, dir), { recursive: true }).filter(file => file.endsWith('.tsx'))) {
      const file = path.join(dir, relative).replaceAll('\\', '/');
      if (file === 'components/ui/text-input.tsx') continue;
      const source = ts.createSourceFile(file, fs.readFileSync(path.join(root, file), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
      for (const statement of source.statements) {
        if (!ts.isImportDeclaration(statement) || statement.moduleSpecifier.text !== 'react-native') continue;
        const imports = statement.importClause?.namedBindings;
        if (imports && ts.isNamedImports(imports)) {
          assert.ok(!imports.elements.some(item => (item.propertyName || item.name).text === 'TextInput'), `Raw TextInput bypasses the reset: ${file}`);
        }
      }
    }
  }
});
