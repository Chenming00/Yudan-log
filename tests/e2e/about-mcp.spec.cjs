const { test, expect } = require('@playwright/test');

for (const width of [360, 1280]) {
  test(`standalone MCP guide is usable at ${width}px and copies the official endpoint and config`, async ({ page, context }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const errors = [];
    const productionRequests = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.route('https://cost.ykn.cm/api/**', (route) => {
      productionRequests.push(route.request().url());
      return route.abort();
    });
    await page.goto('/about#mcp');
    await expect(page.getByRole('heading', { name: '关于鱼蛋看板', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'MCP 接入指南', exact: true })).toHaveAttribute('href', '/mcp');
    await page.getByRole('link', { name: '查看完整接入指南', exact: true }).click();
    await expect(page).toHaveURL(/\/mcp$/);
    await expect(page.getByRole('heading', { level: 1, name: 'MCP 接入指南', exact: true })).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'http://127.0.0.1:4337/mcp');
    const navigation = page.getByRole('navigation', { name: width < 1024 ? '底部导航' : '主导航', exact: true });
    await expect(navigation.locator('a[aria-current="page"]')).toHaveCount(0);
    await expect(navigation.locator('a[href="/mcp"]')).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath(`mcp-intro-${width}.png`) });
    const guide = page.locator('#mcp');
    await expect(guide.getByRole('heading', { name: '用 MCP 连上鱼蛋看板' })).toBeVisible();
    await expect(guide.getByRole('heading', { name: '可用的 10 个工具' })).toBeVisible();
    await guide.getByRole('button', { name: '复制 MCP 地址' }).click();
    await expect(guide.getByRole('status')).toContainText('已复制');
    const endpoint = 'https://cost.ykn.cm/api/mcp';
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(endpoint);
    await guide.getByRole('button', { name: '复制配置', exact: true }).click();
    const config = JSON.parse(await page.evaluate(() => navigator.clipboard.readText()));
    expect(config.mcpServers['yudan-log'].url).toBe(endpoint);
    expect(config.mcpServers['yudan-log'].headers.Authorization).toBe('Bearer YOUR_API_KEY');
    expect(await page.locator('body').innerText()).not.toContain('local-browser-test-only');
    await guide.getByText('Claude Code 命令', { exact: true }).click();
    await guide.getByRole('button', { name: '复制命令', exact: true }).click();
    const command = await page.evaluate(() => navigator.clipboard.readText());
    expect(command).toContain(`yudan-log ${endpoint}`);
    expect(command).toContain('--header "Authorization: Bearer YOUR_API_KEY"');
    expect(command).not.toContain('\n+');
    await expect(guide.getByText('连不上或保存失败时', { exact: true })).toBeVisible();
    expect(await page.locator('body').evaluate((body) => body.scrollWidth <= window.innerWidth)).toBe(true);
    expect(errors).toEqual([]);
    expect(productionRequests).toEqual([]);
    await guide.screenshot({ path: testInfo.outputPath(`mcp-guide-${width}.png`) });
    await navigation.getByRole('link', { name: width < 1024 ? '关于' : '关于小站', exact: true }).click();
    await expect(page).toHaveURL(/\/about$/);
    await page.getByRole('link', { name: 'MCP 接入指南', exact: true }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'MCP 接入指南', exact: true })).toBeVisible();
  });
}

test('real Astro MCP route authenticates, lists tools and calls an existing read handler', async ({ request }) => {
  expect((await request.get('/api/mcp')).status()).toBe(401);
  expect((await request.post('/api/mcp', { data: { jsonrpc: '2.0', id: 1, method: 'tools/list' } })).status()).toBe(401);
  const headers = { Authorization: 'Bearer local-browser-test-only', Accept: 'application/json, text/event-stream', 'MCP-Protocol-Version': '2025-11-25' };
  expect((await request.get('/api/mcp', { headers })).status()).toBe(405);
  async function rpc(method, params = {}) {
    const response = await request.post('/api/mcp', { headers, data: { jsonrpc: '2.0', id: 1, method, params } });
    expect(response.status()).toBe(200);
    expect(response.headers()['cache-control']).toBe('private, no-store');
    const text = await response.text();
    return response.headers()['content-type'].includes('text/event-stream')
      ? JSON.parse(text.split('\n').find((line) => line.startsWith('data: ')).slice(6))
      : JSON.parse(text);
  }
  const initialized = await rpc('initialize', { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'browser-test', version: '1' } });
  expect(initialized.result.serverInfo.name).toBe('yudan-log');
  expect((await rpc('tools/list')).result.tools).toHaveLength(10);
  const result = await rpc('tools/call', { name: 'get_care_schedule', arguments: {} });
  expect(result.result.isError).toBeUndefined();
  expect(result.result.structuredContent.data.provider).toBe('卓正儿童保健');
  expect(result.result.structuredContent.data.milestones.length).toBeGreaterThan(0);
});
