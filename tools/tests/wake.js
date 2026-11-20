// the menu while the relay server cannot be reached (asleep): « Connexion au serveur… » then « Le serveur se réveille »
// run from /home/claude/t; Node server on port 8099 (it serves the page; ws://localhost:9 stands for a sleeping server)
const fs = require('fs'); const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 960, height: 600 } });
  await p.route('https://cdnjs.cloudflare.com/**', r => r.fulfill({ body: fs.readFileSync('three.min.js'), contentType: 'application/javascript' }));
  await p.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await p.addInitScript(() => { window.__noIntro = true; });
  await p.goto('http://localhost:8099/?server=ws://localhost:9/ws', { waitUntil: 'load', timeout: 900000 });
  await p.waitForFunction(() => !document.getElementById('start').disabled, null, { timeout: 900000 });
  const t = await p.evaluate(async () => { const st = () => [document.getElementById('netStatus').textContent, document.getElementById('create').disabled]; const a = st(); await new Promise(r => setTimeout(r, 6000)); return [a, st()]; });
  console.log(JSON.stringify(t));
  console.log(/réveille/.test(t[1][0]) && t[1][1] ? 'OK   message de réveil, création bloquée' : 'FAIL');
  await b.close();
})();
