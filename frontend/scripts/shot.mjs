import { chromium } from 'playwright';

const width = Number(process.argv[2] ?? 1440);
const height = Number(process.argv[3] ?? 900);
const out = process.argv[4] ?? 'scripts/_hero.png';
const dpr = Number(process.argv[5] ?? 1);
const path = process.argv[6] ?? '/';

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width, height },
  deviceScaleFactor: dpr,
});
await page.goto(`http://localhost:3001${path}`, { waitUntil: 'networkidle' });
await page.waitForTimeout(3000);

const box = await page.evaluate(() => {
  const q = (s) => document.querySelector(s)?.getBoundingClientRect();
  const panel = q('.hero-panel');
  const product = q('.hero-product');
  const img = q('.hero-product img');
  const el = document.querySelector('.hero-product img');
  return {
    panelRight: panel?.right,
    product: product && [product.left, product.top, product.width, product.height],
    img: img && [img.left, img.top, img.width, img.height],
    natural: el && [el.naturalWidth, el.naturalHeight],
    currentSrc: el?.currentSrc,
    objectFit: el && getComputedStyle(el).objectFit,
  };
});
console.log(JSON.stringify(box, null, 2));

await page.screenshot({ path: out });
await browser.close();
