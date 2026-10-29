const { test, expect } = require('@playwright/test');

for (const width of [360, 1440]) {
  for (const route of ['/', '/health']) {
    test(`weight reference curves switch without changing measurements on ${route} at ${width}px`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      await page.clock.setFixedTime(new Date('2026-09-24T04:00:00Z'));
      const errors = [];
      const writes = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.route('http://127.0.0.1:54329/**', (request) => request.abort());
      await page.route('**/api/**', (request) => {
        if (request.request().method() !== 'GET') writes.push(request.request().url());
        return request.abort();
      });
      await page.goto(route);
      await expect(page.locator('astro-island[client="load"][ssr]')).toHaveCount(0);
      const heading = page.getByRole('heading', { name: route === '/' ? '一点一滴，长大的轨迹' : '体重成长曲线', exact: true });
      await heading.scrollIntoViewIfNeeded();
      const comparison = page.getByRole('region', { name: '体重标准对照', exact: true });
      await expect(comparison).toBeVisible();
      const svg = comparison.getByRole('group', { name: '体重趋势图，点按图表可查看最近数据点的日期和体重', exact: true });
      const both = comparison.getByRole('button', { name: '双标准', exact: true });
      const who = comparison.getByRole('button', { name: 'WHO', exact: true });
      const china = comparison.getByRole('button', { name: '中国 WS/T', exact: true });
      const measured = comparison.getByRole('button', { name: '仅实测', exact: true });
      const points = svg.getByRole('button', { name: /体重 .* 千克/ });
      await expect(points).toHaveCount(3);
      const positions = await points.evaluateAll((items) => items.map((item) => Number(item.getAttribute('cx'))));
      expect((positions[1] - positions[0]) / (positions[2] - positions[0])).toBeCloseTo(4 / 9, 5);
      await expect(both).toHaveAttribute('aria-pressed', 'true');
      await expect(svg.locator('[data-standard="WHO"][data-percentile="p50"]')).toHaveCount(1);
      await expect(svg.locator('[data-standard="CN"][data-percentile="p50"]')).toHaveCount(1);
      await comparison.screenshot({ path: testInfo.outputPath(`weight-both-${route === '/' ? 'home' : 'health'}-${width}.png`) });

      await who.click();
      await expect(who).toHaveAttribute('aria-pressed', 'true');
      await expect(both).toHaveAttribute('aria-pressed', 'false');
      for (const percentile of ['p3', 'p50', 'p97']) {
        await expect(svg.locator(`[data-standard="WHO"][data-percentile="${percentile}"]`)).toHaveCount(1);
      }
      await expect(svg.locator('[data-standard="CN"]')).toHaveCount(0);
      await comparison.screenshot({ path: testInfo.outputPath(`weight-who-${route === '/' ? 'home' : 'health'}-${width}.png`) });

      await china.click();
      await expect(china).toHaveAttribute('aria-pressed', 'true');
      for (const percentile of ['p3', 'p50', 'p97']) {
        await expect(svg.locator(`[data-standard="CN"][data-percentile="${percentile}"]`)).toHaveCount(1);
      }
      await expect(svg.locator('[data-standard="WHO"]')).toHaveCount(0);
      await measured.click();
      await expect(measured).toHaveAttribute('aria-pressed', 'true');
      await expect(svg.locator('[data-standard]')).toHaveCount(0);
      await expect(points).toHaveCount(3);
      await expect(points.last()).toHaveAttribute('aria-label', '2026-08-21，体重 3.56 千克');
      await points.last().press('Enter');
      await expect(comparison.getByRole('tooltip')).toContainText('实测 3.56 kg');
      await both.click();
      await expect(svg.locator('[data-standard="WHO"][data-percentile="p50"]')).toHaveCount(1);
      await expect(points).toHaveCount(3);
      expect(await svg.getAttribute('viewBox')).toBeTruthy();
      expect(await svg.innerHTML()).not.toMatch(/NaN|Infinity/);
      const dimensions = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, document: document.documentElement.scrollWidth }));
      expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport);
      expect(writes).toEqual([]);
      expect(errors).toEqual([]);
    });
  }
}
