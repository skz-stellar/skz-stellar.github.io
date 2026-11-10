const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
let document, clean, marked, window;
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

before(async () => {
  const { parseHTML } = await import(process.env.LINKEDOM_PATH || 'linkedom');
  ({ document, window } = parseHTML(read('index.html')));
  const context = vm.createContext({ document });
  vm.runInContext(read('core.js'), context);
  vm.runInContext(read('vendor/marked.umd.js'), context);
  clean = source => context.HyperTextify.cleanHTML(source).html;
  marked = context.marked;
});

test('removes styling and wrappers while preserving content and paragraph boundaries', () => {
  assert.equal(clean('<div class="wrap"><p id="x" style="color:red">Hello <span>beautiful</span> <strong>world</strong>.</p></div>'), '<p>Hello beautiful <strong>world</strong>.</p>');
  assert.equal(clean('<div>One</div><div>Two</div>'), '<p>One</p>\n\n<p>Two</p>');
  assert.equal(clean('<font face="Arial" color="red">Hello</font>'), 'Hello');
});

test('preserves inline spacing, entities, and preformatted code exactly', () => {
  assert.equal(clean('<p>Hello <em>one</em><em>two</em>!</p>'), '<p>Hello <em>one</em><em>two</em>!</p>');
  assert.equal(clean('<pre><code>  a &lt; b\n\n    next\n</code></pre>'), '<pre><code>  a &lt; b\n\n    next\n</code></pre>');
  assert.equal(clean('<p>A &amp; B &lt; C</p>'), '<p>A &amp; B &lt; C</p>');
});

test('drops active content, handlers, comments and unsafe URL schemes', () => {
  const html = clean('<script>alert(1)</script><style>body{display:none}</style><iframe src="https://example.invalid/"></iframe><svg onload="alert(1)"></svg><!--comment--><p onclick="alert(1)">Safe <a href="jav&#x61;script:alert(1)">link</a><img src="https://example.invalid/pixel" onerror="alert(1)" alt="pixel"></p>');
  assert.match(html, /<p>Safe <a>link<\/a><img /);
  assert.match(html, /src="https:\/\/example.invalid\/pixel"/);
  assert.match(html, /alt="pixel"/);
  assert.doesNotMatch(html, /script|onerror|onclick|iframe|svg|comment/);
  for (const url of ['data:text/html,hello', 'java\nscript:alert(1)', 'vbscript:msgbox(1)', 'file:///etc/passwd']) assert.equal(clean(`<a href="${url}">link</a>`), '<a>link</a>');
  assert.equal(clean('<a href="/path?q=a&amp;b=c">relative</a>'), '<a href="/path?q=a&amp;b=c">relative</a>');
  assert.equal(clean('<img src="data:image/svg+xml,foo" alt="fallback">'), '<img alt="fallback">');
});

test('keeps functional table, list and image attributes; strips presentation', () => {
  const html = clean('<ol start="3"><li value="5">Five</li></ol><table width="100%"><tbody><tr><th scope="col" colspan="2" style="color:red">Title</th></tr></tbody></table><img src="/image.png" alt="Image" width="400">');
  for (const expected of ['start="3"', 'value="5"', 'scope="col"', 'colspan="2"', 'alt="Image"', 'src="/image.png"']) assert.ok(html.includes(expected), expected);
  assert.doesNotMatch(html, /width=|style=/);
});

test('GFM handles tables, emphasis, code, task lists and embedded HTML', () => {
  const html = clean(marked.parse('# Heading\n\n**Bold** and *italic* and ~~gone~~.\n\n- [x] Done\n- [ ] Todo\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\n```js\n  const n = 1;\n```\n\n<script>alert(1)</script>', {gfm: true}));
  for (const expected of ['<h1>Heading</h1>', '<strong>Bold</strong>', '<em>italic</em>', '<del>gone</del>', '<table>', '<input', 'checked=""', 'disabled=""', '<pre><code>  const n = 1;\n</code></pre>']) assert.ok(html.includes(expected), expected);
  assert.doesNotMatch(html, /script|class=|style=/);
});

test('conversion requires action; preview strips URLs; copy and clear work', async () => {
  let copied;
  // DOM-only harness. This does not verify browser CSP enforcement or resource loads.
  const context = vm.createContext({ document, HyperTextify: { cleanHTML: source => ({html:clean(source), removed:0}) }, marked, navigator: {clipboard:{writeText:async value => {copied=value;}}} });
  vm.runInContext(read('app.js'), context);
  const $ = id => document.getElementById(id);
  $('input').value = '<p>Before <a href="https://example.invalid">link</a><img src="https://example.invalid/image" alt="image"></p>';
  $('input').dispatchEvent(new window.Event('input'));
  assert.equal($('output').value, '');
  $('convert').click();
  assert.match($('output').value, /Before/);
  assert.doesNotMatch($('preview').srcdoc, /https:\/\/example/);
  assert.match($('preview').srcdoc, /default-src 'none'/);
  assert.equal($('preview').getAttribute('sandbox'), '');
  $('input').value = '<p>After</p>';
  $('input').dispatchEvent(new window.Event('input'));
  assert.doesNotMatch($('output').value, /After/);
  assert.match($('status').textContent, /Input changed/);
  $('copy').click();
  await Promise.resolve();
  assert.equal(copied, $('output').value);
  $('clear').click();
  assert.equal($('input').value, '');
  assert.equal($('output').value, '');
  assert.ok($('copy').disabled);
});

test('static privacy policy: bundled assets, no network or storage APIs', () => {
  const html = read('index.html');
  assert.match(html, /connect-src 'none'/);
  assert.match(html, /img-src https:\/\/skz-stellar\.github\.io\/hypertextify\/favicon\.svg https:\/\/skz-stellar\.github\.io\/hypertextify\/favicon\.ico;/);
  assert.doesNotMatch(html, /(?:src|href)="https?:/);
  for (const file of ['core.js','app.js','starfield.js']) assert.doesNotMatch(read(file), /\b(?:fetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|localStorage|sessionStorage|indexedDB|document\.cookie)\b/);
  assert.match(read('core.js'), /createElement\('template'\)/);
});
