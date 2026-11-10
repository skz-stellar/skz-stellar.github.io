const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright-core');

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const page = await context.newPage();
  const requests = [], errors = [];
  page.on('request', request => { if (/^https?:/.test(request.url())) requests.push(request.url()); });
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(pathToFileURL(path.resolve(__dirname, '../index.html')).href);
    const clean = source => page.evaluate(source => HyperTextify.cleanHTML(source).html, source);
    assert.equal(await clean('<div class="wrap"><p id="x" style="color:red">Hello <span>beautiful</span> <strong>world</strong>.</p></div>'), '<p>Hello beautiful <strong>world</strong>.</p>');
    assert.equal(await clean('<div>One</div><div>Two</div>'), '<p>One</p>\n\n<p>Two</p>');
    assert.equal(await clean('<p>Hello <em>one</em><em>two</em>!</p>'), '<p>Hello <em>one</em><em>two</em>!</p>');
    assert.equal(await clean('<pre><code>  a &lt; b\n\n    next\n</code></pre>'), '<pre><code>  a &lt; b\n\n    next\n</code></pre>');
    const hostile = '<script>window.pwned=1</script><style>body{display:none}</style><iframe src="https://example.invalid/frame"></iframe><svg onload="window.pwned=1"></svg><p onclick="window.pwned=1">Safe <a href="jav&#x61;script:alert(1)">link</a><img src="https://example.invalid/pixel" onerror="window.pwned=1" alt="pixel"></p>';
    assert.equal(await clean(hostile), '<p>Safe <a>link</a><img src="https://example.invalid/pixel" alt="pixel"></p>');
    for (const url of ['data:text/html,hello', 'java\nscript:alert(1)', 'vbscript:msgbox(1)', 'file:///etc/passwd']) {
      assert.equal(await clean(`<a href="${url}">link</a>`), '<a>link</a>');
    }
    assert.equal(await clean('<a href="/path?q=a&amp;b=c">relative</a>'), '<a href="/path?q=a&amp;b=c">relative</a>');
    assert.equal(await clean('<table style="width:100%"><tr><th scope="col" colspan="2">Title</th></tr><tr><td>A</td><td>B</td></tr></table>'), '<table>\n  <tbody>\n    <tr>\n      <th scope="col" colspan="2">Title</th>\n    </tr>\n    <tr>\n      <td>A</td>\n      <td>B</td>\n    </tr>\n  </tbody>\n</table>');
    console.log('PASS: cleanup, URL filtering, table semantics, whitespace');

    await page.locator('#input').fill(hostile);
    assert.equal(await page.locator('#output').inputValue(), '');
    await page.locator('#convert').click();
    assert.match(await page.locator('#output').inputValue(), /example.invalid/);
    await page.locator('#preview-view').click();
    assert.equal(await page.locator('#preview').getAttribute('sandbox'), '');
    await page.waitForTimeout(100);
    const preview = page.frames().find(frame => frame !== page.mainFrame());
    assert.equal(await preview.locator('[src], [href], script, style').count(), 0);
    assert.equal(await page.evaluate(() => globalThis.pwned), undefined);
    await page.locator('#input').fill('<p>Changed</p>');
    assert.doesNotMatch(await page.locator('#output').inputValue(), /Changed/);
    assert.match(await page.locator('#status').textContent(), /Input changed/);
    console.log('PASS: explicit conversion, stale output indicator, sandbox preview');

    await page.locator('#format').selectOption('markdown');
    await page.locator('#input').fill('# Heading\n\n**Bold** and *italic* and ~~gone~~.\n\n- [x] Done\n- [ ] Todo\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\n```js\n  const n = 1;\n```\n\n<script>window.pwned=1</script>');
    await page.locator('#convert').click();
    const markdown = await page.locator('#output').inputValue();
    for (const expected of ['<h1>Heading</h1>', '<strong>Bold</strong>', '<em>italic</em>', '<del>gone</del>', '<table>', '<input', 'checked=""', 'disabled=""', '<pre><code>  const n = 1;\n</code></pre>']) assert.ok(markdown.includes(expected), expected);
    assert.doesNotMatch(markdown, /script|class=|style=/);
    await page.locator('#html-view').click();
    // Replace only the test page clipboard API to verify exact text without touching the real clipboard.
    await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { globalThis.copied = text; } } }));
    await page.locator('#copy').click();
    assert.equal(await page.evaluate(() => globalThis.copied), markdown);
    await page.locator('#clear').click();
    assert.equal(await page.locator('#output').inputValue(), '');
    assert.equal(await page.locator('#input').inputValue(), '');
    assert.ok(await page.locator('#copy').isDisabled());
    await page.reload();
    assert.equal(await page.locator('#input').inputValue(), '');
    assert.deepEqual(requests, []);
    assert.deepEqual(errors, []);
    console.log('PASS: GFM Markdown, copy, clear, reload, no outbound network');

    fs.mkdirSync(path.join(__dirname, 'artifacts'), { recursive: true });
    await page.screenshot({path: path.join(__dirname, 'artifacts/desktop.png'), fullPage: true});
    await page.setViewportSize({width: 390, height: 844});
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({path: path.join(__dirname, 'artifacts/mobile.png'), fullPage: true});
    console.log('PASS: desktop/mobile layout');
    if (process.env.HOMEPAGE_PATH) {
      const homepageRoot = path.dirname(path.resolve(process.env.HOMEPAGE_PATH));
      await page.route('http://homepage.test/**', async route => {
        const pathname = decodeURIComponent(new URL(route.request().url()).pathname);
        const file = path.join(homepageRoot, pathname === '/' ? 'index.html' : pathname);
        const contentType = {'.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.woff2':'font/woff2', '.svg':'image/svg+xml'}[path.extname(file)] || 'application/octet-stream';
        try { await route.fulfill({body:fs.readFileSync(file), contentType}); }
        catch { await route.fulfill({status:404, body:'Not found'}); }
      });
      await page.setViewportSize({width: 1440, height: 1100});
      await page.goto('http://homepage.test/');
      await page.waitForFunction(() => customElements.get('time-traveler'));
      assert.equal(await page.locator('.tiles > .tile').count(), 3);
      assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.tiles')).gridTemplateColumns.split(' ').length), 2);
      assert.equal(await page.locator('a.launch[href="/hypertextify/"]').count(), 1);
      await page.screenshot({path: path.join(__dirname, 'artifacts/homepage-desktop.png'), fullPage: true});
      await page.setViewportSize({width: 390, height: 844});
      assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.tiles')).gridTemplateColumns.split(' ').length), 1);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.screenshot({path: path.join(__dirname, 'artifacts/homepage-mobile.png'), fullPage: true});
      console.log('PASS: homepage cards, two desktop columns, one mobile column');
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
