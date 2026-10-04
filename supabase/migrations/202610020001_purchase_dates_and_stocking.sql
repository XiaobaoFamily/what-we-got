begin;
alter table public.inventory_items add column purchased_on date;
alter table public.shopping_list_items add column stocked_at timestamptz;

-- Opening a portion preserves the original batch's purchase date and notes.
create or replace function public.open_inventory_batch(batch_id uuid, amount numeric, opened_date date, use_within_days integer)
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
    low_stock_enabled,low_stock_threshold,expires_on,tags,notes,opened_on,opened_days,purchased_on)
  values(b.household_id,b.product_id,b.name,b.storage_zone,amount,b.unit,
    b.low_stock_enabled,b.low_stock_threshold,b.expires_on,b.tags,b.notes,opened_date,use_within_days,b.purchased_on)
  returning id into result_id;
  return result_id;
end;
$$;

-- Save the batch and its shopping status together so the button reflects a successful save.
create function public.stock_shopping_item(shopping_item_id uuid, batch jsonb)
returns uuid language plpgsql security definer set search_path = public, pg_temp
as $$
declare s public.shopping_list_items; result_id uuid;
begin
  select * into s from public.shopping_list_items where id = shopping_item_id for update;
  if not found or not public.is_household_member(s.household_id) then raise exception 'Shopping item not found'; end if;
  if not s.checked then raise exception 'Please mark this item as purchased first'; end if;
  if s.stocked_at is not null then raise exception 'This item is already recorded in inventory'; end if;
  insert into public.inventory_items(household_id,product_id,name,storage_zone,quantity,unit,
    low_stock_enabled,low_stock_threshold,expires_on,tags,notes,purchased_on)
  values(s.household_id,nullif(batch->>'product_id','')::uuid,batch->>'name',batch->>'storage_zone',
    (batch->>'quantity')::numeric,batch->>'unit',(batch->>'low_stock_enabled')::boolean,
    (batch->>'low_stock_threshold')::numeric,nullif(batch->>'expires_on','')::date,
    array(select jsonb_array_elements_text(batch->'tags')),batch->>'notes',nullif(batch->>'purchased_on','')::date)
  returning id into result_id;
  update public.shopping_list_items set stocked_at = now() where id = s.id;
  return result_id;
end;
$$;
revoke all on function public.stock_shopping_item(uuid,jsonb) from public, anon;
grant execute on function public.stock_shopping_item(uuid,jsonb) to authenticated;
commit;
