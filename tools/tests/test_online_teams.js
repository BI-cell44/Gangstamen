const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const three = fs.readFileSync(process.argv[2]);
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const mk = async (name) => {
    const page = await browser.newPage({ viewport: { width: 900, height: 600 } });
    const errs = []; page.on('pageerror', e => errs.push(name + ' pageerror: ' + e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(name + ' ' + m.text()); });
    await page.route('https://cdnjs.cloudflare.com/**', r => r.fulfill({ body: three, contentType: 'application/javascript' }));
    await page.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
    await page.goto('http://localhost:8099/', { waitUntil: 'load', timeout: 120000 });
    await page.waitForFunction(() => !document.getElementById('start').disabled, null, { timeout: 120000 });
    page.errs = errs; return page;
  };
  const A = await mk('A'), B = await mk('B');
  await A.click('[data-go="vOnline"]'); await A.fill('#nick', 'Alice'); await A.click('#oSeg [data-m="1"]'); await A.click('#tSeg [data-t="0"]'); await A.click('#create');
  await A.waitForTimeout(2500);
  await B.click('[data-go="vOnline"]'); await B.fill('#nick', 'Bob'); await B.click('#tSeg [data-t="-1"]');
  await B.waitForSelector('#games button', { timeout: 15000 });
  console.log('B sees:', await B.textContent('#games'));
  await B.click('#games button');
  await A.keyboard.down('KeyW'); await B.keyboard.down('KeyW');
  await A.waitForTimeout(3000);
  const info = p => p.evaluate(() => { const N = __gm.Net; const L = __gm.locals()[0]; return { me: N.me, host: N.isHost, hostPeer: N.hostPeer, team: L.team, remotes: [...N.remotes.values()].map(R => ({ nick: R.nick, t: R.car.team, x: R.car.x.toFixed(1), z: R.car.z.toFixed(1) })), my: { x: L.car.x.toFixed(1), z: L.car.z.toFixed(1), hp: L.car.hp }, bots: __gm.rivals().map(r => r.team).join(''), bot0: [__gm.rivals()[0].x.toFixed(1), __gm.rivals()[0].z.toFixed(1), !!__gm.rivals()[0].proxy] }; });
  const ia = await info(A), ib = await info(B);
  console.log('A', JSON.stringify(ia)); console.log('B', JSON.stringify(ib));
  // A shoots B (simulated hit event)
  await A.evaluate(peer => __gm.Net.queue('hit', peer, 12), ib.me);
  await A.waitForTimeout(800);
  await A.evaluate(() => { document.getElementById('board').hidden = false; }); await A.waitForTimeout(700);
  console.log('B hp after hit:', await B.evaluate(() => __gm.locals()[0].car.hp));
  await A.screenshot({ path: process.argv[3] + '_A.png' }); await B.screenshot({ path: process.argv[3] + '_B.png' });
  console.log([...A.errs, ...B.errs].slice(0, 10).join('\n'));
  await browser.close();
})();
