/**
 * Prerender script — runs after `vite build` to generate static HTML
 * with fully rendered content for SEO (Googlebot gets real content).
 *
 * Usage: node scripts/prerender.mjs
 */
import { launch } from 'puppeteer';
import { writeFileSync } from 'fs';
import { resolve, join } from 'path';
import { preview } from 'vite';

const DIST = resolve(process.cwd(), 'dist');

async function prerender() {
  console.log('Starting prerender...');

  // Use Vite's built-in preview server (handles all MIME types correctly)
  const server = await preview({ preview: { port: 4174, strictPort: true } });
  const url = server.resolvedUrls.local[0] || 'http://localhost:4174/';

  const browser = await launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  // Navigate and wait for full render
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

  // Wait for React to mount and animations to settle
  await page.waitForSelector('h1', { timeout: 15000 });
  await new Promise((r) => setTimeout(r, 3000));

  // Get the fully rendered HTML
  const html = await page.content();

  // Write back to dist/index.html
  writeFileSync(join(DIST, 'index.html'), html, 'utf-8');
  console.log('Prerendered index.html written to dist/');

  await browser.close();
  server.httpServer.close();
  console.log('Prerender complete!');
}

prerender().catch((err) => {
  console.error('Prerender failed:', err);
  process.exit(1);
});
