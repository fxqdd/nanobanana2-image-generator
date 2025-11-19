-- ==============================================================================
-- 1. Ensure tables exist and have all required columns (Safe Migration)
-- ==============================================================================

-- --- Subscriptions Table ---
create table if not exists public.subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  created_at timestamp with time zone default now()
);

-- Add missing columns safely
alter table public.subscriptions add column if not exists plan text;
alter table public.subscriptions add column if not exists status text;
alter table public.subscriptions add column if not exists provider text;
alter table public.subscriptions add column if not exists external_id text;
alter table public.subscriptions add column if not exists amount_cents integer;
alter table public.subscriptions add column if not exists currency text;
alter table public.subscriptions add column if not exists renew_at timestamp with time zone;

-- --- Invoices Table ---
create table if not exists public.invoices (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  created_at timestamp with time zone default now()
);

-- Add missing columns safely
alter table public.invoices add column if not exists provider text;
alter table public.invoices add column if not exists external_id text;
alter table public.invoices add column if not exists amount_cents integer;
alter table public.invoices add column if not exists currency text;
alter table public.invoices add column if not exists description text;
alter table public.invoices add column if not exists issued_at timestamp with time zone;
alter table public.invoices add column if not exists metadata jsonb;

-- ==============================================================================
-- 2. Indexes and RLS
-- ==============================================================================

-- Add indexes for performance (if not exists is not standard for indexes in all postgres versions, 
-- but Supabase supports it. If it fails, we can wrap in DO block, but usually fine)
create index if not exists subscriptions_user_id_idx on public.subscriptions(user_id);
create index if not exists invoices_user_id_idx on public.invoices(user_id);
create index if not exists subscriptions_external_id_idx on public.subscriptions(external_id);
create index if not exists invoices_external_id_idx on public.invoices(external_id);

-- Enable RLS
alter table public.subscriptions enable row level security;
alter table public.invoices enable row level security;

-- Policies (Drop first to avoid "policy already exists" error)
drop policy if exists "Users can view their own subscriptions" on public.subscriptions;
create policy "Users can view their own subscriptions"
  on public.subscriptions for select
  using (auth.uid() = user_id);

drop policy if exists "Users can view their own invoices" on public.invoices;
create policy "Users can view their own invoices"
  on public.invoices for select
  using (auth.uid() = user_id);

-- ==============================================================================
-- 3. RPC Function for Atomic Updates
-- ==============================================================================

create or replace function public.handle_gumroad_purchase(
  p_user_id uuid,
  p_plan_code text,
  p_points int,
  p_sale_id text,
  p_price_cents int,
  p_currency text,
  p_renew_at timestamptz,
  p_metadata jsonb
)
returns void
language plpgsql
security definer
as $$
declare
  v_existing_id uuid;
begin
  -- 1. Idempotency check
  select id into v_existing_id from public.subscriptions where external_id = p_sale_id limit 1;
  if v_existing_id is not null then
    return; -- Already processed
  end if;

  -- 2. Update profile
  update public.profiles
  set 
    plan = p_plan_code,
    credits_remaining = coalesce(credits_remaining, 0) + p_points
  where user_id = p_user_id;

  -- 3. Insert subscription
  insert into public.subscriptions (
    user_id, plan, status, provider, external_id, amount_cents, currency, renew_at
  ) values (
    p_user_id, p_plan_code, 'active', 'gumroad', p_sale_id, p_price_cents, p_currency, p_renew_at
  );

  -- 4. Insert invoice
  insert into public.invoices (
    user_id, provider, external_id, amount_cents, currency, description, issued_at, metadata
  ) values (
    p_user_id, 'gumroad', p_sale_id, p_price_cents, p_currency, p_plan_code, now(), p_metadata
  );
end;
$$;
