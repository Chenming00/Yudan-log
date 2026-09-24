-- Public article Q&A budgets are reserved atomically across all application instances.
-- No existing user data is changed. Apply with an owner connection before enabling chat.
begin;
create schema if not exists blog_chat_private;
revoke all on schema blog_chat_private from public, anon, authenticated;
grant usage on schema blog_chat_private to service_role;

create table if not exists blog_chat_private.daily_global (
  day date primary key,
  used integer not null default 0 check (used >= 0)
);
create table if not exists blog_chat_private.daily_visitor (
  day date not null,
  visitor text not null,
  article text not null,
  used integer not null default 0 check (used >= 0),
  primary key (day, visitor, article)
);
create table if not exists blog_chat_private.request_rate (
  minute timestamptz not null,
  visitor text not null,
  attempts integer not null default 0,
  primary key (minute, visitor)
);
create table if not exists blog_chat_private.reservations (
  id uuid primary key default gen_random_uuid(),
  day date not null,
  visitor text not null,
  article text not null,
  state text not null default 'pending' check (state in ('pending', 'charged', 'refunded')),
  expires_at timestamptz not null default now() + interval '2 minutes'
);
create index if not exists blog_chat_pending_expiry on blog_chat_private.reservations(day, expires_at) where state = 'pending';
alter table blog_chat_private.daily_global enable row level security;
alter table blog_chat_private.daily_visitor enable row level security;
alter table blog_chat_private.request_rate enable row level security;
alter table blog_chat_private.reservations enable row level security;
revoke all on all tables in schema blog_chat_private from public, anon, authenticated;
grant all on all tables in schema blog_chat_private to service_role;

create or replace function public.blog_chat_status(p_visitor text, p_article text, p_daily_limit integer, p_global_limit integer)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public, blog_chat_private as $$
declare
  v_day date := (now() at time zone 'Asia/Shanghai')::date;
  v_used integer;
  v_global integer;
  v_remaining integer;
  v_reset timestamptz := (((now() at time zone 'Asia/Shanghai')::date + 1)::timestamp at time zone 'Asia/Shanghai');
  expired record;
begin
  insert into blog_chat_private.daily_global(day) values(v_day) on conflict do nothing;
  perform 1 from blog_chat_private.daily_global where day = v_day for update;
  -- Status also reclaims abandoned reservations, so a failed worker never leaves
  -- a browser unable to send a new request after the reservation lease expires.
  for expired in select * from blog_chat_private.reservations where day = v_day and state = 'pending' and expires_at < now() for update loop
    update blog_chat_private.reservations set state = 'refunded' where id = expired.id;
    update blog_chat_private.daily_global set used = greatest(0, used - 1) where day = v_day;
    update blog_chat_private.daily_visitor set used = greatest(0, used - 1) where day = v_day and visitor = expired.visitor and article = expired.article;
  end loop;
  select coalesce((select used from blog_chat_private.daily_visitor where day = v_day and visitor = p_visitor and article = p_article), 0) into v_used;
  select coalesce((select used from blog_chat_private.daily_global where day = v_day), 0) into v_global;
  v_remaining := greatest(0, least(p_daily_limit - v_used, p_global_limit - v_global));
  return jsonb_build_object('allowed', v_remaining > 0, 'remaining', v_remaining, 'limit', p_daily_limit, 'resetAt', v_reset);
end;
$$;

create or replace function public.blog_chat_reserve(p_visitor text, p_article text, p_daily_limit integer, p_global_limit integer, p_rate_limit integer, p_global_rate_limit integer)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public, blog_chat_private as $$
declare
  v_day date := (now() at time zone 'Asia/Shanghai')::date;
  v_minute timestamptz := date_trunc('minute', now());
  v_reset timestamptz := (((now() at time zone 'Asia/Shanghai')::date + 1)::timestamp at time zone 'Asia/Shanghai');
  v_status jsonb;
  v_ticket uuid;
  v_rate integer;
  v_global_rate integer;
begin
  if p_daily_limit < 1 or p_global_limit < 1 or p_rate_limit < 1 or p_global_rate_limit < 1 or length(p_visitor) <> 36 or length(p_article) not between 1 and 200 then
    raise exception 'Invalid chat quota arguments';
  end if;
  insert into blog_chat_private.daily_global(day) values(v_day) on conflict do nothing;
  -- All reserve/finish operations lock this row first. This serializes quota decisions
  -- and prevents lost updates and deadlocks even across independent server instances.
  perform 1 from blog_chat_private.daily_global where day = v_day for update;

  delete from blog_chat_private.request_rate where minute < now() - interval '2 days';
  delete from blog_chat_private.reservations where day < v_day - 7;
  delete from blog_chat_private.daily_visitor where day < v_day - 7;
  delete from blog_chat_private.daily_global where day < v_day - 7;

  insert into blog_chat_private.request_rate(minute, visitor, attempts) values(v_minute, p_visitor, 1)
    on conflict (minute, visitor) do update set attempts = blog_chat_private.request_rate.attempts + 1 returning attempts into v_rate;
  insert into blog_chat_private.request_rate(minute, visitor, attempts) values(v_minute, '*', 1)
    on conflict (minute, visitor) do update set attempts = blog_chat_private.request_rate.attempts + 1 returning attempts into v_global_rate;
  v_status := public.blog_chat_status(p_visitor, p_article, p_daily_limit, p_global_limit);
  if v_rate > p_rate_limit or v_global_rate > p_global_rate_limit then
    return v_status || jsonb_build_object('allowed', false, 'reason', 'rate', 'retryAfter', greatest(1, ceil(extract(epoch from v_minute + interval '1 minute' - now()))::integer));
  end if;
  if not (v_status->>'allowed')::boolean then
    return v_status || jsonb_build_object('reason', 'daily', 'retryAfter', greatest(1, ceil(extract(epoch from v_reset - now()))::integer));
  end if;

  insert into blog_chat_private.daily_visitor(day, visitor, article, used) values(v_day, p_visitor, p_article, 1)
    on conflict (day, visitor, article) do update set used = blog_chat_private.daily_visitor.used + 1;
  update blog_chat_private.daily_global set used = used + 1 where day = v_day;
  insert into blog_chat_private.reservations(day, visitor, article) values(v_day, p_visitor, p_article) returning id into v_ticket;
  return public.blog_chat_status(p_visitor, p_article, p_daily_limit, p_global_limit) || jsonb_build_object('allowed', true, 'ticket', v_ticket);
end;
$$;

create or replace function public.blog_chat_finish(p_ticket uuid, p_produced boolean)
returns void language plpgsql security definer set search_path = pg_catalog, public, blog_chat_private as $$
declare
  v_day date;
  reservation blog_chat_private.reservations%rowtype;
begin
  if p_produced is null then raise exception 'Missing chat reservation outcome'; end if;
  select day into v_day from blog_chat_private.reservations where id = p_ticket;
  if v_day is null then
    if p_produced then raise exception 'Chat reservation does not exist'; end if;
    return;
  end if;
  perform 1 from blog_chat_private.daily_global where day = v_day for update;
  select * into reservation from blog_chat_private.reservations where id = p_ticket for update;
  if not found then
    if p_produced then raise exception 'Chat reservation does not exist'; end if;
    return;
  end if;
  if reservation.state = 'charged' then return; end if;
  if p_produced and (reservation.state = 'refunded' or reservation.expires_at <= clock_timestamp()) then
    -- A late provider response must never resurrect a refunded or expired lease.
    -- The application requires this call to succeed before exposing any answer.
    raise exception 'Chat reservation expired or was refunded';
  end if;
  if reservation.state = 'refunded' then return; end if;
  update blog_chat_private.reservations set state = case when p_produced then 'charged' else 'refunded' end where id = p_ticket;
  if not p_produced then
    update blog_chat_private.daily_global set used = greatest(0, used - 1) where day = v_day;
    update blog_chat_private.daily_visitor set used = greatest(0, used - 1) where day = v_day and visitor = reservation.visitor and article = reservation.article;
  end if;
end;
$$;
revoke all on function public.blog_chat_status(text, text, integer, integer) from public, anon, authenticated;
revoke all on function public.blog_chat_reserve(text, text, integer, integer, integer, integer) from public, anon, authenticated;
revoke all on function public.blog_chat_finish(uuid, boolean) from public, anon, authenticated;
grant execute on function public.blog_chat_status(text, text, integer, integer) to service_role;
grant execute on function public.blog_chat_reserve(text, text, integer, integer, integer, integer) to service_role;
grant execute on function public.blog_chat_finish(uuid, boolean) to service_role;
commit;
