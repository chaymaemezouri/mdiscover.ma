import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.goto('http://localhost:3001/catalogue', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

const info = await page.evaluate(() => {
  const html = document.documentElement;
  const body = document.body;
  const h3 = document.querySelector('h3');
  const read = (el) => {
    const cs = getComputedStyle(el);
    return {
      cls: String(el.className).slice(0, 80),
      cormorant: cs.getPropertyValue('--font-cormorant').trim().slice(0, 60),
      manrope: cs.getPropertyValue('--font-manrope').trim().slice(0, 60),
      title: cs.getPropertyValue('--font-title').trim().slice(0, 60),
      bodyVar: cs.getPropertyValue('--font-body').trim().slice(0, 60),
      fontFamily: cs.fontFamily.slice(0, 80),
    };
  };
  return { html: read(html), body: read(body), h3: h3 ? read(h3) : null };
});

console.log(JSON.stringify(info, null, 2));
await browser.close();
