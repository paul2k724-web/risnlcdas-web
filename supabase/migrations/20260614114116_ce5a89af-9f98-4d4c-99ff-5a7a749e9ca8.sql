revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
revoke execute on function public.is_admin(uuid) from public, anon;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;
grant execute on function public.is_admin(uuid) to authenticated;

drop policy "delays_insert_auth" on public.delays_data;
create policy "delays_insert_auth" on public.delays_data for insert to authenticated with check (auth.uid() is not null);