alter table public.inventory_items
  add column if not exists low_stock_enabled boolean not null default true;

create table if not exists public.shopping_lists (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 40),
  sort_order integer not null default 0,
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, household_id),
  unique (household_id, name)
);

create table if not exists public.shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  shopping_list_id uuid not null,
  name text not null check (char_length(trim(name)) between 1 and 120),
  checked boolean not null default false,
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (shopping_list_id, household_id)
    references public.shopping_lists(id, household_id) on delete cascade
);

create index if not exists idx_shopping_lists_household_order
  on public.shopping_lists (household_id, sort_order, created_at);

create index if not exists idx_shopping_list_items_list_checked
  on public.shopping_list_items (shopping_list_id, checked, created_at);

drop trigger if exists shopping_lists_set_updated_at on public.shopping_lists;
create trigger shopping_lists_set_updated_at
before update on public.shopping_lists
for each row execute function public.set_updated_at();

drop trigger if exists shopping_list_items_set_updated_at on public.shopping_list_items;
create trigger shopping_list_items_set_updated_at
before update on public.shopping_list_items
for each row execute function public.set_updated_at();

create or replace function public.seed_default_shopping_lists()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.shopping_lists (household_id, name, sort_order, created_by)
  values
    (new.id, 'Costco', 10, new.created_by),
    (new.id, 'H-Mart', 20, new.created_by),
    (new.id, 'H-E-B', 30, new.created_by),
    (new.id, 'Target', 40, new.created_by)
  on conflict (household_id, name) do nothing;
  return new;
end;
$$;

drop trigger if exists households_seed_shopping_lists on public.households;
create trigger households_seed_shopping_lists
after insert on public.households
for each row execute function public.seed_default_shopping_lists();

insert into public.shopping_lists (household_id, name, sort_order, created_by)
select household.id, default_list.name, default_list.sort_order, household.created_by
from public.households as household
cross join (
  values
    ('Costco'::text, 10),
    ('H-Mart'::text, 20),
    ('H-E-B'::text, 30),
    ('Target'::text, 40)
) as default_list(name, sort_order)
on conflict (household_id, name) do nothing;

alter table public.shopping_lists enable row level security;
alter table public.shopping_list_items enable row level security;

create policy "shopping_lists_select_for_members"
on public.shopping_lists for select to authenticated
using (public.is_household_member(household_id));

create policy "shopping_lists_insert_for_members"
on public.shopping_lists for insert to authenticated
with check (public.is_household_member(household_id) and created_by = auth.uid());

create policy "shopping_lists_update_for_members"
on public.shopping_lists for update to authenticated
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));

create policy "shopping_lists_delete_for_members"
on public.shopping_lists for delete to authenticated
using (public.is_household_member(household_id));

create policy "shopping_items_select_for_members"
on public.shopping_list_items for select to authenticated
using (public.is_household_member(household_id));

create policy "shopping_items_insert_for_members"
on public.shopping_list_items for insert to authenticated
with check (public.is_household_member(household_id) and created_by = auth.uid());

create policy "shopping_items_update_for_members"
on public.shopping_list_items for update to authenticated
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));

create policy "shopping_items_delete_for_members"
on public.shopping_list_items for delete to authenticated
using (public.is_household_member(household_id));

revoke all on function public.seed_default_shopping_lists() from public, anon, authenticated;

grant select, insert, update, delete on public.shopping_lists to authenticated;
grant select, insert, update, delete on public.shopping_list_items to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'shopping_lists'
  ) then
    execute 'alter publication supabase_realtime add table public.shopping_lists';
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'shopping_list_items'
  ) then
    execute 'alter publication supabase_realtime add table public.shopping_list_items';
  end if;
end;
$$;

analyze public.inventory_items;
analyze public.shopping_lists;
analyze public.shopping_list_items;
