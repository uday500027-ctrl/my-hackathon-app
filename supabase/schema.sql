create table public.users (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 60),
  email text not null unique check (email = lower(email)),
  password_hash text not null,
  created_at timestamptz not null default now()
);
create table public.policies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  enabled_categories text[] not null default '{email,phone,aadhaar,pan,upi_id,card,api_key,ip_address,password}',
  custom_terms text[] not null default '{}',
  strictness text not null default 'balanced' check (strictness in ('relaxed','balanced','strict')),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index policies_one_default on public.policies(user_id) where is_default;
create index policies_user_idx on public.policies(user_id);
create table public.scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  policy_id uuid references public.policies(id) on delete set null,
  title text,
  destination text not null check (destination in ('ai_chatbot','email_external','public_post','internal_chat')),
  masked_text text not null,
  findings jsonb not null default '[]'::jsonb,
  ai_analysis jsonb,
  ai_status text not null default 'ok' check (ai_status in ('ok','fallback')),
  risk_score int not null check (risk_score between 0 and 100),
  risk_level text not null check (risk_level in ('low','medium','high','critical')),
  source text not null default 'text' check (source in ('text','document')),
  verdict text check (verdict in ('safe','redact_first','do_not_upload')),
  created_at timestamptz not null default now()
);
create index scans_user_created_idx on public.scans(user_id, created_at desc);
alter table public.users enable row level security;
alter table public.policies enable row level security;
alter table public.scans enable row level security;
revoke all on public.users, public.policies, public.scans from anon, authenticated;
