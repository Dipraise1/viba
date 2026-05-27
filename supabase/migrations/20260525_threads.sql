-- ─── Threads ──────────────────────────────────────────────────────────────────
create table if not exists threads (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles on delete cascade,
  body       text not null check (char_length(body) between 1 and 500),
  tags       text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table threads enable row level security;
create policy "Anyone can view threads"      on threads for select using (true);
create policy "Authors can insert threads"   on threads for insert with check (auth.uid() = user_id);
create policy "Authors can delete threads"   on threads for delete using (auth.uid() = user_id);

-- ─── Thread likes ─────────────────────────────────────────────────────────────
create table if not exists thread_likes (
  user_id    uuid not null references profiles on delete cascade,
  thread_id  uuid not null references threads  on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, thread_id)
);

alter table thread_likes enable row level security;
create policy "Anyone can view thread likes"       on thread_likes for select using (true);
create policy "Users can manage their thread likes" on thread_likes for all   using (auth.uid() = user_id);

-- ─── Thread reposts ───────────────────────────────────────────────────────────
create table if not exists thread_reposts (
  user_id    uuid not null references profiles on delete cascade,
  thread_id  uuid not null references threads  on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, thread_id)
);

alter table thread_reposts enable row level security;
create policy "Anyone can view thread reposts"       on thread_reposts for select using (true);
create policy "Users can manage their thread reposts" on thread_reposts for all   using (auth.uid() = user_id);

-- ─── Thread bookmarks ─────────────────────────────────────────────────────────
create table if not exists thread_bookmarks (
  user_id    uuid not null references profiles on delete cascade,
  thread_id  uuid not null references threads  on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, thread_id)
);

alter table thread_bookmarks enable row level security;
create policy "Users can view their own bookmarks"    on thread_bookmarks for select using (auth.uid() = user_id);
create policy "Users can manage their thread bookmarks" on thread_bookmarks for all  using (auth.uid() = user_id);

-- ─── Thread replies ───────────────────────────────────────────────────────────
create table if not exists thread_replies (
  id         uuid primary key default gen_random_uuid(),
  thread_id  uuid not null references threads  on delete cascade,
  user_id    uuid not null references profiles on delete cascade,
  body       text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);

alter table thread_replies enable row level security;
create policy "Anyone can view thread replies"      on thread_replies for select using (true);
create policy "Authors can insert thread replies"   on thread_replies for insert with check (auth.uid() = user_id);
create policy "Authors can delete their replies"    on thread_replies for delete using (auth.uid() = user_id);

-- ─── Thread stats view ────────────────────────────────────────────────────────
create or replace view thread_stats as
select
  t.id                                               as thread_id,
  coalesce(l.like_count,    0)                       as like_count,
  coalesce(r.reply_count,   0)                       as reply_count,
  coalesce(rp.repost_count, 0)                       as repost_count
from threads t
left join (select thread_id, count(*) as like_count    from thread_likes   group by thread_id) l  on l.thread_id  = t.id
left join (select thread_id, count(*) as reply_count   from thread_replies group by thread_id) r  on r.thread_id  = t.id
left join (select thread_id, count(*) as repost_count  from thread_reposts group by thread_id) rp on rp.thread_id = t.id;

-- ─── Thread feed view ─────────────────────────────────────────────────────────
create or replace view thread_feed as
select
  t.id,
  t.user_id,
  t.body,
  t.tags,
  t.created_at,
  p.display_name,
  p.handle,
  p.avatar_url,
  coalesce(ts.like_count,    0) as likes,
  coalesce(ts.reply_count,   0) as replies,
  coalesce(ts.repost_count,  0) as reposts
from threads t
join profiles p on p.id = t.user_id
left join thread_stats ts on ts.thread_id = t.id;

-- ─── Realtime ─────────────────────────────────────────────────────────────────
alter publication supabase_realtime add table threads;
alter publication supabase_realtime add table thread_replies;
