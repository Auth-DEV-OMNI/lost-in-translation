const { JSDOM } = require('jsdom');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const code = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const checks = [];

function page(saved) {
  const dom = new JSDOM(html, { url: 'https://example.com/', runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window;
  w.matchMedia = () => ({ matches: false });
  if (saved) w.localStorage.setItem('lit-languages', saved);
  const requests = [];
  w.fetch = async (url) => {
    const u = new URL(url);
    requests.push({ source: u.searchParams.get('sl'), target: u.searchParams.get('tl'), text: u.searchParams.get('q') });
    return { ok: true, json: async () => [[[`result-${requests.length}`]]] };
  };
  w.eval(code + '\nglobalThis.badTranslate = badTranslate; globalThis.onTranslate = onTranslate;');
  return { w, requests, el: (id) => w.document.getElementById(id), close: () => w.close() };
}

async function check(name, run) {
  await run();
  checks.push(name);
  console.log('PASS:', name);
}

(async () => {
  await check('Selectors initialize all languages, auto source, Chinese target, and labels', () => {
    const p = page();
    assert.equal(p.el('source-language').value, 'auto');
    assert.equal(p.el('target-language').value, 'zh-CN');
    assert.equal(p.el('source-language').options.length, p.el('target-language').options.length + 1);
    assert(p.el('target-language').options.length > 100);
    assert(!Array.from(p.el('target-language').options).some(o => o.value === 'auto'));
    assert.equal(p.el('output-language').textContent, '(Chinese (Simplified))');
    p.close();
  });
  for (const [source, target] of [['zh-CN', 'zh-CN'], ['ja', 'en'], ['auto', 'zh-TW'], ['en', 'en'], ['ar', 'fr']]) {
    await check(`Translation ${source} → 3 random hops → ${target} chains previous output and completes progress`, async () => {
      const p = page();
      const hops = [];
      const result = await p.w.badTranslate('你好 & ? #', 3, (chain, done, total) => hops.push({ chain: [...chain], done, total }), source, target);
      assert.equal(p.requests.length, 4);
      assert.equal(p.requests[0].source, source);
      assert.equal(p.requests[0].text, '你好 & ? #');
      assert.equal(p.requests.at(-1).target, target);
      for (let i = 0; i < 3; i++) {
        assert.notEqual(p.requests[i].target, target);
        assert.notEqual(p.requests[i].target, p.requests[i].source);
        assert.equal(p.requests[i + 1].source, p.requests[i].target);
        assert.equal(p.requests[i + 1].text, `result-${i + 1}`);
      }
      assert.equal(result.output, 'result-4');
      assert.equal(result.chain.length, 5);
      assert.equal(hops.at(-1).done, 4);
      assert.equal(hops.at(-1).total, 4);
      p.close();
    });
  }
  await check('Saved choices restore, invalid settings fall back, selection updates and clears stale output', () => {
    const p = page(JSON.stringify({ source: 'ja', target: 'ar' }));
    assert.equal(p.el('source-language').value, 'ja');
    assert.equal(p.el('target-language').value, 'ar');
    p.el('output').value = 'stale';
    p.el('target-language').value = 'fr';
    p.el('target-language').dispatchEvent(new p.w.Event('change'));
    assert.equal(p.el('output').value, '');
    assert.equal(p.el('output').lang, 'fr');
    assert.equal(JSON.parse(p.w.localStorage.getItem('lit-languages')).target, 'fr');
    p.close();
    const broken = page('{bad json');
    assert.equal(broken.el('source-language').value, 'auto');
    assert.equal(broken.el('target-language').value, 'zh-CN');
    broken.close();
  });
  await check('Example selects English source and preserves target', () => {
    const p = page();
    p.el('shuffle').click();
    assert.equal(p.el('source-language').value, 'en');
    assert.equal(p.el('target-language').value, 'zh-CN');
    assert(p.el('input').value.length > 0);
    assert.equal(p.el('relay-next').textContent, 'English');
    p.close();
  });
  await check('Loading blocks overlapping runs and restores controls on HTTP error', async () => {
    const p = page();
    let release;
    p.w.fetch = () => new Promise(resolve => { release = resolve; });
    p.el('input').value = '测试';
    p.el('rounds').value = '1';
    const run = p.w.eval('onTranslate()');
    assert(p.el('source-language').disabled);
    assert(p.el('target-language').disabled);
    assert(p.el('rounds').disabled);
    await p.w.eval('onTranslate()');
    release({ ok: false, status: 429 });
    await run;
    assert.match(p.el('error').textContent, /429/);
    assert(!p.el('translate').disabled);
    assert(!p.el('source-language').disabled);
    assert(!p.el('target-language').disabled);
    assert(!p.el('rounds').disabled);
    p.close();
  });
  await check('Fractional rounds rejected before network; successful UI flow reaches selected target', async () => {
    const p = page();
    p.el('input').value = '你好';
    p.el('rounds').value = '1.5';
    await p.w.eval('onTranslate()');
    assert.equal(p.requests.length, 0);
    assert.match(p.el('error').textContent, /whole number/);
    p.el('rounds').value = '1';
    await p.w.eval('onTranslate()');
    assert.equal(p.el('output').value, 'result-2');
    assert.equal(p.requests.at(-1).target, 'zh-CN');
    assert(!p.el('copy').disabled);
    assert.equal(p.el('progress-fill').style.width, '100%');
    p.close();
  });
  console.log(`${checks.length} checks passed`);
})().catch(error => { console.error(error); process.exitCode = 1; });

