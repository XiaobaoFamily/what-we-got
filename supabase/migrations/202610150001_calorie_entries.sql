begin;
create table public.calorie_entries (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  preparation text not null default 'raw' check (preparation in ('raw', 'cooked')),
  normalized_name text generated always as (lower(trim(name))) stored,
  kcal numeric(12,2) check (kcal >= 0),
  amount numeric(12,2) not null default 100 check (amount > 0),
  unit text not null default '克' check (char_length(trim(unit)) between 1 and 12),
  notes text not null default '' check (char_length(notes) <= 500),
  source_url text not null default '' check (source_url = '' or source_url ~ '^https?://'),
  updated_at timestamptz not null default now(),
  unique (household_id, normalized_name, preparation)
);
alter table public.calorie_entries enable row level security;
create policy calories_read on public.calorie_entries for select to authenticated
using (public.is_household_member(household_id));
create policy calories_insert on public.calorie_entries for insert to authenticated
with check (public.is_household_member(household_id));
create policy calories_update on public.calorie_entries for update to authenticated
using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
grant select, insert, update on public.calorie_entries to authenticated;
create trigger calories_updated before update on public.calorie_entries
for each row execute function public.set_updated_at();
alter publication supabase_realtime add table public.calorie_entries;
commit;
