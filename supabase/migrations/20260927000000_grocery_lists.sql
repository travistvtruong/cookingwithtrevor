-- Grocery lists (R5): create a list and its items in one transaction.
-- Runs as the caller, so row-level security applies (users only touch their own lists).

create function public.create_grocery_list(
  p_name  text,
  p_items jsonb  -- [{ name, quantity, unit }], already merged by the app
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
begin
  insert into public.grocery_lists (user_id, name)
  values (auth.uid(), left(coalesce(nullif(trim(p_name), ''), 'Grocery list'), 100))
  returning id into v_id;

  insert into public.grocery_list_items (list_id, position, name, quantity, unit)
  select v_id, i.ord::integer, i.item ->> 'name', (i.item ->> 'quantity')::numeric, i.item ->> 'unit'
  from jsonb_array_elements(p_items) with ordinality as i(item, ord);

  return v_id;
end;
$$;

revoke execute on function public.create_grocery_list(text, jsonb) from public, anon;
grant execute on function public.create_grocery_list(text, jsonb) to authenticated;

-- While shopping, users may only tick items on and off (not move them between lists).
revoke update on public.grocery_list_items from authenticated, anon;
grant update (checked) on public.grocery_list_items to authenticated;
