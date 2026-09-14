create table if not exists public.household_shelf_life_rules (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  base_rule_id text check (base_rule_id is null or char_length(base_rule_id) between 1 and 100),
  name text not null check (char_length(trim(name)) between 1 and 80),
  aliases text[] not null default '{}',
  category text not null check (category in ('prepared', 'meat', 'seafood', 'eggs-dairy', 'produce', 'pantry', 'pet-food')),
  conditions text[] not null default '{}' check (
    conditions <@ array['unopened', 'opened', 'raw', 'cooked', 'prepared', 'whole', 'cut', 'ripe', 'homemade', 'thawed']::text[]
  ),
  risk_level text not null default 'medium' check (risk_level in ('low', 'medium', 'high')),
  storage_zone text not null check (storage_zone in ('pantry', 'chilled', 'frozen')),
  min_days integer check (min_days is null or min_days >= 0),
  max_days integer check (max_days is null or max_days >= 0),
  start_from text not null default 'purchased' check (start_from in ('purchased', 'opened', 'prepared', 'cooked', 'ripe', 'thawed', 'package-date')),
  quality_only boolean not null default false,
  label_first boolean not null default false,
  advice text[] not null default '{}',
  warning text check (warning is null or char_length(warning) <= 500),
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shelf_life_duration_pair check (
    (min_days is null and max_days is null)
    or (min_days is not null and max_days is not null and min_days <= max_days)
  )
);

create unique index if not exists idx_household_rule_base_zone
  on public.household_shelf_life_rules (household_id, base_rule_id, storage_zone)
  where base_rule_id is not null;

create index if not exists idx_household_rules_household
  on public.household_shelf_life_rules (household_id, name);

drop trigger if exists household_shelf_life_rules_set_updated_at on public.household_shelf_life_rules;
create trigger household_shelf_life_rules_set_updated_at
before update on public.household_shelf_life_rules
for each row execute function public.set_updated_at();

alter table public.household_shelf_life_rules enable row level security;

create policy "shelf_life_rules_select_for_members"
on public.household_shelf_life_rules for select to authenticated
using (public.is_household_member(household_id));

create policy "shelf_life_rules_insert_for_members"
on public.household_shelf_life_rules for insert to authenticated
with check (public.is_household_member(household_id) and created_by = auth.uid());

create policy "shelf_life_rules_update_for_members"
on public.household_shelf_life_rules for update to authenticated
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));

create policy "shelf_life_rules_delete_for_members"
on public.household_shelf_life_rules for delete to authenticated
using (public.is_household_member(household_id));

grant select, insert, update, delete on public.household_shelf_life_rules to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'household_shelf_life_rules'
  ) then
    execute 'alter publication supabase_realtime add table public.household_shelf_life_rules';
  end if;
end;
$$;

analyze public.household_shelf_life_rules;
