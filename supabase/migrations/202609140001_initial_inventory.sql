create extension if not exists pgcrypto;

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 40),
  invite_code text not null unique default upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 10)),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id),
  unique (user_id)
);

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  storage_zone text not null check (storage_zone in ('pantry', 'chilled', 'frozen')),
  quantity numeric(12, 2) not null default 0 check (quantity >= 0),
  unit text not null default '件' check (char_length(unit) between 1 and 12),
  low_stock_threshold numeric(12, 2) not null default 1 check (low_stock_threshold >= 0),
  expires_on date,
  tags text[] not null default '{}',
  notes text check (notes is null or char_length(notes) <= 500),
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_inventory_household_expiry
  on public.inventory_items (household_id, expires_on);

create index if not exists idx_inventory_household_zone
  on public.inventory_items (household_id, storage_zone);

create index if not exists idx_inventory_tags
  on public.inventory_items using gin (tags);

create or replace function public.is_household_member(target_household uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.household_members
    where household_id = target_household and user_id = auth.uid()
  );
$$;

create or replace function public.is_household_owner(target_household uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.household_members
    where household_id = target_household and user_id = auth.uid() and role = 'owner'
  );
$$;

create or replace function public.create_household(household_name text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  new_household_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if trim(coalesce(household_name, '')) = '' then raise exception 'Household name is required'; end if;
  if exists (select 1 from public.household_members where user_id = auth.uid()) then
    raise exception 'This account already belongs to a household';
  end if;

  insert into public.households (name, created_by)
  values (trim(household_name), auth.uid())
  returning id into new_household_id;

  insert into public.household_members (household_id, user_id, role)
  values (new_household_id, auth.uid(), 'owner');

  return new_household_id;
end;
$$;

create or replace function public.join_household(code text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  matched_household_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if exists (select 1 from public.household_members where user_id = auth.uid()) then
    raise exception 'This account already belongs to a household';
  end if;

  select id into matched_household_id
  from public.households
  where invite_code = upper(trim(code));

  if matched_household_id is null then raise exception 'Invalid invite code'; end if;

  insert into public.household_members (household_id, user_id, role)
  values (matched_household_id, auth.uid(), 'member');

  return matched_household_id;
end;
$$;

create or replace function public.adjust_inventory_quantity(item_id uuid, amount numeric)
returns numeric
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  next_quantity numeric;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  update public.inventory_items
  set quantity = greatest(0, quantity + amount), updated_at = now()
  where id = item_id and public.is_household_member(household_id)
  returning quantity into next_quantity;

  if next_quantity is null then raise exception 'Inventory item not found'; end if;
  return next_quantity;
end;
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists inventory_items_set_updated_at on public.inventory_items;
create trigger inventory_items_set_updated_at
before update on public.inventory_items
for each row execute function public.set_updated_at();

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.inventory_items enable row level security;

create policy "households_select_for_members"
on public.households for select to authenticated
using (public.is_household_member(id));

create policy "households_update_for_owners"
on public.households for update to authenticated
using (public.is_household_owner(id))
with check (public.is_household_owner(id));

create policy "members_select_for_household"
on public.household_members for select to authenticated
using (public.is_household_member(household_id));

create policy "inventory_select_for_members"
on public.inventory_items for select to authenticated
using (public.is_household_member(household_id));

create policy "inventory_insert_for_members"
on public.inventory_items for insert to authenticated
with check (public.is_household_member(household_id) and created_by = auth.uid());

create policy "inventory_update_for_members"
on public.inventory_items for update to authenticated
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));

create policy "inventory_delete_for_members"
on public.inventory_items for delete to authenticated
using (public.is_household_member(household_id));

revoke all on function public.is_household_member(uuid) from public, anon;
revoke all on function public.is_household_owner(uuid) from public, anon;
revoke all on function public.create_household(text) from public, anon;
revoke all on function public.join_household(text) from public, anon;
revoke all on function public.adjust_inventory_quantity(uuid, numeric) from public, anon;

grant execute on function public.is_household_member(uuid) to authenticated;
grant execute on function public.is_household_owner(uuid) to authenticated;
grant execute on function public.create_household(text) to authenticated;
grant execute on function public.join_household(text) to authenticated;
grant execute on function public.adjust_inventory_quantity(uuid, numeric) to authenticated;

grant usage on schema public to authenticated;
grant select on public.households to authenticated;
grant select on public.household_members to authenticated;
grant select, insert, update, delete on public.inventory_items to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'inventory_items'
  ) then
    execute 'alter publication supabase_realtime add table public.inventory_items';
  end if;
end;
$$;

analyze public.households;
analyze public.household_members;
analyze public.inventory_items;
