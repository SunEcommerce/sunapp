const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
function load(file, mocks, globals = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  vm.runInNewContext(code, { exports, require: name => mocks[name] ?? require(name), setTimeout, clearTimeout, setInterval, clearInterval, console, ...globals });
  return exports;
}
for (const runtime of ['server', 'browser', 'android', 'ios']) {
  test(`${runtime}: Redux persistence avoids server storage and retains client persistence`, async () => {
    const calls = [];
    const data = new Map();
    const storage = Object.fromEntries(['getItem', 'setItem', 'removeItem'].map(method => [method, async (key, value) => {
      if (runtime === 'server') throw new Error('window is not defined');
      calls.push(method);
      if (method === 'getItem') return data.get(key) ?? null;
      if (method === 'setItem') data.set(key, value);
      else data.delete(key);
    }]));
    const { store, persistor } = load('store/store.ts', {
      '@react-native-async-storage/async-storage': { default: storage },
      'react-native': { Platform: { OS: ['server', 'browser'].includes(runtime) ? 'web' : runtime } },
      './categoriesSlice': { default: (state = { tree: [] }, action) => action.type === 'test/change' ? { tree: ['phones'] } : state },
    }, runtime === 'browser' ? { window: {} } : {});
    await new Promise(resolve => {
      if (persistor.getState().bootstrapped) return resolve();
      const unsubscribe = persistor.subscribe(() => {
        if (persistor.getState().bootstrapped) { unsubscribe(); resolve(); }
      });
    });
    store.dispatch({ type: 'test/change' });
    await persistor.flush();
    await persistor.purge();
    persistor.pause();
    if (runtime === 'server') assert.deepEqual(calls, []);
    else {
      assert.ok(calls.includes('getItem'));
      assert.ok(calls.includes('setItem'));
      assert.ok(calls.includes('removeItem'));
    }
  });
}
test('web notifications load without importing either native SDK or attaching listeners', async () => {
  const web = load('utils/pushNotifications.web.ts', {
    'expo-notifications': new Proxy({}, { get() { throw new Error('Native SDK imported'); } }),
    'pushy-react-native': new Proxy({}, { get() { throw new Error('Native SDK imported'); } }),
  });
  assert.equal(await web.isPushyRegistered(), false);
  assert.equal(web.getDeviceToken(), null);
  web.setNotificationHandler(() => assert.fail('Unexpected notification'));
  web.setNotificationClickHandler(() => assert.fail('Unexpected click'));
  await web.unregisterPushy();
  await assert.rejects(web.initializePushy('test'), /not supported on web/);
});
