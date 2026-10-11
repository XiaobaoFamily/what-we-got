begin;

-- One reusable snapshot per name and storage zone, independent of batch/unit.
create table public.inventory_templates (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  normalized_name text not null,
  storage_zone text not null check (storage_zone in ('pantry', 'chilled', 'frozen')),
  snapshot jsonb not null,
  shelf_life_days integer check (shelf_life_days >= 0),
  learned_at timestamptz not null,
  unique (household_id, normalized_name, storage_zone)
);
alter table public.inventory_templates enable row level security;
create policy templates_read on public.inventory_templates for select to authenticated
using (public.is_household_member(household_id));
grant select on public.inventory_templates to authenticated;

create function public.remember_inventory_batch(b public.inventory_items, learned timestamptz)
returns void language plpgsql security definer set search_path = public, pg_temp
as $$
declare duration integer;
begin
  duration := b.expires_on - b.purchased_on;
  if duration < 0 then duration := null; end if;
  insert into public.inventory_templates as t
    (household_id, normalized_name, storage_zone, snapshot, shelf_life_days, learned_at)
  values (b.household_id, lower(trim(b.name)), b.storage_zone, to_jsonb(b), duration, learned)
  on conflict (household_id, normalized_name, storage_zone) do update
  set snapshot = excluded.snapshot,
      shelf_life_days = coalesce(excluded.shelf_life_days, t.shelf_life_days),
      learned_at = excluded.learned_at;
end;
$$;
revoke all on function public.remember_inventory_batch(public.inventory_items,timestamptz) from public, anon, authenticated;

-- Legacy rows have no consumed timestamp. updated_at is the best available proxy.
-- Preserve the newest valid historical duration before removing depleted rows.
do $$
declare b public.inventory_items;
begin
  for b in select * from public.inventory_items where quantity = 0 order by updated_at, id loop
    perform public.remember_inventory_batch(b, b.updated_at);
  end loop;
end;
$$;
update public.inventory_templates t set shelf_life_days = (
  select b.expires_on - b.purchased_on from public.inventory_items b
  where b.household_id = t.household_id and lower(trim(b.name)) = t.normalized_name
    and b.storage_zone = t.storage_zone and b.expires_on >= b.purchased_on
  order by b.created_at desc, b.id desc limit 1
);
delete from public.inventory_items where quantity = 0;

-- Trigger covers +/- buttons, direct edits, shopping imports and future clients.
-- Snapshot and deletion share the same transaction; failure rolls both back.
create function public.archive_depleted_inventory()
returns trigger language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  perform public.remember_inventory_batch(new, clock_timestamp());
  delete from public.inventory_items where id = new.id;
  return new;
end;
$$;
revoke all on function public.archive_depleted_inventory() from public, anon, authenticated;
create trigger inventory_archive_depleted after insert or update on public.inventory_items
for each row when (new.quantity = 0) execute function public.archive_depleted_inventory();

alter publication supabase_realtime add table public.inventory_templates;

commit;
