const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, mocks, globals = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(code, { exports, require: name => name in mocks ? mocks[name] : require(name), console, ...globals });
  return exports;
}
const settle = () => new Promise(resolve => setImmediate(resolve));
function artifact({ cachedPath = null, platform = 'android', decode } = {}) {
  const reads = [], downloads = [], loaded = [], timers = new Map();
  let serial = 0;
  const bitmap = { width: 100, height: 200, releases: 0, release() { this.releases++; } };
  const api = load('utils/welcome-artwork.ts', {
    '@/assets/images/welcome-tech.png': 7,
    'react-native': { Platform: { OS: platform } },
    'expo-image': { Image: {
      getCachePathAsync: async key => { reads.push(key); return cachedPath; },
      prefetch: async (...args) => { downloads.push(args); return true; },
      loadAsync: async source => { loaded.push(source); return decode ? decode() : bitmap; },
    } },
  }, { setTimeout(fn, duration) { timers.set(++serial, { fn, duration }); return serial; }, clearTimeout(id) { timers.delete(id); } });
  return { ...api, bitmap, reads, downloads, loaded, timers };
}
test('bundled artwork is decoded before it becomes eligible', async () => {
  const app = artifact();
  assert.equal(await app.prepareWelcomeArtwork(), app.bitmap);
  assert.deepEqual(app.loaded, [7]);
  assert.equal(app.timers.size, 0);
});
test('cache miss skips this launch and warms disk for a later launch without decoding a remote URL', async () => {
  const app = artifact();
  assert.equal(await app.prepareWelcomeArtwork({ url: 'https://example.test/launch.png' }), null);
  assert.deepEqual(app.loaded, []);
  assert.deepEqual(app.downloads, [['https://example.test/launch.png', 'disk']]);
});
test('cache hit decodes only the local path; invalid images never become eligible', async () => {
  const app = artifact({ cachedPath: '/cache/launch.png' });
  assert.equal(await app.prepareWelcomeArtwork({ url: 'https://example.test/launch.png' }), app.bitmap);
  assert.equal(app.loaded[0].uri, 'file:///cache/launch.png');
  assert.deepEqual(app.downloads, []);
  app.bitmap.width = 0;
  assert.equal(await app.prepareWelcomeArtwork(), null);
  assert.equal(app.bitmap.releases, 1);
});
test('one-second timeout stays skipped when a decode eventually completes and releases the late bitmap', async () => {
  let complete;
  const app = artifact({ decode: () => new Promise(resolve => { complete = resolve; }) });
  const result = app.prepareWelcomeArtwork();
  const timer = [...app.timers.values()][0];
  assert.equal(timer.duration, 1000);
  timer.fn();
  assert.equal(await result, null);
  complete(app.bitmap);
  await settle();
  assert.equal(app.bitmap.releases, 1);
});
test('decode errors and unsupported web remote caches skip without throwing', async () => {
  const corrupt = artifact({ decode() { throw new Error('corrupt'); } });
  assert.equal(await corrupt.prepareWelcomeArtwork(), null);
  const web = artifact({ platform: 'web', cachedPath: '/not-a-web-cache' });
  assert.equal(await web.prepareWelcomeArtwork({ url: 'https://example.test/launch.png' }), null);
  assert.deepEqual(web.reads, []);
  assert.deepEqual(web.loaded, []);
});
function nodes(tree) {
  return !tree || typeof tree !== 'object' ? [] : [tree, ...[tree.props?.children].flat(Infinity).flatMap(nodes)];
}
function gate({ hidden = null, image = { release() {} }, prepare } = {}) {
  const hooks = [], pending = [], frames = new Map();
  let cursor = 0, preparations = 0, hides = 0, frameId = 0;
  const same = (a, b) => a && b && a.length === b.length && a.every((value, i) => Object.is(value, b[i]));
  const Component = load('components/welcome-startup.tsx', {
    '@/components/welcome-screen': { WelcomeScreen: 'Welcome' },
    '@/utils/welcome-artwork': { WELCOME_IMAGE_TIMEOUT_MS: 1000, prepareWelcomeArtwork: async () => { preparations++; return prepare ? prepare() : image; } },
    '@/utils/welcome-screen': { WELCOME_HIDDEN_DATE_KEY: 'hidden' },
    '@react-native-async-storage/async-storage': { default: { getItem: async () => hidden } },
    'expo-router': { SplashScreen: { hideAsync: async () => hides++ } },
    'react-native': { View: 'View', StyleSheet: { create: x => x, absoluteFillObject: {} } },
    react: {
      useRef(value) { const i = cursor++; hooks[i] ??= { current: value }; return hooks[i]; },
      useState(value) { const i = cursor++; hooks[i] ??= { value }; return [hooks[i].value, next => hooks[i].value = typeof next === 'function' ? next(hooks[i].value) : next]; },
      useCallback(fn, deps) { const i = cursor++; if (!same(hooks[i]?.deps, deps)) hooks[i] = { deps, fn }; return hooks[i].fn; },
      useEffect(fn, deps) { const i = cursor++; if (!same(hooks[i]?.deps, deps)) { const old = hooks[i]; hooks[i] = { deps, cleanup: old?.cleanup }; pending.push(() => { hooks[i].cleanup?.(); hooks[i].cleanup = fn(); }); } },
    },
  }, { requestAnimationFrame(fn) { frames.set(++frameId, fn); return frameId; }, cancelAnimationFrame(id) { frames.delete(id); } }).WelcomeStartup;
  const route = { type: 'ProductDetail', props: { productId: 7 } };
  const render = () => { cursor = 0; const tree = nodes(Component({ children: route })); while (pending.length) pending.shift()(); return tree; };
  return { render, route, unmount() { hooks.forEach(hook => hook?.cleanup?.()); },
    frame() { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(fn => fn()); },
    get preparations() { return preparations; }, get hides() { return hides; } };
}
test('startup hides the real route before async work; reveals the image only after display, then restores the same route', async () => {
  let releases = 0;
  const app = gate({ image: { release() { releases++; } } });
  let tree = app.render();
  assert.ok(tree.some(node => node.props?.['aria-hidden'] === true));
  assert.ok(tree.includes(app.route));
  assert.equal(app.hides, 0);
  await settle();
  tree = app.render();
  const welcome = tree.find(node => node.type === 'Welcome');
  assert.ok(welcome);
  app.frame();
  assert.equal(app.hides, 0);
  welcome.props.onReady();
  tree = app.render();
  assert.ok(tree.some(node => node.props?.['aria-hidden'] === true));
  app.frame();
  assert.equal(app.hides, 0); // Parent layout is also required.
  tree[0].props.onLayout();
  app.render(); app.frame();
  assert.equal(app.hides, 1);
  welcome.props.onDismiss();
  tree = app.render();
  assert.ok(tree.some(node => node.props?.['aria-hidden'] === false));
  assert.ok(tree.includes(app.route));
  assert.equal(releases, 1);
  welcome.props.onReady(); // Late display events cannot reopen a finished splash.
  assert.ok(!app.render().some(node => node.type === 'Welcome'));
});
test('missing artwork and today opt-out reveal the original route without a welcome or download wait', async () => {
  for (const config of [{ image: null }, { hidden: new Date().toDateString() }]) {
    const app = gate(config);
    app.render()[0].props.onLayout();
    await settle();
    const tree = app.render();
    assert.ok(!tree.some(node => node.type === 'Welcome'));
    assert.ok(tree.some(node => node.props?.['aria-hidden'] === false));
    app.frame();
    assert.equal(app.hides, 1);
    if (config.hidden) assert.equal(app.preparations, 0);
  }
});
test('unmount ignores late preparation and releases its bitmap', async () => {
  let complete, releases = 0;
  const app = gate({ prepare: () => new Promise(resolve => { complete = resolve; }) });
  app.render(); await settle();
  app.unmount();
  complete({ release() { releases++; } });
  await settle();
  assert.equal(releases, 1);
  assert.equal(app.hides, 0);
});


test('Metro web bundled URI objects are decoded as local packaged artwork rather than remote API candidates', async () => {
  const app = artifact({ platform: 'web' });
  const bundled = { uri: '/assets/welcome.png', width: 1122, height: 1402 };
  assert.equal(await app.prepareWelcomeArtwork(bundled), app.bitmap);
  assert.deepEqual(app.reads, []);
  assert.deepEqual(app.downloads, []);
  assert.equal(app.loaded[0], bundled);
});
