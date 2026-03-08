-- Run this once in your Supabase SQL editor to create the chat_history table

create table if not exists chat_history (
  id          bigserial primary key,
  user_id     text        not null,
  session_id  text        not null,
  title       text        not null default 'Untitled',
  messages    jsonb       not null default '[]',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, session_id)
);

-- Index for fast per-user lookups
create index if not exists chat_history_user_id_idx on chat_history (user_id);
create index if not exists chat_history_updated_idx  on chat_history (updated_at desc);

-- Row-Level Security (optional but recommended)
alter table chat_history enable row level security;
