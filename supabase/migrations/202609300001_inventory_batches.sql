begin;

-- Same name + unit identifies a product. Existing rows remain individual batches.
create table public.inventory_products (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  unit text not null check (char_length(unit) between 1 and 12),
  tags text[] not null default '{}',
  low_stock_enabled boolean not null default true,
  low_stock_threshold numeric(12,2) not null default 1 check (low_stock_threshold >= 0),
  unique (id, household_id)
);
create unique index inventory_products_identity
  on public.inventory_products (household_id, lower(trim(name)), unit);

alter table public.inventory_items
  add column product_id uuid,
  add column opened_on date,
  add column opened_days integer,
  add constraint inventory_opened_pair check (
    (opened_on is null and opened_days is null)
    or (opened_on is not null and opened_days is not null and opened_days between 1 and 3650)
  );

-- For previously duplicated names, use the most recently edited product settings.
insert into public.inventory_products (household_id, name, unit, tags, low_stock_enabled, low_stock_threshold)
select distinct on (household_id, lower(trim(name)), unit)
  household_id, trim(name), unit, tags, low_stock_enabled, low_stock_threshold
from public.inventory_items
order by household_id, lower(trim(name)), unit, updated_at desc, id;

update public.inventory_items b
set product_id = p.id, name = p.name, tags = p.tags,
    low_stock_enabled = p.low_stock_enabled, low_stock_threshold = p.low_stock_threshold
from public.inventory_products p
where b.household_id = p.household_id and lower(trim(b.name)) = lower(trim(p.name)) and b.unit = p.unit;

alter table public.inventory_items
  alter column product_id set not null,
  add constraint inventory_product_household foreign key (product_id, household_id)
    references public.inventory_products(id, household_id);
create index inventory_items_product on public.inventory_items(product_id);

alter table public.inventory_products enable row level security;
create policy products_read on public.inventory_products for select to authenticated
using (public.is_household_member(household_id));
grant select on public.inventory_products to authenticated;

-- Keep the existing batch API compatible while storing shared settings on products.
create function public.sync_inventory_product()
returns trigger language plpgsql security definer set search_path = public, pg_temp
as $$
declare p public.inventory_products;
begin
  if not public.is_household_member(new.household_id) then
    raise exception 'Household access required';
  end if;
  if pg_trigger_depth() > 1 then return new; end if;
  if tg_op = 'UPDATE' then
    if new.household_id <> old.household_id or new.product_id <> old.product_id then
      raise exception 'Cannot move a batch between products or households';
    end if;
    if row(new.name,new.unit,new.tags,new.low_stock_enabled,new.low_stock_threshold)
       is distinct from row(old.name,old.unit,old.tags,old.low_stock_enabled,old.low_stock_threshold) then
      update public.inventory_products set name = trim(new.name), unit = new.unit, tags = new.tags,
        low_stock_enabled = new.low_stock_enabled, low_stock_threshold = new.low_stock_threshold
      where id = old.product_id;
      update public.inventory_items set name = trim(new.name), unit = new.unit, tags = new.tags,
        low_stock_enabled = new.low_stock_enabled, low_stock_threshold = new.low_stock_threshold
      where product_id = old.product_id and id <> old.id;
    end if;
  else
    if new.product_id is null then
      insert into public.inventory_products(household_id,name,unit,tags,low_stock_enabled,low_stock_threshold)
      values(new.household_id,trim(new.name),new.unit,new.tags,new.low_stock_enabled,new.low_stock_threshold)
      on conflict do nothing;
      select * into p from public.inventory_products
      where household_id = new.household_id and lower(trim(name)) = lower(trim(new.name)) and unit = new.unit;
      new.product_id := p.id;
    end if;
  end if;
  select * into p from public.inventory_products where id = new.product_id and household_id = new.household_id;
  if not found then raise exception 'Product not found'; end if;
  new.name := p.name; new.unit := p.unit; new.tags := p.tags;
  new.low_stock_enabled := p.low_stock_enabled; new.low_stock_threshold := p.low_stock_threshold;
  return new;
end;
$$;
create trigger inventory_sync_product before insert or update on public.inventory_items
for each row execute function public.sync_inventory_product();
revoke all on function public.sync_inventory_product() from public, anon, authenticated;

-- Lock the original batch and split in one transaction, so concurrent opening cannot duplicate stock.
create function public.open_inventory_batch(batch_id uuid, amount numeric, opened_date date, use_within_days integer)
returns uuid language plpgsql security definer set search_path = public, pg_temp
as $$
declare b public.inventory_items; result_id uuid;
begin
  select * into b from public.inventory_items where id = batch_id for update;
  if not found or not public.is_household_member(b.household_id) then raise exception 'Batch not found'; end if;
  if b.opened_on is not null then raise exception 'Batch already opened'; end if;
  if amount is null or amount <= 0 or amount > b.quantity or amount <> round(amount,2) then raise exception 'Invalid opening quantity'; end if;
  if opened_date is null or use_within_days is null or use_within_days not between 1 and 3650 then raise exception 'Invalid opening date or days'; end if;
  if amount = b.quantity then
    update public.inventory_items set opened_on = opened_date, opened_days = use_within_days where id = b.id;
    return b.id;
  end if;
  update public.inventory_items set quantity = quantity - amount where id = b.id;
  insert into public.inventory_items(household_id,product_id,name,storage_zone,quantity,unit,
    low_stock_enabled,low_stock_threshold,expires_on,tags,notes,opened_on,opened_days)
  values(b.household_id,b.product_id,b.name,b.storage_zone,amount,b.unit,
    b.low_stock_enabled,b.low_stock_threshold,b.expires_on,b.tags,b.notes,opened_date,use_within_days)
  returning id into result_id;
  return result_id;
end;
$$;
revoke all on function public.open_inventory_batch(uuid,numeric,date,integer) from public, anon;
grant execute on function public.open_inventory_batch(uuid,numeric,date,integer) to authenticated;

commit;
