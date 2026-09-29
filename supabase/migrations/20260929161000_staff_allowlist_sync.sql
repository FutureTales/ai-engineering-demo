-- Sync the staff allowlist from the STAFF_EMAILS env var (called by scripts/seed.ts).
-- private.staff_allowlist is not exposed through the API, so the server goes
-- through this function. Only the service role may execute it.
create or replace function public.sync_staff_allowlist(p_emails text[])
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int;
begin
  delete from private.staff_allowlist where email <> all (select lower(trim(e)) from unnest(p_emails) e);
  insert into private.staff_allowlist (email)
  select distinct lower(trim(e)) from unnest(p_emails) e where trim(e) <> ''
  on conflict do nothing;
  select count(*) into v_count from private.staff_allowlist;
  return v_count;
end;
$$;
revoke execute on function public.sync_staff_allowlist(text[]) from public, anon, authenticated;
grant execute on function public.sync_staff_allowlist(text[]) to service_role;
