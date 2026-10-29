const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const fixedNow = new Date('2026-09-24T04:00:00Z');
const articlePath = '/blog/ledger-pagination-optimization';
const markdown = fs.readFileSync(path.join(__dirname, '../../content/blog/ledger-pagination-optimization.md'), 'utf8');
const firstJsonExample = markdown.match(/```json\r?\n([\s\S]*?)\r?\n```/)[1];

for (const width of [360, 1440]) {
  test(`article code preserves whitespace, supports copying and scrolls within the page at ${width}px`, async ({ page, context }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.clock.setFixedTime(fixedNow);
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    // This is a static article interaction; no API request should reach a service.
    const writes = [];
    await page.route('**/api/**', (route) => {
      if (route.request().method() !== 'GET') writes.push(route.request().url());
      return route.abort();
    });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(articlePath);
    const jsonBlock = page.getByRole('group', { name: /^JSON 代码块 \d+$/ }).first();
    await expect(jsonBlock).toBeVisible();
    await expect(jsonBlock.getByRole('button', { name: '复制 JSON 代码', exact: true })).toHaveCount(1);
    const code = jsonBlock.locator('pre > code');
    expect(await code.textContent()).toBe(firstJsonExample);
    const copy = jsonBlock.getByRole('button', { name: '复制 JSON 代码', exact: true });
    await copy.focus();
    await page.keyboard.press('Enter');
    await expect(copy).toHaveText('已复制');
    await expect(jsonBlock.getByRole('status')).toHaveText('代码已复制');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(firstJsonExample);

    const pre = jsonBlock.locator('pre');
    const typography = await pre.evaluate((element) => {
      const style = getComputedStyle(element);
      return { top: parseFloat(style.paddingTop), left: parseFloat(style.paddingLeft), size: parseFloat(style.fontSize), lineHeight: parseFloat(style.lineHeight) };
    });
    expect(typography.top).toBeGreaterThanOrEqual(16);
    expect(typography.left).toBeGreaterThanOrEqual(16);
    expect(typography.size).toBeGreaterThanOrEqual(13);
    expect(typography.lineHeight / typography.size).toBeGreaterThanOrEqual(1.75);
    const inlineCode = page.locator('.blog-content :not(pre) > code').first();
    expect(await inlineCode.evaluate((element) => getComputedStyle(element, '::before').content)).toBe('none');
    expect(await inlineCode.evaluate((element) => getComputedStyle(element, '::after').content)).toBe('none');

    const examples = page.locator('.blog-content pre');
    const scrollingIndex = await examples.evaluateAll((elements) => elements.findIndex((element) => element.scrollWidth > element.clientWidth + 10));
    // The article's examples fit on desktop; only the narrow viewport must scroll.
    if (width < 768) expect(scrollingIndex).toBeGreaterThanOrEqual(0);
    if (scrollingIndex >= 0) {
      const scrollingExample = examples.nth(scrollingIndex);
      await scrollingExample.focus();
      await page.keyboard.press('ArrowRight');
      await expect.poll(() => scrollingExample.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
    }
    const dimensions = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
    expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width);
    expect(dimensions.body).toBeLessThanOrEqual(dimensions.width);

    await page.getByRole('heading', { name: '认证', exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath(`api-code-context-${width}.png`) });
    const authenticationBlock = page.getByRole('group', { name: 'HTTP 代码块 1', exact: true });
    await authenticationBlock.screenshot({ path: testInfo.outputPath(`api-code-auth-${width}.png`) });
    expect(writes).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test('clipboard rejection leaves article code available and explains how to copy manually', async ({ page }) => {
  await page.clock.setFixedTime(fixedNow);
  await page.addInitScript(() => {
    Object.defineProperty(navigator.clipboard, 'writeText', {
      configurable: true,
      value: () => Promise.reject(new DOMException('Clipboard permission denied', 'NotAllowedError')),
    });
  });
  await page.goto(articlePath);
  const block = page.getByRole('group', { name: 'HTTP 代码块 1', exact: true });
  const before = await block.locator('code').textContent();
  const copy = block.getByRole('button', { name: '复制 HTTP 代码', exact: true });
  await copy.click();
  await expect(copy).toHaveText('请手动复制');
  await expect(block.getByRole('status')).toHaveText('复制未成功，请选中代码后手动复制。');
  expect(await block.locator('code').textContent()).toBe(before);
  await expect(copy).toBeEnabled();
});
