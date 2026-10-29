const { test, expect } = require('@playwright/test');

const row = {
  id: '00000000-0000-4000-8000-000000000001', version: 1,
  amount: 29.9, type: 'expense', brand: '测试品牌', product: '测试奶瓶',
  category: '喂养用品', note: '', transaction_time: '2026-09-24T01:00:00Z',
  created_at: '2026-09-24T02:00:00Z',
};

async function openLedger(page, { blockedStorage = false, transaction = row } = {}) {
  await page.clock.setFixedTime(new Date('2026-09-24T04:00:00Z'));
  await page.addInitScript(({ blockedStorage }) => {
    if (blockedStorage) {
      for (const method of ['getItem', 'setItem', 'removeItem']) {
        Storage.prototype[method] = () => { throw new DOMException('Storage disabled', 'SecurityError'); };
      }
    } else {
      localStorage.setItem('api_key', 'browser-test-only');
    }
  }, { blockedStorage });
  await page.route('**/api/monthly?**', (route) => route.fulfill({ json: { success: true, data: {
    year: 2026, month: 9, totalExpense: transaction.type === 'expense' ? transaction.amount : 0, allTimeExpense: transaction.type === 'expense' ? transaction.amount : 0,
    prevMonthExpense: 0, transactionCount: 1, dailyExpenses: [],
    calendarData: {}, categoryBreakdown: [], lastTransaction: null,
  } } }));
  await page.route('**/api/list?**', (route) => route.fulfill({ json: {
    success: true, data: [transaction], hasMore: false, nextCursor: null,
  } }));
  await page.goto('/ledger');
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
}

async function openEdit(page) {
  await page.getByRole('tab', { name: '历史', exact: true }).click();
  await page.getByRole('button', { name: /测试奶瓶/ }).click();
  await page.getByRole('button', { name: '编辑', exact: true }).click();
  return page.getByRole('dialog', { name: '编辑账单', exact: true });
}

test('storage denial still allows session authorization and a successful ledger save', async ({ page }) => {
  const errors = [];
  const writes = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/api/add', (route) => {
    const input = route.request().postDataJSON();
    writes.push(input);
    return route.fulfill({ json: { success: true, data: { ...row, ...input }, replayed: false, request_id: input.request_id } });
  });
  await openLedger(page, { blockedStorage: true });
  await page.getByRole('button', { name: '设置', exact: true }).click();
  await page.getByPlaceholder('输入 API Key').fill('browser-test-only');
  await page.getByRole('button', { name: '保存', exact: true }).click();
  await page.getByRole('button', { name: '记一笔', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '记一笔', exact: true });
  await dialog.getByLabel('实付金额（元） *').fill('38.5');
  await dialog.getByPlaceholder('商品名称、规格、数量').fill('存储禁用仍可保存');
  await dialog.getByRole('button', { name: '保存账单', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  expect(writes).toHaveLength(1);
  expect(writes[0].request_id).toMatch(/^[0-9a-f-]{36}$/i);
  expect(errors).toEqual([]);
  await page.getByRole('button', { name: '记一笔', exact: true }).click();
  await expect(dialog.getByPlaceholder('商品名称、规格、数量')).toHaveValue('');
});

test('a lost save response retries the same request and creates only one record', async ({ page }) => {
  const requests = [];
  const saved = new Map();
  await page.route('**/api/add', (route) => {
    const input = route.request().postDataJSON();
    requests.push(input);
    if (!saved.has(input.request_id)) saved.set(input.request_id, { ...row, ...input });
    if (requests.length === 1) return route.abort('failed');
    return route.fulfill({ json: { success: true, data: saved.get(input.request_id), replayed: true, request_id: input.request_id } });
  });
  await openLedger(page);
  await page.getByRole('button', { name: '记一笔', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '记一笔', exact: true });
  await dialog.getByLabel('实付金额（元） *').fill('16.25');
  await dialog.getByPlaceholder('商品名称、规格、数量').fill('响应丢失只记一笔');
  await dialog.getByRole('button', { name: '保存账单', exact: true }).click();
  await expect(dialog.getByRole('button', { name: '重试确认保存', exact: true })).toBeVisible();
  await expect(dialog.getByPlaceholder('商品名称、规格、数量')).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: '重试确认保存', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  expect(requests).toHaveLength(2);
  expect(requests[1]).toEqual(requests[0]);
  expect(saved.size).toBe(1);
});

test('an edit conflict preserves the draft and requires explicit confirmation for the current version', async ({ page }) => {
  const requests = [];
  const current = { ...row, version: 2, product: '另一设备修改的奶瓶', amount: 59.9 };
  await page.route('**/api/edit', (route) => {
    const input = route.request().postDataJSON();
    requests.push(input);
    return route.fulfill(requests.length === 1
      ? { status: 409, json: { success: false, code: 'LEDGER_CONFLICT', error: '账单已被其他设备修改', current } }
      : { json: { success: true, data: { ...current, ...input, version: 3 }, replayed: false, request_id: input.request_id } });
  });
  await openLedger(page);
  const dialog = await openEdit(page);
  await dialog.getByPlaceholder('商品名称、规格、数量').fill('本机保留的草稿');
  await dialog.getByRole('button', { name: '保存账单', exact: true }).click();
  await expect(dialog.getByPlaceholder('商品名称、规格、数量')).toHaveValue('本机保留的草稿');
  await expect(dialog.getByText('另一设备修改的奶瓶', { exact: true })).toBeVisible();
  expect(requests).toHaveLength(1);
  await dialog.getByRole('button', { name: '使用我的输入覆盖云端', exact: true }).click();
  expect(requests).toHaveLength(1);
  await page.getByRole('button', { name: '确认覆盖', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  expect(requests[0].expected_version).toBe(1);
  expect(requests[1].expected_version).toBe(2);
  expect(requests[1].request_id).not.toBe(requests[0].request_id);
  expect(requests[1].product).toBe('本机保留的草稿');
});

test('authorization can be renewed after a lost response without changing the pending request', async ({ page }) => {
  const requests = [];
  await page.route('**/api/add', (route) => {
    const input = route.request().postDataJSON();
    requests.push({ input, authorization: route.request().headers().authorization });
    if (requests.length === 1) return route.abort('failed');
    if (requests.length === 2) return route.fulfill({ status: 401, json: { success: false, code: 'UNAUTHORIZED', error: '请更新写入权限' } });
    return route.fulfill({ json: { success: true, data: { ...row, ...input }, replayed: true, request_id: input.request_id } });
  });
  await openLedger(page);
  await page.getByRole('button', { name: '记一笔', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '记一笔', exact: true });
  await dialog.getByLabel('实付金额（元） *').fill('28');
  await dialog.getByPlaceholder('商品名称、规格、数量').fill('重新授权后确认原账单');
  await dialog.getByRole('button', { name: '保存账单', exact: true }).click();
  await dialog.getByRole('button', { name: '重试确认保存', exact: true }).click();
  await dialog.getByRole('button', { name: '更新写入权限', exact: true }).click();
  const settings = page.getByRole('dialog', { name: '账本写入权限', exact: true });
  await settings.getByPlaceholder('输入 API Key').fill('renewed-test-token');
  await settings.getByRole('button', { name: '保存', exact: true }).click();
  await dialog.getByRole('button', { name: '重试确认保存', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  expect(requests).toHaveLength(3);
  expect(requests[1].input).toEqual(requests[0].input);
  expect(requests[2].input).toEqual(requests[0].input);
  expect(requests[2].authorization).toBe('Bearer renewed-test-token');
});

test('a delete conflict requires a fresh confirmation before deleting the latest version', async ({ page }) => {
  const requests = [];
  await page.route('**/api/delete', (route) => {
    const input = route.request().postDataJSON();
    requests.push(input);
    return route.fulfill(requests.length === 1
      ? { status: 409, json: { success: false, code: 'LEDGER_CONFLICT', error: '账单已被其他设备修改', current: { ...row, version: 2, amount: 99 } } }
      : { json: { success: true, data: { ...row, version: 2 }, replayed: false, request_id: input.request_id } });
  });
  await openLedger(page);
  await page.getByRole('tab', { name: '历史', exact: true }).click();
  await page.getByRole('button', { name: /测试奶瓶/ }).click();
  await page.getByRole('button', { name: '删除', exact: true }).click();
  await page.getByRole('button', { name: '确认删除', exact: true }).click();
  await expect(page.getByRole('button', { name: '删除云端最新版本', exact: true })).toBeVisible();
  expect(requests).toHaveLength(1);
  await page.getByRole('button', { name: '删除云端最新版本', exact: true }).click();
  // The fresh confirmation must show the newer amount before a second request.
  await expect(page.getByText(/99\.00/).last()).toBeVisible();
  expect(requests).toHaveLength(1);
  await page.getByRole('button', { name: '确认删除', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(requests[0].expected_version).toBe(1);
  expect(requests[1].expected_version).toBe(2);
  expect(requests[1].request_id).not.toBe(requests[0].request_id);
});


async function openDetail(page, name) {
  await page.getByRole('tab', { name: '历史', exact: true }).click();
  await page.getByRole('button', { name }).click();
  const dialog = page.getByRole('dialog', { name: '账单详情', exact: true });
  await expect(dialog).toBeVisible();
  return dialog;
}

async function expectContainedDialog(page, dialog, { fitsWithoutScrolling = false } = {}) {
  const layout = await dialog.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return {
      left: bounds.left, right: bounds.right, top: bounds.top, bottom: bounds.bottom,
      width: window.innerWidth, height: window.innerHeight,
      clientWidth: element.clientWidth, scrollWidth: element.scrollWidth,
      clientHeight: element.clientHeight, scrollHeight: element.scrollHeight,
      pageWidth: document.documentElement.scrollWidth,
    };
  });
  expect(layout.left).toBeGreaterThanOrEqual(0);
  expect(layout.right).toBeLessThanOrEqual(layout.width + 1);
  expect(layout.top).toBeGreaterThanOrEqual(0);
  expect(layout.bottom).toBeLessThanOrEqual(layout.height + 1);
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth + 1);
  expect(layout.pageWidth).toBeLessThanOrEqual(layout.width + 1);
  if (fitsWithoutScrolling) expect(layout.scrollHeight).toBeLessThanOrEqual(layout.clientHeight + 1);
  await expect(page.getByRole('dialog')).toHaveCount(1);
}

for (const size of [
  { name: 'mobile', viewport: { width: 360, height: 800 } },
  { name: 'desktop', viewport: { width: 1440, height: 1000 } },
]) {
  test.describe(`ledger detail ${size.name}`, () => {
    test.use({ viewport: size.viewport });

    test('expense detail is compact, starts on its title, and keeps both actions reachable', async ({ page }, testInfo) => {
      const transaction = { ...row, brand: '尼塔', product: '黑标纸尿裤 M码4片', amount: 8.61, category: '护理清洁', note: '淘宝' };
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await openLedger(page, { transaction });
      const dialog = await openDetail(page, /黑标纸尿裤 M码4片/);
      const remove = dialog.getByRole('button', { name: '删除', exact: true });
      const edit = dialog.getByRole('button', { name: '编辑', exact: true });
      await expect(dialog.getByRole('heading', { name: '账单详情', exact: true })).toBeFocused();
      await expect(remove).not.toBeFocused();
      await expect(dialog.getByText('支出金额', { exact: true })).toBeVisible();
      await expect(dialog.getByText('−¥8.61', { exact: true })).toBeVisible();
      await expect(dialog.getByText(transaction.product, { exact: true })).toBeVisible();
      await expect(dialog).toContainText('尼塔');
      await expect(dialog.getByText(transaction.category, { exact: true })).toBeVisible();
      await expect(dialog.getByLabel('备注内容')).toHaveText('淘宝');
      await expect(remove).toBeInViewport();
      await expect(edit).toBeInViewport();
      await expectContainedDialog(page, dialog, { fitsWithoutScrolling: true });
      const imagePath = testInfo.outputPath(`ledger-detail-${size.name}.png`);
      await page.screenshot({ path: imagePath, animations: 'disabled' });
      await testInfo.attach(`ledger-detail-${size.name}`, { path: imagePath, contentType: 'image/png' });

      // Keyboard users can reach the primary action without accidentally deleting anything.
      await edit.focus();
      await page.keyboard.press('Enter');
      const form = page.getByRole('dialog', { name: '编辑账单', exact: true });
      await expect(form.getByLabel('实付金额（元） *')).toBeFocused();
      await expect(form.getByLabel('实付金额（元） *')).toHaveValue('8.61');
      await form.getByRole('button', { name: '取消', exact: true }).click();
      await remove.click();
      const confirmation = page.getByRole('dialog', { name: '确认删除', exact: true });
      await expect(confirmation.getByText('−¥8.61', { exact: true })).toBeVisible();
      await expect(confirmation.getByRole('button', { name: '确认删除', exact: true })).toBeInViewport();
      await confirmation.getByRole('button', { name: '取消', exact: true }).click();
      await expect(dialog).toBeVisible();
      expect(errors).toEqual([]);
    });

    test('income with missing optional fields stays clear and within the viewport', async ({ page }) => {
      const transaction = { ...row, type: 'income', amount: 36.5, brand: null, product: null, category: null, note: null, transaction_time: null };
      await openLedger(page, { transaction });
      const dialog = await openDetail(page, /购买时间未知/);
      await expect(dialog.getByText('收入金额', { exact: true })).toBeVisible();
      await expect(dialog.getByText('+¥36.50', { exact: true })).toBeVisible();
      await expect(dialog.getByText('支出金额', { exact: true })).toHaveCount(0);
      await expect(dialog.getByText('商品未填写', { exact: true })).toBeVisible();
      await expect(dialog.getByText('品牌未填写', { exact: true })).toBeVisible();
      await expect(dialog.getByText('未分类', { exact: true })).toBeVisible();
      await expect(dialog.getByText('未填写购买时间', { exact: true })).toBeVisible();
      await expect(dialog.getByLabel('备注内容')).toHaveCount(0);
      await expect(dialog.getByRole('button', { name: '删除', exact: true })).not.toBeFocused();
      await expect(dialog.getByRole('button', { name: '编辑', exact: true })).toBeInViewport();
      await expectContainedDialog(page, dialog, { fitsWithoutScrolling: true });
    });

    test('long fields and large amounts wrap while notes and actions remain usable', async ({ page }) => {
      const transaction = {
        ...row, amount: 999999999.99,
        product: `长商品名称 ${'UnbrokenProductDescription'.repeat(65)}`,
        brand: `长品牌 ${'UnbrokenBrand'.repeat(12)}`,
        category: `自定义分类 ${'LongCategory'.repeat(12)}`,
        note: Array.from({ length: 24 }, (_, index) => `第 ${index + 1} 行：淘宝订单记录 ${'ORDER'.repeat(16)}`).join('\n'),
      };
      await openLedger(page, { transaction });
      const dialog = await openDetail(page, /长商品名称/);
      await expect(dialog.getByText('−¥999,999,999.99', { exact: true })).toBeVisible();
      await expect(dialog.getByText(transaction.product, { exact: true })).toHaveText(transaction.product);
      await expect(dialog).toContainText(transaction.brand);
      await expect(dialog.getByText(transaction.category, { exact: true })).toHaveText(transaction.category);
      await expectContainedDialog(page, dialog);

      const note = dialog.getByLabel('备注内容');
      await expect(note).toHaveText(transaction.note);
      await note.scrollIntoViewIfNeeded();
      await note.focus();
      await page.keyboard.press('End');
      await expect.poll(() => note.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
      expect(await note.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
      const edit = dialog.getByRole('button', { name: '编辑', exact: true });
      await edit.scrollIntoViewIfNeeded();
      await expect(edit).toBeInViewport();
      await expect(dialog.getByRole('button', { name: '删除', exact: true })).toBeInViewport();
      await edit.click();
      await expect(page.getByRole('dialog', { name: '编辑账单', exact: true }).getByPlaceholder('商品名称、规格、数量')).toHaveValue(transaction.product);
    });
  });
}
