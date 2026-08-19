import { chromium } from 'playwright';

const width = Number(process.argv[2] ?? 1440);
const height = Number(process.argv[3] ?? 900);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height } });
await page.goto('http://localhost:3001/', { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);

const res = await page.evaluate(() => {
  const r = (s) => {
    const b = document.querySelector(s)?.getBoundingClientRect();
    return b && { left: Math.round(b.left), top: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height), bottom: Math.round(b.bottom) };
  };
  return {
    panel: r('.hero-panel'),
    arrow: r('.hero-arrow'),
    title: r('.hero-panel-copy h2'),
    productLeft: Math.round(document.querySelector('.hero-product').getBoundingClientRect().left),
  };
});
console.log(JSON.stringify(res, null, 2));
await browser.close();
