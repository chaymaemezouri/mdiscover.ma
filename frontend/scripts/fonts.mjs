import { chromium } from 'playwright';

const path = process.argv[2] ?? '/catalogue';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.goto(`http://localhost:3001${path}`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

const rows = await page.evaluate(() => {
  const out = [];
  const seen = new Set();
  for (const el of document.querySelectorAll('h1,h2,h3,h4,p,a,button,label,input')) {
    const key = el.tagName + (el.className || '');
    if (seen.has(key)) continue;
    seen.add(key);
    const cs = getComputedStyle(el);
    out.push({
      tag: el.tagName,
      cls: String(el.className).slice(0, 28),
      font: cs.fontFamily.split(',')[0],
      size: cs.fontSize,
      text: (el.textContent || '').trim().slice(0, 24),
    });
  }
  return out;
});
console.table(rows);
await browser.close();
