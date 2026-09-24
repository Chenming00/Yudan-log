const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { randomUUID } = require('node:crypto');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, filename);
};
const { createBlogChatHandlers } = require('../src/lib/blog-chat-server.ts');
const { PGlite } = require(process.env.PGLITE_MODULE || '@electric-sql/pglite');

test('blog chat quota migration runs in PostgreSQL and enforces durable budgets', async (t) => {
  const db = new PGlite();
  const visitor = randomUUID();
  const status = async (id = visitor, article = 'article', daily = 5, global = 100) => (await db.query('select public.blog_chat_status($1,$2,$3,$4) as result', [id, article, daily, global])).rows[0].result;
  const reserve = async ({ id = visitor, article = 'article', daily = 5, global = 100, rate = 100, globalRate = 1000 } = {}) => (await db.query('select public.blog_chat_reserve($1,$2,$3,$4,$5,$6) as result', [id, article, daily, global, rate, globalRate])).rows[0].result;
  const finish = (ticket, produced) => db.query('select public.blog_chat_finish($1::uuid,$2::boolean)', [ticket, produced]);
  const reset = () => db.exec('truncate blog_chat_private.reservations, blog_chat_private.daily_visitor, blog_chat_private.daily_global, blog_chat_private.request_rate');
  try {
    await db.exec('create role anon; create role authenticated; create role service_role;');
    await db.exec(fs.readFileSync(require.resolve('../supabase/migrations/202609240003_blog_chat_limits.sql'), 'utf8'));

    await t.test('simultaneously submitted requests cannot exceed the visitor/article daily budget', async () => {
      const results = await Promise.all(Array.from({ length: 16 }, () => reserve()));
      const accepted = results.filter((result) => result.allowed);
      assert.equal(accepted.length, 5);
      assert.equal(new Set(accepted.map((result) => result.ticket)).size, 5);
      assert.equal((await status()).remaining, 0);
      for (const result of results.filter((result) => !result.allowed)) {
        assert.equal(result.reason, 'daily'); assert.ok(result.retryAfter > 0 && result.retryAfter <= 86400);
      }
      const totals = await db.query('select used from blog_chat_private.daily_global');
      assert.equal(totals.rows[0].used, 5);
      assert.equal((await reserve({ article: 'second-article' })).allowed, true);
    });

    await t.test('global daily cap applies across independent visitors and articles', async () => {
      await reset();
      const results = await Promise.all(Array.from({ length: 12 }, (_, index) => reserve({ id: randomUUID(), article: `article-${index}`, global: 7 })));
      assert.equal(results.filter((result) => result.allowed).length, 7);
      assert.equal((await status(randomUUID(), 'another', 5, 7)).remaining, 0);
      await finish(results.find((result) => result.allowed).ticket, false);
      assert.equal((await reserve({ id: randomUUID(), global: 7 })).allowed, true);
    });

    await t.test('refunds and charges are idempotent; a charged answer cannot later be refunded', async () => {
      await reset();
      const refunded = await reserve();
      await Promise.all([finish(refunded.ticket, false), finish(refunded.ticket, false)]);
      assert.equal((await status()).remaining, 5);
      await assert.rejects(finish(refunded.ticket, true), /expired or was refunded/);
      const charged = await reserve();
      await Promise.all([finish(charged.ticket, true), finish(charged.ticket, true)]);
      await finish(charged.ticket, false);
      assert.equal((await status()).remaining, 4);
      assert.equal((await db.query('select state from blog_chat_private.reservations where id=$1', [charged.ticket])).rows[0].state, 'charged');
    });

    await t.test('expired reservations are reclaimed by status and cannot authorize a late answer', async () => {
      await reset();
      const first = await reserve();
      await db.query("update blog_chat_private.reservations set expires_at=now()-interval '1 second' where id=$1", [first.ticket]);
      await assert.rejects(finish(first.ticket, true), /expired or was refunded/);
      assert.equal((await status()).remaining, 5);
      await assert.rejects(finish(first.ticket, true), /expired or was refunded/);
      await finish(first.ticket, false);
      await assert.rejects(finish(randomUUID(), true), /does not exist/);
      assert.equal((await status()).remaining, 5);
      const second = await reserve();
      assert.equal(second.allowed, true);
    });

    await t.test('visitor rate applies across articles and unsuccessful answers do not refund rate attempts', async () => {
      await reset();
      // One transaction fixes PostgreSQL now(), so this test cannot straddle a minute boundary.
      await db.exec('begin');
      try {
        const first = await reserve({ rate: 2 });
        await finish(first.ticket, false);
        await reserve({ article: 'second', rate: 2 });
        const third = await reserve({ article: 'third', rate: 2 });
        assert.equal(third.allowed, false); assert.equal(third.reason, 'rate');
        assert.ok(third.retryAfter >= 1 && third.retryAfter <= 60);
        assert.equal((await status(visitor, 'third')).remaining, 5);
      } finally { await db.exec('commit'); }
    });

    await t.test('the HTTP stream exposes no text when SQL rejects an already-refunded ticket', async () => {
      await reset();
      let ticket;
      let identity;
      const handlers = createBlogChatHandlers({
        config: { baseUrl: 'https://example.test', apiKey: 'test-key', cookieSecret: 's'.repeat(40), dailyLimit: 5, globalDailyLimit: 100, rateLimit: 3, globalRateLimit: 20, maxOutputTokens: 800 },
        getPost: async () => ({ title: '测试', text: '文章内容' }),
        quota: async (_action, id) => { identity = id; const result = await reserve({ id }); ticket = result.ticket; return result; },
        finish: async (id, produced) => { await finish(id, produced); },
        fetch: async () => {
          await db.query("update blog_chat_private.reservations set expires_at=now()-interval '1 second' where id=$1", [ticket]);
          await status(identity);
          return new Response('data: {"choices":[{"delta":{"content":"不应暴露的回复"}}]}\n\ndata: [DONE]\n\n');
        },
        report: () => {},
      });
      const result = await handlers.POST(new Request('https://example.test/api/blog/chat', { method: 'POST', body: JSON.stringify({ slug: 'article', question: '你好' }) }));
      const body = await result.text();
      assert.ok(!body.includes('不应暴露的回复'));
      assert.match(body, /未扣次数/);
      assert.equal((await status(identity)).remaining, 5);
    });

    await t.test('global rate protects the provider across signed-cookie resets', async () => {
      await reset();
      await db.exec('begin');
      try {
        const results = await Promise.all(Array.from({ length: 7 }, () => reserve({ id: randomUUID(), globalRate: 3 })));
        assert.equal(results.filter((result) => result.allowed).length, 3);
        assert.ok(results.filter((result) => !result.allowed).every((result) => result.reason === 'rate'));
      } finally { await db.exec('commit'); }
    });

    await t.test('daily reset is Shanghai midnight and previous-day usage does not affect today', async () => {
      await reset();
      const row = (await db.query("select (now() at time zone 'Asia/Shanghai')::date::text as day, (((now() at time zone 'Asia/Shanghai')::date+1)::timestamp at time zone 'Asia/Shanghai') as reset")).rows[0];
      await db.query("insert into blog_chat_private.daily_global(day,used) values($1::date-1,100)", [row.day]);
      await db.query("insert into blog_chat_private.daily_visitor(day,visitor,article,used) values($1::date-1,$2,'article',5)", [row.day, visitor]);
      const quota = await status();
      assert.equal(quota.remaining, 5);
      assert.equal(new Date(quota.resetAt).toISOString(), new Date(row.reset).toISOString());
      assert.equal(new Date(quota.resetAt).getUTCHours(), 16);
    });

    await t.test('only service role can execute quota functions and read counters', async () => {
      for (const role of ['anon', 'authenticated']) {
        const privileges = (await db.query(`select
          has_function_privilege($1,'public.blog_chat_status(text,text,integer,integer)','execute') as status,
          has_function_privilege($1,'public.blog_chat_reserve(text,text,integer,integer,integer,integer)','execute') as reserve,
          has_function_privilege($1,'public.blog_chat_finish(uuid,boolean)','execute') as finish,
          has_schema_privilege($1,'blog_chat_private','usage') as schema,
          has_table_privilege($1,'blog_chat_private.reservations','select') as read,
          has_table_privilege($1,'blog_chat_private.daily_global','update') as write`, [role])).rows[0];
        assert.deepEqual(privileges, { status: false, reserve: false, finish: false, schema: false, read: false, write: false });
      }
      const tables = (await db.query("select relrowsecurity from pg_class join pg_namespace on relnamespace=pg_namespace.oid where nspname='blog_chat_private' and relkind='r'")).rows;
      assert.equal(tables.length, 4); assert.ok(tables.every((row) => row.relrowsecurity));
      await db.exec('set role anon');
      try { await assert.rejects(status(), /permission denied/); }
      finally { await db.exec('reset role'); }
      await db.exec('set role service_role');
      try { assert.equal((await reserve()).allowed, true); }
      finally { await db.exec('reset role'); }
    });
  } finally { await db.close(); }
});
