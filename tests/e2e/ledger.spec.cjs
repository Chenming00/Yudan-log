const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');

const fixedNow = new Date('2026-09-24T04:00:00Z');
const rows = Array.from({ length: 36 }, (_, index) => ({
  id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
  amount: index === 35 ? 16.25 : 10,
  type: 'expense',
  brand: '测试品牌',
  product: index === 35 ? '第二页奶瓶' : `日常用品${index}`,
  category: index === 35 ? null : '喂养用品',
  note: '',
  transaction_time: `2026-09-${String(24 - Math.floor(index / 2)).padStart(2, '0')}T01:00:00Z`,
  created_at: '2026-09-24T02:00:00Z',
}));
rows.push({ ...rows[35], id: '10000000-0000-4000-8000-000000000000', product: '上月奶瓶', transaction_time: '2026-08-20T01:00:00Z' });

function summary(month) {
  return { success: true, data: {
    year: 2026, month, totalExpense: 200 + month, allTimeExpense: 1000,
    prevMonthExpense: 100, transactionCount: 36,
    dailyExpenses: Array.from({ length: 30 }, (_, i) => ({ date: `2026-${String(month).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`, amount: i === 0 ? 200 + month : 0 })),
    calendarData: { 1: 200 + month }, categoryBreakdown: [], lastTransaction: null,
  } };
}

async function installReadFixtures(page, onList = () => {}) {
  await page.clock.setFixedTime(fixedNow);
  await page.route('**/api/monthly?**', (route) => route.fulfill({ json: summary(Number(new URL(route.request().url()).searchParams.get('month'))) }));
  await page.route('**/api/list?**', async (route) => {
    const params = new URL(route.request().url()).searchParams;
    onList(params);
    const q = (params.get('q') || '').toLowerCase();
    const category = params.get('category');
    const month = params.get('month');
    const filtered = rows.filter((row) => (!month || row.transaction_time.startsWith(`2026-${month.padStart(2, '0')}`))
      && (!category || (row.category || '未分类') === category)
      && (!q || [row.product, row.brand, row.amount, row.category || '未分类'].join(' ').toLowerCase().includes(q)));
    const start = Number(params.get('cursor') || 0);
    const limit = Number(params.get('limit') || 30);
    const data = filtered.slice(start, start + limit);
    const hasMore = start + limit < filtered.length;
    await route.fulfill({ json: { success: true, data, hasMore, nextCursor: hasMore ? String(start + limit) : null } });
  });
}

test('search finds an unloaded row and monthly CSV shares its query', async ({ page }, testInfo) => {
  const queries = [];
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await installReadFixtures(page, (params) => queries.push(Object.fromEntries(params)));
  await page.goto('/ledger');
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
  await page.getByRole('tab', { name: '历史', exact: true }).click();
  await expect(page.getByRole('button', { name: /日常用品0/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /第二页奶瓶/ })).toHaveCount(0);
  await page.getByPlaceholder('搜索品牌、商品、备注、分类或金额...').fill('奶瓶');
  await expect(page.getByRole('button', { name: /第二页奶瓶/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /上月奶瓶/ })).toHaveCount(0);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出 CSV' }).click();
  const csv = await fs.readFile(await (await downloadPromise).path(), 'utf8');
  expect(csv).toContain('第二页奶瓶');
  expect(csv).not.toContain('上月奶瓶');
  expect(queries.some((query) => query.q === '奶瓶' && Number(query.month) === 9 && Number(query.limit) === 100)).toBe(true);
  expect(errors).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('ledger-mobile.png'), fullPage: true });
});

test('empty search can be cleared without losing the filters', async ({ page }) => {
  await installReadFixtures(page);
  await page.goto('/ledger');
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
  await page.getByRole('tab', { name: '历史', exact: true }).click();
  const search = page.getByPlaceholder('搜索品牌、商品、备注、分类或金额...');
  await search.fill('没有这个商品');
  await expect(page.getByRole('button', { name: /日常用品0/ })).toHaveCount(0);
  await expect(search).toBeVisible();
  await search.fill('16.25');
  await expect(page.getByRole('button', { name: /第二页奶瓶/ })).toBeVisible();
  expect(await page.locator('body').evaluate((body) => body.scrollWidth <= window.innerWidth)).toBe(true);
});

test('late month responses cannot replace the current month', async ({ page }) => {
  await installReadFixtures(page);
  let releaseAugust;
  let startedAugust;
  let finishedAugust;
  const augustStarted = new Promise((resolve) => { startedAugust = resolve; });
  const augustGate = new Promise((resolve) => { releaseAugust = resolve; });
  const augustFinished = new Promise((resolve) => { finishedAugust = resolve; });
  await page.route('**/api/monthly?**', async (route) => {
    const month = Number(new URL(route.request().url()).searchParams.get('month'));
    if (month === 8) { startedAugust(); await augustGate; }
    await route.fulfill({ json: summary(month) }).catch(() => {});
    if (month === 8) finishedAugust();
  });
  await page.goto('/ledger');
  await expect(page.getByText('本月支出', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '上个月', exact: true }).click();
  await augustStarted;
  await page.getByRole('button', { name: '上个月', exact: true }).click();
  await expect(page.getByText('7月支出', { exact: true })).toBeVisible();
  await expect(page.getByText('¥207.00', { exact: true })).toBeVisible();
  releaseAugust();
  await augustFinished;
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await expect(page.getByText('¥207.00', { exact: true })).toBeVisible();
  await expect(page.getByText('¥208.00', { exact: true })).toHaveCount(0);
});

test('failed monthly requests show an error and can be retried', async ({ page }) => {
  await installReadFixtures(page);
  let attempts = 0;
  await page.route('**/api/monthly?**', (route) => {
    attempts += 1;
    return route.fulfill(attempts === 1
      ? { status: 503, json: { success: false, error: '测试：暂时无法读取汇总' } }
      : { json: summary(9) });
  });
  await page.goto('/ledger');
  await expect(page.getByText('测试：暂时无法读取汇总')).toBeVisible();
  await page.getByRole('button', { name: /重试/ }).click();
  await expect(page.getByText('本月支出', { exact: true })).toBeVisible();
  await expect(page.getByText('¥209.00', { exact: true })).toBeVisible();
});
