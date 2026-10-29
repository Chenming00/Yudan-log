const { test, expect } = require('@playwright/test');

const fixedNow = new Date('2026-09-24T04:00:00Z');
const birthStoryTitle = '鱼蛋出生记｜从破水到平安出院';
const routes = [
  { path: '/', title: '鱼蛋的成长日常', section: '/', guestHealth: true },
  { path: '/health', title: '鱼蛋的保健档案', section: '/health', guestHealth: true },
  { path: '/ledger', title: '鱼蛋小账本', section: '/ledger' },
  { path: '/blog', title: '成长日志', section: '/blog' },
  { path: '/blog/yudan-birth-story', title: birthStoryTitle, section: '/blog' },
  { path: '/about', title: '关于鱼蛋看板', section: '/about' },
];

async function installGuestFixtures(page) {
  const writes = [];
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.clock.setFixedTime(fixedNow);
  // browser-setup.cjs supplies local-only Supabase credentials. Keep every data
  // request inside this test as well, so a UI smoke test cannot write records.
  await page.route('http://127.0.0.1:54329/**', (route) => route.abort());
  await page.route('**/api/**', (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() !== 'GET') {
      writes.push(`${request.method()} ${url.pathname}`);
      return route.fulfill({ status: 405, json: { success: false, error: 'Read-only UI fixture' } });
    }
    if (url.pathname === '/api/monthly') {
      return route.fulfill({ json: { success: true, data: {
        year: 2026, month: 9, totalExpense: 0, allTimeExpense: 0,
        prevMonthExpense: 0, transactionCount: 0, dailyExpenses: [],
        calendarData: {}, categoryBreakdown: [], lastTransaction: null,
      } } });
    }
    if (url.pathname === '/api/list') {
      return route.fulfill({ json: { success: true, data: [], hasMore: false, nextCursor: null } });
    }
    return route.fulfill({ status: 503, json: { available: false, error: 'UI fixture: service unavailable' } });
  });
  return { writes, errors };
}

async function waitForInteractivePage(page) {
  // Eager islands must hydrate before an input or tab is exercised. Visible-only
  // article helpers are intentionally allowed to hydrate when scrolled into view.
  await expect(page.locator('astro-island[client="load"][ssr]')).toHaveCount(0);
}

async function expectNoHorizontalOverflow(page) {
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport);
  expect(dimensions.body).toBeLessThanOrEqual(dimensions.viewport);
}

async function expectActiveNavigation(page, width, href) {
  const navigation = page.getByRole('navigation', { name: width < 1024 ? '底部导航' : '主导航', exact: true });
  await expect(navigation).toBeVisible();
  const active = navigation.locator('a[aria-current="page"]');
  await expect(active).toHaveCount(1);
  await expect(active).toHaveAttribute('href', href);
}

for (const width of [360, 1440]) {
  test(`site pages preserve guest state, active navigation and responsive width at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    const observed = await installGuestFixtures(page);

    for (const entry of routes) {
      await test.step(entry.path, async () => {
        await page.goto(entry.path);
        await expect(page.getByRole('heading', { level: 1, name: entry.title, exact: true })).toBeVisible();
        await waitForInteractivePage(page);
        await expectActiveNavigation(page, width, entry.section);
        if (entry.guestHealth) {
          if (entry.path === '/' && width < 640) {
            await expect(page.getByText('示例数据，真实记录未公开', { exact: true })).toBeVisible();
          } else {
            await expect(page.getByText('示例预览', { exact: true })).toBeVisible();
            await expect(page.getByText('当前体重和接种内容为示例，鱼蛋的云端记录没有公开', { exact: true }).last()).toBeVisible();
          }
          await expect(page.getByRole('button', { name: 'GitHub 登录', exact: true })).toBeVisible();
          await expect(page.getByRole('button', { name: '记录体重', exact: true })).toHaveCount(0);
          await expect(page.getByRole('button', { name: '删除体重记录', exact: true })).toHaveCount(0);
        }
        if (entry.path === '/') {
          await page.getByRole('heading', { name: '一点一滴，长大的轨迹', exact: true }).scrollIntoViewIfNeeded();
          await expect(page.getByRole('group', { name: '体重趋势图，点按图表可查看最近数据点的日期和体重', exact: true })).toBeVisible();
          await page.evaluate(() => window.scrollTo(0, 0));
          await page.screenshot({ path: testInfo.outputPath(`dashboard-${width}.png`), fullPage: true });
        }
        if (entry.path === '/blog') {
          await page.screenshot({ path: testInfo.outputPath(`journal-${width}.png`), fullPage: true });
        }
        if (entry.path === '/ledger') {
          await expect(page.getByRole('region', { name: '月度支出', exact: true })).toBeVisible();
        }
        await expectNoHorizontalOverflow(page);
      });
    }
    expect(observed.writes).toEqual([]);
    expect(observed.errors).toEqual([]);
  });

  test(`health categories remain usable and read-only for a guest at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const observed = await installGuestFixtures(page);
    await page.goto('/health');
    await waitForInteractivePage(page);
    const categories = page.getByRole('navigation', { name: '保健档案分类', exact: true });
    const weight = categories.getByRole('button', { name: '体重', exact: true });
    const vaccines = categories.getByRole('button', { name: '疫苗', exact: true });
    const care = categories.getByRole('button', { name: '卓正儿保', exact: true });
    await expect(weight).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('heading', { name: '测量记录', exact: true })).toBeVisible();

    await vaccines.click();
    await expect(vaccines).toHaveAttribute('aria-pressed', 'true');
    await expect(weight).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByRole('heading', { name: '接种计划', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: '测量记录', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: '登记', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: '自费', exact: true }).click();
    await expect(page.getByRole('button', { name: '自费', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expectNoHorizontalOverflow(page);

    await care.click();
    await expect(care).toHaveAttribute('aria-pressed', 'true');
    await expect(vaccines).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByRole('heading', { name: '卓正儿童保健时间', exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await weight.click();
    await expect(weight).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('heading', { name: '体重成长曲线', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: '登录后记录', exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    expect(observed.writes).toEqual([]);
    expect(observed.errors).toEqual([]);
  });

  test(`journal search, tag filtering and article contents navigation work at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const observed = await installGuestFixtures(page);
    await page.goto('/blog');
    await waitForInteractivePage(page);
    const search = page.getByRole('searchbox', { name: '搜索文章', exact: true });
    await search.fill('鱼蛋出生记');
    await expect(page.getByRole('link', { name: new RegExp(birthStoryTitle) })).toBeVisible();
    await expect(page.getByRole('heading', { name: '账单 skill', exact: true })).toHaveCount(0);
    await search.fill('无匹配内容的测试关键词');
    await expect(page.getByText('没有找到匹配的文章', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: '清除筛选', exact: true }).click();
    await expect(search).toHaveValue('');
    await expect(page.getByRole('heading', { name: birthStoryTitle, exact: true })).toBeVisible();
    const categories = page.getByRole('navigation', { name: '日志分类', exact: true });
    const stories = categories.getByRole('button', { name: '成长故事', exact: true });
    const tech = categories.getByRole('button', { name: '技术笔记', exact: true });
    const all = categories.getByRole('button', { name: '全部', exact: true });
    await expect(stories).toHaveAttribute('aria-pressed', 'true');
    await tech.click();
    await expect(tech).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('heading', { name: '账单 skill', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: birthStoryTitle, exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: '出生日记', exact: true })).toHaveCount(0);
    await search.fill('鱼蛋出生记');
    await expect(page.getByText('没有找到匹配的文章', { exact: true })).toBeVisible();
    await all.click();
    await expect(search).toHaveValue('鱼蛋出生记');
    await expect(page.getByRole('heading', { name: birthStoryTitle, exact: true })).toBeVisible();
    await page.getByRole('button', { name: '清除搜索', exact: true }).click();
    await expect(page.getByRole('heading', { name: '账单 skill', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: birthStoryTitle, exact: true })).toBeVisible();
    await stories.click();
    const birthTag = page.getByRole('button', { name: '出生日记', exact: true });
    await birthTag.click();
    await expect(birthTag).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('heading', { name: '账单 skill', exact: true })).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
    await tech.click();
    await expect(page.getByRole('button', { name: '全部标签', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('heading', { name: '账单 skill', exact: true })).toBeVisible();
    await stories.click();
    await expect(page.getByRole('button', { name: '全部标签', exact: true })).toHaveAttribute('aria-pressed', 'true');

    await page.getByRole('link', { name: new RegExp(birthStoryTitle) }).click();
    await expect(page.getByRole('heading', { level: 1, name: birthStoryTitle, exact: true })).toBeVisible();
    await waitForInteractivePage(page);
    await expectActiveNavigation(page, width, '/blog');
    const contents = page.getByRole('button', { name: '文章目录', exact: true });
    await expect(contents).toBeVisible();
    const initiallyExpanded = await contents.getAttribute('aria-expanded') === 'true';
    await contents.click();
    await expect(contents).toHaveAttribute('aria-expanded', String(!initiallyExpanded));
    if (initiallyExpanded) await contents.click();
    await expect(contents).toHaveAttribute('aria-expanded', 'true');
    const sectionName = '8月12日9点16分，我们见面了';
    const sectionLink = page.getByRole('link', { name: sectionName, exact: true });
    const fragment = await sectionLink.getAttribute('href');
    await sectionLink.click();
    await expect.poll(() => page.evaluate(() => decodeURIComponent(window.location.hash))).toBe(fragment);
    await expect(page.getByRole('heading', { name: sectionName, exact: true })).toBeInViewport();
    await expectNoHorizontalOverflow(page);
    expect(observed.writes).toEqual([]);
    expect(observed.errors).toEqual([]);
  });
}

for (const viewport of [{ width: 360, height: 800 }, { width: 390, height: 844 }]) {
  test(`mobile dashboard shows weight and next action above the dock at ${viewport.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    const observed = await installGuestFixtures(page);
    await page.goto('/');
    await waitForInteractivePage(page);

    const priorities = page.getByRole('region', { name: '今日重点', exact: true });
    await expect(priorities.getByRole('link', { name: /最新体重/ })).toContainText('3.56');
    await expect(priorities.getByRole('heading', { name: /乙肝疫苗/ })).toBeVisible();
    const priorityBounds = await priorities.boundingBox();
    const dockBounds = await page.getByRole('navigation', { name: '底部导航', exact: true }).boundingBox();
    expect(priorityBounds.y).toBeGreaterThanOrEqual(0);
    expect(priorityBounds.y + priorityBounds.height).toBeLessThanOrEqual(dockBounds.y);
    await expect(page.getByText('示例数据，真实记录未公开', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'GitHub 登录', exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: testInfo.outputPath(`mobile-home-${viewport.width}.png`) });

    await priorities.locator('summary').filter({ hasText: '查看全部近期事项' }).click();
    await expect(priorities.getByRole('link', { name: /儿保/ })).toBeVisible();
    await expect(priorities.getByRole('link', { name: /儿保/ })).toHaveAttribute('href', '/health?tab=care');
    await page.locator('summary').filter({ hasText: '查看示例与登录说明' }).click();
    await expect(page.getByText('当前体重和接种内容为示例，鱼蛋的云端记录没有公开', { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: '记录体重', exact: true })).toHaveCount(0);
    expect(observed.writes).toEqual([]);
    expect(observed.errors).toEqual([]);
  });
}
