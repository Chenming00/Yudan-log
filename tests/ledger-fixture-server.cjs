// In-memory PostgREST fixture for local end-to-end verification; never connects to production.
const { createServer } = require('node:http');
const { randomUUID } = require('node:crypto');
const rows = [
  { id: randomUUID(), amount: 16, type: 'expense', brand: '示例品牌', product: '奶嘴收纳盒 2个装', category: '喂养用品', note: '店铺：示例旗舰店\n订单号：000123\n优惠：店铺优惠¥15', transaction_time: '2026-09-07T16:00:00.000Z', created_at: '2026-09-08T01:00:00.000Z' },
  { id: randomUUID(), amount: 20, type: 'expense', brand: null, product: null, category: '其他', note: '旧账单，时间未知', transaction_time: null, created_at: '2026-09-07T01:00:00.000Z' },
];
const server = createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') { res.writeHead(204).end(); return; }
  const url = new URL(req.url, 'http://127.0.0.1');
  const send = (data, status = 200) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)); };
  if (url.pathname === '/rest/v1/rpc/total_expense') return send(rows.reduce((sum, r) => sum + r.amount, 0));
  if (url.pathname !== '/rest/v1/transactions') return send({ error: 'Fixture route not found' }, 404);
  let selected = rows.filter((r) => {
    for (const key of ['id', 'type', 'category']) {
      const filter = url.searchParams.get(key);
      if (filter?.startsWith('eq.') && r[key] !== filter.slice(3)) return false;
    }
    const cursor = url.searchParams.get('created_at');
    if (cursor?.startsWith('lt.') && r.created_at >= cursor.slice(3)) return false;
    const range = url.searchParams.get('or');
    if (range) {
      const start = range.match(/transaction_time.gte.([^,)]+)/)?.[1];
      const end = range.match(/transaction_time.lt.([^,)]+)/)?.[1];
      const time = r.transaction_time || r.created_at;
      if (start && time < start || end && time >= end) return false;
    }
    return true;
  });
  if (req.method === 'POST' || req.method === 'PATCH') {
    let body = ''; for await (const chunk of req) body += chunk;
    const data = JSON.parse(body);
    if (req.method === 'POST') {
      selected = (Array.isArray(data) ? data : [data]).map((item) => ({ id: randomUUID(), created_at: new Date().toISOString(), brand: null, product: null, note: null, category: null, transaction_time: null, ...item }));
      rows.push(...selected);
    } else for (const row of selected) Object.assign(row, data);
  } else if (req.method === 'DELETE') {
    for (const row of selected) rows.splice(rows.indexOf(row), 1);
  }
  selected = selected.slice().sort((a, b) => b.created_at.localeCompare(a.created_at));
  if (url.searchParams.has('limit')) selected = selected.slice(0, Number(url.searchParams.get('limit')));
  const single = req.headers.accept?.includes('vnd.pgrst.object');
  send(single ? selected[0] || null : selected);
});
server.listen(54329, '127.0.0.1', () => process.stdout.write('Local ledger fixture ready on 54329\n'));
