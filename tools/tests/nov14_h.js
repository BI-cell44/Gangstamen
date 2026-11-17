// shared harness: node X.js ; loads the HD (or classic) build in headless Chrome, exposes page
const { chromium } = require('playwright');
const fs = require('fs');
module.exports = async function open(file, opts = {}) {
  const three = fs.readFileSync(__dirname + '/three.min.js');
  const html = fs.readFileSync(file, 'utf8');
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', '--disable-accelerated-2d-canvas', '--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage(Object.assign({ viewport: opts.viewport || { width: 1280, height: 720 } }, opts.context || {}));
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' || (opts.log && m.type() === 'log')) errs.push(m.type() + ': ' + m.text().slice(0, 300)); });
  await page.route('https://cdnjs.cloudflare.com/**', r => r.fulfill({ body: three, contentType: 'application/javascript' }));
  await page.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.addInitScript(() => { window.__noIntro = true; });
  if (opts.init) await page.addInitScript(opts.init);
  await page.setContent('<!doctype html><html><head><meta charset=utf-8></head><body>' + html + '</body></html>', { waitUntil: 'load', timeout: 240000 });
  await page.waitForFunction(() => !document.getElementById('start').disabled, null, { timeout: 240000 });
  if (await page.evaluate(() => !!__gm.hd)) await page.evaluate(() => __gm.hd.setQuality(0));
  return { browser, page, errs };
};
