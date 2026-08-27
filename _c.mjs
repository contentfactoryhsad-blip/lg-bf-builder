import { chromium } from 'playwright-core';
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 2400, height: 1300 }, deviceScaleFactor: 2 });
await p.goto('http://localhost:5174/', { waitUntil: 'networkidle' });
await p.evaluate(() => {
  const el = [...document.querySelectorAll('button,p')].find(n => n.textContent.trim() === 'Content Template Builder');
  (el.closest('button') || el).click();
});
await p.waitForTimeout(1800);
await p.evaluate(() => {
  const sec = [...document.querySelectorAll('aside section')].find(s => s.querySelector('p').textContent.trim() === 'KEY VISUAL_Main');
  sec.querySelectorAll('button')[0].click();
});
await p.evaluate(() => [...document.querySelector('aside').querySelectorAll('button')].find(b => b.innerText.trim() === 'Criteo').click());
await p.waitForTimeout(2200);
const h = await p.evaluateHandle(() => {
  const lab = [...document.querySelectorAll('main p')].find(e => e.textContent.trim().startsWith('1200×628'));
  const box = lab.parentElement.querySelector('div');
  box.scrollIntoView({ block: 'center' });
  return box;
});
await p.waitForTimeout(600);
await h.asElement().screenshot({ path: '/tmp/bld628.png' });
// and the numbers the DOM actually used
console.log(JSON.stringify(await p.evaluate(() => {
  const lab = [...document.querySelectorAll('main p')].find(e => e.textContent.trim().startsWith('1200×628'));
  const stage = lab.parentElement.querySelector('div').firstElementChild;
  return [...stage.querySelectorAll('p')].map(el => {
    const cs = getComputedStyle(el);
    return { txt: el.textContent.slice(0, 40), left: el.style.left, top: el.style.top, w: el.style.width,
      size: cs.fontSize, weight: cs.fontWeight, lh: cs.lineHeight, ls: cs.letterSpacing,
      fam: cs.fontFamily.split(',')[0], lines: Math.round(el.getBoundingClientRect().height / parseFloat(cs.lineHeight)) };
  });
}), null, 1));
await b.close();
