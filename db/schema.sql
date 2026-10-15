-- tokenstat leaderboard schema. Safe to run more than once.

create table if not exists users (
  id             bigint primary key,          -- GitHub user id
  login          text not null unique,
  avatar_url     text,
  created_at     timestamptz not null default now(),
  last_submit_at timestamptz
);

-- Leaderboard tokens the CLI sends. Only the SHA-256 hash is stored.
create table if not exists api_tokens (
  hash         text primary key,
  user_id      bigint not null references users(id) on delete cascade,
  created_at   timestamptz not null default now(),
  last_used_at timestamptz
);
create index if not exists api_tokens_user_idx on api_tokens(user_id);

-- One row per user, local day, tool, and model.
create table if not exists usage_daily (
  user_id     bigint not null references users(id) on delete cascade,
  day         date   not null,
  tool        text   not null check (tool in ('claude', 'codex', 'copilot')),
  model       text   not null,
  input       bigint not null check (input >= 0),
  output      bigint not null check (output >= 0),
  cache_read  bigint not null check (cache_read >= 0),
  cache_write bigint not null check (cache_write >= 0),
  calls       integer not null check (calls >= 0),
  updated_at  timestamptz not null default now(),
  primary key (user_id, day, tool, model)
);
create index if not exists usage_daily_day_idx on usage_daily(day);

-- Databases made before Copilot support allow only claude and codex.
alter table usage_daily drop constraint if exists usage_daily_tool_check;
alter table usage_daily add constraint usage_daily_tool_check check (tool in ('claude', 'codex', 'copilot'));

-- Supabase exposes the public schema through its Data API. Row level
-- security with no policies blocks that API; the app connects as the
-- table owner, which RLS does not restrict.
alter table users       enable row level security;
alter table api_tokens  enable row level security;
alter table usage_daily enable row level security;

-- The app never uses the Data API, so its roles get no access at all.
-- (These roles exist only on Supabase.)
do $$ begin
  if exists (select from pg_roles where rolname = 'anon') then
    revoke all on table users, api_tokens, usage_daily from anon, authenticated;
  end if;
end $$;
