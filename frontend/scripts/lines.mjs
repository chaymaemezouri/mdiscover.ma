import { chromium } from 'playwright';

const width = Number(process.argv[2] ?? 1440);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height: 900 } });
await page.goto('http://localhost:3001/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

const res = await page.evaluate(() => {
  const p = document.querySelector('.hero-panel-copy p');
  const h2 = document.querySelector('.hero-panel-copy h2');
  const cs = getComputedStyle(p);
  const lh = parseFloat(cs.lineHeight);
  return {
    paragraphLines: Math.round(p.getBoundingClientRect().height / lh),
    paragraphWidth: Math.round(p.getBoundingClientRect().width),
    titleLines: Math.round(
      h2.getBoundingClientRect().height / parseFloat(getComputedStyle(h2).lineHeight),
    ),
    productLeft: Math.round(document.querySelector('.hero-product').getBoundingClientRect().left),
    textRight: Math.round(p.getBoundingClientRect().right),
  };
});
console.log(width, JSON.stringify(res));
await browser.close();
